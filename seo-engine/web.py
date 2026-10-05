#!/usr/bin/env python3
"""شريط واحد في المتصفح: ضع الدومين واضغط «حلّل». يعمل محليًا بلا أي حزم إضافية.

التشغيل:  python web.py            ← http://localhost:8000
          python web.py 9000       ← منفذ آخر
"""
from __future__ import annotations

import html
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

import engine

PAGE = """<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>محرك SEO مصغّر</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;max-width:900px;margin:40px auto;padding:0 16px;background:#fafafa;color:#222;line-height:1.7}
  h1{margin-bottom:4px} p.hint{color:#666;margin-top:0}
  form{display:flex;gap:8px;margin:24px 0}
  input{flex:1;padding:14px 16px;font-size:18px;border:1px solid #bbb;border-radius:10px;direction:ltr;text-align:left}
  button{padding:14px 24px;font-size:18px;border:0;border-radius:10px;background:#1a73e8;color:#fff;cursor:pointer}
  button:hover{background:#1558b0}
  pre{white-space:pre-wrap;word-wrap:break-word;background:#fff;border:1px solid #ddd;border-radius:10px;padding:20px;line-height:1.9;font-family:inherit}
  .err{color:#b00020;background:#fdecea;border:1px solid #f5c2c0;border-radius:10px;padding:12px 16px}
  .ok{color:#1b5e20;font-size:14px}
</style></head><body>
<h1>محرك SEO مصغّر</h1>
<p class="hint">ضع الدومين أو رابط الموقع فقط، وسيحصل على دراسة مصغّرة بالكلمات المفتاحية والتوصيات.</p>
<form method="post"><input name="url" placeholder="example.com" value="%URL%" required autofocus><button>حلّل</button></form>
%BODY%
</body></html>"""


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_page(PAGE.replace("%URL%", "").replace("%BODY%", ""))

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        form = urllib.parse.parse_qs(self.rfile.read(length).decode("utf-8", "replace"))
        url = form.get("url", [""])[0].strip()
        try:
            path, text = engine.run(url)
            body = f'<p class="ok">حُفظ التقرير في: {html.escape(engine.show(path))}</p><pre>{html.escape(text)}</pre>'
        except RuntimeError as e:
            body = f'<p class="err">{html.escape(str(e))}</p>'
        self.send_page(PAGE.replace("%URL%", html.escape(url, quote=True)).replace("%BODY%", body))

    def send_page(self, content: str) -> None:
        data = content.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):  # اسكت سجل الطلبات
        pass


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    try:
        engine.make_client()  # تحقّق مبكر من المفتاح قبل فتح الصفحة
    except RuntimeError as e:
        sys.exit(str(e))
    print(f"افتح المتصفح على:  http://localhost:{port}   (Ctrl+C للإيقاف)", flush=True)
    try:
        HTTPServer(("127.0.0.1", port), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\nتم الإيقاف.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
