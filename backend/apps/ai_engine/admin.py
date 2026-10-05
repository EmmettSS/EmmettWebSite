"""ادمین اپ ``ai_engine`` — پیکربندی موتور AI + دادهٔ اجرا (فاز ۶).

اصول این فایل:

* **کلیدها تغییرناپذیرند:** ``Catalog.key``، ``CatalogOption.key``،
  ``PromptTemplate`` (feature/locale/version) و ``GuardrailRule.rule_key`` پس از
  ساخت فقط‌خواندنی می‌شوند؛ این کلیدها به pipeline مقیدند و تغییرشان یعنی از
  کار افتادن پاسخ‌های ذخیره‌شده (ADR-0014).
* **پیکربندی با پاسخ‌گویی:** هر ذخیره در ``AuditLog`` ثبت می‌شود.
* **دادهٔ اجرا فقط‌خواندنی است** و فقط صادر می‌شود (بدون واردات).
* **نسخهٔ فعال Prompt:** pipeline بالاترین ``version`` فعال را برمی‌گزیند؛ اکشن
  «بایگانی نسخه‌های قدیمی» فقط نسخه‌های پایین‌تر از نسخهٔ فعال را غیرفعال می‌کند.
"""

from __future__ import annotations

from typing import Any

from django.contrib import admin, messages
from django.http import HttpRequest
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

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
from apps.ai_engine.resources import (
    AIConceptResource,
    AIContentArtifactResource,
    AIRequestResource,
    AISuggestionResource,
    CatalogOptionResource,
    CatalogResource,
    EstimationRuleResource,
    GuardrailRuleResource,
    PromptTemplateResource,
)
from apps.core.admin_mixins import (
    EmmettImportExportAdmin,
    ImportDisabledMixin,
    RecordStateFilter,
    SoftDeleteAdminMixin,
    render_status_pill,
)
from apps.core.models import log_action


class AuditedConfigurationAdmin(SoftDeleteAdminMixin, EmmettImportExportAdmin):
    """پایهٔ پیکربندی: نرم‌حذف قابل‌بازگردانی + ثبت هر ساخت/ویرایش در ``AuditLog``.

    مدل‌های پیکربندی از ``BaseModel`` ارث می‌برند، پس ``delete()`` پیش‌فرض
    نرم‌حذف است؛ بدون این mixin اکشن «بازگردانی» وجود نداشت و ردیف حذف‌شده
    فقط با فیلتر «وضعیت رکورد» دیده می‌شد ولی برنمی‌گشت (رفع در فاز ۶).
    """

    def save_model(self, request: HttpRequest, obj: Any, form: Any, change: bool) -> None:
        super().save_model(request, obj, form, change)
        log_action(
            action=f"ai_engine.{obj._meta.model_name}_{'updated' if change else 'created'}",
            actor=request.user,
            target=obj,
            metadata={"changed_fields": sorted(form.changed_data)},
        )


class CatalogOptionInline(admin.TabularInline[CatalogOption, Catalog]):
    """گزینه‌های کاتالوگ — ویرایش درون صفحهٔ کاتالوگ (قلب ورودی enum-bound)."""

    model = CatalogOption
    extra = 0
    fields = ("key", "label_fa", "label_en", "is_public", "order", "is_active", "metadata")
    ordering = ("order", "key")
    show_change_link = True
    readonly_fields = ()


@admin.register(Catalog)
class CatalogAdmin(AuditedConfigurationAdmin):
    resource_class = CatalogResource
    list_display = ("key", "label_fa", "label_en", "option_count", "is_public", "is_active", "order")
    list_display_links = ("key",)
    list_editable = ("is_public", "is_active", "order")
    list_filter = ("is_public", "is_active", RecordStateFilter)
    search_fields = ("key", "label_fa", "label_en")
    ordering = ("order", "key")
    inlines = [CatalogOptionInline]

    @admin.display(description=_("Options"))
    def option_count(self, obj: Catalog) -> int:
        return obj.options.count()

    def get_readonly_fields(self, request: HttpRequest, obj: Catalog | None = None) -> tuple[str, ...]:
        """کلید کاتالوگ پس از ساخت قفل می‌شود (ADR-0014)."""

        return ("key",) if obj is not None else ()

    def get_queryset(self, request: HttpRequest) -> Any:
        return super().get_queryset(request).prefetch_related("options")


class EstimationRuleInline(admin.StackedInline[EstimationRule, CatalogOption]):
    """حداقل زمان تحویل را همان‌جا کنار گزینهٔ کاتالوگ ``delivery_scope`` ویرایش کنید."""

    model = EstimationRule
    extra = 0
    max_num = 1
    fields = ("minimum_working_days", "note_fa", "note_en", "is_active")


@admin.register(CatalogOption)
class CatalogOptionAdmin(AuditedConfigurationAdmin):
    resource_class = CatalogOptionResource
    list_display = ("key", "catalog", "label_fa", "label_en", "is_public", "is_active", "order")
    list_display_links = ("key",)
    list_editable = ("is_public", "is_active", "order")
    list_filter = ("catalog", "is_public", "is_active", RecordStateFilter)
    search_fields = ("catalog__key", "key", "label_fa", "label_en")
    autocomplete_fields = ("catalog",)
    list_select_related = ("catalog",)
    ordering = ("catalog__order", "catalog_id", "order", "key")
    inlines = [EstimationRuleInline]

    def get_inlines(self, request: HttpRequest, obj: CatalogOption | None = None) -> list[Any]:
        """اینلاین «حداقل زمان تحویل» فقط برای گزینه‌های کاتالوگ ``delivery_scope``."""

        if obj is not None and obj.catalog.key == "delivery_scope":
            return [EstimationRuleInline]
        return []

    def get_readonly_fields(self, request: HttpRequest, obj: CatalogOption | None = None) -> tuple[str, ...]:
        if obj is None:
            return ()
        return ("catalog", "key")


@admin.register(EstimationRule)
class EstimationRuleAdmin(AuditedConfigurationAdmin):
    resource_class = EstimationRuleResource
    list_display = ("delivery_scope", "minimum_working_days", "note_fa", "is_active", "updated_at")
    list_filter = ("is_active", RecordStateFilter)
    autocomplete_fields = ("delivery_scope",)
    list_select_related = ("delivery_scope",)
    search_fields = ("delivery_scope__key", "delivery_scope__label_fa", "note_fa", "note_en")


@admin.register(PromptTemplate)
class PromptTemplateAdmin(AuditedConfigurationAdmin):
    resource_class = PromptTemplateResource
    list_display = ("feature", "locale", "version", "is_effective", "is_active", "updated_at")
    list_filter = ("feature", "locale", "is_active", RecordStateFilter)
    search_fields = ("feature", "system_prompt")
    ordering = ("feature", "locale", "-version")
    actions = ("archive_superseded_versions",)
    fieldsets = (
        (None, {"fields": ("feature", "locale", "version")}),
        (_("Prompt"), {"fields": ("system_prompt",)}),
        (_("Publication"), {"fields": ("is_active",)}),
    )

    def get_readonly_fields(self, request: HttpRequest, obj: PromptTemplate | None = None) -> tuple[str, ...]:
        return ("feature", "locale", "version") if obj is not None else ()

    @admin.display(boolean=True, description=_("Active version"))
    def is_effective(self, obj: PromptTemplate) -> bool:
        """آیا این رکورد، نسخه‌ای است که pipeline واقعاً استفاده می‌کند؟"""

        if not (obj.is_active and obj.deleted_at is None):
            return False
        newest: int | None = (
            PromptTemplate.objects.filter(
                feature=obj.feature,
                locale=obj.locale,
                is_active=True,
                deleted_at__isnull=True,
            )
            .order_by("-version")
            .values_list("version", flat=True)
            .first()
        )
        return newest == obj.version

    @admin.action(description=_("Archive superseded versions of the same feature and locale"))
    def archive_superseded_versions(self, request: HttpRequest, queryset: Any) -> None:
        """نسخه‌های پایین‌تر از نسخهٔ فعالِ همان (feature, locale) را بایگانی می‌کند."""

        archived = 0
        pairs = set(queryset.values_list("feature", "locale"))
        for feature, locale in sorted(pairs):
            newest = (
                PromptTemplate.objects.filter(feature=feature, locale=locale, is_active=True)
                .order_by("-version")
                .values_list("version", flat=True)
                .first()
            )
            if newest is None:
                continue
            archived += PromptTemplate.objects.filter(
                feature=feature, locale=locale, version__lt=newest, is_active=True
            ).update(is_active=False)
        if archived:
            log_action(
                action="ai_engine.prompt_versions_archived",
                actor=request.user,
                metadata={"archived": archived, "pairs": sorted(f"{f}:{loc}" for f, loc in pairs)},
            )
        self.message_user(
            request,
            _("Archived %(count)s superseded prompt version(s).") % {"count": archived},
            level=messages.SUCCESS if archived else messages.WARNING,
        )


@admin.register(GuardrailRule)
class GuardrailRuleAdmin(AuditedConfigurationAdmin):
    resource_class = GuardrailRuleResource
    list_display = ("rule_key", "rule_type", "severity", "is_active", "updated_at")
    list_display_links = ("rule_key",)
    list_filter = ("rule_type", "severity", "is_active", RecordStateFilter)
    search_fields = ("rule_key", "description_fa", "description_en")
    ordering = ("rule_key",)
    fieldsets = (
        (None, {"fields": ("rule_key", "rule_type", "severity")}),
        (_("Descriptions"), {"fields": ("description_fa", "description_en")}),
        (_("Configuration"), {"fields": ("config", "is_active")}),
    )

    def get_readonly_fields(self, request: HttpRequest, obj: GuardrailRule | None = None) -> tuple[str, ...]:
        return ("rule_key",) if obj is not None else ()


class ReadOnlyAIAdmin(ImportDisabledMixin, EmmettImportExportAdmin, SoftDeleteAdminMixin):
    """دادهٔ اجرای موتور AI: فقط‌خواندنی، فقط صادرات."""

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Any | None = None) -> bool:
        """مشاهدهٔ جزئیات مجاز است، اما هیچ فیلدی قابل ویرایش نیست."""

        return False

    def has_delete_permission(self, request: HttpRequest, obj: Any | None = None) -> bool:
        return False


@admin.register(AIRequest)
class AIRequestAdmin(ReadOnlyAIAdmin):
    resource_class = AIRequestResource
    list_display = (
        "created_at",
        "feature",
        "status",
        "provider_name",
        "model_name",
        "latency_ms",
        "cache_hit",
    )
    list_display_links = ("created_at",)
    list_filter = ("feature", "status", "cache_hit", "locale", "created_at", RecordStateFilter)
    search_fields = ("public_id", "request_hash", "requester_hash", "error_code")
    readonly_fields = [field.name for field in AIRequest._meta.fields]
    date_hierarchy = "created_at"
    ordering = ("-created_at",)


@admin.register(AISuggestion)
class AISuggestionAdmin(ReadOnlyAIAdmin):
    resource_class = AISuggestionResource
    list_display = ("public_id", "locale", "output_version", "is_displayable", "share_state", "created_at")
    list_display_links = ("public_id",)
    list_filter = ("locale", "is_displayable", "created_at", RecordStateFilter)
    search_fields = ("public_id", "request__public_id")
    readonly_fields = [field.name for field in AISuggestion._meta.fields]
    date_hierarchy = "created_at"
    actions = ("revoke_shares",)

    def has_change_permission(self, request: HttpRequest, obj: AISuggestion | None = None) -> bool:
        """رکوردها ویرایش‌شدنی نیستند، اما «لغو اشتراک عمومی» یک اقدام تعدیلی است.

        این متد فقط دروازهٔ همان اکشن است: همهٔ فیلدها ``readonly`` هستند، پس
        حتی با داشتن مجوز ``change`` هم متن/خروجی قابل دست‌کاری نیست.
        """

        return request.user.has_perm("ai_engine.change_aisuggestion")

    @admin.display(description=_("Public share"))
    def share_state(self, obj: AISuggestion) -> str:
        return str(_("Revoked")) if obj.share_revoked_at else str(_("Active"))

    @admin.action(description=_("Revoke public share links for selected suggestions"), permissions=["change"])
    def revoke_shares(self, request: HttpRequest, queryset: Any) -> None:
        suggestion_ids = list(queryset.filter(share_revoked_at__isnull=True).values_list("pk", flat=True))
        if not suggestion_ids:
            self.message_user(request, _("Nothing to revoke: no active share link was selected."))
            return
        queryset.filter(pk__in=suggestion_ids).update(share_revoked_at=timezone.now())
        log_action(
            action="ai_engine.shares_revoked",
            actor=request.user,
            metadata={"suggestion_ids": suggestion_ids},
        )
        self.message_user(request, _("Revoked %(count)s share link(s).") % {"count": len(suggestion_ids)})


@admin.register(AIConcept)
class AIConceptAdmin(ReadOnlyAIAdmin):
    resource_class = AIConceptResource
    list_display = (
        "title_en",
        "suggestion",
        "position",
        "solution_area",
        "delivery_scope",
        "minimum_working_days",
    )
    list_filter = ("solution_area", "complexity", "delivery_scope", RecordStateFilter)
    search_fields = ("title_fa", "title_en", "suggestion__public_id")
    readonly_fields = [field.name for field in AIConcept._meta.fields]
    list_select_related = ("suggestion", "solution_area", "complexity", "delivery_scope")


@admin.register(AIContentArtifact)
class AIContentArtifactAdmin(EmmettImportExportAdmin, SoftDeleteAdminMixin):
    """خلاصه‌های تولیدشده — تنها بخش «ویرایش‌پذیر» دادهٔ اجرا: متن خلاصه و تأیید."""

    resource_class = AIContentArtifactResource
    list_display = (
        "content_type",
        "object_id",
        "locale",
        "status_badge",
        "is_stale",
        "reviewed_by",
        "created_at",
    )
    list_filter = ("locale", "status", "is_stale", "content_type", RecordStateFilter)
    search_fields = ("summary_text", "source_hash")
    autocomplete_fields = ("reviewed_by",)
    date_hierarchy = "created_at"
    actions = ("approve_summaries", "reject_summaries")
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

    @admin.display(description=_("Status"), ordering="status")
    def status_badge(self, obj: AIContentArtifact) -> str:
        return render_status_pill(str(obj.status), AIContentArtifact.Status.choices)

    @admin.action(description=_("Approve selected summaries for public display"), permissions=["change"])
    def approve_summaries(self, request: HttpRequest, queryset: Any) -> None:
        artifact_ids = list(queryset.filter(is_stale=False).values_list("pk", flat=True))
        if not artifact_ids:
            self.message_user(request, _("Nothing to approve: selected summaries are stale."))
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
        self.message_user(request, _("Approved %(count)s summarie(s).") % {"count": len(artifact_ids)})

    @admin.action(description=_("Reject selected summaries"), permissions=["change"])
    def reject_summaries(self, request: HttpRequest, queryset: Any) -> None:
        artifact_ids = list(queryset.values_list("pk", flat=True))
        if not artifact_ids:
            self.message_user(request, _("Nothing to reject: no summary was selected."))
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
        self.message_user(request, _("Rejected %(count)s summarie(s).") % {"count": len(artifact_ids)})

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
