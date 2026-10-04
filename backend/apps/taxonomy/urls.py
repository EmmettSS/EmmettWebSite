from __future__ import annotations

from rest_framework.routers import DefaultRouter

from apps.taxonomy.views import CategoryViewSet, TagViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("tags", TagViewSet, basename="tag")

urlpatterns = router.urls
