# ADR-0011: Custom User Model و مکانیزم احراز هویت API

**وضعیت:** پذیرفته‌شده (نهایی‌کنندهٔ بحث بازِ ADR-0007 دربارهٔ مکانیزم auth)

## زمینه

Django به‌شدت توصیه می‌کند Custom User Model از روز اول پروژه تعریف شود، چون جایگزینی مدل کاربر پیش‌فرض (`django.contrib.auth.models.User`) بعد از اولین `migrate` عملاً غیرممکن است بدون migration دستی پرخطر. پروژه از ابتدا به فیلدهای اضافه (نقش کاربری، شماره تلفن برای OTP آینده با کاوه‌نگار، شناسهٔ عمومی غیرقابل‌حدس) نیاز دارد. هم‌زمان باید مکانیزم احراز هویت API بین Session+CSRF و JWT انتخاب شود (بحث باز در ADR-0007).

## گزینه‌ها (User Model)

1. استفاده از `AbstractUser` با `username=None` و `USERNAME_FIELD="email"`.
2. استفاده از `AbstractBaseUser` + `PermissionsMixin` از صفر (کنترل کامل، اما باید تمام متدهای کمکی Django admin/permissions دوباره نوشته شود).

## گزینه‌ها (مکانیزم Auth)

1. **Session + CSRF استاندارد Django:** بدون وابستگی جدید، سازگار کامل با Django Admin، ساده‌ترین مسیر برای فرانت‌اند هم‌دامنه/زیردامنهٔ همان سایت.
2. **JWT (`djangorestframework-simplejwt`):** مناسب برای کلاینت‌های موبایل/SPA کاملاً جدا از دامنهٔ بک‌اند، اما وابستگی اضافه و پیچیدگی مدیریت refresh token را وارد می‌کند.
3. هر دو هم‌زمان.

## تصمیم

- **User Model:** گزینهٔ ۱ — ارث‌بری از `AbstractUser` با غیرفعال‌کردن `username` و تبدیل `email` به `USERNAME_FIELD`. دلیل: کمترین کد تکراری، سازگاری کامل با `django.contrib.auth` (groups، permissions، Django Admin) بدون بازنویسی.
- **Auth:** **گزینهٔ ۱ — Session + CSRF استاندارد Django.** این مسیر ADR-0007 را می‌بندد.

## دلیل

- فرانت‌اند و بک‌اند این پروژه هم‌دامنه/زیردامنهٔ یک سازمان هستند (نه اپلیکیشن موبایل مستقل)؛ نیازی به stateless token واقعی نیست.
- قانون ۶ («بدون وابستگی غیرضروری»): Session+CSRF هیچ پکیج جدیدی اضافه نمی‌کند؛ JWT نیازمند `djangorestframework-simplejwt` و مدیریت چرخهٔ عمر token (blacklist, refresh rotation) است که برای این مقیاس توجیه ندارد.
- Django Admin که از همان ابتدا برای مدیریت AuditLog/کاربران استفاده می‌شود، به‌صورت بومی روی Session کار می‌کند؛ دوگانگی auth (Session برای admin، JWT برای API) پیچیدگی غیرضروری ایجاد می‌کرد.

## فیلدهای کلیدی User

- `email` (unique, `USERNAME_FIELD`)
- `role` (`TextChoices`: admin/editor/student/client) — پایهٔ RBAC سادهٔ فازهای بعد
- `phone`, `is_phone_verified` — آمادهٔ OTP پیامکی کاوه‌نگار در فاز بعد
- `public_id` (UUID، `unique`, `editable=False`) — شناسهٔ غیرقابل‌حدس برای افشا در API/URL به‌جای `pk` عددی ترتیبی

`UserManager` سفارشی (`create_user`/`create_superuser`/`_create_user`) ایمیل را نرمال‌سازی می‌کند و بدون `username` کار می‌کند.

## پیامدها

- Middleware احراز هویت DRF پیش‌فرض باید روی `SessionAuthentication` تنظیم شود و `CSRF_COOKIE_*`/`SESSION_COOKIE_*` در تنظیمات production سخت‌گیرانه (Secure, HttpOnly, SameSite) تنظیم شوند (قانون ۱۶).
- فرانت‌اند React باید توکن CSRF را از کوکی بخواند و در هدر `X-CSRFToken` ارسال کند؛ این نکته باید در مستندات یکپارچه‌سازی فرانت-بک‌اند (فاز بعدی ادغام) مستند شود.
- اگر در آینده نیاز به اپ موبایل/کلاینت کاملاً مستقل پیش بیاید، این ADR باید با یک ADR جدید (نه ویرایش این فایل) بازنگری شود.
