"""URLهای SEO اپ ``core`` (فاز ۷ — ADR-0031).

زیر ``/api/v1/seo/`` سوار می‌شوند تا از health/search جدا باشد و بتوان در
آینده بدون شکستن مصرف‌کننده‌ها، نسخه‌بندی کرد.
"""

from __future__ import annotations

from django.urls import path

from apps.core.views import (
    SEOFAQView,
    SEORedirectsView,
    SEOSettingsView,
    SEOSitemapView,
)

urlpatterns = [
    path("settings/", SEOSettingsView.as_view(), name="seo-settings"),
    path("sitemap/", SEOSitemapView.as_view(), name="seo-sitemap"),
    path("redirects/", SEORedirectsView.as_view(), name="seo-redirects"),
    path("faq/", SEOFAQView.as_view(), name="seo-faq"),
]
