"""Deterministic project-scope estimator; never calls an LLM or invents cost."""

from __future__ import annotations

from django.utils import timezone

from apps.ai_engine.models import AIRequest, CatalogOption, EstimationRule
from apps.ai_engine.pipelines.advisor import _keys_from_input
from apps.ai_engine.pipelines.common import canonical_json, sha256_text


def estimate_project(*, input_data: dict[str, object], locale: str, requester_hash: str) -> dict[str, object]:
    normalized = _keys_from_input(input_data)
    delivery_scope = input_data.get("delivery_scope")
    if not isinstance(delivery_scope, CatalogOption):
        raise ValueError("delivery_scope_invalid")

    latest_rule_update = (
        EstimationRule.objects.filter(is_active=True, deleted_at__isnull=True)
        .order_by("-updated_at")
        .values_list("updated_at", flat=True)
        .first()
    )
    request_hash = sha256_text(
        canonical_json(
            {
                "feature": AIRequest.Feature.ESTIMATOR,
                "locale": locale,
                "input": normalized,
                "rules_updated_at": latest_rule_update.isoformat() if latest_rule_update else None,
            }
        )
    )
    audit = AIRequest.objects.create(
        feature=AIRequest.Feature.ESTIMATOR,
        locale=locale,
        input_payload=normalized,
        requester_hash=requester_hash,
        request_hash=request_hash,
        status=AIRequest.Status.PENDING,
    )
    rule = EstimationRule.objects.filter(
        delivery_scope=delivery_scope,
        is_active=True,
        deleted_at__isnull=True,
        delivery_scope__is_active=True,
        delivery_scope__deleted_at__isnull=True,
    ).first()
    audit.status = AIRequest.Status.COMPLETED
    audit.completed_at = timezone.now()
    audit.save(update_fields=["status", "completed_at", "updated_at"])
    return {
        "delivery_scope": delivery_scope.key,
        "delivery_scope_label": delivery_scope.label_for(locale),
        "minimum_working_days": rule.minimum_working_days if rule else None,
    }


__all__ = ["estimate_project"]
