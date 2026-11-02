# ADR-0010: مدیریت وابستگی‌ها و محیط اجرای بک‌اند

**وضعیت:** پذیرفته‌شده

## زمینه

بک‌اند باید روی یک هاست اشتراکی cPanel ایرانی با ویژگی «Setup Python App» مستقر شود. ابزار مدیریت وابستگی باید با این محیط سازگار باشد و قانون ۶ (بدون وابستگی غیرضروری) و قانون ۷ (type-safety) را رعایت کند.

## گزینه‌ها

1. **Poetry / PDM:** مدیریت وابستگی مدرن با lock file دقیق، ولی نیاز به نصب خود ابزار روی هاست یا مرحلهٔ build جداگانه؛ بسیاری از پنل‌های «Setup Python App» در cPanel به‌طور پیش‌فرض فقط `pip install -r requirements.txt` را انتظار دارند.
2. **`requirements.txt` + `requirements-dev.txt` ساده (با نسخه‌های pin‌شده) + `pip-tools` برای تولید lock از یک `requirements.in`:** سازگاری کامل با رایج‌ترین گردش‌کار cPanel Python App، بدون ابزار اضافه در زمان دیپلوی.

## تصمیم

**گزینهٔ ۲.** دو فایل:
- `requirements.txt`: وابستگی‌های production (Django, djangorestframework, drf-spectacular, django-modeltranslation, django-environ, django-ratelimit, jdatetime, mysqlclient, Pillow, ...)
- `requirements-dev.txt`: اضافه بر فایل بالا — `pytest`, `pytest-django`, `mypy`, `django-stubs`, `ruff`/`black`, `factory-boy`, `coverage`.

نسخه‌ها Pin می‌شوند (`==`) برای بازتولیدپذیری دقیق محیط production روی هاست.

## دلیل

- کمترین اصطکاک با محیط واقعی دیپلوی (اکثر مستندات «Setup Python App» در cPanel مستقیماً `requirements.txt` را پشتیبانی می‌کنند).
- بدون نیاز به نصب ابزار مدیریت بستهٔ اضافه روی هاست (که ممکن است دسترسی محدود/عدم امکان نصب سراسری داشته باشد).
- Pin دقیق نسخه‌ها از «کار می‌کند روی ماشین من، خراب می‌شود روی هاست» جلوگیری می‌کند — مهم‌تر در هاست اشتراکی که دسترسی محدود به shell/دیباگ دارد.

## نسخهٔ Python و Django

- **Python:** 3.11 یا 3.12 (آخرین نسخهٔ پایدار پشتیبانی‌شده توسط اکثر کنترل‌پنل‌های cPanel «Setup Python App»)؛ نسخهٔ دقیق در فاز Implementation پس از تأیید در دسترس‌بودن روی هاست مشخص می‌شود.
- **Django:** آخرین نسخهٔ LTS در دسترس در زمان شروع Implementation، با پشتیبانی رسمی از MySQL 8 و SQLite.

## type-safety (قانون ۷)

`mypy --strict` به همراه `django-stubs` در `requirements-dev.txt` و در CI (فاز بعدی) اجرا می‌شود؛ تنظیمات دقیق (`mypy.ini`/`pyproject.toml`) در فاز Implementation همراه با اسکلت پروژه نوشته می‌شود، نه در این فاز مستندسازی.

## پیامدها

- هر افزودن وابستگی جدید در طول پروژه باید در PR مربوطه یک جملهٔ توجیهی کوتاه داشته باشد (طبق قانون ۶) و در `CHANGELOG.md` ثبت شود (قانون ۲۰).
- به‌روزرسانی امنیتی وابستگی‌ها (مشابه مشکلات `npm audit` که در فرانت اولیه دیده شد) باید به‌صورت دوره‌ای با `pip-audit` یا معادل در CI بررسی شود.
