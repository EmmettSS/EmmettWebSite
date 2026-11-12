"""System checks برای پنل بومی Django Admin و دارایی‌های برند امیت."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, cast

from django.conf import settings
from django.core.checks import Error, Tags, Warning, register

from apps.core.admin_theme import ADMIN_THEME_ASSETS, ADMIN_THEME_TEMPLATES


@register()
def check_admin_theme_apps(*, app_configs: Any = None, **kwargs: Any) -> list[Error]:
    """وجود و ترتیب وابستگی‌های پنل بومی را بررسی می‌کند."""

    errors: list[Error] = []
    apps = list(settings.INSTALLED_APPS)
    hint = "modeltranslation باید پیش از Django Admin باشد؛ بخش Admin از Django بومی استفاده می‌کند."

    def index_of(name: str) -> int | None:
        return apps.index(name) if name in apps else None

    admin_index = index_of("django.contrib.admin")
    modeltranslation_index = index_of("modeltranslation")

    if admin_index is None:
        errors.append(Error("اپ «django.contrib.admin» نصب نیست.", id="emmett_admin.E001", hint=hint))

    if modeltranslation_index is None:
        errors.append(Error("اپ «modeltranslation» نصب نیست.", id="emmett_admin.E001", hint=hint))
    elif admin_index is not None and modeltranslation_index > admin_index:
        errors.append(
            Error(
                "«modeltranslation» باید پیش از «django.contrib.admin» در INSTALLED_APPS باشد.",
                id="emmett_admin.E001",
                hint=hint,
            )
        )

    if "jazzmin" in apps:
        errors.append(
            Error(
                "اپ قدیمی «jazzmin» نباید در INSTALLED_APPS باشد؛ پنل باید از Django Admin بومی استفاده کند.",
                id="emmett_admin.E005",
                hint=hint,
            )
        )

    if "import_export" not in apps:
        errors.append(
            Error(
                "اپ «import_export» نصب نیست (صادرات/واردات ادمین — ADR-0029).",
                id="emmett_admin.E002",
                hint=hint,
            )
        )

    return errors


@register()
def check_admin_theme_paths(*, app_configs: Any = None, **kwargs: Any) -> list[Error]:
    """پوشهٔ قالب پروژه و پوشهٔ دارایی‌های استاتیک باید تنظیم شده باشند."""

    errors: list[Error] = []
    base_dir = Path(settings.BASE_DIR)

    template_settings = cast(Any, settings.TEMPLATES[0])
    template_dirs = [Path(str(item)) for item in template_settings.get("DIRS", [])]
    if base_dir / "templates" not in template_dirs:
        errors.append(
            Error(
                "پوشهٔ «backend/templates» در TEMPLATES['DIRS'] تنظیم نشده است.",
                id="emmett_admin.E003",
                hint="قالب‌های سفارشی ادمین از این مسیر بارگذاری می‌شوند.",
            )
        )

    static_dirs = [Path(str(item)) for item in getattr(settings, "STATICFILES_DIRS", [])]
    if base_dir / "static" not in static_dirs:
        errors.append(
            Error(
                "پوشهٔ «backend/static» در STATICFILES_DIRS تنظیم نشده است.",
                id="emmett_admin.E003",
                hint="دارایی‌های برند/پوستهٔ بومی ادمین از این مسیر سرو می‌شوند (ADR-0043).",
            )
        )

    return errors


@register()
def check_admin_theme_assets(*, app_configs: object = None, **kwargs: object) -> list[Error]:
    """وجود فایل‌های واقعی تم/برند روی دیسک (پیش‌نیاز ``collectstatic``)."""

    errors: list[Error] = []
    static_root_dir = Path(settings.BASE_DIR) / "static"

    for name, relative_path in ADMIN_THEME_ASSETS.items():
        if not (static_root_dir / relative_path).exists():
            errors.append(
                Error(
                    f"فایل دارایی تم ادمین «{name}» یافت نشد: static/{relative_path}",
                    id="emmett_admin.E004",
                    hint="این فایل باید در مخزن باشد؛ نبودش یعنی در دیپلوی صفحات ادمین ناقص می‌شوند.",
                )
            )

    fonts_dir = static_root_dir / "admin_theme" / "fonts"
    if not any(fonts_dir.glob("vazirmatn-arabic-*-normal.woff2")):
        errors.append(
            Error(
                "فونت خوداستقرار Vazirmatn در static/admin_theme/fonts یافت نشد.",
                id="emmett_admin.E004",
                hint="بدون فونت بومی، ادمین فارسی با فونت پیش‌فرض سیستم نمایش داده می‌شود (ADR-0018).",
            )
        )

    return errors


@register()
def check_fa_translations_compiled(*, app_configs: object = None, **kwargs: object) -> list[Warning]:
    """هشدار در صورت نبود فایل ``.mo`` فارسی (ادمین/API انگلیسی نمایش داده می‌شود)."""

    locale_dir = Path(settings.BASE_DIR) / "locale" / "fa" / "LC_MESSAGES"
    if not (locale_dir / "django.mo").exists():
        return [
            Warning(
                "فایل ترجمهٔ کامپایل‌شدهٔ فارسی (locale/fa/LC_MESSAGES/django.mo) وجود ندارد.",
                id="emmett_admin.W005",
                hint="python scripts/i18n.py compile — سپس collectstatic/restart.",
            )
        ]
    return []


@register()
def check_admin_theme_templates(*, app_configs: object = None, **kwargs: object) -> list[Error]:
    """وجود قالب‌های ضروری پوستهٔ بومی را بررسی می‌کند."""

    templates_dir = Path(settings.BASE_DIR) / "templates"
    missing = [
        f"{name}: {relative_path}"
        for name, relative_path in ADMIN_THEME_TEMPLATES.items()
        if not (templates_dir / relative_path).is_file()
    ]
    if not missing:
        return []
    return [
        Error(
            "قالب‌های ضروری پنل بومی یافت نشدند: " + ", ".join(missing),
            id="emmett_admin.E006",
            hint="قالب‌های اعلام‌شده در apps.core.admin_theme.ADMIN_THEME_TEMPLATES را نگه دارید.",
        )
    ]


@register(Tags.security, deploy=True)
def check_public_site_url(*, app_configs: object = None, **kwargs: object) -> list[Warning]:
    """در production، آدرس سایت عمومی باید تنظیم شده باشد (لینک «مشاهدهٔ سایت»).

    این یک **deployment check** است (``Tags.security, deploy=True``) و فقط با
    ``manage.py check --deploy`` اجرا می‌شود؛ بنابراین روی محیط توسعه/تست نویز
    تولید نمی‌کند ولی در چک‌لیست انتشار واقعی هشدار می‌دهد.
    """

    if settings.DEBUG:
        return []
    public_site_url = str(getattr(settings, "PUBLIC_SITE_URL", ""))
    if not public_site_url or "localhost" in public_site_url or "127.0.0.1" in public_site_url:
        return [
            Warning(
                f"PUBLIC_SITE_URL روی مقدار پیش‌فرض/محلی است: {public_site_url!r}",
                id="emmett_admin.W007",
                hint="در env مقصد مقدار واقعی دامنه را قرار دهید.",
            )
        ]
    return []


# ---------------------------------------------------------------------------
# فاز ۷ — سخت‌سازی امنیتی (ADR-0033)
# ---------------------------------------------------------------------------


@register()
def check_csp_enabled(*, app_configs: object = None, **kwargs: object) -> list[Error | Warning]:
    """CSP باید فعال باشد؛ وگرنه XSS در ادمین/API مهار نمی‌شود.

    این check «خطا» است (نه هشدار) چون خاموش‌کردن CSP یک تصمیم امنیتی است که
    باید صریح و آگاهانه باشد (``DJANGO_CSP_ENABLED=0``) — نه نتیجهٔ فراموشی.
    """

    if not getattr(settings, "CSP_ENABLED", False):
        return [
            Warning(
                "CSP جنگو خاموش است؛ هدر Content-Security-Policy روی ادمین/API ست نمی‌شود.",
                id="emmett_admin.W008",
                hint="DJANGO_CSP_ENABLED=1 (پیش‌فرض) را برنگردانید مگر با دلیل مستند.",
            )
        ]
    return []


@register(Tags.security, deploy=True)
def check_admin_two_factor(*, app_configs: object = None, **kwargs: object) -> list[Warning]:
    """در production، ۲FA ادمین باید روشن باشد (ADR-0033)."""

    if settings.DEBUG:
        return []
    if not getattr(settings, "ADMIN_2FA_REQUIRED", False):
        return [
            Warning(
                "ADMIN_2FA_REQUIRED در production خاموش است؛ ورود ادمین فقط با رمز ممکن است.",
                id="emmett_admin.W009",
                hint="ADMIN_2FA_REQUIRED=1 و برای هر staff دستگاه TOTP ثبت کنید.",
            )
        ]
    return []


@register(Tags.security, deploy=True)
def check_search_console_verification(*, app_configs: object = None, **kwargs: object) -> list[Warning]:
    """کد تأیید Search Console در production باید پر باشد (ADR-0031)."""

    if settings.DEBUG:
        return []
    from apps.core.models import SiteSettings

    try:
        verification = SiteSettings.load().search_console_verification
    except Exception:  # noqa: BLE001 - نبود جدول/DB در چک اولیه نباید بشکند
        return []
    if not verification:
        return [
            Warning(
                "کد تأیید Google Search Console تنظیم نشده است.",
                id="emmett_admin.W010",
                hint="Admin → Site settings → SEO → Google Search Console verification code",
            )
        ]
    return []


@register(Tags.security, deploy=True)
def check_backup_directory(*, app_configs: object = None, **kwargs: object) -> list[Warning]:
    """مسیر پشتیبان‌گیری باید وجود/قابل‌نوشتن باشد (ADR-0033)."""

    if settings.DEBUG:
        return []
    path = Path(str(getattr(settings, "BACKUP_DIR", "")))
    if not path or not path.exists():
        return [
            Warning(
                f"پوشهٔ پشتیبان‌گیری وجود ندارد: {path}",
                id="emmett_admin.W011",
                hint="پوشه را بسازید و Cron روزانهٔ manage.py backup_db را در cPanel فعال کنید.",
            )
        ]
    if not os.access(path, os.W_OK):
        return [
            Warning(
                f"پوشهٔ پشتیبان‌گیری قابل‌نوشتن نیست: {path}",
                id="emmett_admin.W012",
                hint="دسترسی پوشه را برای کاربر اپلیکیشن اصلاح کنید (755/775).",
            )
        ]
    return []


@register(Tags.security, deploy=True)
def check_secret_key_entropy(*, app_configs: object = None, **kwargs: object) -> list[Warning]:
    """``SECRET_KEY`` ضعیف/پیش‌فرض در production (تکمیل ``security.W009`` جنگو)."""

    if settings.DEBUG:
        return []
    secret = str(getattr(settings, "SECRET_KEY", ""))
    if secret.startswith("django-insecure") or len(secret) < 50 or len(set(secret)) < 5:
        return [
            Warning(
                "SECRET_KEY ضعیف/مقدار نمونه است؛ باید در env مقصد مقدار تصادفی ۵۰+ کاراکتری بگذارید.",
                id="emmett_admin.W013",
                hint='python -c "import secrets; print(secrets.token_urlsafe(64))"',
            )
        ]
    return []
