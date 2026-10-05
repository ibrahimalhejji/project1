#!/usr/bin/env python3
"""محرك «صورة ← اقتباس تحفيزي عن الذكاء الاصطناعي» (نسخة مبسّطة).

المدخل : صورة (ملف أو رابط).
المسار : انظر (وصف دقيق لما في الصورة) ← تأمّل (جسور بين الصورة والذكاء الاصطناعي)
         ← صُغ (اقتباس عربي تحفيزي يحمل عنصرًا بصريًا من الصورة نفسها).
المخرج : output/<اسم الصورة>.quote.md و .json، ويُطبع الاقتباس في الطرفية.
"""
from __future__ import annotations

import argparse
import base64
import json
import re
import sys
from datetime import date
from pathlib import Path

import anthropic

ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "output"

DEFAULT_MODEL = "claude-opus-5-5"
EFFORT = "high"
MAX_TOKENS = 16000
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MEDIA_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}

SCHEMA = {
    "type": "object",
    "properties": {
        "analysis_ar": {"type": "string"},
        "bridges_ar": {"type": "array", "items": {"type": "string"}},
        "quotes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "text_tashkeel": {"type": "string"},
                    "theme": {"type": "string"},
                    "image_link_ar": {"type": "string"},
                },
                "required": ["text", "text_tashkeel", "theme", "image_link_ar"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["analysis_ar", "bridges_ar", "quotes"],
    "additionalProperties": False,
}

SYSTEM = """أنت أديب عربي يتأمل الصور ويستخرج منها حكمة عن الذكاء الاصطناعي. تعمل بثلاث خطوات مرتّبة، ولا تقفز إلى الثالثة قبل الأولى والثانية:

# 1. انظر (analysis_ar)
صِف ما في الصورة بدقة وأمانة: الموضوع، العناصر، الألوان، الضوء، الحركة أو السكون، المزاج، وما يلفت النظر فيها. لا تخترع ما ليس فيها.

# 2. تأمّل (bridges_ar)
اكتب 3 جسور مختلفة تربط عنصرًا محددًا من الصورة بفكرة عن الذكاء الاصطناعي: التعلّم من البيانات، الشراكة بين الإنسان والآلة، الصبر على التدريب والمحاولة، التواضع أمام ما لا نعرفه، المسؤولية في الاستخدام، الخيال الذي يسبق الأداة، أو غيرها. كل جسر جملة واحدة تذكر العنصر البصري والفكرة معًا.

# 3. صُغ (quotes)
اكتب الاقتباس المطلوب (أو الاقتباسات) اعتمادًا على أقوى الجسور:
- اقتباس تحفيزي عن الذكاء الاصطناعي، من 8 إلى 22 كلمة، جملة واحدة أو جملتان قصيرتان مكتملتان.
- يحمل عنصرًا بصريًا من الصورة نفسها (الضوء، الطريق، البذرة، اليد، الأفق...) حتى يُحسّ أنه خرج من هذه الصورة لا من أي صورة.
- يحفّز على التعلّم أو البناء أو الشجاعة أو المسؤولية، دون مبالغة ولا تخويف ولا وعود خارقة، ودون ادّعاء حقائق تقنية.
- عربية فصحى سليمة بتراكيب أصيلة؛ لا ركاكة ولا ترجمة حرفية ولا أساليب أعجمية («يقوم بـ»، «من قِبَل»، «بشكل»). لا عبارات مبتذلة مثل «الذكاء الاصطناعي هو المستقبل».
- text: بلا تشكيل. text_tashkeel: الاقتباس نفسه مشكولًا تشكيلًا كاملًا صحيحًا نحويًا.
- theme: كلمة أو كلمتان (مثل: الشراكة، التعلّم، الشجاعة).
- image_link_ar: جملة قصيرة تبيّن أي عنصر من الصورة حمله الاقتباس وكيف.
- الاقتباس من إنشائك ولا يُنسب إلى أي شخص حقيقي.
- عند طلب أكثر من اقتباس: اجعلها مختلفة في الفكرة والعنصر البصري، وضع الأقوى أولًا."""


# ---------------------------------------------------------------- أدوات صغيرة

def log(msg: str) -> None:
    print(msg, flush=True)


def show(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


TASHKEEL = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")


def strip_tashkeel(text: str) -> str:
    return re.sub(r"\s+", " ", TASHKEEL.sub("", text)).strip()


def image_name(source: str) -> str:
    return Path(source.split("?")[0]).stem or "image"


def image_block(source: str) -> dict:
    """يحوّل مسار ملف أو رابطًا إلى كتلة صورة يفهمها النموذج."""
    if source.startswith(("http://", "https://")):
        return {"type": "image", "source": {"type": "url", "url": source}}
    path = Path(source)
    if not path.is_file():
        raise RuntimeError(f"الصورة غير موجودة: {source}")
    media = MEDIA_TYPES.get(path.suffix.lower())
    if not media:
        raise RuntimeError(f"صيغة غير مدعومة «{path.suffix}». المدعوم: {', '.join(MEDIA_TYPES)}")
    data = path.read_bytes()
    if len(data) > MAX_IMAGE_BYTES:
        raise RuntimeError(f"الصورة أكبر من 5 ميغابايت ({len(data) / 1024 / 1024:.1f} MB). صغّرها ثم أعد المحاولة.")
    return {"type": "image", "source": {"type": "base64", "media_type": media,
                                        "data": base64.standard_b64encode(data).decode("ascii")}}


# ---------------------------------------------------------------- النموذج

def make_client() -> anthropic.Anthropic:
    client = anthropic.Anthropic()
    if not (client.api_key or client.auth_token or client.credentials):
        raise RuntimeError('لم يُضبط مفتاح API. نفّذ أولًا:  export ANTHROPIC_API_KEY="sk-ant-..."')
    return client


def ask(client: anthropic.Anthropic, model: str, image: dict, count: int, tone: str, notes: str) -> dict:
    text = f"انظر في هذه الصورة ثم تأمّل ثم صُغ {count} اقتباسًا تحفيزيًا عن الذكاء الاصطناعي من وحيها. النبرة: {tone}."
    if notes:
        text += f"\nملاحظات إضافية من المستخدم (لها الأولوية): {notes}"
    message = client.beta.messages.create(
        model=model,
        max_tokens=MAX_TOKENS,
        system=SYSTEM,
        messages=[{"role": "user", "content": [image, {"type": "text", "text": text}]}],
        output_config={"effort": EFFORT, "format": {"type": "json_schema", "schema": SCHEMA}},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if message.stop_reason == "refusal":
        why = message.stop_details.explanation if message.stop_details else ""
        raise RuntimeError(f"رفض النموذج تحليل هذه الصورة. {why}".strip())
    if message.stop_reason == "max_tokens":
        raise RuntimeError("انقطع رد النموذج لتجاوزه الحد الأقصى.")
    result = json.loads("".join(b.text for b in message.content if b.type == "text"))
    for q in result["quotes"]:   # إن لم يطابق المشكول نصَّه بعد حذف الحركات، نعود إلى النص بلا تشكيل
        if strip_tashkeel(q["text_tashkeel"]) != strip_tashkeel(q["text"]):
            q["text_tashkeel"] = q["text"]
    return result


# ---------------------------------------------------------------- الحفظ

def save(source: str, tone: str, result: dict) -> tuple[Path, Path]:
    OUTPUT_DIR.mkdir(exist_ok=True)
    name = image_name(source)
    md_path, json_path = OUTPUT_DIR / f"{name}.quote.md", OUTPUT_DIR / f"{name}.quote.json"
    quotes = result["quotes"]

    json_path.write_text(json.dumps({"source": source, "date": date.today().isoformat(), "tone": tone,
                                     "analysis_ar": result["analysis_ar"], "bridges_ar": result["bridges_ar"],
                                     "quotes": [{**q, "attribution": "من وحي الصورة"} for q in quotes]},
                                    ensure_ascii=False, indent=2), encoding="utf-8")

    L = [f"# اقتباس من وحي الصورة: {name}", "", f"- المصدر: {source}", f"- التاريخ: {date.today().isoformat()}", f"- النبرة: {tone}", "",
         "## ما في الصورة", "", result["analysis_ar"], "",
         "## الجسور إلى الذكاء الاصطناعي", ""] + [f"- {b}" for b in result["bridges_ar"]]
    for i, q in enumerate(quotes):
        L += ["", "## الاقتباس" if i == 0 else f"## بديل {i}", "",
              f"**«{q['text_tashkeel']}»**", "", f"«{q['text']}»  ", f"— من وحي الصورة · {q['theme']}", "",
              f"الرابط بالصورة: {q['image_link_ar']}"]
    L += ["", "---", "", "الاقتباس من إنشاء المحرك على أفكار الصورة، ولا يُنسب إلى أي شخص."]
    md_path.write_text("\n".join(L) + "\n", encoding="utf-8")
    return md_path, json_path


# ---------------------------------------------------------------- المحرك

def run(source: str, count: int = 1, tone: str = "تحفيزية", notes: str = "", model: str = DEFAULT_MODEL) -> tuple[Path, Path, dict]:
    image = image_block(source)
    client = make_client()
    log(f"🖼️  {image_name(source)}: انظر ← تأمّل ← صُغ ({count}) ...")
    try:
        result = ask(client, model, image, count, tone, notes)
    except anthropic.AuthenticationError as e:
        raise RuntimeError("مفتاح API غير صالح. تحقق من ANTHROPIC_API_KEY.") from e
    except anthropic.RateLimitError as e:
        raise RuntimeError("تجاوزت حد الطلبات. انتظر قليلًا ثم أعد المحاولة.") from e
    except anthropic.APIStatusError as e:
        raise RuntimeError(f"خطأ من الخدمة ({e.status_code}): {e.message}") from e
    except anthropic.APIConnectionError as e:
        raise RuntimeError("تعذّر الاتصال بالخدمة. تحقق من الشبكة.") from e
    md_path, json_path = save(source, tone, result)
    return md_path, json_path, result


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="صورة تدخل، اقتباس تحفيزي عن الذكاء الاصطناعي من وحيها يخرج")
    p.add_argument("images", nargs="*", help="مسار صورة أو رابطها (واحدة أو أكثر)")
    p.add_argument("--count", type=int, default=1, help="عدد الاقتباسات لكل صورة (1 إلى 5، الافتراضي 1)")
    p.add_argument("--tone", default="تحفيزية", help="النبرة (الافتراضي: تحفيزية؛ مثل: تأملية، حماسية، هادئة)")
    p.add_argument("--notes", default="", help="ملاحظات حرة (مثل: لمنشور صباحي لفريق تقني)")
    p.add_argument("--model", default=DEFAULT_MODEL, help=f"النموذج (الافتراضي {DEFAULT_MODEL})")
    args = p.parse_args(argv)

    images = args.images or [input("مسار الصورة أو رابطها: ").strip()]
    if not 1 <= args.count <= 5:
        sys.exit("عدد الاقتباسات يجب أن يكون بين 1 و5.")

    try:
        for source in images:
            md_path, json_path, result = run(source, args.count, args.tone, args.notes, args.model)
            for i, q in enumerate(result["quotes"]):
                log(f"\n{'★' if i == 0 else '◦'} «{q['text_tashkeel']}»\n   — من وحي الصورة · {q['theme']}\n   ↳ {q['image_link_ar']}")
            log(f"\n📄 {show(md_path)}\n📦 {show(json_path)}")
    except RuntimeError as e:
        sys.exit(str(e))
    return 0


if __name__ == "__main__":
    sys.exit(main())
