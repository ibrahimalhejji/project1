#!/usr/bin/env python3
"""محرك إنشاء المقالات (نسخة مبسّطة).

المدخلات : عنوان المقال، الشريحة المستهدفة، عدد الكلمات، المهارة، الكاتب، المراجعون.
المسار   : الكاتب يكتب المسودة ← المراجعون يقيّمون ← الكاتب يعدّل ← ... حتى الموافقة.
المخرجات : output/<العنوان>.md (المقال) و output/<العنوان>.review.md (تقرير المراجعة).

كل مهارة وكل وكيل هو ملف Markdown واحد:
  skills/*.md            المهارة (أسلوب الكتابة وبنيتها)
  agents/writers/*.md    وكلاء الكتابة (من يستلم الطلب ويكتب)
  agents/reviewers/*.md  وكلاء المراجعة (من يراجع ويعتمد)
أضف ملفًا جديدًا في أي مجلد ليصبح متاحًا فورًا.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import anthropic

ROOT = Path(__file__).resolve().parent
SKILLS_DIR = ROOT / "skills"
WRITERS_DIR = ROOT / "agents" / "writers"
REVIEWERS_DIR = ROOT / "agents" / "reviewers"
OUTPUT_DIR = ROOT / "output"

DEFAULT_MODEL = "claude-opus-5-5"
EFFORT = "high"
MAX_TOKENS = 64000

# ما يعيده كل مراجع (مخرجات منظّمة يضمنها النموذج)
REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "approved": {"type": "boolean"},
        "score": {"type": "integer"},
        "notes": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["approved", "score", "notes"],
    "additionalProperties": False,
}


@dataclass
class Job:
    title: str
    audience: str
    words: int
    language: str
    model: str

    def brief(self) -> str:
        return (
            f"عنوان المقال: {self.title}\n"
            f"الشريحة المستهدفة: {self.audience}\n"
            f"عدد الكلمات المطلوب: {self.words} كلمة تقريبًا (الهامش المقبول ±10%)\n"
            f"لغة المقال: {self.language}"
        )


# ---------------------------------------------------------------- أدوات صغيرة

def log(msg: str) -> None:
    print(msg, flush=True)


def names_in(folder: Path) -> list[str]:
    return sorted(p.stem for p in folder.glob("*.md"))


def load(folder: Path, name: str, kind: str) -> str:
    path = folder / f"{name}.md"
    if not path.exists():
        sys.exit(f"لا يوجد {kind} باسم «{name}». المتاح: {', '.join(names_in(folder)) or 'لا شيء'}")
    return path.read_text(encoding="utf-8").strip()


def count_words(text: str) -> int:
    return len(text.split())


def slugify(title: str) -> str:
    return re.sub(r"[^\w؀-ۿ]+", "-", title).strip("-")[:60] or "article"


def show(path: Path) -> str:
    """مسار نسبي للعرض إن أمكن، وإلا مطلق."""
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


# ---------------------------------------------------------------- نداء النموذج

def ask(client: anthropic.Anthropic, model: str, system: str, user: str, schema: dict | None = None) -> str:
    """نداء واحد للنموذج. مع schema يُعاد JSON صالح مضمون."""
    output_config: dict = {"effort": EFFORT}
    if schema:
        output_config["format"] = {"type": "json_schema", "schema": schema}

    with client.beta.messages.stream(
        model=model,
        max_tokens=MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_config=output_config,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    ) as stream:
        message = stream.get_final_message()

    if message.stop_reason == "refusal":
        why = message.stop_details.explanation if message.stop_details else ""
        raise RuntimeError(f"رفض النموذج الطلب. {why}".strip())
    if message.stop_reason == "max_tokens":
        raise RuntimeError("انقطع رد النموذج لتجاوزه الحد الأقصى للطول؛ قلّل عدد الكلمات أو ارفع MAX_TOKENS.")
    return "".join(block.text for block in message.content if block.type == "text").strip()


# ---------------------------------------------------------------- الوكلاء

def writer_system(persona: str, skill: str) -> str:
    return (
        f"{persona}\n\n"
        f"# المهارة التي تكتب بها\n{skill}\n\n"
        "# قواعد الإخراج\n"
        "- أخرج المقال فقط بصيغة Markdown، بلا مقدمات ولا تعليقات ولا شرح لما فعلت.\n"
        "- التزم بعدد الكلمات المطلوب ضمن الهامش المذكور."
    )


def reviewer_system(persona: str, skill: str) -> str:
    return (
        f"{persona}\n\n"
        f"# المهارة التي كُتب بها المقال (قِس عليها)\n{skill}\n\n"
        "# طريقة الحكم\n"
        "- score: درجة من 1 إلى 10.\n"
        "- approved: true فقط إذا كانت الدرجة 8 أو أكثر ولا توجد ملاحظات جوهرية.\n"
        "- notes: ملاحظات محددة قابلة للتنفيذ، كل ملاحظة تشير إلى موضعها وتقترح الإصلاح. "
        "لا تكتب مديحًا، ولا ملاحظات عامة."
    )


def write_draft(client, job: Job, system: str) -> str:
    return ask(client, job.model, system, f"{job.brief()}\n\nاكتب المقال الآن.")


def review(client, job: Job, system: str, article: str) -> dict:
    user = (
        f"{job.brief()}\n"
        f"عدد كلمات المقال الفعلي: {count_words(article)}\n\n"
        f"# المقال\n\n{article}"
    )
    return json.loads(ask(client, job.model, system, user, REVIEW_SCHEMA))


def revise(client, job: Job, system: str, article: str, results: dict[str, dict]) -> str:
    notes = "\n".join(
        f"## ملاحظات {name} (الدرجة {r['score']}/10)\n" + "\n".join(f"- {n}" for n in r["notes"])
        for name, r in results.items()
        if not r["approved"]
    )
    user = (
        f"{job.brief()}\n\n"
        f"# مسودتك الحالية\n\n{article}\n\n"
        f"# ملاحظات المراجعين\n\n{notes}\n\n"
        "أعد كتابة المقال كاملًا مع معالجة كل الملاحظات، وحافظ على ما لم يُعترض عليه. أخرج المقال فقط."
    )
    return ask(client, job.model, system, user)


# ---------------------------------------------------------------- المحرك

def make_client() -> anthropic.Anthropic:
    """يبني العميل ويتأكد من وجود بيانات اعتماد (مفتاح، رمز، أو ملف تعريف ant auth)."""
    client = anthropic.Anthropic()
    if not (client.api_key or client.auth_token or client.credentials):
        sys.exit('لم يُضبط مفتاح API. نفّذ أولًا:  export ANTHROPIC_API_KEY="sk-ant-..."')
    return client


def run(job: Job, skill_name: str, writer_name: str, reviewer_names: list[str], rounds: int) -> tuple[Path, Path]:
    skill = load(SKILLS_DIR, skill_name, "مهارة")
    w_system = writer_system(load(WRITERS_DIR, writer_name, "كاتب"), skill)
    r_systems = {n: reviewer_system(load(REVIEWERS_DIR, n, "مراجع"), skill) for n in reviewer_names}
    client = make_client()

    log(f"✍️  الكاتب «{writer_name}» يكتب المسودة بمهارة «{skill_name}» ...")
    article = write_draft(client, job, w_system)

    history: list[tuple[int, int, dict]] = []
    for round_no in range(1, rounds + 1):
        wc = count_words(article)
        log(f"🔎 جولة المراجعة {round_no}/{rounds} (الكلمات: {wc})")
        results = {}
        for name, system in r_systems.items():
            results[name] = review(client, job, system, article)
            mark = "✅" if results[name]["approved"] else "❌"
            log(f"   {mark} {name}: {results[name]['score']}/10")
        history.append((round_no, wc, results))

        if all(r["approved"] for r in results.values()):
            log("🎉 اعتمد جميع المراجعين المقال.")
            break
        if round_no == rounds:
            log("⚠️  انتهت الجولات دون اعتماد كامل؛ سيُحفظ آخر إصدار مع الملاحظات.")
            break
        log("✍️  الكاتب يعدّل المسودة بحسب الملاحظات ...")
        article = revise(client, job, w_system, article, results)

    return save(job, article, history, skill_name, writer_name)


def save(job: Job, article: str, history, skill_name: str, writer_name: str) -> tuple[Path, Path]:
    OUTPUT_DIR.mkdir(exist_ok=True)
    slug = slugify(job.title)
    article_path = OUTPUT_DIR / f"{slug}.md"
    report_path = OUTPUT_DIR / f"{slug}.review.md"

    lines = [
        f"# تقرير المراجعة: {job.title}",
        "",
        f"- الشريحة: {job.audience}",
        f"- الكلمات المطلوبة: {job.words} | الفعلية: {count_words(article)}",
        f"- المهارة: {skill_name} | الكاتب: {writer_name} | النموذج: {job.model}",
        "",
    ]
    for round_no, wc, results in history:
        lines.append(f"## الجولة {round_no} (الكلمات: {wc})")
        for name, r in results.items():
            mark = "✅ معتمد" if r["approved"] else "❌ غير معتمد"
            lines.append(f"### {name} — {r['score']}/10 — {mark}")
            lines += [f"- {n}" for n in r["notes"]] or ["- لا ملاحظات."]
            lines.append("")

    article_path.write_text(article + "\n", encoding="utf-8")
    report_path.write_text("\n".join(lines), encoding="utf-8")
    return article_path, report_path


# ---------------------------------------------------------------- سطر الأوامر

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="محرك إنشاء المقالات — مبسّط")
    p.add_argument("--title", help="عنوان المقال")
    p.add_argument("--audience", help="الشريحة المستهدفة (مثل: روّاد أعمال مبتدئون)")
    p.add_argument("--words", type=int, default=800, help="عدد الكلمات (الافتراضي 800)")
    p.add_argument("--skill", default="general", help=f"المهارة: {', '.join(names_in(SKILLS_DIR))}")
    p.add_argument("--writer", default="journalist", help=f"وكيل الكتابة: {', '.join(names_in(WRITERS_DIR))}")
    p.add_argument("--reviewers", nargs="+", default=names_in(REVIEWERS_DIR),
                   help=f"وكلاء المراجعة (الافتراضي: الجميع): {', '.join(names_in(REVIEWERS_DIR))}")
    p.add_argument("--rounds", type=int, default=2, help="أقصى عدد جولات المراجعة (الافتراضي 2)")
    p.add_argument("--language", default="العربية", help="لغة المقال (الافتراضي العربية)")
    p.add_argument("--model", default=DEFAULT_MODEL, help=f"النموذج (الافتراضي {DEFAULT_MODEL})")
    p.add_argument("--list", action="store_true", help="اعرض المهارات والوكلاء المتاحين ثم اخرج")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if args.list:
        log("المهارات      : " + ", ".join(names_in(SKILLS_DIR)))
        log("وكلاء الكتابة : " + ", ".join(names_in(WRITERS_DIR)))
        log("وكلاء المراجعة: " + ", ".join(names_in(REVIEWERS_DIR)))
        return 0

    # وضع تفاعلي إن لم تُمرَّر المدخلات الأساسية
    title = args.title or input("عنوان المقال: ").strip()
    audience = args.audience or input("الشريحة المستهدفة: ").strip()
    if not title or not audience:
        sys.exit("العنوان والشريحة المستهدفة مطلوبان.")
    if args.words < 50:
        sys.exit("عدد الكلمات صغير جدًا (الحد الأدنى 50).")

    job = Job(title=title, audience=audience, words=args.words, language=args.language, model=args.model)
    try:
        article_path, report_path = run(job, args.skill, args.writer, args.reviewers, args.rounds)
    except anthropic.AuthenticationError:
        sys.exit("مفتاح API غير صالح أو غير موجود. اضبط المتغيّر ANTHROPIC_API_KEY.")
    except anthropic.RateLimitError:
        sys.exit("تجاوزت حد الطلبات. انتظر قليلًا ثم أعد المحاولة.")
    except anthropic.APIStatusError as e:
        sys.exit(f"خطأ من الخدمة ({e.status_code}): {e.message}")
    except anthropic.APIConnectionError:
        sys.exit("تعذّر الاتصال بالخدمة. تحقق من الشبكة.")
    except RuntimeError as e:
        sys.exit(str(e))

    log(f"\n📄 المقال        : {show(article_path)}")
    log(f"📋 تقرير المراجعة: {show(report_path)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
