# دليل رفع CMChub.net على الاستضافة / Deployment guide

هذه الحزمة هي نسخة الإنتاج الجاهزة من منصة CMChub.net (Next.js standalone + SQLite).
لا تحتاج إلى `npm install` على الخادم؛ كل ما يلزم موجود داخل الحزمة.

## محتويات الحزمة / Package contents

```
server.js            نقطة التشغيل (node server.js)
.next/               ملفات التطبيق المبنية + الملفات الثابتة
node_modules/        الاعتماديات اللازمة للتشغيل فقط (Linux x64)
public/              الصور والأيقونات
drizzle/             ملفات إنشاء الجداول (تُطبَّق تلقائياً عند أول تشغيل)
data/                مجلد قاعدة البيانات (يُنشأ الملف cmchub.db تلقائياً)
.env.example         قالب الإعدادات ← انسخه إلى .env وعبّئه
ecosystem.config.js  ملف PM2 (للخوادم الخاصة)
README-DEPLOY.md     هذا الدليل
```

## المتطلبات / Requirements

- Node.js **20 أو أحدث** (موصى به 22) على Linux x64.
- نطاق cmchub.net موجّه إلى الخادم، وشهادة HTTPS (Let's Encrypt).
- 512 MB ذاكرة كحد أدنى.

> الاستضافة المشتركة القديمة التي كانت تشغّل PHP فقط لا تكفي؛ يلزم استضافة تدعم Node.js
> (cPanel مع "Setup Node.js App"، أو VPS، أو منصة مثل Railway/Render/Vercel).

## الخيار 1: استضافة cPanel تدعم Node.js (الأقرب للاستضافة القديمة)

1. ارفع الحزمة (ملف `.tar.gz`) إلى مجلد خارج `public_html`، مثلاً `~/cmchub-app`، وفك ضغطه من File Manager.
2. انسخ `.env.example` إلى `.env` وعبّئ `SESSION_SECRET` و`ADMIN_PASSWORD` و`NEXT_PUBLIC_SITE_URL=https://cmchub.net`.
3. من cPanel افتح **Setup Node.js App** ← Create Application:
   - Node.js version: 20 أو 22
   - Application mode: Production
   - Application root: `cmchub-app` (المجلد الذي يحتوي `server.js`)
   - Application URL: cmchub.net
   - Application startup file: `server.js`
4. في قسم **Environment variables** أضف نفس قيم `.env` (بعض الاستضافات لا تقرأ ملف `.env` تلقائياً).
5. اضغط **Create** ثم **Start App**. افتح https://cmchub.net ثم https://cmchub.net/ar/admin وسجّل الدخول ببريد المشرف.
6. غيّر كلمة مرور المشرف من `.env` بعد أول دخول (يتم إنشاء الحساب مرة واحدة فقط عند أول تشغيل).

## الخيار 2: خادم خاص (VPS) مع PM2 و Nginx

```bash
sudo mkdir -p /var/www/cmchub && sudo tar -xzf cmchub-net-*.tar.gz -C /var/www/cmchub --strip-components=1
cd /var/www/cmchub && cp .env.example .env && nano .env        # عبّئ القيم
npm install -g pm2
pm2 start ecosystem.config.js && pm2 save && pm2 startup       # تشغيل دائم مع إعادة التشغيل
sudo cp nginx.conf.example /etc/nginx/sites-available/cmchub.net   # عدّل المسارات ثم:
sudo ln -s /etc/nginx/sites-available/cmchub.net /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d cmchub.net -d www.cmchub.net
```

## الخيار 3: Docker

```bash
cp deploy/.env.production.example .env && nano .env
docker compose -f deploy/docker-compose.yml up -d --build
```
قاعدة البيانات تُحفظ في الحجم `cmchub-data`.

## الخيار 4: Vercel أو Railway أو Render

ادفع المستودع إلى GitHub واربطه بالمنصة. لأن هذه المنصات لا تحفظ الملفات بين النشرات، استخدم قاعدة بيانات
مُدارة (Turso): `DATABASE_URL=libsql://...` و`DATABASE_AUTH_TOKEN=...`. أضف `SESSION_SECRET` وبيانات المشرف.

## بعد الرفع / After going live

- [ ] سجّل الدخول وغيّر كلمة مرور المشرف.
- [ ] أنشئ المؤتمر الأول من لوحة التحكم (أو شغّل `npm run db:seed` محلياً لبيانات تجريبية ثم انسخ `data/cmchub.db`).
- [ ] فعّل نسخاً احتياطية يومية لمجلد `data/` (ملف واحد).
- [ ] تأكد أن HTTPS يعمل، فملف تعريف الجلسة يُرسل بخاصية Secure في الإنتاج.
- [ ] للتحديثات اللاحقة: ابنِ حزمة جديدة بـ `npm run package` وارفعها مع الاحتفاظ بمجلد `data/` و`.env`.

## استكشاف الأخطاء / Troubleshooting

| العرض | السبب والحل |
| --- | --- |
| `Cannot find module '@libsql/linux-x64-gnu'` | الخادم ليس Linux x64 glibc (مثلاً Alpine). استخدم Docker image المرفقة أو شغّل `npm ci` على الخادم. |
| الصفحة تفتح لكن الدخول يفشل دائماً | `SESSION_SECRET` فارغ أو تغيّر، أو الموقع يعمل على HTTP بينما NODE_ENV=production. |
| `SQLITE_CANTOPEN` | مجلد `data/` غير قابل للكتابة. امنح صلاحية الكتابة لمستخدم التطبيق. |
| الصور الخارجية لا تظهر | روابط الصور في النماذج يجب أن تكون https كاملة. |
