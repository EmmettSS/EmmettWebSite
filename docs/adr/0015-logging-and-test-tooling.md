# ADR-0015: لاگ ساختاریافته (structlog) و ابزار تست/type-checking

**وضعیت:** پذیرفته‌شده

## زمینه

قانون ۷ (mypy strict) و درخواست صریح فاز ۲ («لاگ ساختاریافته» + «تست‌های پایه با pytest-django و factory-boy») نیازمند انتخاب و پیکربندی مشخص ابزارهای لاگینگ، تست، و type-checking است که در کل پروژه یکسان اعمال شوند.

## بخش ۱: لاگ ساختاریافته

### گزینه‌ها

1. **`structlog` + `django-structlog`:** لاگ JSON در production (قابل مصرف توسط هر ابزار agregation لاگ)، رندر خوانا (`ConsoleRenderer`) در dev، و middleware آماده برای تزریق خودکار `request_id` به هر لاگ یک درخواست.
2. `logging` استاندارد پایتون با `python-json-logger`: سبک‌تر، اما بدون context-binding خودکار (باید هر لاگ دستی `request_id` را پاس بدهد).

### تصمیم

گزینهٔ ۱. `apps/core/logging.py` تابع `configure_structlog(debug: bool)` را فراهم می‌کند که مستقیماً از پایین `config/settings/base.py` (بعد از تعریف `DEBUG`) فراخوانی می‌شود: رندرر `ConsoleRenderer` وقتی `DEBUG=True`، `JSONRenderer` در غیر این صورت. `django_structlog.middlewares.RequestMiddleware` در `MIDDLEWARE` اضافه شده تا هر لاگ به‌طور خودکار `request_id` داشته باشد (کلید برای پیگیری یک درخواست در میان چندین خط لاگ). `get_logger(name)` یک wrapper تایپ‌شده دور `structlog.get_logger` است که برای رعایت mypy strict، خروجی را به `structlog.stdlib.BoundLogger` کست می‌کند.

### دلیل

لاگ JSON ساختاریافته برای هاست اشتراکی cPanel که معمولاً دسترسی به ابزار APM کامل ندارد، حداقل امکان `grep`/parse ساده‌تر فایل لاگ را با کلیدهای یکسان (`event`, `request_id`, `level`, `timestamp`) فراهم می‌کند؛ `django-structlog` با چند خط تنظیمات، context خودکار درخواست را بدون نیاز به پاس‌دادن دستی در هر لایه فراهم می‌کند.

## بخش ۲: تست

### تصمیم

- **`pytest` + `pytest-django`**: فایل پیکربندی `backend/pytest.ini` با `DJANGO_SETTINGS_MODULE=config.settings.dev`، `--reuse-db --nomigrations` برای سرعت اجرا در توسعه/CI (migration واقعی هنوز در `python manage.py migrate` جداگانه تأیید می‌شود، طبق خروجی این فاز).
- **`factory-boy`**: `apps/accounts/tests/factories.py` → `UserFactory(DjangoModelFactory[User])` با `django_get_or_create=("email",)` و `skip_postgeneration_save=True`. تولید ایمیل با `Sequence` برای یکتایی تضمین‌شده بین تست‌ها.
- **`coverage`** (نه `pytest-cov`) برای گزارش پوشش، چون `requirements-dev.txt` از ابتدا `coverage` را انتخاب کرده بود؛ اجرا با `coverage run -m pytest && coverage report -m`.
- پوشش فعلی تست‌های پایهٔ این فاز (`apps/core`, `apps/accounts`): **۹۶٪** (۲۸ تست: مدل‌های User/AuditLog/BaseModel، health-check شامل مسیرهای degraded، exception handler، pagination، throttle scopes).

## بخش ۳: mypy strict

### تصمیم و نکات پیاده‌سازی

`backend/pyproject.toml` → `[tool.mypy]` با `strict = true`، پلاگین `mypy_django_plugin.main`، و `[tool.django-stubs] django_settings_module = "config.settings.dev"`. سه override محدود و مستند:

1. `*.migrations.*` → `ignore_errors = true` (کد تولیدشدهٔ خودکار Django، بررسی آن ارزش عملی ندارد).
2. `environ.*` → `ignore_missing_imports = true` (`django-environ` فاقد stub رسمی است).
3. `*.tests.*` → `disallow_untyped_decorators = false`, `disallow_untyped_calls = false`, `warn_return_any = false` — **محدودهٔ این شُل‌شدن صرفاً فایل‌های تست است، نه کد اپلیکیشن**؛ علت صرفاً فنی است: متاکلاس پویای `factory_boy` (`FactoryMetaClass.__call__`) در زمان اجرا نمونهٔ مدل واقعی برمی‌گرداند اما در تحلیل استاتیک mypy نمونه‌ای از خود کلاس Factory تلقی می‌شود؛ در نقاطی که این ابهام به خطای واقعی type-arg/attr-defined منجر می‌شد (نه صرفاً به یک هشدار بی‌اثر)، از `cast(User, UserFactory())` با کامنت توضیحی استفاده شده است به‌جای خاموش‌کردن کور کل فایل.

وضعیت نهایی تأییدشده: `mypy apps config` → **«Success: no issues found in 36 source files»** روی کد نوشته‌شدهٔ این فاز.

## بخش ۴: Lint

`ruff` با `pyproject.toml` → `line-length=110`, قوانین `E, F, I, B, UP, DJ` (با `DJ001` نادیده‌گرفته‌شده چون نگاه سخت‌گیرانهٔ آن به `null=True` روی `CharField` با تصمیم آگاهانهٔ پروژه برای برخی فیلدهای اختیاری فارسی در تضاد است). وضعیت نهایی: `ruff check .` → **«All checks passed!»**.

## پیامدها

- هر PR فازهای بعد باید قبل از merge هر سه دستور (`pytest`/`coverage`، `mypy apps config`، `ruff check .`) را سبز نگه دارد؛ این سه دستور کاندید اصلی یک workflow CI آیندهٔ GitHub Actions هستند (خارج از scope این فاز، اما باید در فاز DevOps/CI به آن ارجاع داده شود).
- override شُل‌شدهٔ mypy برای تست‌ها باید در هر بازبینی کد جدید دوباره بررسی شود تا به کد اپلیکیشن واقعی نشت نکند (محدودهٔ آن فقط `*.tests.*` است).
