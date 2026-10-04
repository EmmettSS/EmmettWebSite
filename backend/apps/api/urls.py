"""لایهٔ ترکیب API نسخهٔ ۱.

این اپ هیچ مدل/منطق کسب‌وکاری ندارد؛ فقط URLهای اپ‌های دامنه‌ای را زیر یک
پیشوند نسخه‌دار (``/api/v1/``) ترکیب می‌کند تا نسخه‌بندی API در آینده
(``/api/v2/``) بدون درهم‌تنیدگی با مدل‌ها ممکن باشد (ADR-0002).
"""

from __future__ import annotations

from django.urls import path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.core.views import HealthCheckView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
