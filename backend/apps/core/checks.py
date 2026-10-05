"""System checks اختصاصی پنل ادمین — فاز ۶ (ADR-0027/0029).

هدف: جلوگیری از رگرسیون‌هایی که فقط «در زمان اجرا و روی سرور» دیده می‌شوند و
دیباگ آن‌ها گران است. Django این ماژول را خودکار بارگذاری می‌کند (قرارداد
``<app>.checks``) و نتیجه در ``manage.py check``/``migrate`` دیده می‌شود.

خطاهای تازه‌تر در ``emmett_admin`` با شناسه‌های زیر تعریف شده‌اند:

- ``E001`` ترتیب اشتباه ``jazzmin``/``modeltranslation`` نسبت به ``admin``
- ``E002`` نبود ``import_export``
- ``E003`` تنظیم نبودن پوشهٔ قالب‌های پروژه/دارایی‌های استاتیک
- ``E004`` نبود فایل‌های لازم تم/برند روی دیسک (خطای ``collectstatic``)
- ``W005`` نبود فایل ترجمهٔ کامپایل‌شدهٔ فارسی (ادمین انگلیسی نمایش داده می‌شود)
- ``W006`` روشن بودن CDN فونت گوگل در Jazzmin (نقض فونت self-hosted)
- ``W007`` باقی‌ماندن ``PUBLIC_SITE_URL`` روی مقدار پیش‌فرض در production
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, cast

from django.conf import settings
from django.core.checks import Error, Tags, Warning, register

from apps.core.admin_theme import ADMIN_THEME_ASSETS


@register()
def check_admin_theme_apps(
    *, app_configs: Any = None, **kwargs: Any
) -> list[Error]:
    """ترتیب اپ‌ها و حضور وابستگی‌های ادمین را بررسی می‌کند."""

    errors: list[Error] = []
    apps = list(settings.INSTALLED_APPS)
    hint = "ر.ک. ADR-0027 — ترتیب اپ‌ها در تنظیمات باید حفظ شود."

    def index_of(name: str) -> int | None:
        return apps.index(name) if name in apps else None

    admin_index = index_of("django.contrib.admin")
    modeltranslation_index = index_of("modeltranslation")
    jazzmin_index = index_of("jazzmin")
    import_export_index = index_of("import_export")

    if modeltranslation_index is None:
        errors.append(Error("مدل‌ترنسلیشن نصب نیست.", id="emmett_admin.E001", hint=hint))
    elif admin_index is not None and modeltranslation_index > admin_index:
        errors.append(
            Error(
                "«modeltranslation» باید پیش از «django.contrib.admin» در INSTALLED_APPS باشد.",
                id="emmett_admin.E001",
                hint=hint,
            )
        )

    if jazzmin_index is None:
        errors.append(Error("اپ «jazzmin» (تم ادمین) نصب نیست.", id="emmett_admin.E001", hint=hint))
    elif admin_index is not None and jazzmin_index > admin_index:
        errors.append(
            Error(
                "«jazzmin» باید پیش از «django.contrib.admin» در INSTALLED_APPS بیاید.",
                id="emmett_admin.E001",
                hint=hint,
            )
        )

    if import_export_index is None:
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
                hint="قالب‌های سفارشی ادمین (base_site/index) از این مسیر بارگذاری می‌شوند.",
            )
        )

    static_dirs = [Path(str(item)) for item in getattr(settings, "STATICFILES_DIRS", [])]
    if base_dir / "static" not in static_dirs:
        errors.append(
            Error(
                "پوشهٔ «backend/static» در STATICFILES_DIRS تنظیم نشده است.",
                id="emmett_admin.E003",
                hint="دارایی‌های برند/تم ادمین از این مسیر سرو می‌شوند (ADR-0027).",
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
def check_jazzmin_font_cdn(*, app_configs: object = None, **kwargs: object) -> list[Warning]:
    """فونت گوگل CDN نباید فعال باشد (قانون ۶/ADR-0018: بدون وابستگی CDN خارجی)."""

    jazzmin_settings = getattr(settings, "JAZZMIN_SETTINGS", {}) or {}
    if jazzmin_settings.get("use_google_fonts_cdn", False):
        return [
            Warning(
                "JAZZMIN_SETTINGS['use_google_fonts_cdn'] روشن است؛ فونت باید self-hosted باشد.",
                id="emmett_admin.W006",
                hint="این مقدار را False بگذارید — ADR-0018/ADR-0027.",
            )
        ]
    return []


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
