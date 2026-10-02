from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/", include("apps.tools.urls")),
    path("api/v1/", include("apps.jobs.urls")),
    path("api/v1/", include("apps.leads.urls")),
    path("api/v1/", include("apps.content.urls")),
    path("api/v1/", include("apps.scanner.urls")),
    path("api/v1/", include("apps.assistant.urls")),
    path("api/v1/", include("apps.biolab.urls")),
]
