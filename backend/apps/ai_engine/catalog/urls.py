from __future__ import annotations

from django.urls import path

from apps.ai_engine.catalog.views import CatalogListView

urlpatterns = [path("", CatalogListView.as_view(), name="ai-catalog-list")]
