"""Minimal OpenAI-compatible chat-completions adapter built on existing requests."""

from __future__ import annotations

from typing import Any, cast

import requests

from apps.ai_engine.providers.base import ProviderCompletion, ProviderResponseError


class OpenAICompatibleProvider:
    provider_name = "openai-compatible"

    def __init__(self, *, base_url: str, api_key: str, model_name: str, timeout_seconds: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model_name = model_name
        self.timeout_seconds = timeout_seconds

    def _endpoint(self) -> str:
        if self.base_url.endswith("/chat/completions"):
            return self.base_url
        if self.base_url.endswith("/v1"):
            return f"{self.base_url}/chat/completions"
        return f"{self.base_url}/v1/chat/completions"

    def complete(self, *, system_prompt: str, user_message: str, max_tokens: int) -> ProviderCompletion:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        try:
            response = requests.post(
                self._endpoint(),
                headers=headers,
                json={
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.2,
                    "max_tokens": max_tokens,
                },
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            raw_payload = response.json()
            if not isinstance(raw_payload, dict):
                raise ProviderResponseError("provider_response_invalid")
            payload = cast(dict[str, Any], raw_payload)
        except (requests.RequestException, ValueError) as exc:
            raise ProviderResponseError("provider_request_failed") from exc

        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            raise ProviderResponseError("provider_response_invalid")
        first_choice = choices[0]
        if not isinstance(first_choice, dict):
            raise ProviderResponseError("provider_response_invalid")
        message = first_choice.get("message")
        if not isinstance(message, dict) or not isinstance(message.get("content"), str):
            raise ProviderResponseError("provider_response_invalid")

        usage = payload.get("usage")
        usage_dict = usage if isinstance(usage, dict) else {}
        input_tokens = usage_dict.get("prompt_tokens")
        output_tokens = usage_dict.get("completion_tokens")
        return ProviderCompletion(
            content=cast(str, message["content"]),
            provider_name=self.provider_name,
            model_name=self.model_name,
            input_tokens=input_tokens if isinstance(input_tokens, int) and input_tokens >= 0 else None,
            output_tokens=output_tokens if isinstance(output_tokens, int) and output_tokens >= 0 else None,
        )
