"""Environment-driven provider construction; no provider secrets are logged."""

from __future__ import annotations

from django.conf import settings

from apps.ai_engine.providers.base import AIProvider, ProviderUnavailable
from apps.ai_engine.providers.openai_compatible import OpenAICompatibleProvider


def get_provider() -> AIProvider:
    base_url = settings.AI_API_BASE_URL
    model_name = settings.AI_MODEL
    if not settings.AI_ENABLED or not base_url or not model_name:
        raise ProviderUnavailable("provider_not_configured")
    return OpenAICompatibleProvider(
        base_url=base_url,
        api_key=settings.AI_API_KEY,
        model_name=model_name,
        timeout_seconds=settings.AI_TIMEOUT_SECONDS,
    )
