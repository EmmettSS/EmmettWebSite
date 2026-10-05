"""Small provider protocol; feature code must not depend on an SDK."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class ProviderCompletion:
    content: str
    provider_name: str
    model_name: str
    input_tokens: int | None = None
    output_tokens: int | None = None


class AIProvider(Protocol):
    provider_name: str
    model_name: str

    def complete(self, *, system_prompt: str, user_message: str, max_tokens: int) -> ProviderCompletion:
        """Return one model completion or raise a sanitized provider error."""


class ProviderError(RuntimeError):
    """Base for provider failures; exception messages must never contain secrets or response bodies."""


class ProviderUnavailable(ProviderError):
    """No enabled provider configuration exists."""


class ProviderResponseError(ProviderError):
    """The configured endpoint returned an invalid response."""
