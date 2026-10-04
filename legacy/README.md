# legacy/ — الموقع الأصلي المستعاد / Restored original site

هذا المجلد مخصص للنسخة المستعادة من موقع **cmchub.net** القديم كما حفظها أرشيف الإنترنت (Wayback Machine).

لتعبئته شغّل من جهازك (يحتاج اتصالاً بـ web.archive.org):

```bash
python3 scripts/restore_from_wayback.py cmchub.net --list              # استعراض اللقطات المتاحة
python3 scripts/restore_from_wayback.py cmchub.net --from 2012 --to 2016
```

الناتج يُكتب في `legacy/cmchub.net/` مع ملف `manifest.json` يوثّق مصدر كل ملف وتاريخ لقطته.
الصفحات المستعادة ثابتة (HTML/CSS/صور) وتُستخدم كمرجع للمحتوى والتصميم القديم عند تطوير المنصة الجديدة في `src/`.

This folder receives the static copy of the original cmchub.net site downloaded from the Wayback Machine
by `scripts/restore_from_wayback.py`. It is reference material; the new platform lives in `src/`.
