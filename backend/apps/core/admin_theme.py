"""برندینگ و پیکربندی سایت ادمین — فاز ۱.

تنظیمات ظاهری/متنی پنل بومی در قالب‌های پروژه و دارایی‌های خودمیزبان تعریف
می‌شوند. این ماژول متن‌های سطح ``AdminSite`` را با ``gettext_lazy`` ست می‌کند،
مسیرهای قالب و دارایی‌های پوسته را نگه می‌دارد و همان برندینگ را برای سایت
ادمین سفارشی (مثلاً در تست‌ها) اعمال می‌کند.
"""

from __future__ import annotations

from django.conf import settings
from django.contrib import admin
from django.utils.translation import gettext_lazy as _

#: نسخهٔ لایهٔ برند ادمین — با هر تغییر بصری/ساختاری مهم بالا می‌رود.
ADMIN_THEME_VERSION = "2.0.0"

#: مسیرهای استاتیک تم (کلید: نام منطقی، مقدار: مسیر نسبی به STATICFILES_DIRS).
ADMIN_THEME_ASSETS: dict[str, str] = {
    "theme_css": "admin_theme/css/emmett-admin.css",
    "rtl_css": "admin_theme/css/emmett-rtl.css",
    "theme_js": "admin_theme/js/emmett-admin.js",
    "theme_default_js": "admin_theme/js/emmett-theme-default.js",
    "jquery_ui": "admin_theme/js/vendor/jquery-ui-1.13.3.min.js",
    "icon_sprite": "admin_theme/icons.svg",
    "wordmark": "brand/emmett-wordmark.png",
    "mark": "brand/emmett-logo-192.png",
    "favicon": "brand/emmett-favicon.ico",
    "mark_svg": "brand/emmett-mark.svg",
}

ADMIN_THEME_TEMPLATES: dict[str, str] = {
    "base_site": "admin/base_site.html",
    "dashboard": "admin/index.html",
    "login": "admin/login.html",
    "navigation": "admin/nav_sidebar.html",
    "navigation_apps": "admin/app_list.html",
    "language_switcher": "admin/includes/emmett_language_switcher.html",
    "two_factor_base": "admin/twofa/_base.html",
    "two_factor_setup": "admin/twofa/setup.html",
    "two_factor_verify": "admin/twofa/verify.html",
    "two_factor_status": "admin/twofa/status.html",
    "two_factor_recovery": "admin/twofa/recovery.html",
    "export": "admin/import_export/export.html",
}


def apply_admin_branding(site: admin.AdminSite | None = None) -> None:
    """متن‌های برند امیت را روی سایت ادمین ست می‌کند (lazy و قابل‌ترجمه)."""

    target = site or admin.site
    target.site_header = _("Emmett Group admin")
    target.site_title = _("Emmett Admin")
    target.index_title = _("Dashboard")
    target.site_url = str(settings.PUBLIC_SITE_URL).rstrip("/")
    target.empty_value_display = "—"


__all__ = [
    "ADMIN_THEME_ASSETS",
    "ADMIN_THEME_TEMPLATES",
    "ADMIN_THEME_VERSION",
    "apply_admin_branding",
]
