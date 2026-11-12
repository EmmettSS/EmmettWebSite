# فاز ۰ — خط مبنا و روش راستی‌آزمایی

تاریخ: ۲۰۲۶-۱۱-۱۲
مخزن: `EmmettSS/EmmettWebSite`
شاخهٔ کاری جاری: `arena/4839b949-emmettwebsite`
کامیت پایه: `f8c0fa03e6cb01eee1b79beb229f6601a33fb7d9`
برچسب خط مبنا: `phase0-baseline-20261112`

## ۱. دامنهٔ فاز ۰

این فاز فقط کشف، ممیزی و راستی‌آزمایی خط مبنا است. هیچ تغییر اپلیکیشنی، migration، تغییر تنظیمات محصول، حذف وابستگی یا بازنویسی انجام نشده است. خروجی‌ها سند تصمیم و معیار پذیرش فازهای بعد هستند.

هفت خروجی این پوشه:

1. `01-baseline.fa.md` — خط مبنا، محیط و روش
2. `02-architecture.fa.md` — نقشهٔ معماری بک‌اند/فرانت‌اند/استقرار
3. `03-feature-parity.fa.md` — ماتریس parity فیچرها
4. `04-api-inventory.fa.md` — فهرست قرارداد API و مصرف‌کننده‌ها
5. `05-admin-jazzmin.fa.md` — ممیزی Admin و مسیر حذف Jazzmin
6. `06-ai-audit.fa.md` — ممیزی موتور هوش مصنوعی
7. `07-verification-scope.fa.md` — نتایج اجرا، نقص‌ها، scope و معیار پذیرش

## ۲. محیط اجرای محلی

| مؤلفه | مقدار مشاهده‌شده |
|---|---|
| Python | 3.11.2 |
| Node.js | 22.22.3 |
| Django | 5.2.17 |
| DRF | 3.18.1 |
| Next.js | 16.4.3 |
| React | 19.2.8 |
| Playwright | 1.63 |
| Chromium آزمایشی | 153.0.8010.0 |
| دیتابیس محلی | SQLite seed/demo |
| دیتابیس هدف | MySQL 8 — در سندباکس موجود نیست |

محیط تست محلی شامل `INTERNAL_API_TOKEN` مشترک، `FRONTEND_REVALIDATE_SECRET`، نرخ‌های throttle ایزوله و `DJANGO_CSRF_TRUSTED_ORIGINS` برای پراکسی هم‌مبدأ بود. فایل env خارج از مخزن نگه داشته شد و وارد Git نشده است.

## ۳. روش راستی‌آزمایی

- `git fetch` و بررسی شاخه/کامیت پایه پیش از هر اقدام.
- نصب وابستگی‌ها با `pip install -r requirements-dev.txt` و `npm ci`.
- اجرای واقعی تست‌ها، lint، typecheck، build، E2E، Lighthouse، secret scan، Bandit و deploy checks.
- بیلد production فرانت‌اند با بک‌اند زنده و توکن داخلی انجام شد تا prerenderها دادهٔ واقعی داشته باشند.
- اسکرین‌شات‌های مرورگری در عرض‌های ۳۲۰، ۳۹۰، ۷۶۸، ۱۰۲۴، ۱۴۴۰ و ۱۹۲۰ برای صفحهٔ اصلی فارسی گرفته شد.
- برای ممیزی ادمین، رمز کاربر demo محلی به‌صورت موقت reset شد؛ پس از ثبت تصویرها دوباره به حالت unusable برگردانده شد. هیچ credentialی در مخزن ذخیره نشده است.
- سرورهای محلی پس از پایان راستی‌آزمایی متوقف شدند.

## ۴. محدودیت‌های محیط

| مورد | وضعیت |
|---|---|
| MySQL 8 | NOT EXECUTED — سرویس MySQL در سندباکس موجود نیست |
| cPanel/Passenger واقعی | BLOCKED — دسترسی هاست مقصد موجود نیست |
| دیپلوی production | NOT EXECUTED — اجازهٔ دیپلوی داده نشده است |
| preflight محلی cPanel | FAILED — فقط به‌دلیل نبود artefactهای مخصوص هاست |
| تست‌های محلی | PASSED — معادل production واقعی نیستند |

شکست‌های preflight محلی مربوط به نبود `passenger_wsgi.py`، `frontend/server.js`، `backups/`، `.cache/django-cache`، `backend/tmp` و `frontend/tmp` است؛ این فایل‌ها/پوشه‌ها توسط اسکریپت‌های استقرار روی هاست ساخته می‌شوند و نقص محصول محسوب نمی‌شوند.

## ۵. قیدهای دائمی

- حفظ Django 5.2/DRF/Python 3.11/MySQL 8 و Next.js 16/React/TS/Tailwind/next-intl.
- حذف کامل Jazzmin و جایگزینی با Admin بومی Emmett، بدون حذف django-otp، import-export، modeltranslation، caching یا auditing.
- حفظ داده‌ها، migrationهای اعمال‌شده، URLها و سازگاری API تا حد ممکن.
- بدون secret هاردکد، mock به‌جای production، فیچر جعلی، تضعیف امنیت یا بازنویسی غیرضروری.
- fa-RTL و en-LTR؛ هویت بصری Emmett حفظ شود.
- cPanel + Passenger + SSR + پراکسی هم‌مبدأ؛ بدون Docker/Redis/Celery/root/worker دائمی/CDN حیاتی.
- هیچ تغییر برگشت‌ناپذیر یا عملیات مخرب بدون تأیید صریح و برنامهٔ بازیابی انجام نشود.
