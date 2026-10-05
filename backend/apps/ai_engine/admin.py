from __future__ import annotations

from typing import Any

from django.contrib import admin
from django.http import HttpRequest
from django.utils import timezone

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
from apps.core.models import log_action


class AuditedConfigurationAdmin(admin.ModelAdmin[Any]):
    def save_model(self, request: HttpRequest, obj: Any, form: Any, change: bool) -> None:
        super().save_model(request, obj, form, change)
        log_action(
            action=f"ai_engine.{obj._meta.model_name}_{'updated' if change else 'created'}",
            actor=request.user,
            target=obj,
            metadata={"changed_fields": sorted(form.changed_data)},
        )


@admin.register(Catalog)
class CatalogAdmin(AuditedConfigurationAdmin):
    list_display = ("key", "label_fa", "label_en", "is_public", "is_active", "order")
    list_filter = ("is_public", "is_active")
    search_fields = ("key", "label_fa", "label_en")


@admin.register(CatalogOption)
class CatalogOptionAdmin(AuditedConfigurationAdmin):
    list_display = ("catalog", "key", "label_fa", "label_en", "is_public", "is_active", "order")
    list_filter = ("catalog", "is_public", "is_active")
    search_fields = ("catalog__key", "key", "label_fa", "label_en")
    autocomplete_fields = ("catalog",)


@admin.register(EstimationRule)
class EstimationRuleAdmin(AuditedConfigurationAdmin):
    list_display = ("delivery_scope", "minimum_working_days", "is_active", "updated_at")
    list_filter = ("is_active",)
    autocomplete_fields = ("delivery_scope",)


@admin.register(PromptTemplate)
class PromptTemplateAdmin(AuditedConfigurationAdmin):
    list_display = ("feature", "locale", "version", "is_active", "updated_at")
    list_filter = ("feature", "locale", "is_active")
    search_fields = ("feature", "system_prompt")


@admin.register(GuardrailRule)
class GuardrailRuleAdmin(AuditedConfigurationAdmin):
    list_display = ("rule_key", "rule_type", "severity", "is_active", "updated_at")
    list_filter = ("rule_type", "severity", "is_active")
    search_fields = ("rule_key", "description_fa", "description_en")


@admin.register(AIRequest)
class AIRequestAdmin(admin.ModelAdmin[AIRequest]):
    list_display = ("feature", "status", "provider_name", "model_name", "cache_hit", "created_at")
    list_filter = ("feature", "status", "cache_hit", "created_at")
    search_fields = ("public_id", "request_hash", "requester_hash", "error_code")
    readonly_fields = [field.name for field in AIRequest._meta.fields]
    date_hierarchy = "created_at"

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: AIRequest | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: AIRequest | None = None) -> bool:
        return False


@admin.register(AISuggestion)
class AISuggestionAdmin(admin.ModelAdmin[AISuggestion]):
    list_display = ("public_id", "locale", "is_displayable", "share_revoked_at", "created_at")
    list_filter = ("locale", "is_displayable", "share_revoked_at")
    search_fields = ("public_id",)
    readonly_fields = [field.name for field in AISuggestion._meta.fields]
    actions = ("revoke_shares",)

    @admin.action(description="Revoke public share links for selected suggestions", permissions=["change"])
    def revoke_shares(self, request: HttpRequest, queryset: Any) -> None:
        suggestion_ids = list(queryset.filter(share_revoked_at__isnull=True).values_list("pk", flat=True))
        if not suggestion_ids:
            return
        queryset.filter(pk__in=suggestion_ids).update(share_revoked_at=timezone.now())
        log_action(
            action="ai_engine.shares_revoked",
            actor=request.user,
            metadata={"suggestion_ids": suggestion_ids},
        )

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: AISuggestion | None = None) -> bool:
        return request.user.has_perm("ai_engine.change_aisuggestion")


@admin.register(AIConcept)
class AIConceptAdmin(admin.ModelAdmin[AIConcept]):
    list_display = ("title_en", "suggestion", "position", "solution_area", "delivery_scope", "created_at")
    list_filter = ("solution_area", "complexity", "delivery_scope")
    search_fields = ("title_fa", "title_en", "suggestion__public_id")
    readonly_fields = [field.name for field in AIConcept._meta.fields]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: AIConcept | None = None) -> bool:
        return False


@admin.register(AIContentArtifact)
class AIContentArtifactAdmin(admin.ModelAdmin[AIContentArtifact]):
    list_display = ("content_type", "object_id", "locale", "status", "is_stale", "reviewed_by", "created_at")
    list_filter = ("locale", "status", "is_stale")
    search_fields = ("summary_text", "source_hash")
    readonly_fields = (
        "request",
        "content_type",
        "object_id",
        "locale",
        "source_hash",
        "status",
        "is_stale",
        "reviewed_by",
        "reviewed_at",
        "created_at",
        "updated_at",
    )
    actions = ("approve_summaries", "reject_summaries")

    @admin.action(description="Approve selected summaries for public display", permissions=["change"])
    def approve_summaries(self, request: HttpRequest, queryset: Any) -> None:
        artifact_ids = list(queryset.filter(is_stale=False).values_list("pk", flat=True))
        if not artifact_ids:
            return
        queryset.filter(pk__in=artifact_ids).update(
            status=AIContentArtifact.Status.APPROVED,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        log_action(
            action="ai_engine.content_artifacts_approved",
            actor=request.user,
            metadata={"artifact_ids": artifact_ids},
        )

    @admin.action(description="Reject selected summaries", permissions=["change"])
    def reject_summaries(self, request: HttpRequest, queryset: Any) -> None:
        artifact_ids = list(queryset.values_list("pk", flat=True))
        if not artifact_ids:
            return
        queryset.update(
            status=AIContentArtifact.Status.REJECTED,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        log_action(
            action="ai_engine.content_artifacts_rejected",
            actor=request.user,
            metadata={"artifact_ids": artifact_ids},
        )

    def save_model(self, request: HttpRequest, obj: AIContentArtifact, form: Any, change: bool) -> None:
        if change and "summary_text" in form.changed_data:
            obj.status = AIContentArtifact.Status.DRAFT
            obj.is_stale = False
            obj.reviewed_by = None
            obj.reviewed_at = None
        super().save_model(request, obj, form, change)
        log_action(
            action=f"ai_engine.content_artifact_{'updated' if change else 'created'}",
            actor=request.user,
            target=obj,
            metadata={"changed_fields": sorted(form.changed_data)},
        )

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False
