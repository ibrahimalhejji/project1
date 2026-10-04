#!/usr/bin/env python3
"""
Restore an archived website from the Internet Archive (Wayback Machine).

Dependency-free (Python 3.8+, standard library only).

Usage:
    python3 scripts/restore_from_wayback.py cmchub.net
    python3 scripts/restore_from_wayback.py cmchub.net --from 2013 --to 2016 --out legacy/cmchub.net
    python3 scripts/restore_from_wayback.py cmchub.net --list      # only list captures

What it does:
    1. Queries the CDX API for every capture of <domain>/* (HTML, CSS, JS, images, PDFs ...).
    2. Keeps the capture closest to the --prefer timestamp for every distinct URL
       (default: the oldest capture in the requested window, i.e. the original site).
    3. Downloads the raw archived bytes (the "id_" flag strips the Wayback toolbar).
    4. Rewrites absolute Wayback links in HTML/CSS back to site-relative links.
    5. Writes a manifest.json describing every file it produced.

Be polite to archive.org: the script sleeps between requests and backs off on 429.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Dict, Iterable, List, Optional, Tuple

CDX_ENDPOINT = "https://web.archive.org/cdx/search/cdx"
WAYBACK_ENDPOINT = "https://web.archive.org/web"
USER_AGENT = "cmchub-restore/1.0 (+https://github.com/ibrahimalhejji/project1)"

# Matches http(s)://web.archive.org/web/20150101000000(id_|im_|cs_|js_)?/http://host/path
WAYBACK_LINK_RE = re.compile(
    r"(?:https?:)?//web\.archive\.org/web/\d{4,17}(?:[a-z]{2}_)?/(https?://[^\s\"'<>)]+)",
    re.IGNORECASE,
)


def http_get(url: str, retries: int = 6, timeout: int = 60) -> bytes:
    """GET with exponential back-off; honours 429/5xx."""
    delay = 3.0
    last_err: Optional[Exception] = None
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as err:
            last_err = err
            if err.code in (429, 500, 502, 503, 504):
                retry_after = err.headers.get("Retry-After")
                wait = float(retry_after) if retry_after and retry_after.isdigit() else delay
                sys.stderr.write(f"  HTTP {err.code} for {url} - waiting {wait:.0f}s\n")
                time.sleep(wait)
                delay = min(delay * 2, 120)
                continue
            raise
        except (urllib.error.URLError, ConnectionError, TimeoutError) as err:
            last_err = err
            sys.stderr.write(f"  network error for {url}: {err} - retrying in {delay:.0f}s\n")
            time.sleep(delay)
            delay = min(delay * 2, 120)
    raise RuntimeError(f"giving up on {url}: {last_err}")


def cdx_captures(domain: str, ts_from: str, ts_to: str) -> List[Dict[str, str]]:
    """Return every 200 capture for domain/* within the window."""
    params = {
        "url": f"{domain}/*",
        "output": "json",
        "fl": "timestamp,original,mimetype,statuscode,digest,length",
        "filter": "statuscode:200",
        "from": ts_from,
        "to": ts_to,
        "collapse": "digest",
    }
    rows: List[Dict[str, str]] = []
    page = 0
    while True:
        query = dict(params, page=str(page))
        url = f"{CDX_ENDPOINT}?{urllib.parse.urlencode(query)}"
        raw = http_get(url)
        if not raw.strip():
            break
        data = json.loads(raw)
        if not data:
            break
        header, body = data[0], data[1:]
        rows.extend(dict(zip(header, r)) for r in body)
        # CDX paging: when fewer than the page size come back we are done.
        if len(body) < 1000:
            break
        page += 1
        time.sleep(1.5)
    return rows


def normalise(url: str) -> str:
    """Canonical key for de-duplicating the same resource across captures."""
    parsed = urllib.parse.urlsplit(url)
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    path = parsed.path or "/"
    return urllib.parse.urlunsplit((parsed.scheme.lower(), host, path, parsed.query, ""))


def pick_captures(rows: Iterable[Dict[str, str]], prefer: str) -> Dict[str, Dict[str, str]]:
    """One capture per URL: the one whose timestamp is closest to `prefer`."""
    chosen: Dict[str, Dict[str, str]] = {}
    for row in rows:
        key = normalise(row["original"])
        if key not in chosen or abs(int(row["timestamp"][:14].ljust(14, "0")) - int(prefer.ljust(14, "0"))) < abs(
            int(chosen[key]["timestamp"][:14].ljust(14, "0")) - int(prefer.ljust(14, "0"))
        ):
            chosen[key] = row
    return chosen


def local_path(out_dir: str, url: str, mimetype: str) -> str:
    """Map an original URL to a path on disk."""
    parsed = urllib.parse.urlsplit(url)
    path = urllib.parse.unquote(parsed.path or "/")
    if path.endswith("/"):
        path += "index.html"
    if parsed.query:
        safe_query = re.sub(r"[^A-Za-z0-9_.-]+", "_", parsed.query)[:80]
        root, ext = os.path.splitext(path)
        path = f"{root}__{safe_query}{ext or '.html'}"
    root, ext = os.path.splitext(path)
    if not ext:
        if mimetype.startswith("text/html"):
            path = path + ".html"
        elif mimetype == "text/css":
            path = path + ".css"
        elif "javascript" in mimetype:
            path = path + ".js"
    path = path.lstrip("/")
    # Guard against path traversal from odd URLs.
    path = os.path.normpath(path)
    if path.startswith(".."):
        path = path.replace("..", "_")
    return os.path.join(out_dir, path)


def rewrite_links(text: str, domain: str) -> str:
    """Turn Wayback absolute links back into site-relative links."""

    def repl(match: re.Match) -> str:
        target = match.group(1)
        parsed = urllib.parse.urlsplit(target)
        host = parsed.netloc.lower()
        if host.startswith("www."):
            host = host[4:]
        if host == domain.lower():
            rel = parsed.path or "/"
            if parsed.query:
                rel += "?" + parsed.query
            return rel
        return target  # external resource: keep the live URL

    text = WAYBACK_LINK_RE.sub(repl, text)
    # Remove the Wayback toolbar/script injection if a non-id_ page slipped through.
    text = re.sub(r"<!-- BEGIN WAYBACK TOOLBAR INSERT -->.*?<!-- END WAYBACK TOOLBAR INSERT -->", "", text, flags=re.S)
    text = re.sub(r"<script[^>]*archive\.org/_static/[^>]*>\s*</script>", "", text, flags=re.I)
    return text


def download(domain: str, chosen: Dict[str, Dict[str, str]], out_dir: str, delay: float) -> List[dict]:
    manifest: List[dict] = []
    total = len(chosen)
    for index, (key, row) in enumerate(sorted(chosen.items()), start=1):
        original = row["original"]
        mimetype = row.get("mimetype", "")
        dest = local_path(out_dir, original, mimetype)
        if os.path.exists(dest):
            sys.stderr.write(f"[{index}/{total}] skip (exists) {dest}\n")
            manifest.append({"url": original, "timestamp": row["timestamp"], "file": dest, "skipped": True})
            continue
        archive_url = f"{WAYBACK_ENDPOINT}/{row['timestamp']}id_/{original}"
        sys.stderr.write(f"[{index}/{total}] {archive_url}\n")
        try:
            payload = http_get(archive_url)
        except Exception as err:  # noqa: BLE001 - we want to keep going
            sys.stderr.write(f"  FAILED: {err}\n")
            manifest.append({"url": original, "timestamp": row["timestamp"], "error": str(err)})
            continue
        if mimetype.startswith("text/") or "javascript" in mimetype or "json" in mimetype or "xml" in mimetype:
            try:
                text = payload.decode("utf-8")
            except UnicodeDecodeError:
                text = payload.decode("windows-1256", errors="replace")  # common for old Arabic sites
            payload = rewrite_links(text, domain).encode("utf-8")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as fh:
            fh.write(payload)
        manifest.append({"url": original, "timestamp": row["timestamp"], "mimetype": mimetype, "file": dest, "bytes": len(payload)})
        time.sleep(delay)
    return manifest


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("domain", help="domain to restore, e.g. cmchub.net")
    parser.add_argument("--from", dest="ts_from", default="2010", help="earliest capture (YYYY[MMDD])")
    parser.add_argument("--to", dest="ts_to", default="2024", help="latest capture (YYYY[MMDD])")
    parser.add_argument("--prefer", default=None, help="timestamp to prefer per URL (default: --from, i.e. the oldest)")
    parser.add_argument("--out", default=None, help="output directory (default: legacy/<domain>)")
    parser.add_argument("--delay", type=float, default=1.0, help="seconds to sleep between downloads")
    parser.add_argument("--list", action="store_true", help="only list captures, download nothing")
    parser.add_argument("--max", type=int, default=0, help="stop after N files (0 = no limit)")
    args = parser.parse_args(argv)

    out_dir = args.out or os.path.join("legacy", args.domain)
    prefer = args.prefer or args.ts_from

    sys.stderr.write(f"Querying CDX for {args.domain} ({args.ts_from}..{args.ts_to}) ...\n")
    rows = cdx_captures(args.domain, args.ts_from, args.ts_to)
    sys.stderr.write(f"{len(rows)} captures found\n")
    chosen = pick_captures(rows, prefer)
    sys.stderr.write(f"{len(chosen)} distinct URLs selected\n")

    if args.list:
        for key, row in sorted(chosen.items()):
            print(row["timestamp"], row.get("mimetype", ""), row["original"])
        return 0

    if args.max:
        chosen = dict(list(sorted(chosen.items()))[: args.max])

    os.makedirs(out_dir, exist_ok=True)
    manifest = download(args.domain, chosen, out_dir, args.delay)
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"domain": args.domain, "window": [args.ts_from, args.ts_to], "files": manifest}, fh, ensure_ascii=False, indent=2)
    ok = sum(1 for m in manifest if "file" in m)
    failed = sum(1 for m in manifest if "error" in m)
    sys.stderr.write(f"done: {ok} files written, {failed} failed -> {out_dir}\n")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
