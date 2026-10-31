from __future__ import annotations

from unittest.mock import Mock, patch

import pytest
import requests
from django.test import override_settings

from apps.ai_engine.providers.base import ProviderResponseError, ProviderUnavailable
from apps.ai_engine.providers.factory import get_provider
from apps.ai_engine.providers.openai_compatible import OpenAICompatibleProvider


def test_openai_compatible_provider_sends_bounded_request_and_parses_usage() -> None:
    provider = OpenAICompatibleProvider(
        base_url="https://ai.example.test/v1/",
        api_key="test-secret",
        model_name="small-model",
        timeout_seconds=15.0,
    )
    response = Mock()
    response.json.return_value = {
        "choices": [{"message": {"content": '{"ideas": []}'}}],
        "usage": {"prompt_tokens": 20, "completion_tokens": 7},
    }

    with patch("apps.ai_engine.providers.openai_compatible.requests.post", return_value=response) as post:
        completion = provider.complete(system_prompt="System", user_message="{}", max_tokens=900)

    assert completion.content == '{"ideas": []}'
    assert completion.input_tokens == 20
    assert completion.output_tokens == 7
    response.raise_for_status.assert_called_once_with()
    post.assert_called_once()
    args, kwargs = post.call_args
    assert args == ("https://ai.example.test/v1/chat/completions",)
    assert kwargs["timeout"] == 15.0
    assert kwargs["headers"]["Authorization"] == "Bearer test-secret"
    assert kwargs["json"]["messages"] == [
        {"role": "system", "content": "System"},
        {"role": "user", "content": "{}"},
    ]
    assert kwargs["json"]["max_tokens"] == 900


def test_provider_errors_are_sanitized_before_leaving_the_adapter() -> None:
    provider = OpenAICompatibleProvider(
        base_url="https://ai.example.test",
        api_key="never-return-this-secret",
        model_name="small-model",
        timeout_seconds=15.0,
    )
    with patch(
        "apps.ai_engine.providers.openai_compatible.requests.post",
        side_effect=requests.Timeout("upstream failure: never-return-this-secret"),
    ):
        with pytest.raises(ProviderResponseError) as error:
            provider.complete(system_prompt="System", user_message="{}", max_tokens=10)

    assert str(error.value) == "provider_request_failed"
    assert "never-return-this-secret" not in str(error.value)


def test_provider_factory_fails_closed_when_ai_is_disabled() -> None:
    with override_settings(AI_ENABLED=False, AI_API_BASE_URL="https://ai.example.test", AI_MODEL="model"):
        with pytest.raises(ProviderUnavailable):
            get_provider()
