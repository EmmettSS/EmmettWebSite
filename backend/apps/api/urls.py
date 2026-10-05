"""لایهٔ ترکیب API نسخهٔ ۱.

این اپ هیچ مدل/منطق کسب‌وکاری ندارد؛ فقط URLهای اپ‌های دامنه‌ای را زیر یک
پیشوند نسخه‌دار (``/api/v1/``) ترکیب می‌کند تا نسخه‌بندی API در آینده
(``/api/v2/``) بدون درهم‌تنیدگی با مدل‌ها ممکن باشد (ADR-0002).
"""

from __future__ import annotations

from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.core.views import GlobalSearchView, HealthCheckView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("search/", GlobalSearchView.as_view(), name="global-search"),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("schema/swagger-ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("schema/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("auth/", include("apps.accounts.urls")),
    path("taxonomy/", include("apps.taxonomy.urls")),
    path("company/", include("apps.company.urls")),
    path("services/", include("apps.services.urls")),
    path("projects/", include("apps.portfolio.urls")),
    path("academy/", include("apps.academy.urls")),
    path("blog/", include("apps.blog.urls")),
    path("leads/", include("apps.leads.urls")),
    path("ai/catalogs/", include("apps.ai_engine.catalog.urls")),
    path("ai/", include("apps.ai_engine.pipelines.urls")),
]
