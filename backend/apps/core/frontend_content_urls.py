"""Versioned public routes for frontend-managed copy."""

from __future__ import annotations

from django.urls import path

from apps.core.frontend_translations import FrontendCopyTranslationsView

urlpatterns = [
    path("translations/", FrontendCopyTranslationsView.as_view(), name="frontend-copy-translations"),
]
