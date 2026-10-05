#!/usr/bin/env python3
"""محرك تحويل الصور إلى برومبتات (نسخة مبسّطة).

المدخلات : صورة (ملف أو رابط)، نمط الإخراج المطلوب، محرك الصور المستهدف، عدد البدائل، ملاحظات حرة.
المخرجات : برومبت جاهز للنسخ إلى محرك الصور، مع وصف عربي للصورة وملاحظات لكل بديل.

كل نمط وكل محرك مستهدف هو ملف Markdown واحد:
  styles/*.md    أنماط الإخراج: كيف تريد أن تخرج الصورة (إعلان، موك أب، سينمائي، ...)
  targets/*.md   صيغة البرومبت بحسب محرك الصور المستهدف (Midjourney، DALL·E، ...)
أضف ملفًا جديدًا في أي مجلد ليصبح متاحًا فورًا باسمه.
"""
from __future__ import annotations

import argparse
import base64
import json
import sys
from pathlib import Path

import anthropic

ROOT = Path(__file__).resolve().parent
STYLES_DIR = ROOT / "styles"
TARGETS_DIR = ROOT / "targets"
OUTPUT_DIR = ROOT / "output"

DEFAULT_MODEL = "claude-opus-5-5"
EFFORT = "high"
MAX_TOKENS = 16000
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MEDIA_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}

# ما يعيده النموذج (مخرجات منظّمة مضمونة الصيغة)
SCHEMA = {
    "type": "object",
    "properties": {
        "analysis_ar": {"type": "string"},
        "prompts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title_ar": {"type": "string"},
                    "prompt": {"type": "string"},
                    "negative_prompt": {"type": "string"},
                    "aspect_ratio": {"type": "string"},
                    "notes_ar": {"type": "string"},
                },
                "required": ["title_ar", "prompt", "negative_prompt", "aspect_ratio", "notes_ar"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["analysis_ar", "prompts"],
    "additionalProperties": False,
}


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


def show(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def image_block(source: str) -> dict:
    """يحوّل مسار ملف أو رابطًا إلى كتلة صورة يفهمها النموذج."""
    if source.startswith(("http://", "https://")):
        return {"type": "image", "source": {"type": "url", "url": source}}
    path = Path(source)
    if not path.is_file():
        sys.exit(f"الصورة غير موجودة: {source}")
    media = MEDIA_TYPES.get(path.suffix.lower())
    if not media:
        sys.exit(f"صيغة غير مدعومة «{path.suffix}». المدعوم: {', '.join(MEDIA_TYPES)}")
    data = path.read_bytes()
    if len(data) > MAX_IMAGE_BYTES:
        sys.exit(f"الصورة أكبر من 5 ميغابايت ({len(data) / 1024 / 1024:.1f} MB). صغّرها ثم أعد المحاولة.")
    return {
        "type": "image",
        "source": {"type": "base64", "media_type": media, "data": base64.standard_b64encode(data).decode("ascii")},
    }


def image_name(source: str) -> str:
    return Path(source.split("?")[0]).stem or "image"


# ---------------------------------------------------------------- نداء النموذج

def system_prompt(style: str, target: str, variations: int) -> str:
    return (
        "أنت مهندس برومبتات محترف لمحركات توليد الصور. تحلّل الصورة المرفقة بدقة: الموضوع الرئيسي، "
        "التكوين، زاوية الكاميرا والعدسة، الإضاءة، لوحة الألوان، الخامات، المزاج، والأسلوب الفني. "
        "ثم تكتب برومبتًا يعيد إنتاج جوهر الصورة بالنمط المطلوب وبالصيغة التي يفهمها المحرك المستهدف.\n\n"
        f"# نمط الإخراج المطلوب\n{style}\n\n"
        f"# صيغة المحرك المستهدف\n{target}\n\n"
        "# قواعد\n"
        f"- أعطِ {variations} برومبت(ات). إن كانت أكثر من واحد فاجعلها مختلفة فعلًا في الزاوية أو الإضاءة "
        "أو المشهد، لا مجرد إعادة صياغة.\n"
        "- البرومبت بالإنجليزية لأن محركات الصور تفهمها أفضل. التحليل والعناوين والملاحظات بالعربية.\n"
        "- لا تذكر أسماء أشخاص حقيقيين ولا علامات تجارية ولا فنانين أحياء؛ صِف الملامح والأسلوب بدلًا من ذلك.\n"
        "- aspect_ratio بصيغة W:H (مثل 16:9) مستنتجة من الصورة أو مما يقتضيه النمط.\n"
        "- negative_prompt: ما يجب تجنّبه؛ اتركه نصًا فارغًا إن كان المحرك المستهدف لا يستعمله.\n"
        "- notes_ar: جملة أو جملتان تشرحان ما تغيّر عن الصورة الأصلية ولماذا."
    )


def ask(client: anthropic.Anthropic, model: str, system: str, content: list[dict]) -> dict:
    message = client.beta.messages.create(
        model=model,
        max_tokens=MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": content}],
        output_config={"effort": EFFORT, "format": {"type": "json_schema", "schema": SCHEMA}},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if message.stop_reason == "refusal":
        why = message.stop_details.explanation if message.stop_details else ""
        raise RuntimeError(f"رفض النموذج تحليل هذه الصورة. {why}".strip())
    if message.stop_reason == "max_tokens":
        raise RuntimeError("انقطع رد النموذج لتجاوزه الحد الأقصى؛ قلّل عدد البدائل.")
    text = "".join(block.text for block in message.content if block.type == "text")
    return json.loads(text)


# ---------------------------------------------------------------- المحرك

def make_client() -> anthropic.Anthropic:
    client = anthropic.Anthropic()
    if not (client.api_key or client.auth_token or client.credentials):
        sys.exit('لم يُضبط مفتاح API. نفّذ أولًا:  export ANTHROPIC_API_KEY="sk-ant-..."')
    return client


def convert(client, model: str, source: str, image: dict, style_name: str, target_name: str, variations: int, notes: str) -> Path:
    style = load(STYLES_DIR, style_name, "نمط")
    target = load(TARGETS_DIR, target_name, "محرك مستهدف")

    text = "حوّل هذه الصورة إلى برومبت بحسب النمط والصيغة المطلوبين."
    if notes:
        text += f"\n\nملاحظات إضافية من المستخدم (لها الأولوية): {notes}"

    log(f"🖼️  {image_name(source)}  ←  نمط «{style_name}»  ←  محرك «{target_name}» ...")
    result = ask(client, model, system_prompt(style, target, variations), [image, {"type": "text", "text": text}])
    path = save(source, style_name, target_name, result)

    for i, p in enumerate(result["prompts"], 1):
        log(f"\n── البرومبت {i}: {p['title_ar']}  [{p['aspect_ratio']}]")
        log(p["prompt"])
        if p["negative_prompt"]:
            log(f"Negative: {p['negative_prompt']}")
    return path


def save(source: str, style_name: str, target_name: str, result: dict) -> Path:
    OUTPUT_DIR.mkdir(exist_ok=True)
    path = OUTPUT_DIR / f"{image_name(source)}.{style_name}.{target_name}.md"
    lines = [
        f"# برومبتات: {image_name(source)}",
        "",
        f"- المصدر: {source}",
        f"- النمط: {style_name} | المحرك المستهدف: {target_name}",
        "",
        "## تحليل الصورة",
        "",
        result["analysis_ar"],
        "",
    ]
    for i, p in enumerate(result["prompts"], 1):
        lines += [
            f"## البرومبت {i}: {p['title_ar']}",
            "",
            "```text",
            p["prompt"],
            "```",
        ]
        if p["negative_prompt"]:
            lines += ["", "**Negative prompt:**", "", "```text", p["negative_prompt"], "```"]
        lines += ["", f"- نسبة الأبعاد: {p['aspect_ratio']}", f"- ملاحظات: {p['notes_ar']}", ""]
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


# ---------------------------------------------------------------- سطر الأوامر

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="محرك تحويل الصور إلى برومبتات — مبسّط")
    p.add_argument("images", nargs="*", help="مسار صورة أو رابطها (واحدة أو أكثر)")
    p.add_argument("--style", default="faithful",
                   help=f"نمط الإخراج، أو all لكل الأنماط. المتاح: {', '.join(names_in(STYLES_DIR))}")
    p.add_argument("--target", default="generic",
                   help=f"محرك الصور المستهدف. المتاح: {', '.join(names_in(TARGETS_DIR))}")
    p.add_argument("--variations", type=int, default=1, help="عدد البدائل لكل صورة (1 إلى 5، الافتراضي 1)")
    p.add_argument("--notes", default="", help="ملاحظات حرة تُضاف للطلب (مثل: خلفية بيضاء، بلا نص)")
    p.add_argument("--model", default=DEFAULT_MODEL, help=f"النموذج (الافتراضي {DEFAULT_MODEL})")
    p.add_argument("--list", action="store_true", help="اعرض الأنماط والمحركات المتاحة ثم اخرج")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if args.list:
        log("أنماط الإخراج     : " + ", ".join(names_in(STYLES_DIR)))
        log("المحركات المستهدفة: " + ", ".join(names_in(TARGETS_DIR)))
        return 0
    if not args.images:
        sys.exit("مرّر صورة واحدة على الأقل. مثال:  python engine.py photo.jpg --style ad")
    if not 1 <= args.variations <= 5:
        sys.exit("عدد البدائل يجب أن يكون بين 1 و5.")

    styles = names_in(STYLES_DIR) if args.style == "all" else [args.style]
    for s in styles:
        load(STYLES_DIR, s, "نمط")
    load(TARGETS_DIR, args.target, "محرك مستهدف")
    images = {source: image_block(source) for source in args.images}  # تحقّق من الصور قبل أي اتصال

    client = make_client()
    saved: list[Path] = []
    try:
        for source, image in images.items():
            for style in styles:
                saved.append(convert(client, args.model, source, image, style, args.target, args.variations, args.notes))
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

    log("\n📄 الملفات المحفوظة:")
    for path in saved:
        log(f"   {show(path)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
