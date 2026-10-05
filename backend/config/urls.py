"""ریشهٔ URLconf پروژه."""

from __future__ import annotations

from django.conf import settings
from django.contrib import admin
from django.urls import URLPattern, URLResolver, include, path

urlpatterns: list[URLPattern | URLResolver] = [
    path("admin/", admin.site.urls),
    # تغییر زبان از داخل پنل ادمین (کلید زبان در Jazzmin) و از API.
    # بدون این مسیر، رندر قالب ادمین با ``NoReverseMatch: set_language``
    # شکست می‌خورد — کشف‌شده با تست رندر صفحهٔ داشبورد (فاز ۶).
    path("i18n/", include("django.conf.urls.i18n")),
    path("api/v1/", include("apps.api.urls")),
]

if settings.DEBUG:
    from django.conf.urls.static import static

    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
