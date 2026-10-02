"""ADR-007 provider abstraction: nothing in the product calls a specific vendor directly.

Selection comes from the environment, never from code:

* ``ASSISTANT_LLM_PROVIDER=null`` (default) → :class:`NullProvider`. BM25 ships; §۶ of the phase
  prompt accepts this as a complete outcome and B7 stays open in OPEN-ITEMS.
* ``=relay`` → :class:`HttpRelayProvider` (an internal relay: no vendor key in the app).
* ``=hosted`` → :class:`HostedProvider` (any OpenAI-compatible endpoint).

Keys live only in env; they are never logged, never returned and never written to the repo.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Protocol

REQUEST_TIMEOUT = int(os.getenv("ASSISTANT_LLM_TIMEOUT", "20"))


class ProviderError(RuntimeError):
    """Any provider failure degrades to BM25 — it must never surface as a raw error."""


@dataclass
class Completion:
    text: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    provider: str = ""


class LLMProvider(Protocol):
    name: str
    available: bool

    def embed(self, texts: list[str]) -> list[list[float]] | None: ...

    def complete(self, messages: list[dict], **kwargs) -> Completion: ...


class NullProvider:
    """Used in development, tests, and whenever B7 (LLM access) is unresolved."""

    name = "null"
    available = False

    def embed(self, texts: list[str]) -> list[list[float]] | None:
        return None

    def complete(self, messages: list[dict], **kwargs) -> Completion:
        raise ProviderError("No LLM provider is configured (B7 open) — falling back to BM25.")


def _post_json(url: str, payload: dict, headers: dict[str, str]) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        raise ProviderError(f"{type(exc).__name__}") from exc


class HttpRelayProvider:
    """Talks to an internal relay; the vendor key never reaches the application server."""

    name = "relay"
    available = True

    def __init__(self, url: str, token: str = ""):
        if not url:
            raise ProviderError("ASSISTANT_LLM_RELAY_URL is empty")
        self.url = url.rstrip("/")
        self.token = token

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def embed(self, texts: list[str]) -> list[list[float]] | None:
        payload = _post_json(f"{self.url}/embed", {"input": texts}, self._headers())
        vectors = payload.get("embeddings") or payload.get("data")
        if not isinstance(vectors, list):
            raise ProviderError("relay returned no embeddings")
        if vectors and isinstance(vectors[0], dict):  # OpenAI-compatible shape
            vectors = [item.get("embedding", []) for item in vectors]
        return vectors

    def complete(self, messages: list[dict], **kwargs) -> Completion:
        payload = _post_json(f"{self.url}/complete", {"messages": messages, **kwargs}, self._headers())
        return Completion(
            text=str(payload.get("text") or payload.get("content") or ""),
            prompt_tokens=int(payload.get("prompt_tokens", 0)),
            completion_tokens=int(payload.get("completion_tokens", 0)),
            provider=self.name,
        )


class HostedProvider:
    """Any OpenAI-compatible endpoint (base URL + key from env)."""

    name = "hosted"
    available = True

    def __init__(self, base_url: str, api_key: str, model: str, embed_model: str = ""):
        if not base_url or not api_key or not model:
            raise ProviderError("Hosted provider needs ASSISTANT_LLM_BASE_URL, ASSISTANT_LLM_API_KEY and ASSISTANT_LLM_MODEL")
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.embed_model = embed_model or model

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    def embed(self, texts: list[str]) -> list[list[float]] | None:
        payload = _post_json(
            f"{self.base_url}/embeddings",
            {"model": self.embed_model, "input": texts},
            self._headers(),
        )
        data = payload.get("data")
        if not isinstance(data, list):
            raise ProviderError("provider returned no embeddings")
        return [item.get("embedding", []) for item in data]

    def complete(self, messages: list[dict], **kwargs) -> Completion:
        payload = _post_json(
            f"{self.base_url}/chat/completions",
            {"model": self.model, "messages": messages, "temperature": kwargs.get("temperature", 0.2)},
            self._headers(),
        )
        choices = payload.get("choices") or []
        text = choices[0].get("message", {}).get("content", "") if choices else ""
        usage = payload.get("usage") or {}
        return Completion(
            text=str(text),
            prompt_tokens=int(usage.get("prompt_tokens", 0)),
            completion_tokens=int(usage.get("completion_tokens", 0)),
            provider=self.name,
        )


def get_provider() -> LLMProvider:
    """Reads the environment on every call so tests and cron can swap providers freely."""
    choice = (os.getenv("ASSISTANT_LLM_PROVIDER") or "null").strip().lower()
    try:
        if choice == "relay":
            return HttpRelayProvider(os.getenv("ASSISTANT_LLM_RELAY_URL", ""), os.getenv("ASSISTANT_LLM_RELAY_TOKEN", ""))
        if choice == "hosted":
            return HostedProvider(
                os.getenv("ASSISTANT_LLM_BASE_URL", ""),
                os.getenv("ASSISTANT_LLM_API_KEY", ""),
                os.getenv("ASSISTANT_LLM_MODEL", ""),
                os.getenv("ASSISTANT_EMBED_MODEL", ""),
            )
    except ProviderError:
        return NullProvider()
    return NullProvider()


def daily_cost_cap() -> float:
    try:
        return float(os.getenv("ASSISTANT_DAILY_COST_CAP_USD", "0"))
    except ValueError:
        return 0.0


def estimate_cost(prompt_tokens: int, completion_tokens: int) -> float:
    """Rough accounting only — the cap is a safety net, not an invoice."""
    try:
        input_rate = float(os.getenv("ASSISTANT_COST_PER_1K_INPUT", "0.001"))
        output_rate = float(os.getenv("ASSISTANT_COST_PER_1K_OUTPUT", "0.002"))
    except ValueError:
        input_rate, output_rate = 0.001, 0.002
    return (prompt_tokens / 1000) * input_rate + (completion_tokens / 1000) * output_rate
