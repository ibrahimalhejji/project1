# CMC Hub — منصة إدارة المؤتمرات / Conference Management Platform

إعادة بناء موقع **cmchub.net** كمنصة حديثة ثنائية اللغة (عربي / إنجليزي) لإدارة المؤتمرات.
A modern, bilingual (Arabic RTL / English) rebuild of **cmchub.net** as a conference management platform.

## المزايا / Features

| الواجهة العامة / Public site | لوحة التحكم / Admin dashboard |
| --- | --- |
| الصفحة الرئيسية مع المؤتمرات القادمة والإحصاءات | نظرة عامة (أعداد، أحدث التسجيلات والملخصات) |
| صفحة المؤتمر: نبذة، البرنامج حسب الأيام والمسارات، المتحدثون، الرعاة | إدارة المؤتمرات (إنشاء / تعديل / نشر / أرشفة / حذف) |
| التسجيل الإلكتروني مع أنواع تذاكر، تحكم بالسعة ورقم مرجعي | الجلسات والمسارات (متعددة الأيام، قاعات، أنواع، ربط المتحدثين) |
| تقديم الملخصات البحثية مع موعد نهائي | المتحدثون والرعاة (حسب الفئة) |
| «أنشئ مؤتمرك»: حساب منظّم بخدمة ذاتية يدير مؤتمراته فقط | التسجيلات (تغيير الحالة، تصدير CSV) |
| الدعم الفني: أسئلة شائعة + نموذج يصل إلى صندوق المشرف | تحكيم الملخصات (قيد التحكيم / مقبول / مرفوض + ملاحظات) |
| صفحة المتحدثين، عن المنصة، اتصل بنا، تبديل اللغة مع RTL كامل | المستخدمون والأدوار (مشرف / منظّم) وصندوق الرسائل والدعم |

## التقنيات / Stack

- [Next.js 15](https://nextjs.org) (App Router, Server Actions) + TypeScript + Tailwind CSS v4
- SQLite عبر [libsql](https://github.com/tursodatabase/libsql) + [Drizzle ORM](https://orm.drizzle.team) (يمكن التحويل إلى Turso/Postgres لاحقاً)
- جلسات موقّعة بـ HMAC وكلمات مرور مشفّرة بـ scrypt، بدون اعتماديات خارجية للمصادقة

## التشغيل محلياً / Run locally

```bash
cp .env.example .env        # ثم عدّل SESSION_SECRET وبيانات المشرف
npm install
npm run setup               # ينشئ قاعدة البيانات + حساب المشرف + بيانات تجريبية
npm run dev                 # http://localhost:3000  (يحوّل تلقائياً إلى /ar)
```

- لوحة التحكم: `http://localhost:3000/ar/admin` — الدخول بالبريد وكلمة المرور الموجودين في `.env`
  (الافتراضي: `admin@cmchub.net` / `Admin12345!` — غيّرهما قبل النشر).
- النسخة الإنجليزية: `http://localhost:3000/en`

### أوامر مفيدة / Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | تطوير / بناء / تشغيل الإنتاج |
| `npm run db:migrate` | إنشاء الجداول (يُنفَّذ تلقائياً أيضاً عند بدء الخادم) |
| `npm run db:seed` (أضف `-- --force` للتكرار) | بيانات تجريبية |
| `npm run db:generate` | توليد migration جديد بعد تعديل `src/db/schema.ts` |
| `npm run db:studio` | متصفح قاعدة البيانات (Drizzle Studio) |
| `npm run lint` / `npm run typecheck` | الفحص |
| `npm run package` | بناء حزمة النشر `dist/cmchub-net-<تاريخ>.tar.gz` الجاهزة للرفع (انظر `deploy/README-DEPLOY.md`) |
| `npm run restore:wayback` | استعادة الموقع القديم من أرشيف الإنترنت (انظر أدناه) |

## استعادة الموقع القديم من أرشيف الإنترنت / Restoring the original site from the Wayback Machine

يوجد سكربت بدون اعتماديات في `scripts/restore_from_wayback.py` يحمّل كل الصفحات والملفات المؤرشفة
لموقع `cmchub.net` إلى المجلد `legacy/cmchub.net/`، ويصلح الروابط الداخلية، ويكتب `manifest.json`:

```bash
python3 scripts/restore_from_wayback.py cmchub.net --list                 # عرض اللقطات فقط
python3 scripts/restore_from_wayback.py cmchub.net --from 2012 --to 2016  # تحميل أقدم نسخة في هذه الفترة
python3 scripts/restore_from_wayback.py cmchub.net --prefer 20150601      # تفضيل اللقطة الأقرب لتاريخ معين
```

> ملاحظة: بيئة التطوير السحابية التي أُنشئ فيها هذا المستودع لا تستطيع الوصول إلى `web.archive.org`،
> لذا يجب تشغيل السكربت من جهازك. الأرشيف الأصلي يحتوي على HTML/CSS/صور فقط (لا يحفظ كود الخادم القديم)،
> لذا تُستخدم النسخة المستعادة كمرجع للمحتوى والتصميم، بينما تعيش المنصة الجديدة في هذا المستودع.

## بنية المشروع / Project structure

```
src/
  app/[locale]/            الصفحات العامة (ar | en)
  app/[locale]/admin/      لوحة التحكم (محمية)
  actions/                 Server Actions (الحفظ، الحذف، التسجيل، التحكيم ...)
  components/              مكونات الواجهة والنماذج
  db/schema.ts             مخطط قاعدة البيانات (Drizzle)
  db/queries.ts            الاستعلامات المشتركة
  db/seed.ts               البيانات التجريبية
  i18n/dictionaries.ts     نصوص الواجهة بالعربية والإنجليزية
  lib/                     المصادقة، الجلسات، الأدوات المساعدة
  middleware.ts            توجيه اللغة وحماية لوحة التحكم
scripts/restore_from_wayback.py   سكربت الاستعادة من الأرشيف
scripts/analyze_legacy_site.py    تحليل الموقع المستعاد
scripts/package.sh                بناء حزمة النشر
deploy/                    Dockerfile، PM2، Nginx، دليل الرفع
docs/FINAL_CONCEPT.md      التصور النهائي
drizzle/                   ملفات migration
```

## الأدوار والصلاحيات / Roles

- **مشرف (admin)**: كل المؤتمرات + المستخدمون + صندوق الرسائل والدعم. يُنشأ أول مشرف من `.env` عند أول تشغيل.
- **منظّم (organizer)**: يفتح حسابه من `/signup`، ويرى ويدير مؤتمراته فقط (كل إجراء خادمي يتحقق من الملكية).

## النشر / Deployment

- `npm run package` ينتج حزمة standalone لا تحتاج `npm install` على الخادم. الدليل الكامل (cPanel Node.js، VPS مع PM2 وNginx، Docker، Vercel/Railway) في `deploy/README-DEPLOY.md`.
- لقاعدة بيانات مُدارة استخدم Turso: `DATABASE_URL=libsql://...` و `DATABASE_AUTH_TOKEN=...`.
- التصور النهائي للمنصة وخارطة الطريق في `docs/FINAL_CONCEPT.md`.
