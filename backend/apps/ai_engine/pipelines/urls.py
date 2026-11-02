from __future__ import annotations

from django.urls import path

from apps.ai_engine.pipelines.views import (
    AdvisorCreateView,
    AdvisorLeadCreateView,
    ProjectEstimateView,
    SharedSuggestionView,
)

urlpatterns = [
    path("advisor/", AdvisorCreateView.as_view(), name="ai-advisor-create"),
    path("results/<str:token>/", SharedSuggestionView.as_view(), name="ai-shared-result"),
    path("estimates/", ProjectEstimateView.as_view(), name="ai-project-estimate"),
    path("leads/", AdvisorLeadCreateView.as_view(), name="ai-lead-create"),
]
