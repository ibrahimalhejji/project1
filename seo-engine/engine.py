#!/usr/bin/env python3
"""محرك SEO مصغّر (نسخة مبسّطة للغاية).

المدخل : دومين أو رابط موقع فقط.
المسار : جلب الصفحة الرئيسية وملف robots.txt ← فحص تقني سريع ← تحليل بالنموذج
         ← كلمات مفتاحية وعنوان ووصف مقترحان وإصلاحات سريعة وأفكار محتوى.
المخرج : output/<الدومين>.seo.md

للاستعمال من المتصفح بشريط واحد:  python web.py
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

import anthropic

ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "output"

DEFAULT_MODEL = "claude-opus-5-5"
EFFORT = "high"
MAX_TOKENS = 16000
TIMEOUT = 15
MAX_HTML = 1_500_000
USER_AGENT = "Mozilla/5.0 (compatible; MiniSEOEngine/1.0)"

# ما يعيده النموذج (مخرجات منظّمة مضمونة الصيغة)
SCHEMA = {
    "type": "object",
    "properties": {
        "about_ar": {"type": "string"},
        "site_language": {"type": "string"},
        "primary_keywords": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string"},
                    "intent": {"type": "string", "enum": ["معلوماتية", "تجارية", "شرائية", "تصفّحية"]},
                    "why_ar": {"type": "string"},
                },
                "required": ["keyword", "intent", "why_ar"],
                "additionalProperties": False,
            },
        },
        "secondary_keywords": {"type": "array", "items": {"type": "string"}},
        "long_tail": {"type": "array", "items": {"type": "string"}},
        "title_tag": {"type": "string"},
        "meta_description": {"type": "string"},
        "quick_wins": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "priority": {"type": "string", "enum": ["عالية", "متوسطة", "منخفضة"]},
                    "issue_ar": {"type": "string"},
                    "fix_ar": {"type": "string"},
                },
                "required": ["priority", "issue_ar", "fix_ar"],
                "additionalProperties": False,
            },
        },
        "content_ideas": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["about_ar", "site_language", "primary_keywords", "secondary_keywords", "long_tail",
                 "title_tag", "meta_description", "quick_wins", "content_ideas"],
    "additionalProperties": False,
}


# ---------------------------------------------------------------- أدوات صغيرة

def log(msg: str) -> None:
    print(msg, flush=True)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def normalize_url(raw: str) -> str:
    raw = raw.strip()
    if not raw:
        raise RuntimeError("أدخل دومينًا أو رابطًا.")
    if not re.match(r"^https?://", raw, re.I):
        raw = "https://" + raw
    if not urlparse(raw).netloc:
        raise RuntimeError(f"الرابط غير صالح: {raw}")
    return raw


def show(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


# ---------------------------------------------------------------- الجلب والتحليل

class PageParser(HTMLParser):
    """يستخرج من HTML ما يهم الـSEO فقط، بلا أي حزم خارجية."""

    SKIP = {"script", "style", "noscript", "svg", "template"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.description = ""
        self.lang = ""
        self.canonical = ""
        self.viewport = False
        self.robots_meta = ""
        self.og_title = ""
        self.h1: list[str] = []
        self.h2: list[str] = []
        self.h3: list[str] = []
        self.links: list[tuple[str, str]] = []
        self.images = 0
        self.images_no_alt = 0
        self.text_parts: list[str] = []
        self._skip_depth = 0
        self._in_title = False
        self._heading: tuple[str, list[str]] | None = None
        self._link: tuple[str, list[str]] | None = None

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        if tag in self.SKIP:
            self._skip_depth += 1
        elif tag == "html":
            self.lang = a.get("lang", "")
        elif tag == "title":
            self._in_title = True
        elif tag == "meta":
            name = (a.get("name") or a.get("property") or "").lower()
            content = a.get("content", "")
            if name == "description":
                self.description = content
            elif name == "viewport":
                self.viewport = True
            elif name == "robots":
                self.robots_meta = content
            elif name == "og:title":
                self.og_title = content
        elif tag == "link" and "canonical" in a.get("rel", "").lower():
            self.canonical = a.get("href", "")
        elif tag in ("h1", "h2", "h3"):
            self._heading = (tag, [])
        elif tag == "a":
            self._link = (a.get("href", ""), [])
        elif tag == "img":
            self.images += 1
            if not a.get("alt", "").strip():
                self.images_no_alt += 1

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip_depth:
            self._skip_depth -= 1
        elif tag == "title":
            self._in_title = False
        elif tag in ("h1", "h2", "h3") and self._heading:
            text = clean(" ".join(self._heading[1]))
            if text:
                getattr(self, tag).append(text)
            self._heading = None
        elif tag == "a" and self._link:
            self.links.append((self._link[0], clean(" ".join(self._link[1]))))
            self._link = None

    def handle_data(self, data):
        if self._skip_depth:
            return
        if self._in_title:
            self.title += data
        if self._heading:
            self._heading[1].append(data)
        if self._link:
            self._link[1].append(data)
        self.text_parts.append(data)


def fetch(url: str, limit: int = MAX_HTML) -> tuple[str, str, int]:
    """يعيد (النص، الرابط النهائي بعد التحويلات، رمز الحالة)."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "ar,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        raw = r.read(limit)
        charset = r.headers.get_content_charset()
        if not charset:
            m = re.search(rb"charset=[\"']?([\w-]+)", raw[:4096], re.I)
            charset = m.group(1).decode("ascii", "ignore") if m else "utf-8"
        try:
            text = raw.decode(charset, errors="replace")
        except LookupError:
            text = raw.decode("utf-8", errors="replace")
        return text, r.geturl(), r.status


def fetch_small(url: str) -> str | None:
    """يجلب ملفًا صغيرًا (robots / sitemap) ويعيد None إن لم يوجد."""
    try:
        text, _, _ = fetch(url, limit=20_000)
        return text
    except Exception:
        return None


@dataclass
class Audit:
    url: str
    final_url: str
    status: int
    title: str
    description: str
    lang: str
    canonical: str
    viewport: bool
    robots_meta: str
    og_title: str
    h1: list[str]
    h2: list[str]
    h3: list[str]
    internal_links: int
    external_links: int
    anchors_sample: list[str]
    images: int
    images_no_alt: int
    word_count: int
    text_sample: str
    robots_txt: bool
    sitemap: bool

    def checks(self) -> list[tuple[bool, str]]:
        """فحص تقني سريع ومحسوب محليًا؛ (ناجح؟، الوصف)."""
        tl, dl = len(self.title), len(self.description)
        return [
            (self.final_url.startswith("https://"), "الموقع يعمل عبر HTTPS"),
            (bool(self.title), "يوجد عنوان للصفحة (title)"),
            (30 <= tl <= 60, f"طول العنوان مناسب 30–60 حرفًا (الحالي {tl})"),
            (bool(self.description), "يوجد وصف ميتا (meta description)"),
            (70 <= dl <= 160, f"طول الوصف مناسب 70–160 حرفًا (الحالي {dl})"),
            (len(self.h1) == 1, f"عنوان H1 واحد فقط (الحالي {len(self.h1)})"),
            (bool(self.lang), "لغة الصفحة محددة (lang)"),
            (bool(self.canonical), "يوجد رابط canonical"),
            (self.viewport, "الصفحة متجاوبة مع الجوال (viewport)"),
            (self.images_no_alt == 0, f"كل الصور لها نص بديل alt (بلا alt: {self.images_no_alt} من {self.images})"),
            ("noindex" not in self.robots_meta.lower(), "الصفحة غير محجوبة عن الفهرسة (noindex)"),
            (self.robots_txt, "يوجد ملف robots.txt"),
            (self.sitemap, "يوجد sitemap"),
            (self.word_count >= 300, f"محتوى نصي كافٍ في الصفحة الرئيسية (الحالي {self.word_count} كلمة)"),
        ]


def audit(url: str) -> Audit:
    try:
        html, final_url, status = fetch(url)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"الموقع أعاد الحالة {e.code} عند جلب {url}") from e
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as e:
        raise RuntimeError(f"تعذّر الوصول إلى {url}: {getattr(e, 'reason', e)}") from e

    p = PageParser()
    p.feed(html)
    host = urlparse(final_url).netloc.lower()
    internal = external = 0
    anchors: list[str] = []
    for href, text in p.links:
        if href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        netloc = urlparse(urljoin(final_url, href)).netloc.lower()
        if netloc == host or netloc.endswith("." + host) or host.endswith("." + netloc):
            internal += 1
        else:
            external += 1
        if text and text not in anchors and len(anchors) < 40:
            anchors.append(text)

    text = clean(" ".join(p.text_parts))
    robots = fetch_small(urljoin(final_url, "/robots.txt"))
    sitemap = bool(robots and "sitemap:" in robots.lower()) or fetch_small(urljoin(final_url, "/sitemap.xml")) is not None

    return Audit(
        url=url, final_url=final_url, status=status,
        title=clean(p.title), description=clean(p.description), lang=p.lang, canonical=p.canonical,
        viewport=p.viewport, robots_meta=p.robots_meta, og_title=clean(p.og_title),
        h1=p.h1[:10], h2=p.h2[:20], h3=p.h3[:20],
        internal_links=internal, external_links=external, anchors_sample=anchors,
        images=p.images, images_no_alt=p.images_no_alt,
        word_count=len(text.split()), text_sample=text[:4000],
        robots_txt=robots is not None, sitemap=sitemap,
    )


# ---------------------------------------------------------------- النموذج

SYSTEM = """أنت خبير SEO عملي. تستلم نتائج فحص سريع للصفحة الرئيسية لموقع، وتقدّم دراسة مصغّرة تساعد صاحب الموقع على الوصول إليه من محركات البحث.

# قواعد
- الكلمات المفتاحية بلغة الموقع وجمهوره (site_language)؛ موقع عربي ← كلمات عربية، موقع إنجليزي ← إنجليزية، ثنائي اللغة ← الأهم من اللغتَين.
- primary_keywords: 5 إلى 8 كلمات محورية يستهدفها الموقع كله، مع نية البحث وسبب الاختيار.
- secondary_keywords: 10 إلى 15 كلمة داعمة.
- long_tail: 8 إلى 12 عبارة طويلة أو سؤالًا يكتبه الناس فعلًا في البحث.
- title_tag: 60 حرفًا أو أقل ويتضمن الكلمة الأهم. meta_description: 155 حرفًا أو أقل بدعوة واضحة للنقر.
- quick_wins: 5 إلى 8 إصلاحات مرتبة بالأولوية، مبنية أولًا على نتائج الفحص التقني المرفقة ثم على المحتوى؛ كل إصلاح محدد وقابل للتنفيذ اليوم.
- content_ideas: 5 عناوين مقالات تستهدف الكلمات المقترحة.
- لا تختلق أحجام بحث أو أرقام زيارات أو صعوبة منافسة؛ لا بيانات لديك عنها.
- about_ar والشروح كلها بالعربية."""


def make_client() -> anthropic.Anthropic:
    client = anthropic.Anthropic()
    if not (client.api_key or client.auth_token or client.credentials):
        raise RuntimeError('لم يُضبط مفتاح API. نفّذ أولًا:  export ANTHROPIC_API_KEY="sk-ant-..."')
    return client


def analyze(client: anthropic.Anthropic, model: str, a: Audit) -> dict:
    data = asdict(a)
    data["technical_checks"] = [{"ok": ok, "check": label} for ok, label in a.checks()]
    message = client.beta.messages.create(
        model=model,
        max_tokens=MAX_TOKENS,
        system=SYSTEM,
        messages=[{"role": "user", "content": "نتائج فحص الموقع:\n\n" + json.dumps(data, ensure_ascii=False, indent=1)}],
        output_config={"effort": EFFORT, "format": {"type": "json_schema", "schema": SCHEMA}},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if message.stop_reason == "refusal":
        why = message.stop_details.explanation if message.stop_details else ""
        raise RuntimeError(f"رفض النموذج تحليل هذا الموقع. {why}".strip())
    if message.stop_reason == "max_tokens":
        raise RuntimeError("انقطع رد النموذج لتجاوزه الحد الأقصى.")
    return json.loads("".join(b.text for b in message.content if b.type == "text"))


# ---------------------------------------------------------------- التقرير

def report(a: Audit, r: dict) -> str:
    host = urlparse(a.final_url).netloc
    L = [f"# دراسة SEO مصغّرة: {host}", "",
         f"- الرابط: {a.final_url}", f"- التاريخ: {date.today().isoformat()}", f"- لغة الموقع: {r['site_language']}", "",
         "## عن الموقع", "", r["about_ar"], "",
         "## الكلمات المفتاحية الرئيسية", "", "| الكلمة | نية البحث | لماذا |", "|---|---|---|"]
    L += [f"| {k['keyword']} | {k['intent']} | {k['why_ar']} |" for k in r["primary_keywords"]]
    L += ["", "## كلمات ثانوية", ""] + [f"- {k}" for k in r["secondary_keywords"]]
    L += ["", "## عبارات طويلة وأسئلة يبحث عنها الناس", ""] + [f"- {k}" for k in r["long_tail"]]
    L += ["", "## عنوان ووصف مقترحان", "",
          f"**Title ({len(r['title_tag'])} حرفًا):**", "", "```text", r["title_tag"], "```", "",
          f"**Meta description ({len(r['meta_description'])} حرفًا):**", "", "```text", r["meta_description"], "```", ""]
    L += ["## الفحص التقني السريع", ""] + [f"- {'✅' if ok else '❌'} {label}" for ok, label in a.checks()]
    L += ["", f"- روابط داخلية: {a.internal_links} | خارجية: {a.external_links} | عناوين H2: {len(a.h2)}", ""]
    L += ["## إصلاحات سريعة (بالأولوية)", ""]
    L += [f"{i}. **[{q['priority']}] {q['issue_ar']}**  \n   {q['fix_ar']}" for i, q in enumerate(r["quick_wins"], 1)]
    L += ["", "## أفكار محتوى تستهدف هذه الكلمات", ""] + [f"- {c}" for c in r["content_ideas"]]
    L += ["", "---", "", "الكلمات مقترحة من تحليل محتوى الصفحة الرئيسية فقط، بلا بيانات أحجام بحث. "
          "تحقّق منها في أداة كلمات مفتاحية قبل الاعتماد عليها."]
    return "\n".join(L)


def run(raw_url: str, model: str = DEFAULT_MODEL) -> tuple[Path, str]:
    """المسار الكامل. يرفع RuntimeError برسالة عربية عند أي مشكلة."""
    url = normalize_url(raw_url)
    client = make_client()
    log(f"🌐 جلب {url} ...")
    a = audit(url)
    ok = sum(1 for passed, _ in a.checks() if passed)
    log(f"🔎 الفحص التقني: {ok}/{len(a.checks())} ناجح | {a.word_count} كلمة | {a.internal_links} رابط داخلي")
    log("🧠 تحليل الكلمات المفتاحية ...")
    try:
        r = analyze(client, model, a)
    except anthropic.AuthenticationError as e:
        raise RuntimeError("مفتاح API غير صالح. تحقق من ANTHROPIC_API_KEY.") from e
    except anthropic.RateLimitError as e:
        raise RuntimeError("تجاوزت حد الطلبات. انتظر قليلًا ثم أعد المحاولة.") from e
    except anthropic.APIStatusError as e:
        raise RuntimeError(f"خطأ من الخدمة ({e.status_code}): {e.message}") from e
    except anthropic.APIConnectionError as e:
        raise RuntimeError("تعذّر الاتصال بخدمة النموذج. تحقق من الشبكة.") from e

    text = report(a, r)
    OUTPUT_DIR.mkdir(exist_ok=True)
    path = OUTPUT_DIR / f"{urlparse(a.final_url).netloc.replace(':', '_')}.seo.md"
    path.write_text(text + "\n", encoding="utf-8")
    return path, text


# ---------------------------------------------------------------- سطر الأوامر

def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="محرك SEO مصغّر — دومين واحد يدخل، كلمات مفتاحية وتوصيات تخرج")
    p.add_argument("url", nargs="?", help="الدومين أو رابط الموقع (مثل example.com)")
    p.add_argument("--model", default=DEFAULT_MODEL, help=f"النموذج (الافتراضي {DEFAULT_MODEL})")
    args = p.parse_args(argv)

    url = args.url or input("الدومين أو رابط الموقع: ")
    try:
        path, text = run(url, args.model)
    except RuntimeError as e:
        sys.exit(str(e))

    log("\n" + text)
    log(f"\n📄 حُفظ التقرير في: {show(path)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
