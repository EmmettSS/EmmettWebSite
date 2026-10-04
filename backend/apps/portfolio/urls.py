from __future__ import annotations

from rest_framework.routers import DefaultRouter

from apps.portfolio.views import ProjectViewSet

router = DefaultRouter()
router.register("", ProjectViewSet, basename="project")

urlpatterns = router.urls
