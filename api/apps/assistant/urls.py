from django.urls import path

from .views import (
    AssistantAskView,
    AssistantFeedbackView,
    AssistantPollView,
    AssistantSuggestionsView,
)

urlpatterns = [
    path("assistant/ask/", AssistantAskView.as_view(), name="assistant-ask"),
    path("assistant/ask/<int:job_id>/poll/", AssistantPollView.as_view(), name="assistant-ask-poll"),
    path("assistant/suggestions/", AssistantSuggestionsView.as_view(), name="assistant-suggestions"),
    path("assistant/feedback/", AssistantFeedbackView.as_view(), name="assistant-feedback"),
]
