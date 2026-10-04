# روابط أرشيف الإنترنت لموقع cmchub.net / Wayback Machine links

اللقطات المؤكدة (عبر واجهة التوفر على archive.org). افتحها في المتصفح مباشرة:

| التاريخ | رابط اللقطة |
| --- | --- |
| 2015-11-13 | https://web.archive.org/web/20151113012737/http://cmchub.net/ |
| 2016-06-11 | https://web.archive.org/web/20160611072203/http://cmchub.net/ |
| 2017-05-15 | https://web.archive.org/web/20170515213059/http://cmchub.net/ |
| 2017-09-13 | https://web.archive.org/web/20170913223143/http://cmchub.net/ |
| 2019-08-22 | https://web.archive.org/web/20190822195321/http://cmchub.net/ |
| 2019-09-23 | https://web.archive.org/web/20190923024124/http://cmchub.net/ |
| 2023-03-25 | https://web.archive.org/web/20230325035456/http://www.cmchub.net/ |

السنوات 2010 إلى 2014 لم تُفحص بسبب تقييد الطلبات؛ قد توجد لقطات أقدم.

## روابط مفيدة أخرى / Other useful views

- التقويم الكامل لكل اللقطات: https://web.archive.org/web/*/cmchub.net
- خريطة كل الروابط المؤرشفة تحت النطاق (الصفحات، الصور، CSS، ملفات PHP مع معاملاتها):
  https://web.archive.org/web/*/cmchub.net/*
- قائمة نصية بكل الروابط المؤرشفة (افتحها في المتصفح ثم احفظها باسم `urls.txt`):
  https://web.archive.org/cdx/search/cdx?url=cmchub.net/*&output=txt&fl=timestamp,original,mimetype,statuscode&filter=statuscode:200&collapse=urlkey
- نسخة "خام" بدون شريط الأرشيف لأي لقطة: أضف `id_` بعد الطابع الزمني، مثلاً
  https://web.archive.org/web/20151113012737id_/http://cmchub.net/

## كيف توصل المحتوى إلى الجلسة / Getting the content into this repo

البيئة السحابية لا تصل إلى `web.archive.org` ولا إلى `cmchub.net`، لذا أحد الخيارات التالية:

1. **الأسرع**: افتح لقطة 2015 أو 2016، التقط لقطات شاشة للصفحات (الرئيسية، صفحة مؤتمر، التسجيل، الملخصات، لوحة الإدارة إن ظهرت)،
   واحفظ ملف `urls.txt` من الرابط النصي أعلاه، ثم ارفعها في المحادثة.
2. **الأكمل**: من جهازك
   ```bash
   python3 scripts/restore_from_wayback.py cmchub.net --from 2015 --to 2017
   python3 scripts/analyze_legacy_site.py legacy/cmchub.net
   git add legacy && git commit -m "Restore cmchub.net from Wayback" && git push
   ```
3. **الدائم**: أضف `web.archive.org` و`cmchub.net` إلى Network access في إعدادات البيئة السحابية
   (https://code.claude.com/docs/en/cloud-environments#network-access) ثم ابدأ جلسة جديدة.

## ما نعرفه حتى الآن / What we know so far

- عنوان الصفحة الرئيسية كما فهرسته محركات البحث: **cmc|hub**.
- وصف البحث يذكر خيارين بارزين في الموقع: **إنشاء مؤتمر** (خدمة ذاتية للمنظمين) و**الدعم الفني**.
- آخر لقطة حية للموقع: 2023-03-25.
