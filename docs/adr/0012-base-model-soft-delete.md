# ADR-0012: BaseModel، Soft Delete و Custom Manager/QuerySet

**وضعیت:** پذیرفته‌شده

## زمینه

طبق درخواست فاز ۲، هر مدل دامنه باید از یک `BaseModel` مشترک با `created_at`، `updated_at`، `is_active` و قابلیت soft delete ارث‌بری کند، به‌علاوهٔ یک Custom Manager/QuerySet اختصاصی. هدف: جلوگیری از حذف فیزیکی داده‌های کسب‌وکاری حساس (لیدها، سفارش‌ها، محتوای منتشرشده) و فراهم‌کردن مسیر بازیابی (`restore`) و ممیزی.

## گزینه‌ها

1. **Soft delete به‌صورت پیش‌فرض، با امکان hard delete صریح:** `delete()` پیش‌فرض رکورد را غیرفعال می‌کند (`is_active=False`, `deleted_at=now()`)؛ فراخوانی `delete(hard=True)` حذف واقعی انجام می‌دهد. Manager پیش‌فرض فقط رکوردهای حذف‌نشده را برمی‌گرداند؛ یک `all_objects` manager جداگانه همه را شامل می‌شود.
2. **فقط پرچم `is_active` بدون فیلد `deleted_at` و بدون override متد `delete`:** ساده‌تر، اما تمایز «غیرفعال توسط کاربر» و «حذف‌شده توسط سیستم» گم می‌شود و بازیابی دقیق زمان حذف ممکن نیست.
3. **بستهٔ آماده (`django-safedelete` یا مشابه):** وابستگی خارجی اضافه برای قابلیتی که پیاده‌سازی آن کوچک و کاملاً قابل کنترل داخلی است.

## تصمیم

**گزینهٔ ۱**، پیاده‌سازی داخلی و سبک در `apps/core/models.py`:

- `BaseQuerySet(models.QuerySet)`: متدهای `active()`, `deleted()`, و override `delete()` (soft به‌صورت پیش‌فرض در سطح queryset) + `hard_delete()` صریح برای حذف واقعی گروهی.
- `BaseManager(models.Manager)` از `BaseQuerySet` استفاده می‌کند و `get_queryset()` را به `deleted_at__isnull=True` محدود می‌کند؛ این manager به‌عنوان `objects` پیش‌فرض ثبت می‌شود.
- `AllObjectsManager(models.Manager)`: بدون فیلتر، به‌عنوان `all_objects` ثبت می‌شود (برای ادمین/حسابرسی/بازیابی).
- `BaseModel(models.Model)` (abstract): فیلدهای `created_at` (`auto_now_add`)، `updated_at` (`auto_now`)، `is_active` (`default=True`)، `deleted_at` (`null=True, blank=True`)؛ متدهای نمونه `delete(hard=False)` و `restore()`.
- `TimeStampedModel`: نسخهٔ سبک‌تر بدون soft-delete برای مدل‌هایی که اصلاً نباید قابل حذف باشند (مثل خود `AuditLog`، که به دلایل حسابرسی نباید به‌سادگی soft-delete شود — در عمل `AuditLog` از `BaseModel` ارث‌بری می‌کند تا رفتار یکسانی برای تست‌ها فراهم شود، ولی در لایهٔ دسترسی production قرار است حذف آن محدود به superuser بماند، طبق `apps/core/admin.py`).

## دلیل

- پیاده‌سازی کوچک (کمتر از ۱۰۰ خط) و کاملاً قابل تست، بدون وابستگی بیرونی جدید (قانون ۶).
- تفکیک صریح `objects` (نمای عادی اپلیکیشن) از `all_objects` (نمای کامل برای ادمین/گزارش/بازیابی) از حذف تصادفی داده در کوئری‌های routine جلوگیری می‌کند.
- override کردن `delete()` هم در سطح نمونه و هم در سطح `QuerySet` تضمین می‌کند که `Model.objects.filter(...).delete()` (حذف گروهی) هم به‌طور پیش‌فرض soft باشد — نقطه‌ای که در بسیاری پیاده‌سازی‌های ساده‌تر فراموش می‌شود.

## پیامدها

- هر مدل دامنهٔ جدید در فازهای بعد (لید، محتوا، سفارش) باید از `BaseModel` ارث‌بری کند مگر دلیل صریح خلاف آن مستند شود.
- کوئری‌هایی که عمداً باید رکوردهای حذف‌شده را ببینند (گزارش‌های ادمین، بازیابی) باید آگاهانه از `Model.all_objects` استفاده کنند؛ این نکته باید در بخش «قراردادهای کدنویسی» مستندات توسعه ذکر شود.
- تست‌های واحد (`apps/core/tests/test_models.py`) این رفتار را روی `AuditLog` به‌عنوان نمونهٔ زندهٔ `BaseModel` پوشش می‌دهند (soft delete پیش‌فرض، `restore()`، `delete(hard=True)`، و معادل‌های سطح queryset).
