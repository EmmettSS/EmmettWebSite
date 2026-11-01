"""برندینگ و پیکربندی سایت ادمین — فاز ۶ (ADR-0027).

تنظیمات ظاهری/متنی ادمین در ``settings.JAZZMIN_SETTINGS``/``JAZZMIN_UI_TWEAKS``
تعریف شده‌اند (چون Jazzmin آن‌ها را در زمان بارگذاری می‌خواند). این ماژول فقط
سه کار را انجام می‌دهد:

1. متن‌های سطح ``AdminSite`` را (که در قالب‌های Django/Jazzmin مستقیماً
   استفاده می‌شوند) با ``gettext_lazy`` ست می‌کند تا در فارسی ترجمه شوند.
2. نسخهٔ تم را نگه می‌دارد تا در تست‌ها و راهنما قابل ارجاع باشد.
3. امکان اعمال همین برندینگ روی یک ``AdminSite`` سفارشی (مثلاً در تست‌ها) را
   فراهم می‌کند — بدون هیچ وابستگی به مدل‌ها (settings نیز این ماژول را
   import نمی‌کند؛ فقط ``apps.core.apps.ready`` آن را صدا می‌زند).
"""

from __future__ import annotations

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

#: نسخهٔ لایهٔ برند ادمین — با هر تغییر بصری/ساختاری مهم بالا می‌رود.
ADMIN_THEME_VERSION = "1.0.0"

#: مسیرهای استاتیک تم (کلید: نام منطقی، مقدار: مسیر نسبی به STATICFILES_DIRS).
ADMIN_THEME_ASSETS: dict[str, str] = {
    "theme_css": "admin_theme/css/emmett-admin.css",
    "rtl_css": "admin_theme/css/emmett-rtl.css",
    "theme_js": "admin_theme/js/emmett-admin.js",
    "wordmark": "brand/emmett-wordmark.png",
    "mark": "brand/emmett-logo-192.png",
    "favicon": "brand/emmett-favicon.ico",
    "mark_svg": "brand/emmett-mark.svg",
}


def apply_admin_branding(site: admin.AdminSite | None = None) -> None:
    """متن‌های برند امیت را روی سایت ادمین ست می‌کند (lazy و قابل‌ترجمه)."""

    target = site or admin.site
    target.site_header = _("Emmett Group admin")
    target.site_title = _("Emmett Admin")
    target.index_title = _("Dashboard")
    target.empty_value_display = "—"


__all__ = ["ADMIN_THEME_ASSETS", "ADMIN_THEME_VERSION", "apply_admin_branding"]
