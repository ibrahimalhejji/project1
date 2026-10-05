#!/usr/bin/env python3
"""محرك الاقتباسات العربية (نسخة مبسّطة).

المدخل : كتاب أو مقالة (ملف .txt أو .md) أو مجرد عنوان/موضوع.
المسار : اشتقاق الاقتباسات ← تحقّق محلي من الاقتباسات الحرفية ← مراجعة لغوية وتشكيل ← حفظ.
المخرج : output/<الاسم>.quotes.md (للقراءة) و output/<الاسم>.quotes.json (للمنصات).

نوعا الاقتباس:
  حرفي   : جملة منقولة من النص كما هي، ويتحقق المحرك محليًا من وجودها فيه قبل قبولها.
  مستوحى : جملة من إنشاء المحرك مستوحاة من أفكار النص أو الموضوع، وتُنسب إليه «مستوحى من» لا قولًا للمؤلف.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import anthropic

ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "output"

DEFAULT_MODEL = "claude-opus-5-5"
EFFORT = "high"
MAX_TOKENS = 64000
MAX_SOURCE_CHARS = 300_000     # فوقها يُؤخذ من النص عيّنات موزّعة
SAMPLE_SLICES = 6
TEXT_EXTENSIONS = {".txt", ".md", ".markdown"}

QUOTE_ITEM = {
    "type": "object",
    "properties": {
        "text": {"type": "string"},
        "text_tashkeel": {"type": "string"},
        "theme": {"type": "string"},
        "kind": {"type": "string", "enum": ["حرفي", "مستوحى"]},
        "note": {"type": "string"},
    },
    "required": ["text", "text_tashkeel", "theme", "kind", "note"],
    "additionalProperties": False,
}
GENERATE_SCHEMA = {
    "type": "object",
    "properties": {"quotes": {"type": "array", "items": QUOTE_ITEM}},
    "required": ["quotes"],
    "additionalProperties": False,
}
REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "quotes": {"type": "array", "items": QUOTE_ITEM},
        "changes": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["quotes", "changes"],
    "additionalProperties": False,
}


# ---------------------------------------------------------------- أدوات صغيرة

def log(msg: str) -> None:
    print(msg, flush=True)


def show(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


TASHKEEL = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")


def normalize(text: str) -> str:
    """تطبيع للمقارنة فقط: حذف التشكيل والترقيم وتوحيد الهمزات والياء والتاء المربوطة."""
    text = TASHKEEL.sub("", text)
    text = re.sub("[إأآ]", "ا", text).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def slugify(name: str) -> str:
    return re.sub(r"[^\w؀-ۿ]+", "-", name).strip("-")[:60] or "quotes"


# ---------------------------------------------------------------- المصدر

@dataclass
class Source:
    name: str          # اسم الكتاب أو المقالة أو الموضوع
    author: str        # المؤلف إن عُرف
    text: str          # النص الكامل (فارغ إن كان المدخل عنوانًا فقط)
    sampled: bool      # هل أُخذت عيّنات من نص طويل؟

    @property
    def has_text(self) -> bool:
        return bool(self.text.strip())

    def excerpt(self) -> str:
        """ما يُرسل إلى النموذج: النص كاملًا أو عيّنات موزّعة إن كان طويلًا جدًا."""
        if len(self.text) <= MAX_SOURCE_CHARS:
            return self.text
        size = MAX_SOURCE_CHARS // SAMPLE_SLICES
        step = (len(self.text) - size) // (SAMPLE_SLICES - 1)
        return "\n\n[...]\n\n".join(self.text[i * step: i * step + size] for i in range(SAMPLE_SLICES))

    def attribution(self, kind: str) -> str:
        if kind == "حرفي":
            return f"{self.author}، {self.name}" if self.author else self.name
        if self.has_text:
            return f"مستوحى من {self.name}" + (f" لـ{self.author}" if self.author else "")
        return f"مستوحى من موضوع «{self.name}»"


def load_source(raw: str, title: str, author: str) -> Source:
    path = Path(raw)
    if path.suffix.lower() in TEXT_EXTENSIONS and path.is_file():
        text = path.read_text(encoding="utf-8", errors="replace").strip()
        if len(text.split()) < 30:
            raise RuntimeError("النص قصير جدًا لاشتقاق اقتباسات (أقل من 30 كلمة).")
        return Source(name=title or path.stem, author=author, text=text, sampled=len(text) > MAX_SOURCE_CHARS)
    if path.suffix.lower() in TEXT_EXTENSIONS:
        raise RuntimeError(f"الملف غير موجود: {raw}")
    if len(raw.strip()) < 2:
        raise RuntimeError("أدخل عنوانًا أو موضوعًا أو مسار ملف نصي.")
    return Source(name=title or raw.strip(), author=author, text="", sampled=False)


# ---------------------------------------------------------------- النموذج

ARABIC_RULES = """# معيار العربية (إلزامي)
- فصحى سليمة بتراكيب عربية أصيلة؛ لا ركاكة ولا ترجمة حرفية ولا أساليب أعجمية (مثل: «يقوم بـ»، «من قِبَل»، «بشكل»، «كونه»).
- كل اقتباس جملة مكتملة قائمة بذاتها تُفهم بلا سياق، من 6 إلى 25 كلمة.
- تنويع الصيغ: حكمة، مقابلة بين ضدّين، تساؤل، صورة بلاغية، شرط وجواب، أمر ونهي.
- لا تكرار للمعنى بألفاظ مختلفة، ولا عبارات مبتذلة شائعة.
- text: الاقتباس بلا تشكيل. text_tashkeel: الاقتباس نفسه بتشكيل كامل صحيح نحويًا (كل حرف مشكول، مع مراعاة الإعراب وأحكام الوقف).
- theme: كلمة أو كلمتان للموضوع (مثل: الصبر، المعرفة، الحرية).
- لا تختلق آيات أو أحاديث أو أقوالًا لأشخاص حقيقيين، ولا تنسب شيئًا إلى مؤلف قولًا إلا ما نقلته حرفيًا من نصه."""

GENERATE_SYSTEM = f"""أنت أديب عربي متمكّن، مهمتك اشتقاق اقتباسات عربية راقية من مصدر معطى.

# نوعا الاقتباس
- حرفي (kind = "حرفي"): جملة منقولة من النص المعطى بحروفها دون أي تغيير أو حذف أو إضافة، ولو حرفًا واحدًا. يجوز أن تكون جملة واحدة مقتطعة من فقرة، بشرط أن تُفهم مستقلة. في note اذكر موضعها التقريبي (فصل أو فقرة) إن أمكن.
- مستوحى (kind = "مستوحى"): جملة من إنشائك تلتقط فكرة من المصدر وتصوغها صياغة جديدة بليغة. في note اذكر الفكرة أو الموضع الذي استُوحيت منه.

{ARABIC_RULES}"""

REVIEW_SYSTEM = f"""أنت مصحّح لغوي عربي دقيق. تستلم قائمة اقتباسات وتعيدها مصحّحة بالعدد نفسه والترتيب نفسه.

# ما تفعله
- الاقتباس الحرفي (kind = "حرفي"): لا تغيّر text إطلاقًا ولا حرفًا واحدًا؛ صحّح text_tashkeel فقط ليكون تشكيلًا كاملًا صحيحًا للنص نفسه.
- الاقتباس المستوحى: صحّح النحو والإملاء والترقيم، وأزل الركاكة والتراكيب المترجمة، وأعد صياغة ما ضعف منه مع حفظ المعنى. ثم أعطِ text_tashkeel تشكيلًا كاملًا صحيحًا.
- تأكد أن text_tashkeel مطابق لـ text حرفًا بحرف بعد حذف الحركات.
- لا تحذف اقتباسًا ولا تضف جديدًا ولا تغيّر kind أو الترتيب.
- changes: جملة قصيرة لكل تعديل جوهري أجريته، بصيغة «رقم: ما تغيّر»؛ اتركها فارغة إن لم تعدّل شيئًا جوهريًا.

{ARABIC_RULES}"""


def make_client() -> anthropic.Anthropic:
    client = anthropic.Anthropic()
    if not (client.api_key or client.auth_token or client.credentials):
        raise RuntimeError('لم يُضبط مفتاح API. نفّذ أولًا:  export ANTHROPIC_API_KEY="sk-ant-..."')
    return client


def ask(client: anthropic.Anthropic, model: str, system: str, user: str, schema: dict) -> dict:
    with client.beta.messages.stream(
        model=model,
        max_tokens=MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_config={"effort": EFFORT, "format": {"type": "json_schema", "schema": schema}},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    ) as stream:
        message = stream.get_final_message()
    if message.stop_reason == "refusal":
        why = message.stop_details.explanation if message.stop_details else ""
        raise RuntimeError(f"رفض النموذج الطلب. {why}".strip())
    if message.stop_reason == "max_tokens":
        raise RuntimeError("انقطع رد النموذج لتجاوزه الحد الأقصى؛ قلّل عدد الاقتباسات.")
    return json.loads("".join(b.text for b in message.content if b.type == "text"))


def generate(client, model: str, src: Source, mode: str, count: int, tone: str) -> list[dict]:
    ask_for = count + 10 if mode != "derived" else count   # زيادة احتياطية لما سيسقط في التحقق الحرفي
    plan = {
        "verbatim": f"كل الاقتباسات حرفية (kind = \"حرفي\")، عددها {ask_for}.",
        "derived": f"كل الاقتباسات مستوحاة (kind = \"مستوحى\")، عددها {ask_for}.",
        "mixed": f"عددها {ask_for}: نصفها حرفي ونصفها مستوحى، متداخلة لا متتالية.",
    }[mode]
    head = [f"المصدر: {src.name}" + (f" — المؤلف: {src.author}" if src.author else ""), plan]
    if tone:
        head.append(f"النبرة المطلوبة: {tone}")
    if src.has_text:
        if src.sampled:
            head.append("النص طويل، فالمرفق عيّنات موزّعة منه؛ انقل الحرفي من هذه العيّنات فقط.")
        body = "\n\n# النص\n\n" + src.excerpt()
    else:
        body = "\n\nلا يوجد نص؛ المدخل عنوان أو موضوع فقط، فاشتقّ اقتباسات مستوحاة منه."
    return ask(client, model, GENERATE_SYSTEM, "\n".join(head) + body, GENERATE_SCHEMA)["quotes"]


def review(client, model: str, quotes: list[dict]) -> tuple[list[dict], list[str]]:
    user = "راجع هذه الاقتباسات وأعدها بالعدد والترتيب نفسيهما:\n\n" + json.dumps({"quotes": quotes}, ensure_ascii=False, indent=1)
    r = ask(client, model, REVIEW_SYSTEM, user, REVIEW_SCHEMA)
    if len(r["quotes"]) != len(quotes):
        return quotes, ["تجاوز المراجع العدد المطلوب فأُبقيت النسخة الأصلية."]
    return r["quotes"], r["changes"]


# ---------------------------------------------------------------- التحقق المحلي

def verify_verbatim(quotes: list[dict], src: Source) -> tuple[list[dict], int]:
    """يُسقط كل اقتباس حرفي لا يوجد نصّه في المصدر فعلًا. يعيد (المقبول، عدد المُسقَط)."""
    if not src.has_text:
        for q in quotes:
            q["kind"] = "مستوحى"
        return quotes, 0
    hay = normalize(src.text)
    kept, dropped = [], 0
    for q in quotes:
        if q["kind"] == "حرفي" and normalize(q["text"]) not in hay:
            dropped += 1
            continue
        kept.append(q)
    return kept, dropped


def dedupe(quotes: list[dict]) -> list[dict]:
    seen, out = set(), []
    for q in quotes:
        key = normalize(q["text"])
        if key and key not in seen:
            seen.add(key)
            out.append(q)
    return out


def guard_tashkeel(quotes: list[dict]) -> None:
    """إن لم يطابق المشكول نصَّه بعد حذف الحركات، نعود إلى النص بلا تشكيل بدل عرض نص مختلف."""
    for q in quotes:
        if normalize(q["text_tashkeel"]) != normalize(q["text"]):
            q["text_tashkeel"] = q["text"]


# ---------------------------------------------------------------- الحفظ

def save(src: Source, mode: str, quotes: list[dict], notes: list[str]) -> tuple[Path, Path]:
    OUTPUT_DIR.mkdir(exist_ok=True)
    slug = slugify(src.name)
    md_path, json_path = OUTPUT_DIR / f"{slug}.quotes.md", OUTPUT_DIR / f"{slug}.quotes.json"

    rows = []
    for i, q in enumerate(quotes, 1):
        rows.append({"n": i, "text": q["text"], "text_tashkeel": q["text_tashkeel"], "theme": q["theme"],
                     "kind": q["kind"], "attribution": src.attribution(q["kind"]), "note": q["note"]})
    json_path.write_text(json.dumps({"source": src.name, "author": src.author, "mode": mode, "date": date.today().isoformat(),
                                     "count": len(rows), "quotes": rows}, ensure_ascii=False, indent=2), encoding="utf-8")

    verbatim = sum(q["kind"] == "حرفي" for q in quotes)
    L = [f"# اقتباسات من: {src.name}", "",
         f"- المؤلف: {src.author or 'غير محدد'}", f"- العدد: {len(quotes)} (حرفي: {verbatim}، مستوحى: {len(quotes) - verbatim})",
         f"- التاريخ: {date.today().isoformat()}", ""]
    if notes:
        L += ["> " + n for n in notes] + [""]
    for r in rows:
        L += [f"**{r['n']}.** «{r['text_tashkeel']}»  ", f"«{r['text']}»  ",
              f"— {r['attribution']} · {r['theme']} · {r['kind']}", ""]
    L += ["---", "", "الاقتباس «الحرفي» تحقّق المحرك من وجوده في النص كما هو. "
          "الاقتباس «المستوحى» من إنشاء المحرك على أفكار المصدر، فلا يُنسب إلى المؤلف قولًا."]
    md_path.write_text("\n".join(L) + "\n", encoding="utf-8")
    return md_path, json_path


# ---------------------------------------------------------------- المحرك

def run(raw: str, title: str = "", author: str = "", mode: str = "auto", count: int = 50,
        tone: str = "", do_review: bool = True, model: str = DEFAULT_MODEL) -> tuple[Path, Path, list[dict]]:
    src = load_source(raw, title, author)
    if mode == "auto":
        mode = "mixed" if src.has_text else "derived"
    if mode != "derived" and not src.has_text:
        raise RuntimeError("الاقتباس الحرفي يحتاج إلى نص؛ مرّر ملف الكتاب أو المقالة، أو استعمل --mode derived.")
    client = make_client()
    notes: list[str] = []
    if src.sampled:
        notes.append(f"النص طويل ({len(src.text):,} حرفًا)، فأُخذت منه {SAMPLE_SLICES} عيّنات موزّعة.")

    log(f"✍️  اشتقاق {count} اقتباسًا من «{src.name}» (النمط: {mode}) ...")
    quotes = dedupe(generate(client, model, src, mode, count, tone))
    quotes, dropped = verify_verbatim(quotes, src)
    if dropped:
        notes.append(f"أُسقط {dropped} اقتباسًا زعم أنه حرفي ولم يُعثر عليه في النص.")
        log(f"🔎 التحقق الحرفي: أُسقط {dropped}، بقي {len(quotes)}")
    quotes = quotes[:count]

    if do_review and quotes:
        log("🧐 المراجعة اللغوية والتشكيل ...")
        reviewed, changes = review(client, model, quotes)
        for old, new in zip(quotes, reviewed):   # الحرفي لا يُمسّ نصّه مهما فعل المراجع
            if old["kind"] == "حرفي":
                new["text"], new["kind"] = old["text"], "حرفي"
        quotes = reviewed
        if changes:
            notes.append(f"أجرى المراجع {len(changes)} تعديلًا لغويًا.")
    guard_tashkeel(quotes)

    if len(quotes) < count:
        notes.append(f"طُلب {count} وتوفّر {len(quotes)} بعد التحقق.")
    md_path, json_path = save(src, mode, quotes, notes)
    return md_path, json_path, quotes


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="محرك الاقتباسات العربية — كتاب أو مقالة أو عنوان يدخل، اقتباسات سليمة تخرج")
    p.add_argument("source", nargs="?", help="مسار ملف نصي (.txt/.md) أو عنوان/موضوع")
    p.add_argument("--title", default="", help="اسم الكتاب أو المقالة (الافتراضي: اسم الملف أو العنوان المدخل)")
    p.add_argument("--author", default="", help="اسم المؤلف، لنسبة الاقتباسات الحرفية إليه")
    p.add_argument("--mode", default="auto", choices=["auto", "verbatim", "derived", "mixed"],
                   help="verbatim حرفي | derived مستوحى | mixed مزيج | auto: مزيج مع ملف، مستوحى مع عنوان")
    p.add_argument("--count", type=int, default=50, help="عدد الاقتباسات (1 إلى 100، الافتراضي 50)")
    p.add_argument("--tone", default="", help="نبرة اختيارية (مثل: تحفيزية، تأملية، ساخرة)")
    p.add_argument("--no-review", action="store_true", help="تخطّي المراجعة اللغوية (أسرع وأقل كلفة)")
    p.add_argument("--model", default=DEFAULT_MODEL, help=f"النموذج (الافتراضي {DEFAULT_MODEL})")
    args = p.parse_args(argv)

    raw = args.source or input("مسار الملف أو العنوان: ")
    if not 1 <= args.count <= 100:
        sys.exit("عدد الاقتباسات يجب أن يكون بين 1 و100.")
    try:
        md_path, json_path, quotes = run(raw, args.title, args.author, args.mode, args.count, args.tone,
                                         not args.no_review, args.model)
    except anthropic.AuthenticationError:
        sys.exit("مفتاح API غير صالح. تحقق من ANTHROPIC_API_KEY.")
    except anthropic.RateLimitError:
        sys.exit("تجاوزت حد الطلبات. انتظر قليلًا ثم أعد المحاولة.")
    except anthropic.APIStatusError as e:
        sys.exit(f"خطأ من الخدمة ({e.status_code}): {e.message}")
    except anthropic.APIConnectionError:
        sys.exit("تعذّر الاتصال بالخدمة. تحقق من الشبكة.")
    except RuntimeError as e:
        sys.exit(str(e))

    log("")
    for i, q in enumerate(quotes, 1):
        log(f"{i}. «{q['text_tashkeel']}»  — {q['theme']} · {q['kind']}")
    log(f"\n📄 Markdown: {show(md_path)}\n📦 JSON    : {show(json_path)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
