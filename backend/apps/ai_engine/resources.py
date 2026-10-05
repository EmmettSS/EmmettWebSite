"""منابع صادرات/واردات اپ ``ai_engine`` (ADR-0029).

تفکیک عمدی:

* **پیکربندی** (Catalog/CatalogOption/PromptTemplate/GuardrailRule/EstimationRule)
  هم صادر می‌شود و هم وارد — تا مالک محصول بتواند کل پیکربندی موتور AI را در یک
  فایل CSV/JSON پشتیبان بگیرد و روی نصب دیگر بازگرداند (کلیدها تغییرناپذیرند،
  پس واردات idempotent است).
* **دادهٔ اجرا** (AIRequest/AISuggestion/AIConcept/AIContentArtifact) فقط صادر
  می‌شود؛ واردات خروجی مدل زبانی، تمام تضمین‌های guardrail و audit را دور می‌زند.
"""

from __future__ import annotations

from typing import Any

from import_export import fields
from import_export.widgets import ForeignKeyWidget

from apps.ai_engine.models import (
    AIConcept,
    AIContentArtifact,
    AIRequest,
    AISuggestion,
    Catalog,
    CatalogOption,
    EstimationRule,
    GuardrailRule,
    PromptTemplate,
)
from apps.core.resources import EmmettResource, i18n_fields


class DeliveryScopeWidget(ForeignKeyWidget):  # type: ignore[misc]
    """``delivery_scope`` بر اساس ``key`` در کاتالوگ ``delivery_scope`` پیدا می‌شود."""

    def __init__(self) -> None:  # pragma: no cover - تنظیم ساده
        super().__init__(CatalogOption, field="key")

    def get_queryset(self, value: str, row: dict[str, Any], *args: Any, **kwargs: Any) -> Any:
        return CatalogOption.objects.filter(catalog__key="delivery_scope")


class CatalogResource(EmmettResource):
    class Meta:
        model = Catalog
        fields = i18n_fields(("key", "label_fa", "label_en", "is_public", "order", "is_active"), ())
        export_order = fields
        import_id_fields = ("key",)
        skip_unchanged = True
        report_skipped = True


class CatalogOptionResource(EmmettResource):
    class Meta:
        model = CatalogOption
        fields = i18n_fields(
            ("catalog", "key", "label_fa", "label_en", "is_public", "order", "is_active", "metadata"), ()
        )
        export_order = fields
        import_id_fields = ("catalog", "key")
        skip_unchanged = True
        report_skipped = True


class PromptTemplateResource(EmmettResource):
    class Meta:
        model = PromptTemplate
        fields = (
            "schema_version",
            "feature",
            "locale",
            "version",
            "system_prompt",
            "is_active",
        )
        export_order = fields
        import_id_fields = ("feature", "locale", "version")
        skip_unchanged = True
        report_skipped = True


class GuardrailRuleResource(EmmettResource):
    class Meta:
        model = GuardrailRule
        fields = (
            "schema_version",
            "rule_key",
            "rule_type",
            "description_fa",
            "description_en",
            "severity",
            "config",
            "is_active",
        )
        export_order = fields
        import_id_fields = ("rule_key",)
        skip_unchanged = True


class EstimationRuleResource(EmmettResource):
    class Meta:
        model = EstimationRule
        fields = (
            "schema_version",
            "delivery_scope",
            "minimum_working_days",
            "note_fa",
            "note_en",
            "is_active",
        )
        export_order = fields
        import_id_fields = ("delivery_scope",)
        skip_unchanged = True

    delivery_scope = fields.Field(
        attribute="delivery_scope",
        column_name="delivery_scope",
        widget=DeliveryScopeWidget(),
    )


class AIRequestResource(EmmettResource):
    class Meta:
        model = AIRequest
        fields = (
            "schema_version",
            "created_at",
            "public_id",
            "feature",
            "locale",
            "status",
            "provider_name",
            "model_name",
            "prompt_version",
            "latency_ms",
            "input_tokens",
            "output_tokens",
            "cache_hit",
            "error_code",
            "guardrail_flags",
            "completed_at",
        )
        export_order = fields


class AISuggestionResource(EmmettResource):
    class Meta:
        model = AISuggestion
        fields = (
            "schema_version",
            "created_at",
            "public_id",
            "request",
            "locale",
            "output_version",
            "is_displayable",
            "guardrail_flags",
            "share_revoked_at",
        )
        export_order = fields


class AIConceptResource(EmmettResource):
    class Meta:
        model = AIConcept
        fields = (
            "schema_version",
            "created_at",
            "suggestion",
            "position",
            "title_fa",
            "title_en",
            "benefit_fa",
            "benefit_en",
            "solution_area",
            "complexity",
            "delivery_scope",
            "minimum_working_days",
        )
        export_order = fields


class AIContentArtifactResource(EmmettResource):
    class Meta:
        model = AIContentArtifact
        fields = (
            "schema_version",
            "created_at",
            "content_type",
            "object_id",
            "locale",
            "status",
            "is_stale",
            "source_hash",
            "reviewed_by",
            "reviewed_at",
        )
        export_order = fields


__all__ = [
    "AIConceptResource",
    "AIContentArtifactResource",
    "AIRequestResource",
    "AISuggestionResource",
    "CatalogOptionResource",
    "CatalogResource",
    "DeliveryScopeWidget",
    "EstimationRuleResource",
    "GuardrailRuleResource",
    "PromptTemplateResource",
]
