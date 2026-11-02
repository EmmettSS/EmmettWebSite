"""لایهٔ دادهٔ SEO (فاز ۷ — ADR-0031).

تولیدکنندهٔ sitemap/robots/JSON-LD در **Next.js** است (چون HTML عمومی را آن
سرو می‌کند)، ولی «منبع حقیقت» محتوا و SEO در Django است. این ماژول دادهٔ خام
و کش‌شدهٔ موردنیاز فرانت‌اند را می‌سازد:

- ``build_sitemap_entries`` — همهٔ URLهای عمومی منتشرشده + صفحه‌های ثابت،
  به‌همراه ``lastmod``/``changefreq``/``priority`` و تفکیک بخش (برای sitemap index).
- ``build_seo_settings_payload`` — تنظیمات SEO سایت (کد تأیید Search Console،
  مقادیر پیش‌فرض متا، اطلاعات سازمان برای JSON-LD، تصویر OG پیش‌فرض).
- ``build_faq_payload`` — پرسش‌های متداول یک مسیر (برای ``FAQPage`` JSON-LD).

همه‌چیز با تجمیع تجمیعی/``values()`` و بدون N+1 ساخته می‌شود (قانون ۱۵).
"""

from __future__ import annotations

from typing import Any, Final

from django.conf import settings
from django.contrib.staticfiles.storage import staticfiles_storage
from django.core.cache import cache
from django.utils import timezone

from apps.core.models import FAQItem, SiteSettings, normalize_redirect_path
from apps.core.utils.urls import localized_path

#: بخش‌های sitemap (برای sitemap index در سمت Next.js).
SITEMAP_SECTIONS: Final[tuple[str, ...]] = ("pages", "services", "projects", "blog", "academy")

SITEMAP_CACHE_KEY: Final[str] = "seo:sitemap:entries:v1"
SETTINGS_CACHE_KEY: Final[str] = "seo:settings:v1"


def _absolute_static_url(relative_path: str) -> str:
    """URL مطلق دارایی استاتیک (برای ``logo``/``image`` در JSON-LD و OG)."""

    base = str(settings.PUBLIC_SITE_URL).rstrip("/")
    try:
        return f"{base}{staticfiles_storage.url(relative_path)}"
    except Exception:  # noqa: BLE001 - نبود دارایی نباید payload را بشکند
        return f"{base}/static/{relative_path}"


def _iso(value: Any) -> str:
    """تاریخ را به ISO-8601 با ثانیه تبدیل می‌کند (بدون میکروثانیه — سازگار sitemap)."""

    if value is None:
        return timezone.now().replace(microsecond=0).isoformat()
    return str(value.replace(microsecond=0).isoformat())


def _published_entries() -> list[dict[str, Any]]:
    """رکوردهای منتشرشدهٔ همهٔ اپ‌های محتوایی با یک کوئری در هر مدل."""

    from apps.academy.models import Course
    from apps.blog.models import BlogPost
    from apps.core.models import PublishableModel
    from apps.portfolio.models import Project
    from apps.services.models import Service

    published = PublishableModel.Status.PUBLISHED
    definitions = (
        ("services", Service, "/services"),
        ("projects", Project, "/projects"),
        ("academy", Course, "/academy"),
        ("blog", BlogPost, "/blog"),
    )

    entries: list[dict[str, Any]] = []
    for section, model, prefix in definitions:
        queryset = (
            model.objects.filter(status=published)
            .only("slug", "updated_at", "published_at")
            .order_by("-published_at", "-updated_at")
        )
        for row in queryset.iterator():
            entries.append(
                {
                    "section": section,
                    "path": f"{prefix}/{row.slug}",
                    "lastmod": _iso(row.updated_at or row.published_at),
                    "changefreq": "weekly" if section != "blog" else "daily",
                    "priority": "0.8" if section == "blog" else "0.7",
                }
            )
    return entries


def build_sitemap_entries(*, use_cache: bool = True) -> list[dict[str, Any]]:
    """همهٔ URLهای عمومی برای sitemap (صفحه‌های ثابت + محتوای منتشرشده)."""

    if use_cache:
        cached = cache.get(SITEMAP_CACHE_KEY)
        if cached is not None:
            return list(cached)

    entries: list[dict[str, Any]] = []
    for path, priority, changefreq in settings.SEO_STATIC_PAGES:
        entries.append(
            {
                "section": "pages",
                "path": path,
                "lastmod": _iso(timezone.now()),
                "changefreq": changefreq,
                "priority": priority,
            }
        )
    entries.extend(_published_entries())

    if use_cache:
        cache.set(SITEMAP_CACHE_KEY, entries, timeout=settings.SEO_SITEMAP_CACHE_SECONDS)
    return entries


def invalidate_sitemap_cache() -> None:
    """کش sitemap را پاک می‌کند (پس از تغییر محتوا یا تنظیمات SEO)."""

    cache.delete(SITEMAP_CACHE_KEY)
    cache.delete(SETTINGS_CACHE_KEY)


def localized_urls(path: str) -> dict[str, str]:
    """نگاشت ``locale → مسیر بومی‌سازی‌شده`` برای hreflang و sitemap alternates."""

    return {locale: localized_path(locale, path) for locale, _label in settings.LANGUAGES}


def build_seo_settings_payload(*, use_cache: bool = True) -> dict[str, Any]:
    """تنظیمات SEO سایت برای مصرف فرانت‌اند (پیش‌فرض‌ها، سازمان، تأیید مالکیت)."""

    if use_cache:
        cached = cache.get(SETTINGS_CACHE_KEY)
        if cached is not None:
            return dict(cached)

    obj = SiteSettings.load()
    from django.utils.translation import gettext

    social_links: dict[str, str] = obj.social_links if isinstance(obj.social_links, dict) else {}
    same_as = [url for url in (obj.organization_same_as or []) if isinstance(url, str)]

    payload: dict[str, Any] = {
        "site_name": obj.site_name,
        "default_locale": obj.default_locale,
        "public_site_url": settings.PUBLIC_SITE_URL,
        "locales": [{"code": code, "label": str(label)} for code, label in settings.LANGUAGES],
        "default_meta_title": obj.meta_title,
        "default_meta_description": obj.meta_description,
        "search_console_verification": obj.search_console_verification,
        "twitter_handle": obj.twitter_handle,
        "organization": {
            "name": obj.site_name,
            "legal_name": obj.organization_legal_name,
            "url": settings.PUBLIC_SITE_URL,
            "email": obj.contact_email,
            "phone": obj.contact_phone,
            "address": obj.organization_address,
            "same_as": [*same_as, *social_links.values()],
            "logo_url": _absolute_static_url("brand/emmett-logo-192.png"),
        },
        "default_og_image": obj.og_default_image.file.url if obj.og_default_image else None,
        "noindex_paths": list(settings.SEO_NOINDEX_PATHS),
        "sitemap_sections": list(SITEMAP_SECTIONS),
        "generated_at": _iso(timezone.now()),
        # سطح امنیتی ادمین برای نمایش راهنما در پنل (اختیاری، بدون اطلاعات حساس).
        "two_factor_required": bool(settings.ADMIN_2FA_REQUIRED),
        "search_console_help": str(
            gettext("Paste the verification code here after adding the property in Search Console.")
        ),
    }

    if use_cache:
        cache.set(SETTINGS_CACHE_KEY, payload, timeout=settings.SEO_SITEMAP_CACHE_SECONDS)
    return payload


def build_faq_payload(path: str, *, locale: str | None = None) -> list[dict[str, Any]]:
    """پرسش‌های متداول فعال یک مسیر، به ترتیب نمایش و در زبان درخواستی.

    از نمونه‌های مدل (نه ``values()``) استفاده می‌شود تا descriptorهای
    modeltranslation و زنجیرهٔ fallback (``fa``) عمل کنند: اگر ترجمهٔ انگلیسی
    یک پرسش خالی باشد، همان متن فارسی برمی‌گردد (ADR-0003).
    """

    from django.utils import translation

    normalized = normalize_redirect_path(path)
    queryset = (
        FAQItem.objects.filter(path=normalized)
        .only("id", "question_fa", "question_en", "answer_fa", "answer_en")
        .order_by("order", "id")
    )
    with translation.override(locale or translation.get_language()):
        return [
            {"id": item.pk, "question": str(item.question), "answer": str(item.answer)} for item in queryset
        ]


__all__ = [
    "SITEMAP_CACHE_KEY",
    "SITEMAP_SECTIONS",
    "build_faq_payload",
    "build_seo_settings_payload",
    "build_sitemap_entries",
    "invalidate_sitemap_cache",
    "localized_urls",
]
