# ADR-0014: لایهٔ DRF — Pagination، Exception Handling، Throttling و OpenAPI

**وضعیت:** پذیرفته‌شده

## زمینه

قانون ۸ («OpenAPI خودکار») و درخواست صریح فاز ۲ ایجاب می‌کند تمام رفتارهای عمومی DRF (صفحه‌بندی، خطاها، محدودیت نرخ درخواست، مستندسازی) از همان ابتدا به‌صورت یکپارچه و متمرکز تعریف شوند، نه به‌صورت پراکنده در هر View.

## گزینه‌ها (مستندسازی API)

1. **`drf-spectacular`:** تولید خودکار schema OpenAPI 3 از کد (type hints + serializers)، به‌همراه UI آماده (Swagger UI, ReDoc).
2. `drf-yasg`: قدیمی‌تر، پشتیبانی رسمی کمتر از OpenAPI 3.1 و Django/DRF نسخه‌های جدید.
3. مستندسازی دستی (Markdown جدا از کد) — همیشه با کد واقعی ناهم‌خوان می‌شود.

## تصمیم و پیاده‌سازی

- **مستندسازی:** گزینهٔ ۱ (`drf-spectacular`). مسیرهای `/api/v1/schema/`، `/api/v1/schema/swagger-ui/`، `/api/v1/schema/redoc/` در `apps/api/urls.py` ثبت شده‌اند؛ تنظیمات عنوان/نسخه/توضیح در `SPECTACULAR_SETTINGS` داخل `config/settings/base.py`.
- **Pagination:** `apps/core/pagination.py` → `StandardResultsSetPagination(PageNumberPagination)` با envelope یکنواخت:
  ```json
  {"count": 0, "total_pages": 0, "current_page": 1, "next": null, "previous": null, "results": []}
  ```
  `page_size=20` پیش‌فرض، `max_page_size=100`، قابل‌override با پارامتر Query `page_size`. این به‌عنوان `DEFAULT_PAGINATION_CLASS` سراسری در `REST_FRAMEWORK` ثبت شده تا همهٔ ViewSetهای فازهای بعد به‌طور خودکار همین envelope را داشته باشند.
- **Exception Handling:** `apps/core/exceptions.py` → `custom_exception_handler`، با نگاشت `_ERROR_CODE_MAP` از انواع استثنای DRF/Django (`ValidationError`, `AuthenticationFailed`, `NotAuthenticated`, `PermissionDenied`, `NotFound`, `Http404`, `MethodNotAllowed`, `Throttled`) به کدهای رشته‌ای پایدار، و envelope یکنواخت:
  ```json
  {"error": {"code": "validation_error", "message": "...", "details": {...}}}
  ```
  خطاهای ۵۰۰ پیش‌بینی‌نشده با `log.error(..., exc_info=True)` ثبت می‌شوند؛ بقیه با `log.warning`. این به‌عنوان `EXCEPTION_HANDLER` سراسری در `REST_FRAMEWORK` ثبت شده است.
- **Throttling:** `apps/core/throttling.py` سه کلاس `ScopedRateThrottle` آماده برای فازهای بعد تعریف می‌کند: `ContactFormRateThrottle` (scope=`contact_form`)، `AIEngineRateThrottle` (scope=`ai_engine`)، `AuthRateThrottle` (scope=`auth`). نرخ‌های واقعی در `DEFAULT_THROTTLE_RATES` (قابل override با متغیر محیطی `THROTTLE_RATE_*`) تعریف می‌شوند، نه هاردکد در کلاس‌ها — تا بدون تغییر کد قابل تنظیم در production باشند.

## دلیل

- متمرکزکردن این چهار رفتار در `apps/core` از تکرار منطق مشابه در هر اپ دامنه (leads, content, ai-engine در فازهای بعد) جلوگیری می‌کند و تضمین می‌کند مصرف‌کنندگان API (فرانت‌اند React) با یک قرارداد واحد خطا/صفحه‌بندی در کل سطح API مواجه شوند.
- `drf-spectacular` با type hints پروژه (که به‌خاطر قانون ۷ از قبل اجباری هستند) هم‌افزایی مستقیم دارد: هرچه serializer/view typed‌تر باشد، schema خودکار دقیق‌تر تولید می‌شود — یک دلیل اضافی برای سخت‌گیری mypy.
- Throttle scope جدا برای فرم تماس، موتور AI، و auth به این دلیل انتخاب شد که این سه نقطه محتمل‌ترین اهداف سوءاستفاده/اسپم در این پروژه هستند (فرم‌های عمومی بدون login، و endpointهای پرهزینهٔ محاسباتی AI).

## پیامدها

- `HealthCheckView` (`apps/core/views.py`) عمداً از `AuthRateThrottle`/throttle دیگر معاف است (نیاز مانیتورینگ خارجی مکرر) و `authentication_classes=[]` دارد تا از بررسی session/CSRF روی هر پینگ مانیتورینگ صرف‌نظر شود؛ بررسی سلامت شامل `SELECT 1` روی دیتابیس و یک نوشتن/خواندن کش است، با پاسخ ۲۰۰ (`"ok"`) یا ۵۰۳ (`"degraded"`).
- هر View/ViewSet جدید در فازهای بعد باید به‌طور پیش‌فرض از تنظیمات سراسری استفاده کند و فقط در صورت نیاز واقعی override شود (مثلاً throttle سخت‌گیرتر برای یک endpoint خاص)، نه برعکس.
