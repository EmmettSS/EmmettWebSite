"""Shared deterministic prompt, catalog versioning, and JSON helpers."""

from __future__ import annotations

import hashlib
import json
from typing import Any, cast

from django.db.models import QuerySet

from apps.ai_engine.models import CatalogOption, GuardrailRule, PromptTemplate


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def parse_json_object(content: str) -> dict[str, Any]:
    try:
        value = json.loads(content)
    except (TypeError, json.JSONDecodeError) as exc:
        raise ValueError("invalid_json") from exc
    if not isinstance(value, dict):
        raise ValueError("invalid_json_object")
    return cast(dict[str, Any], value)


def active_prompt(feature: str, locale: str) -> PromptTemplate:
    prompt = (
        PromptTemplate.objects.filter(
            feature=feature,
            locale=locale,
            is_active=True,
            deleted_at__isnull=True,
        )
        .order_by("-version")
        .first()
    )
    if prompt is None:
        raise ValueError("prompt_not_configured")
    return cast(PromptTemplate, prompt)


def active_options(catalog_key: str) -> QuerySet[CatalogOption]:
    return cast(
        QuerySet[CatalogOption],
        CatalogOption.objects.filter(
            catalog__key=catalog_key,
            catalog__is_active=True,
            catalog__is_public=True,
            catalog__deleted_at__isnull=True,
            is_active=True,
            is_public=True,
            deleted_at__isnull=True,
        )
        .select_related("catalog")
        .order_by("order", "key"),
    )


def selected_option_data(keys: dict[str, object], locale: str) -> dict[str, object]:
    result: dict[str, object] = {}
    for name, raw in keys.items():
        if isinstance(raw, list):
            result[name] = [
                {"key": item.key, "label": item.label_for(locale)}
                for item in raw
                if isinstance(item, CatalogOption)
            ]
        elif isinstance(raw, CatalogOption):
            result[name] = {"key": raw.key, "label": raw.label_for(locale)}
    return result


def current_taxonomy_digest() -> str:
    option_rows = list(
        CatalogOption.objects.filter(
            is_active=True,
            is_public=True,
            deleted_at__isnull=True,
            catalog__is_active=True,
            catalog__deleted_at__isnull=True,
        )
        .order_by("catalog__key", "key")
        .values_list("catalog__key", "key", "label_fa", "label_en", "updated_at")
    )
    options = [(*row[:4], row[4].isoformat()) for row in option_rows]
    guard_rows = list(
        GuardrailRule.objects.filter(is_active=True, deleted_at__isnull=True)
        .order_by("rule_key")
        .values_list("rule_key", "rule_type", "severity", "config", "updated_at")
    )
    guards = [(*row[:4], row[4].isoformat()) for row in guard_rows]
    payload = canonical_json({"options": options, "guardrails": guards})
    return sha256_text(payload)
