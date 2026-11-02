"""Fail-closed baseline and database-configurable AI output guardrails."""

from __future__ import annotations

import re
from collections.abc import Iterable

from apps.ai_engine.models import GuardrailRule

_PRICE_PATTERN = re.compile(
    r"(?:[$€£]\s*\d|\b\d[\d,.]*\s*(?:تومان|ریال|IRR|USD|EUR|dollars?)\b)",
    re.IGNORECASE,
)
_DELIVERY_GUARANTEE_PATTERN = re.compile(
    r"(?:guarantee(?:d)?\s+(?:delivery|completion)|will be delivered in|تحویل قطعی|تضمین\s+(?:تحویل|اجرا))",
    re.IGNORECASE,
)
_HTML_PATTERN = re.compile(r"<\s*/?\s*[a-zA-Z][^>]*>")


class GuardrailViolation(ValueError):
    def __init__(self, flags: list[str]) -> None:
        super().__init__("generated_content_blocked")
        self.flags = flags


def _rule_terms(rule: GuardrailRule, locale: str) -> list[str]:
    key = "terms_en" if locale == "en" else "terms_fa"
    terms = rule.config.get(key, [])
    if not isinstance(terms, list):
        return []
    return [item.casefold() for item in terms if isinstance(item, str) and item.strip()]


def check_generated_text(texts: Iterable[str], *, locale: str) -> list[str]:
    combined = "\n".join(texts)
    normalized = combined.casefold()
    flags: list[str] = []

    # These invariants remain active even if an administrator disables a DB rule.
    if _HTML_PATTERN.search(combined):
        flags.append("markup_not_allowed")
    if _PRICE_PATTERN.search(combined):
        flags.append("price_claim")
    if _DELIVERY_GUARANTEE_PATTERN.search(combined):
        flags.append("delivery_guarantee")

    rules = GuardrailRule.objects.filter(is_active=True, deleted_at__isnull=True).order_by("rule_key")
    for rule in rules:
        if rule.rule_type == GuardrailRule.RuleType.BLOCKED_TERMS:
            if any(term in normalized for term in _rule_terms(rule, locale)):
                flags.append(rule.rule_key)
        elif rule.rule_type == GuardrailRule.RuleType.OUTPUT_POLICY:
            if rule.config.get("disallow_price_claims") and _PRICE_PATTERN.search(combined):
                flags.append(rule.rule_key)
            if rule.config.get("disallow_delivery_guarantees") and _DELIVERY_GUARANTEE_PATTERN.search(
                combined
            ):
                flags.append(rule.rule_key)

    return sorted(set(flags))


def enforce_generated_text(texts: Iterable[str], *, locale: str) -> None:
    flags = check_generated_text(texts, locale=locale)
    if flags:
        raise GuardrailViolation(flags)
