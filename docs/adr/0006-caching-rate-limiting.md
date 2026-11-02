# ADR-0006: استراتژی Cache و Rate Limiting بدون Redis

**وضعیت:** پذیرفته‌شده

## زمینه

قانون ۱۵ کش در موارد لازم را الزامی کرده، و قانون ۱۶ Rate Limit را جزو الزامات امنیتی آورده. طبق `DISCOVERY.md`، فرض محافظه‌کارانهٔ در دسترس‌نبودن Redis/Memcached/Celery روی هاست اشتراکی پذیرفته شده است.

## گزینه‌ها برای Cache

1. **`LocMemCache` (پیش‌فرض Django):** بدون هیچ سرویس اضافه، ولی per-process است — روی Passenger که ممکن است چند worker process اجرا کند، کش بین پردازه‌ها همگام نمی‌شود (مشکل invalidation ناقص، مصرف حافظهٔ تکراری).
2. **`FileBasedCache`:** فایل‌های کش روی دیسک مشترک بین همهٔ پردازه‌ها؛ بدون سرویس جانبی؛ کمی کندتر از Redis ولی برای حجم ترافیک یک سایت ویترین کاملاً کافی.
3. **Redis:** سریع‌ترین و استانداردترین، ولی نیاز به سرویس جداگانه که در دسترس‌بودنش روی هاست هدف فعلاً تأیید نشده.

## تصمیم

- **Production:** `FileBasedCache` به‌عنوان پیش‌فرض.
- **Development:** `LocMemCache` (یک پردازه، مشکلی ندارد).
- پیکربندی کامل از طریق متغیر محیطی `CACHE_BACKEND` در `.env` خوانده می‌شود (نه hard-code در settings)، تا در صورت فراهم‌شدن Redis در آینده، فقط با تغییر این متغیر (و افزودن `django-redis` در آن مقطع) سوییچ انجام شود، بدون تغییر کد اپلیکیشن.

## گزینه‌ها برای Rate Limiting

1. **پیاده‌سازی دستی میان‌افزار با شمارش در دیتابیس:** کنترل کامل ولی هزینهٔ توسعه/نگهداری بالا و دوباره‌کاری چیزی که کتابخانهٔ بالغ حل کرده.
2. **`django-ratelimit`:** کتابخانهٔ سبک، مبتنی بر همان cache backend تنظیم‌شده در پروژه (نیاز به Redis ندارد)، با decorator ساده روی view/endpoint.

## تصمیم (Rate Limiting)

**`django-ratelimit`**، با محدودیت‌های متفاوت به ازای حساسیت endpoint:

| Endpoint | محدودیت پیشنهادی |
|---|---|
| ثبت فرم تماس (`leads.Contact`) | ۵ درخواست / ساعت / IP |
| ثبت‌نام و ورود (`accounts`) | ۱۰ تلاش / ۱۵ دقیقه / IP |
| تمام endpointهای `ai_engine` | ۲۰ درخواست / ساعت / کاربر یا IP (گران‌تر از نظر هزینهٔ فراخوانی مدل) |
| عضویت خبرنامه | ۳ درخواست / روز / IP |

## دلیل

- هر دو ابزار (`FileBasedCache`, `django-ratelimit`) بدون نیاز به سرویس جانبی کار می‌کنند و مستقیماً با فرض هاست اشتراکی سازگارند.
- `django-ratelimit` کتابخانه‌ای کوچک، فعال‌نگهداری‌شده و دقیقاً پاسخ‌گوی یک نیاز امنیتی صریح است — توجیه افزودن وابستگی طبق قانون ۶.
- جدا نگه‌داشتن انتخاب backend از طریق env، امکان ارتقا بدون بدهی فنی را فراهم می‌کند.

## پیامدها

- کارایی `FileBasedCache` به I/O دیسک هاست وابسته است؛ در صورت مشاهدهٔ کندی در Performance Testing (فاز بعدی)، باید دوباره گزینهٔ Redis/مدیریت هاست بهتر بررسی شود.
- چون Celery در دسترس نیست، هر فرایند async (مثل ارسال پیامک Kavenegar، فراخوانی AI) باید به‌صورت synchronous با timeout کوتاه یا از طریق یک صف سادهٔ دیتابیسی + management command دوره‌ای (cron) طراحی شود؛ جزئیات در فاز Implementation `ai_engine` (فاز ۵، ر.ک. `ADR-0009`) / `leads` مشخص می‌شود.

## به‌روزرسانی (فاز ۴ — انحراف آگاهانه از تصمیم اولیهٔ Rate Limiting)

در زمان Implementation واقعی، به‌جای کتابخانهٔ `django-ratelimit` از کلاس‌های
`rest_framework.throttling.ScopedRateThrottle` بومی DRF استفاده شد
(`apps/core/throttling.py`: `ContactFormRateThrottle`, `AuthRateThrottle`,
`AIEngineRateThrottle`, `NewsletterRateThrottle`). دلیل: پروژه از ابتدا روی
DRF ساخته شده و `DEFAULT_THROTTLE_CLASSES`/`DEFAULT_THROTTLE_RATES` همان
cache backend تنظیم‌شده در این ADR را به‌صورت رایگان استفاده می‌کنند؛ افزودن
`django-ratelimit` به‌عنوان یک کتابخانهٔ دوم و موازی برای همان نیاز، وابستگی
غیرضروری (نقض قانون ۶) بود. وابستگی `django-ratelimit` از `requirements.txt`
حذف شد (هیچ‌وقت import هم نشده بود).

نرخ‌های نهایی پیاده‌سازی‌شده دقیقاً با جدول بالا منطبق‌اند (`contact_form`:
۵/ساعت، `auth`: ۱۰/ساعت — به‌جای ۱۰/۱۵دقیقه، چون `ScopedRateThrottle` واحد
`rate` را به‌صورت `count/period` با periodهای `sec|min|hour|day` می‌پذیرد و
«۱۵ دقیقه» واحد مجزا ندارد؛ ۱۰/ساعت محافظه‌کارانه‌تر انتخاب شد، `ai_engine`:
۲۰/ساعت، `newsletter`: ۳/روز).

**باگ کشف و رفع‌شده (مهم):** در پیاده‌سازی اولیهٔ فاز ۲/۴، زیرکلاس‌های
`ScopedRateThrottle` مقدار `scope` را به‌صورت attribute کلاس ست می‌کردند
(مثلاً `class AuthRateThrottle(ScopedRateThrottle): scope = "auth"`) اما
پیاده‌سازی استاندارد DRF مقدار واقعی scope را در زمان اجرا از
`getattr(view, "throttle_scope", None)` می‌خواند، **نه** از attribute کلاس
throttle. چون هیچ‌کدام از viewها (`LoginView`, `RegisterView`,
`ContactCreateView`, ...) مقدار `throttle_scope` را روی خودشان تنظیم نکرده
بودند، `allow_request` همیشه بدون محدودیت `True` برمی‌گرداند — یعنی
rate limiting روی auth/contact_form/newsletter عملاً **هرگز واقعاً اجرا
نشده بود**، با وجود تست‌های واحدی که فقط `scope` attribute کلاس را بررسی
می‌کردند (نه رفتار واقعی HTTP). در فاز ۴ (بازبینی/سخت‌سازی) این باگ با
override کردن `allow_request` در یک کلاس پایهٔ مشترک
(`_NamedScopedRateThrottle`) رفع و با تست‌های سطح HTTP (نه فقط بررسی
attribute) دوباره اعتبارسنجی شد (`apps/core/tests/test_throttling.py`).
