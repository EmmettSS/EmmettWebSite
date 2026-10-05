"""Structured creative-advisor pipeline: validate, normalize, prompt, call, guard, persist."""

from __future__ import annotations

import hashlib
import re
import secrets
import time
from dataclasses import dataclass
from typing import Any, cast

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from apps.ai_engine.guardrails.service import GuardrailViolation, enforce_generated_text
from apps.ai_engine.models import (
    AIConcept,
    AIRequest,
    AISuggestion,
    CatalogOption,
    EstimationRule,
    PromptTemplate,
)
from apps.ai_engine.pipelines.common import (
    active_options,
    active_prompt,
    canonical_json,
    current_taxonomy_digest,
    parse_json_object,
    selected_option_data,
    sha256_text,
)
from apps.ai_engine.pipelines.errors import AIOutputBlocked, AIOutputInvalid, AIRequestError
from apps.ai_engine.providers.base import ProviderError, ProviderUnavailable
from apps.ai_engine.providers.factory import get_provider
from apps.portfolio.models import Project
from apps.services.models import Service

_TEXT_LIMITS: dict[str, int] = {
    "title_fa": 140,
    "title_en": 140,
    "description_fa": 1600,
    "description_en": 1600,
    "benefit_fa": 600,
    "benefit_en": 600,
}
_REQUIRED_IDEA_FIELDS = frozenset(
    (
        "title_fa",
        "title_en",
        "description_fa",
        "description_en",
        "benefit_fa",
        "benefit_en",
        "solution_area",
        "complexity",
        "delivery_scope",
        "related_service_slug",
        "related_product_slug",
    )
)
_HTML_TAG = re.compile(r"<\s*/?\s*[a-zA-Z][^>]*>")


@dataclass(frozen=True, slots=True)
class ValidatedIdea:
    title_fa: str
    title_en: str
    description_fa: str
    description_en: str
    benefit_fa: str
    benefit_en: str
    solution_area: CatalogOption
    complexity: CatalogOption
    delivery_scope: CatalogOption
    minimum_working_days: int | None
    related_service: Service | None
    related_product: Project | None

    def as_cache_payload(self) -> dict[str, object]:
        return {
            "title_fa": self.title_fa,
            "title_en": self.title_en,
            "description_fa": self.description_fa,
            "description_en": self.description_en,
            "benefit_fa": self.benefit_fa,
            "benefit_en": self.benefit_en,
            "solution_area": self.solution_area.key,
            "complexity": self.complexity.key,
            "delivery_scope": self.delivery_scope.key,
            "related_service_slug": self.related_service.slug if self.related_service else None,
            "related_product_slug": self.related_product.slug if self.related_product else None,
        }


@dataclass(frozen=True, slots=True)
class AdvisorResult:
    suggestion: AISuggestion
    share_token: str
    cache_hit: bool


def _keys_from_input(input_data: dict[str, object]) -> dict[str, object]:
    normalized: dict[str, object] = {}
    for key, value in input_data.items():
        if isinstance(value, CatalogOption):
            normalized[key] = value.key
        elif isinstance(value, list) and all(isinstance(item, CatalogOption) for item in value):
            normalized[key] = sorted(item.key for item in cast(list[CatalogOption], value))
        else:
            raise ValueError("invalid_structured_input")
    return dict(sorted(normalized.items()))


def _localized_title(obj: Service | Project, locale: str) -> str:
    localized = getattr(obj, f"title_{locale}", "")
    return localized or obj.title


def _prompt_context(
    input_data: dict[str, object], locale: str
) -> tuple[dict[str, object], list[Service], list[Project], str]:
    services = list(
        Service.objects.filter(
            status=Service.Status.PUBLISHED,
            is_active=True,
            deleted_at__isnull=True,
        ).order_by("slug")[:50]
    )
    products = list(
        Project.objects.filter(
            status=Project.Status.PUBLISHED,
            is_product=True,
            is_active=True,
            deleted_at__isnull=True,
        ).order_by("slug")[:50]
    )
    taxonomy = {
        "solution_area": [
            {"key": option.key, "label": option.label_for(locale)}
            for option in active_options("solution_area")
        ],
        "complexity": [
            {"key": option.key, "label": option.label_for(locale)} for option in active_options("complexity")
        ],
        "delivery_scope": [
            {"key": option.key, "label": option.label_for(locale)}
            for option in active_options("delivery_scope")
        ],
        "related_services": [
            {"slug": service.slug, "title": _localized_title(service, locale)} for service in services
        ],
        "related_products": [
            {"slug": product.slug, "title": _localized_title(product, locale)} for product in products
        ],
    }
    context = {
        "selected_options": selected_option_data(input_data, locale),
        "allowed_output_options": taxonomy,
        "constraints": {"maximum_ideas": 3, "prices": "never", "preliminary_only": True},
    }
    digest = sha256_text(canonical_json(taxonomy))
    return context, services, products, digest


def _resolve_option(catalog_key: str, key: object) -> CatalogOption:
    if not isinstance(key, str):
        raise ValueError("output_option_invalid")
    try:
        return active_options(catalog_key).get(key=key)
    except CatalogOption.DoesNotExist as exc:
        raise ValueError("output_option_invalid") from exc


def _validate_idea(raw: object) -> ValidatedIdea:
    if not isinstance(raw, dict) or frozenset(raw.keys()) != _REQUIRED_IDEA_FIELDS:
        raise ValueError("output_schema_invalid")
    idea = cast(dict[str, Any], raw)
    text: dict[str, str] = {}
    for key, limit in _TEXT_LIMITS.items():
        value = idea.get(key)
        if not isinstance(value, str):
            raise ValueError("output_text_invalid")
        cleaned = value.strip()
        if not cleaned or len(cleaned) > limit or _HTML_TAG.search(cleaned):
            raise ValueError("output_text_invalid")
        text[key] = cleaned

    service_slug = idea["related_service_slug"]
    product_slug = idea["related_product_slug"]
    if service_slug is not None and not isinstance(service_slug, str):
        raise ValueError("related_item_invalid")
    if product_slug is not None and not isinstance(product_slug, str):
        raise ValueError("related_item_invalid")
    if service_slug and product_slug:
        raise ValueError("related_item_invalid")

    service: Service | None = None
    product: Project | None = None
    if service_slug:
        try:
            service = Service.objects.get(
                slug=service_slug,
                status=Service.Status.PUBLISHED,
                is_active=True,
                deleted_at__isnull=True,
            )
        except Service.DoesNotExist as exc:
            raise ValueError("related_service_invalid") from exc
    if product_slug:
        try:
            product = Project.objects.get(
                slug=product_slug,
                status=Project.Status.PUBLISHED,
                is_product=True,
                is_active=True,
                deleted_at__isnull=True,
            )
        except Project.DoesNotExist as exc:
            raise ValueError("related_product_invalid") from exc

    solution = _resolve_option("solution_area", idea["solution_area"])
    complexity = _resolve_option("complexity", idea["complexity"])
    delivery_scope = _resolve_option("delivery_scope", idea["delivery_scope"])
    rule = (
        EstimationRule.objects.filter(
            delivery_scope=delivery_scope,
            is_active=True,
            deleted_at__isnull=True,
        )
        .only("minimum_working_days")
        .first()
    )
    return ValidatedIdea(
        **text,
        solution_area=solution,
        complexity=complexity,
        delivery_scope=delivery_scope,
        minimum_working_days=rule.minimum_working_days if rule else None,
        related_service=service,
        related_product=product,
    )


def _validate_output(payload: dict[str, Any], *, locale: str) -> list[ValidatedIdea]:
    if set(payload) != {"ideas"} or not isinstance(payload.get("ideas"), list):
        raise ValueError("output_schema_invalid")
    raw_ideas = cast(list[object], payload["ideas"])
    if not 1 <= len(raw_ideas) <= 3:
        raise ValueError("output_idea_count_invalid")
    ideas = [_validate_idea(item) for item in raw_ideas]
    output_texts = tuple(
        text
        for idea in ideas
        for text in (
            idea.title_fa,
            idea.title_en,
            idea.description_fa,
            idea.description_en,
            idea.benefit_fa,
            idea.benefit_en,
        )
    )
    enforce_generated_text(output_texts, locale="fa")
    enforce_generated_text(output_texts, locale="en")
    return ideas


def _finish_failed(
    audit: AIRequest,
    *,
    started: float,
    code: str,
    status: str = AIRequest.Status.FAILED,
    flags: list[str] | None = None,
) -> None:
    audit.status = status
    audit.error_code = code
    audit.guardrail_flags = flags or []
    audit.latency_ms = max(0, int((time.perf_counter() - started) * 1000))
    audit.completed_at = timezone.now()
    audit.save(
        update_fields=["status", "error_code", "guardrail_flags", "latency_ms", "completed_at", "updated_at"]
    )


def generate_advisor_suggestion(
    *, input_data: dict[str, object], locale: str, requester_hash: str
) -> AdvisorResult:
    normalized = _keys_from_input(input_data)
    audit = AIRequest.objects.create(
        feature=AIRequest.Feature.ADVISOR,
        locale=locale,
        input_payload=normalized,
        requester_hash=requester_hash,
    )
    started = time.perf_counter()

    try:
        provider = get_provider()
        prompt = active_prompt(PromptTemplate.Feature.ADVISOR, locale)
        context, _, _, asset_digest = _prompt_context(input_data, locale)
        taxonomy_digest = current_taxonomy_digest()
        key_payload = {
            "schema": "advisor-v1",
            "feature": AIRequest.Feature.ADVISOR,
            "locale": locale,
            "input": normalized,
            "provider": provider.provider_name,
            "model": provider.model_name,
            "prompt_version": prompt.version,
            "prompt_digest": sha256_text(prompt.system_prompt),
            "taxonomy_digest": taxonomy_digest,
            "asset_digest": asset_digest,
        }
        request_hash = sha256_text(canonical_json(key_payload))
        audit.request_hash = request_hash
        audit.provider_name = provider.provider_name
        audit.model_name = provider.model_name
        audit.prompt_version = prompt.version
        audit.save(
            update_fields=["request_hash", "provider_name", "model_name", "prompt_version", "updated_at"]
        )
        cache_key = f"ai:advisor:{request_hash}"
        cached = cache.get(cache_key)
        completion_tokens: tuple[int | None, int | None] = (None, None)
        cache_hit = False

        if isinstance(cached, dict):
            try:
                cached_payload = cast(dict[str, Any], cached)
                ideas = _validate_output(cached_payload, locale=locale)
                cache_hit = True
            except (ValueError, GuardrailViolation):
                cache.delete(cache_key)
                ideas = []
        else:
            ideas = []

        if not cache_hit:
            user_message = canonical_json(context)
            completion = provider.complete(
                system_prompt=prompt.system_prompt,
                user_message=user_message,
                max_tokens=1800,
            )
            parsed = parse_json_object(completion.content)
            ideas = _validate_output(parsed, locale=locale)
            completion_tokens = (completion.input_tokens, completion.output_tokens)
            cache_payload = {"ideas": [idea.as_cache_payload() for idea in ideas]}
        else:
            cache_payload = {"ideas": [idea.as_cache_payload() for idea in ideas]}

        token = secrets.token_urlsafe(32)
        with transaction.atomic():
            suggestion = AISuggestion.objects.create(
                request=audit,
                locale=locale,
                share_token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
                is_displayable=True,
            )
            AIConcept.objects.bulk_create(
                [
                    AIConcept(
                        suggestion=suggestion,
                        position=index,
                        title_fa=idea.title_fa,
                        title_en=idea.title_en,
                        description_fa=idea.description_fa,
                        description_en=idea.description_en,
                        benefit_fa=idea.benefit_fa,
                        benefit_en=idea.benefit_en,
                        solution_area=idea.solution_area,
                        complexity=idea.complexity,
                        delivery_scope=idea.delivery_scope,
                        minimum_working_days=idea.minimum_working_days,
                        related_service=idea.related_service,
                        related_product=idea.related_product,
                    )
                    for index, idea in enumerate(ideas, start=1)
                ]
            )
            audit.status = AIRequest.Status.COMPLETED
            audit.cache_hit = cache_hit
            audit.input_tokens = completion_tokens[0]
            audit.output_tokens = completion_tokens[1]
            audit.latency_ms = max(0, int((time.perf_counter() - started) * 1000))
            audit.completed_at = timezone.now()
            audit.save(
                update_fields=[
                    "status",
                    "cache_hit",
                    "input_tokens",
                    "output_tokens",
                    "latency_ms",
                    "completed_at",
                    "updated_at",
                ]
            )

        if not cache_hit:
            cache.set(cache_key, cache_payload, timeout=settings.AI_CACHE_TTL_SECONDS)
        return AdvisorResult(suggestion=suggestion, share_token=token, cache_hit=cache_hit)

    except GuardrailViolation as exc:
        _finish_failed(
            audit,
            started=started,
            code="guardrail_blocked",
            status=AIRequest.Status.BLOCKED,
            flags=exc.flags,
        )
        raise AIOutputBlocked("output_blocked") from None
    except ProviderUnavailable:
        _finish_failed(audit, started=started, code="provider_not_configured")
        raise AIRequestError("provider_not_configured") from None
    except ProviderError:
        _finish_failed(audit, started=started, code="provider_unavailable")
        raise AIRequestError("generation_failed") from None
    except ValueError:
        _finish_failed(audit, started=started, code="invalid_model_output")
        raise AIOutputInvalid("generation_failed") from None
    except Exception:
        _finish_failed(audit, started=started, code="generation_failed")
        raise AIRequestError("generation_failed") from None
