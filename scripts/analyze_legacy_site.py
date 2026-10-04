#!/usr/bin/env python3
"""
Analyse a restored static copy of a website (e.g. legacy/cmchub.net produced by
restore_from_wayback.py) and write a Markdown report that helps rebuild it.

Usage:
    python3 scripts/analyze_legacy_site.py legacy/cmchub.net            # writes legacy/ANALYSIS.md
    python3 scripts/analyze_legacy_site.py legacy/cmchub.net -o report.md

The report lists: page inventory (title, language, size), the site map inferred
from internal links, every HTML form (action, method, fields) - i.e. the PHP
endpoints the old backend exposed - query-string parameters per endpoint,
detected front-end libraries, assets, and a suggested mapping to the new
platform's modules.
"""
from __future__ import annotations

import argparse
import collections
import html
import json
import os
import re
import sys
from html.parser import HTMLParser
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import parse_qs, urlsplit

TEXT_EXT = {".html", ".htm", ".php", ".asp", ".aspx", ".jsp", ".shtml"}
ASSET_EXT = {".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".pdf", ".swf", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".doc", ".docx", ".xls", ".xlsx", ".zip"}

LIBRARY_SIGNATURES = [
    ("jQuery", re.compile(r"jquery[-.\d]*(\.min)?\.js|jQuery v?\d", re.I)),
    ("jQuery UI", re.compile(r"jquery-ui", re.I)),
    ("Bootstrap", re.compile(r"bootstrap(\.min)?\.(css|js)|class=\"[^\"]*\b(container|navbar|btn btn-)", re.I)),
    ("Font Awesome", re.compile(r"font-awesome|fontawesome", re.I)),
    ("AngularJS", re.compile(r"angular(\.min)?\.js|ng-app", re.I)),
    ("Vue", re.compile(r"vue(\.min)?\.js", re.I)),
    ("React", re.compile(r"react(-dom)?(\.min)?\.js", re.I)),
    ("Prototype.js", re.compile(r"prototype\.js", re.I)),
    ("MooTools", re.compile(r"mootools", re.I)),
    ("Google Analytics", re.compile(r"google-analytics\.com/(ga|analytics)\.js|gtag\(", re.I)),
    ("Google Maps", re.compile(r"maps\.google(apis)?\.com", re.I)),
    ("CKEditor / TinyMCE", re.compile(r"ckeditor|tinymce", re.I)),
    ("reCAPTCHA", re.compile(r"recaptcha", re.I)),
    ("Joomla", re.compile(r"/components/com_|generator\" content=\"Joomla", re.I)),
    ("WordPress", re.compile(r"wp-content/|wp-includes/|generator\" content=\"WordPress", re.I)),
    ("Drupal", re.compile(r"sites/all/|generator\" content=\"Drupal", re.I)),
    ("vBulletin / phpBB", re.compile(r"vbulletin|phpbb", re.I)),
    ("PHP sessions (PHPSESSID)", re.compile(r"PHPSESSID", re.I)),
    ("Flash", re.compile(r"\.swf\b", re.I)),
    ("Tables-based layout", re.compile(r"<table[^>]*(width=\"?\d{3,}|layout)", re.I)),
]

MODULE_HINTS = [
    ("Conferences / events", re.compile(r"conference|event|مؤتمر|ملتقى|ندوة|فعالي", re.I)),
    ("Registration / tickets", re.compile(r"regist|signup|sign-up|ticket|تسجيل|حجز", re.I)),
    ("Abstracts / papers", re.compile(r"abstract|paper|submission|call ?for|ملخص|بحث|ورقة", re.I)),
    ("Speakers", re.compile(r"speaker|keynote|متحدث|محاضر", re.I)),
    ("Agenda / programme", re.compile(r"agenda|program|schedule|session|برنامج|جدول|جلسة", re.I)),
    ("Sponsors / exhibitors", re.compile(r"sponsor|exhibit|partner|راع|شريك|معرض", re.I)),
    ("Venue / accommodation", re.compile(r"venue|hotel|accommodation|travel|visa|مكان|فندق|إقامة|سكن", re.I)),
    ("Committees", re.compile(r"committee|لجنة|لجان", re.I)),
    ("News / announcements", re.compile(r"news|announcement|أخبار|إعلان", re.I)),
    ("Gallery / media", re.compile(r"gallery|photo|video|معرض الصور|صور|فيديو", re.I)),
    ("Contact", re.compile(r"contact|اتصل|تواصل", re.I)),
    ("User accounts / login", re.compile(r"login|logout|account|profile|password|دخول|حساب|كلمة المرور", re.I)),
    ("Admin / CMS", re.compile(r"admin|cpanel|dashboard|manage|إدارة|لوحة", re.I)),
    ("Payments", re.compile(r"pay|invoice|fee|sadad|paypal|دفع|رسوم|فاتورة", re.I)),
]


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self._in_title = False
        self.lang = ""
        self.charset = ""
        self.generator = ""
        self.links: List[str] = []
        self.assets: List[str] = []
        self.forms: List[dict] = []
        self._form: Optional[dict] = None
        self.headings: List[str] = []
        self._in_heading = False
        self.text_chunks: List[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs_list: List[Tuple[str, Optional[str]]]) -> None:
        attrs = {k.lower(): (v or "") for k, v in attrs_list}
        if tag == "html":
            self.lang = attrs.get("lang", "") or attrs.get("xml:lang", "")
        elif tag == "title":
            self._in_title = True
        elif tag == "meta":
            if attrs.get("charset"):
                self.charset = attrs["charset"]
            if attrs.get("http-equiv", "").lower() == "content-type":
                m = re.search(r"charset=([\w-]+)", attrs.get("content", ""), re.I)
                if m:
                    self.charset = m.group(1)
            if attrs.get("name", "").lower() == "generator":
                self.generator = attrs.get("content", "")
        elif tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        elif tag in ("script", "img", "iframe", "embed", "source") and attrs.get("src"):
            self.assets.append(attrs["src"])
            if tag in ("script", "iframe"):
                self._skip += 1 if tag == "script" else 0
        elif tag == "link" and attrs.get("href"):
            self.assets.append(attrs["href"])
        elif tag == "form":
            self._form = {"action": attrs.get("action", ""), "method": (attrs.get("method") or "get").lower(), "fields": [], "enctype": attrs.get("enctype", "")}
        elif tag in ("input", "select", "textarea", "button") and self._form is not None:
            name = attrs.get("name", "")
            if name:
                self._form["fields"].append({"name": name, "type": attrs.get("type", tag), "required": "required" in attrs})
        elif tag in ("h1", "h2", "h3"):
            self._in_heading = True
        elif tag == "style":
            self._skip += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "form" and self._form is not None:
            self.forms.append(self._form)
            self._form = None
        elif tag in ("h1", "h2", "h3"):
            self._in_heading = False
        elif tag in ("script", "style") and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
        if self._skip:
            return
        text = data.strip()
        if not text:
            return
        if self._in_heading:
            self.headings.append(text)
        self.text_chunks.append(text)


def read_text(path: str) -> str:
    with open(path, "rb") as fh:
        raw = fh.read()
    for enc in ("utf-8", "windows-1256", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def is_internal(href: str, domain: str) -> bool:
    parsed = urlsplit(href)
    if parsed.scheme in ("mailto", "tel", "javascript"):
        return False
    if not parsed.netloc:
        return True
    host = parsed.netloc.lower()
    return host == domain or host == f"www.{domain}"


def endpoint_of(href: str) -> str:
    parsed = urlsplit(href)
    return parsed.path or "/"


def analyse(root: str, domain: str) -> dict:
    pages: List[dict] = []
    endpoints: Dict[str, Set[str]] = collections.defaultdict(set)  # path -> query params
    endpoint_refs: collections.Counter = collections.Counter()
    forms: List[dict] = []
    libraries: collections.Counter = collections.Counter()
    assets: collections.Counter = collections.Counter()
    external_hosts: collections.Counter = collections.Counter()
    module_hits: Dict[str, Set[str]] = collections.defaultdict(set)
    arabic_pages = 0
    files_by_ext: collections.Counter = collections.Counter()

    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            path = os.path.join(dirpath, name)
            rel = os.path.relpath(path, root)
            ext = os.path.splitext(name)[1].lower()
            files_by_ext[ext or "(none)"] += 1
            if ext in ASSET_EXT:
                assets[ext] += 1
            if ext not in TEXT_EXT:
                continue
            text = read_text(path)
            parser = PageParser()
            try:
                parser.feed(text)
            except Exception:  # noqa: BLE001 - tolerate broken legacy markup
                pass
            body_text = " ".join(parser.text_chunks)
            arabic = bool(re.search(r"[؀-ۿ]", body_text))
            arabic_pages += arabic
            page = {
                "file": rel,
                "title": html.unescape(parser.title.strip()) or "(no title)",
                "lang": parser.lang or ("ar" if arabic else "?"),
                "charset": parser.charset,
                "generator": parser.generator,
                "bytes": os.path.getsize(path),
                "words": len(body_text.split()),
                "headings": parser.headings[:8],
                "forms": len(parser.forms),
                "links": 0,
            }
            for sig_name, regex in LIBRARY_SIGNATURES:
                if regex.search(text):
                    libraries[sig_name] += 1
            haystack = f"{rel} {page['title']} {' '.join(parser.headings)}"
            for module, regex in MODULE_HINTS:
                if regex.search(haystack):
                    module_hits[module].add(rel)
            for href in parser.links:
                href = html.unescape(href)
                if is_internal(href, domain):
                    page["links"] += 1
                    path_only = endpoint_of(href)
                    endpoint_refs[path_only] += 1
                    for key in parse_qs(urlsplit(href).query, keep_blank_values=True):
                        endpoints[path_only].add(key)
                    endpoints.setdefault(path_only, set())
                else:
                    host = urlsplit(href).netloc
                    if host:
                        external_hosts[host] += 1
            for form in parser.forms:
                forms.append({"page": rel, **form})
            pages.append(page)

    return {
        "domain": domain,
        "pages": sorted(pages, key=lambda p: p["file"]),
        "endpoints": {k: sorted(v) for k, v in endpoints.items()},
        "endpoint_refs": endpoint_refs,
        "forms": forms,
        "libraries": libraries,
        "assets": assets,
        "external_hosts": external_hosts,
        "module_hits": {k: sorted(v) for k, v in module_hits.items()},
        "arabic_pages": arabic_pages,
        "files_by_ext": files_by_ext,
    }


def render(report: dict) -> str:
    out: List[str] = []
    pages = report["pages"]
    out.append(f"# Legacy site analysis: {report['domain']}\n")
    out.append(f"- Pages analysed: **{len(pages)}** (Arabic content on {report['arabic_pages']})")
    out.append(f"- Files by type: " + ", ".join(f"`{k}` {v}" for k, v in report["files_by_ext"].most_common(12)))
    out.append("")

    out.append("## Detected technologies\n")
    if report["libraries"]:
        for name, n in report["libraries"].most_common():
            out.append(f"- {name} (seen in {n} page{'s' if n != 1 else ''})")
    else:
        out.append("- No known library signatures found (plain HTML/CSS).")
    generators = {p["generator"] for p in pages if p["generator"]}
    if generators:
        out.append(f"- `<meta generator>`: {', '.join(sorted(generators))}")
    charsets = collections.Counter(p["charset"].lower() for p in pages if p["charset"])
    if charsets:
        out.append("- Charsets: " + ", ".join(f"{k} ({v})" for k, v in charsets.most_common()))
    out.append("")

    out.append("## Backend endpoints inferred from links (PHP scripts and their query parameters)\n")
    out.append("| Endpoint | Linked from (count) | Query parameters |")
    out.append("| --- | --- | --- |")
    for path, params in sorted(report["endpoints"].items(), key=lambda kv: -report["endpoint_refs"][kv[0]]):
        out.append(f"| `{path}` | {report['endpoint_refs'][path]} | {', '.join(f'`{p}`' for p in params) or '—'} |")
    out.append("")

    out.append("## Forms (what the old backend accepted)\n")
    if not report["forms"]:
        out.append("No forms found.")
    for form in report["forms"]:
        fields = ", ".join(f"`{f['name']}`{'*' if f['required'] else ''} ({f['type']})" for f in form["fields"]) or "—"
        out.append(f"- **{form['method'].upper()} `{form['action'] or '(same page)'}`** from `{form['page']}`" + (f" · enctype `{form['enctype']}`" if form["enctype"] else ""))
        out.append(f"  - fields: {fields}")
    out.append("")

    out.append("## Functional modules detected (by file names, titles and headings)\n")
    out.append("| Module in the old site | Evidence (files) | Where it lives in the new platform |")
    out.append("| --- | --- | --- |")
    mapping = {
        "Conferences / events": "`conferences` table · `/[locale]/conferences` · admin » Conferences",
        "Registration / tickets": "`registrations` table · `/conferences/[slug]/register` · admin » Registrations (+CSV)",
        "Abstracts / papers": "`abstracts` table · `/conferences/[slug]/submit` · admin » Abstracts (review)",
        "Speakers": "`speakers` table · `/speakers` · admin » Speakers",
        "Agenda / programme": "`sessions` + `tracks` tables · conference page » Agenda · admin » Sessions",
        "Sponsors / exhibitors": "`sponsors` table (tiers) · conference page » Sponsors · admin » Sponsors",
        "Venue / accommodation": "conference fields `venue*`, `city`, `country` (extend with a `venue_info` text field)",
        "Committees": "not yet modelled - add a `committees` table (name, role, members)",
        "News / announcements": "not yet modelled - add an `announcements` table per conference",
        "Gallery / media": "not yet modelled - add `media` table (conference_id, url, caption)",
        "Contact": "`messages` table · `/contact` · admin » Messages",
        "User accounts / login": "`users` table (admin/organizer) · `/login` · signed HMAC session cookie",
        "Admin / CMS": "`/[locale]/admin/**` (server actions + Drizzle)",
        "Payments": "not yet modelled - `conferences.price/currency` exist; integrate a payment gateway on registration",
    }
    for module, _regex in MODULE_HINTS:
        files = report["module_hits"].get(module, [])
        if files:
            shown = ", ".join(f"`{f}`" for f in files[:5]) + (f" (+{len(files) - 5})" if len(files) > 5 else "")
            out.append(f"| {module} | {shown} | {mapping.get(module, '')} |")
    out.append("")

    out.append("## Page inventory\n")
    out.append("| File | Title | Lang | Words | Forms | Internal links | Headings |")
    out.append("| --- | --- | --- | --- | --- | --- | --- |")
    for p in pages:
        headings = " · ".join(h[:40] for h in p["headings"][:4]).replace("|", "/")
        out.append(f"| `{p['file']}` | {p['title'][:60].replace('|', '/')} | {p['lang']} | {p['words']} | {p['forms']} | {p['links']} | {headings} |")
    out.append("")

    out.append("## Assets\n")
    out.append(", ".join(f"`{k}` {v}" for k, v in report["assets"].most_common()) or "none")
    out.append("")
    if report["external_hosts"]:
        out.append("## External hosts linked\n")
        for host, n in report["external_hosts"].most_common(20):
            out.append(f"- {host} ({n})")
        out.append("")

    out.append("## How to use this report\n")
    out.append("1. The *endpoints* and *forms* tables describe the old PHP backend's surface: every `*.php` script and the parameters it received. The Wayback Machine never stores server-side PHP source, so these are the contract to re-implement.")
    out.append("2. The *modules* table maps each old feature to the module that already exists in `src/` or marks it as a gap to add.")
    out.append("3. The *page inventory* gives the original copy (titles/headings) to migrate into `conferences`, `speakers`, etc., e.g. via `src/db/seed.ts`.")
    return "\n".join(out) + "\n"


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("root", help="directory with the restored site, e.g. legacy/cmchub.net")
    parser.add_argument("-o", "--output", default=None, help="report path (default: <root>/../ANALYSIS.md)")
    parser.add_argument("--domain", default=None, help="site domain (default: directory name)")
    parser.add_argument("--json", action="store_true", help="also write ANALYSIS.json next to the report")
    args = parser.parse_args(argv)

    root = args.root.rstrip("/")
    if not os.path.isdir(root):
        sys.stderr.write(f"not a directory: {root}\n")
        return 2
    domain = args.domain or os.path.basename(root)
    report = analyse(root, domain)
    output = args.output or os.path.join(os.path.dirname(root) or ".", "ANALYSIS.md")
    with open(output, "w", encoding="utf-8") as fh:
        fh.write(render(report))
    if args.json:
        serialisable = {**report, "endpoint_refs": dict(report["endpoint_refs"]), "libraries": dict(report["libraries"]), "assets": dict(report["assets"]), "external_hosts": dict(report["external_hosts"]), "files_by_ext": dict(report["files_by_ext"])}
        with open(os.path.splitext(output)[0] + ".json", "w", encoding="utf-8") as fh:
            json.dump(serialisable, fh, ensure_ascii=False, indent=2)
    sys.stderr.write(f"{len(report['pages'])} pages analysed -> {output}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
