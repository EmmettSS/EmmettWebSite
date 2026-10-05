"""Shared AI gateway, database catalogs, durable results, and editorial artifacts."""

from __future__ import annotations

import uuid
from typing import Any

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class Catalog(BaseModel):
    key = models.SlugField(_("catalog key"), max_length=64, unique=True)
    label_fa = models.CharField(_("Persian label"), max_length=100)
    label_en = models.CharField(_("English label"), max_length=100)
    is_public = models.BooleanField(_("public"), default=True)
    order = models.PositiveIntegerField(_("order"), default=0)

    class Meta(BaseModel.Meta):
        verbose_name = _("Catalog")
        verbose_name_plural = _("Catalogs")
        ordering = ["order", "key"]

    def __str__(self) -> str:
        return self.key

    def _validate_key_immutability(self) -> None:
        if self.pk is None:
            return
        original_key = type(self).all_objects.filter(pk=self.pk).values_list("key", flat=True).first()
        if original_key is not None and self.key != original_key:
            raise ValidationError({"key": _("Catalog keys cannot be changed after creation.")})

    def clean(self) -> None:
        super().clean()
        self._validate_key_immutability()

    def save(self, *args: Any, **kwargs: Any) -> None:
        self._validate_key_immutability()
        super().save(*args, **kwargs)


class CatalogOption(BaseModel):
    catalog = models.ForeignKey(Catalog, on_delete=models.PROTECT, related_name="options")
    key = models.SlugField(_("option key"), max_length=64)
    label_fa = models.CharField(_("Persian label"), max_length=120)
    label_en = models.CharField(_("English label"), max_length=120)
    is_public = models.BooleanField(_("public"), default=True)
    order = models.PositiveIntegerField(_("order"), default=0)
    metadata = models.JSONField(_("metadata"), default=dict, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("Catalog Option")
        verbose_name_plural = _("Catalog Options")
        ordering = ["catalog__order", "catalog_id", "order", "key"]
        constraints = [
            models.UniqueConstraint(fields=["catalog", "key"], name="ai_catalog_option_key_unique")
        ]
        indexes = [models.Index(fields=["catalog", "is_active", "is_public"])]

    def __str__(self) -> str:
        return f"{self.catalog.key}:{self.key}"

    def label_for(self, locale: str) -> str:
        return self.label_en if locale == "en" else self.label_fa

    def _validate_key_immutability(self) -> None:
        if self.pk is None:
            return
        original = type(self).all_objects.filter(pk=self.pk).values_list("catalog_id", "key").first()
        if original is not None and (self.catalog_id, self.key) != original:
            raise ValidationError(
                {"key": _("Catalog option keys and their catalog cannot be changed after creation.")}
            )

    def clean(self) -> None:
        super().clean()
        self._validate_key_immutability()

    def save(self, *args: Any, **kwargs: Any) -> None:
        self._validate_key_immutability()
        super().save(*args, **kwargs)


class PromptTemplate(BaseModel):
    class Feature(models.TextChoices):
        ADVISOR = "advisor", _("Creative advisor")
        BLOG_SUMMARY = "blog_summary", _("Blog summary")

    class Locale(models.TextChoices):
        FA = "fa", _("Persian")
        EN = "en", _("English")

    feature = models.CharField(_("feature"), max_length=30, choices=Feature.choices)
    locale = models.CharField(_("locale"), max_length=5, choices=Locale.choices)
    version = models.PositiveSmallIntegerField(_("version"), default=1)
    system_prompt = models.TextField(_("system prompt"))

    class Meta(BaseModel.Meta):
        verbose_name = _("AI Prompt Template")
        verbose_name_plural = _("AI Prompt Templates")
        constraints = [
            models.UniqueConstraint(
                fields=["feature", "locale", "version"], name="ai_prompt_feature_locale_version_unique"
            )
        ]
        indexes = [models.Index(fields=["feature", "locale", "is_active"])]

    def __str__(self) -> str:
        return f"{self.feature}:{self.locale}:v{self.version}"


class GuardrailRule(BaseModel):
    class RuleType(models.TextChoices):
        BLOCKED_TERMS = "blocked_terms", _("Blocked terms")
        OUTPUT_POLICY = "output_policy", _("Output policy")

    class Severity(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")

    rule_key = models.SlugField(_("rule key"), max_length=80, unique=True)
    rule_type = models.CharField(_("rule type"), max_length=30, choices=RuleType.choices)
    description_fa = models.CharField(_("Persian description"), max_length=180)
    description_en = models.CharField(_("English description"), max_length=180)
    severity = models.CharField(_("severity"), max_length=10, choices=Severity.choices, default=Severity.HIGH)
    config = models.JSONField(_("rule configuration"), default=dict, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("AI Guardrail Rule")
        verbose_name_plural = _("AI Guardrail Rules")
        ordering = ["rule_key"]

    def __str__(self) -> str:
        return self.rule_key


class EstimationRule(BaseModel):
    delivery_scope = models.OneToOneField(
        CatalogOption,
        on_delete=models.PROTECT,
        related_name="estimation_rule",
        limit_choices_to={"catalog__key": "delivery_scope"},
    )
    minimum_working_days = models.PositiveSmallIntegerField(_("minimum working days"))
    note_fa = models.CharField(_("Persian note"), max_length=240, blank=True, default="")
    note_en = models.CharField(_("English note"), max_length=240, blank=True, default="")

    class Meta(BaseModel.Meta):
        verbose_name = _("Estimation Rule")
        verbose_name_plural = _("Estimation Rules")
        ordering = ["minimum_working_days"]

    def __str__(self) -> str:
        return f"{self.delivery_scope.key}: {self.minimum_working_days} work days minimum"


class AIRequest(BaseModel):
    class Feature(models.TextChoices):
        ADVISOR = "advisor", _("Creative advisor")
        ESTIMATOR = "estimator", _("Project estimator")
        BLOG_SUMMARY = "blog_summary", _("Blog summary")

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        COMPLETED = "completed", _("Completed")
        FAILED = "failed", _("Failed")
        BLOCKED = "blocked", _("Blocked")

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    feature = models.CharField(_("feature"), max_length=30, choices=Feature.choices, db_index=True)
    locale = models.CharField(_("locale"), max_length=5, choices=settings.LANGUAGES)
    status = models.CharField(_("status"), max_length=12, choices=Status.choices, default=Status.PENDING)
    input_payload = models.JSONField(_("structured input"), default=dict, blank=True)
    request_hash = models.CharField(_("request hash"), max_length=64, blank=True, default="", db_index=True)
    requester_hash = models.CharField(
        _("requester pseudonym"), max_length=64, blank=True, default="", db_index=True
    )
    provider_name = models.CharField(_("provider"), max_length=80, blank=True, default="")
    model_name = models.CharField(_("model"), max_length=120, blank=True, default="")
    prompt_version = models.PositiveSmallIntegerField(_("prompt version"), null=True, blank=True)
    latency_ms = models.PositiveIntegerField(_("latency (ms)"), null=True, blank=True)
    input_tokens = models.PositiveIntegerField(_("input tokens"), null=True, blank=True)
    output_tokens = models.PositiveIntegerField(_("output tokens"), null=True, blank=True)
    cache_hit = models.BooleanField(_("cache hit"), default=False)
    error_code = models.CharField(_("safe error code"), max_length=64, blank=True, default="")
    guardrail_flags = models.JSONField(_("guardrail flags"), default=list, blank=True)
    completed_at = models.DateTimeField(_("completed at"), null=True, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("AI Request Audit")
        verbose_name_plural = _("AI Request Audits")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["feature", "status", "created_at"]),
            models.Index(fields=["request_hash", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.feature} {self.status} @ {self.created_at:%Y-%m-%d %H:%M}"


class AISuggestion(BaseModel):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    request = models.OneToOneField(
        AIRequest, null=True, blank=True, on_delete=models.SET_NULL, related_name="suggestion"
    )
    locale = models.CharField(_("locale"), max_length=5, choices=settings.LANGUAGES)
    output_version = models.PositiveSmallIntegerField(_("output version"), default=1)
    share_token_hash = models.CharField(
        _("share token hash"), max_length=64, unique=True, null=True, blank=True
    )
    share_revoked_at = models.DateTimeField(_("share revoked at"), null=True, blank=True)
    is_displayable = models.BooleanField(_("displayable"), default=True)
    guardrail_flags = models.JSONField(_("guardrail flags"), default=list, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("AI Suggestion")
        verbose_name_plural = _("AI Suggestions")
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["share_revoked_at", "is_displayable"])]

    def __str__(self) -> str:
        return f"Suggestion {self.public_id}"

    def revoke_share(self, *, at: Any | None = None) -> None:
        self.share_revoked_at = at or timezone.now()
        self.save(update_fields=["share_revoked_at", "updated_at"])


class AIConcept(BaseModel):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    suggestion = models.ForeignKey(AISuggestion, on_delete=models.CASCADE, related_name="concepts")
    position = models.PositiveSmallIntegerField(_("position"))
    title_fa = models.CharField(_("Persian title"), max_length=140)
    title_en = models.CharField(_("English title"), max_length=140)
    description_fa = models.TextField(_("Persian description"), max_length=1600)
    description_en = models.TextField(_("English description"), max_length=1600)
    benefit_fa = models.CharField(_("Persian benefit"), max_length=600)
    benefit_en = models.CharField(_("English benefit"), max_length=600)
    solution_area = models.ForeignKey(
        CatalogOption, on_delete=models.PROTECT, related_name="solution_concepts"
    )
    complexity = models.ForeignKey(
        CatalogOption, on_delete=models.PROTECT, related_name="complexity_concepts"
    )
    delivery_scope = models.ForeignKey(
        CatalogOption, on_delete=models.PROTECT, related_name="delivery_concepts"
    )
    minimum_working_days = models.PositiveSmallIntegerField(_("minimum working days"), null=True, blank=True)
    related_service = models.ForeignKey(
        "services.Service", null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_concepts"
    )
    related_product = models.ForeignKey(
        "portfolio.Project", null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_concepts"
    )

    class Meta(BaseModel.Meta):
        verbose_name = _("AI Concept")
        verbose_name_plural = _("AI Concepts")
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=["suggestion", "position"], name="ai_concept_position_unique")
        ]
        indexes = [models.Index(fields=["suggestion", "position"])]

    def __str__(self) -> str:
        return self.title_en or self.title_fa

    def title_for(self, locale: str) -> str:
        return self.title_en if locale == "en" else self.title_fa

    def description_for(self, locale: str) -> str:
        return self.description_en if locale == "en" else self.description_fa

    def benefit_for(self, locale: str) -> str:
        return self.benefit_en if locale == "en" else self.benefit_fa


class AIContentArtifact(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", _("Draft")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")

    request = models.ForeignKey(
        AIRequest, null=True, blank=True, on_delete=models.SET_NULL, related_name="content_artifacts"
    )
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, related_name="ai_content_artifacts"
    )
    object_id = models.PositiveBigIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")
    locale = models.CharField(_("locale"), max_length=5, choices=settings.LANGUAGES)
    summary_text = models.TextField(_("summary"), max_length=1200)
    source_hash = models.CharField(_("source content hash"), max_length=64, db_index=True)
    status = models.CharField(_("review status"), max_length=10, choices=Status.choices, default=Status.DRAFT)
    is_stale = models.BooleanField(_("stale"), default=False, db_index=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_ai_artifacts",
    )
    reviewed_at = models.DateTimeField(_("reviewed at"), null=True, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name = _("AI Content Artifact")
        verbose_name_plural = _("AI Content Artifacts")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["content_type", "object_id", "locale", "status"]),
            models.Index(fields=["source_hash", "status", "is_stale"]),
        ]

    def __str__(self) -> str:
        return f"{self.content_type.app_label}.{self.content_type.model}#{self.object_id} [{self.locale}]"
