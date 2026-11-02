from __future__ import annotations

from typing import Any

from rest_framework import serializers

from apps.ai_engine.catalog.serializers import CatalogOptionKeyField
from apps.ai_engine.models import CatalogOption


class GoalsField(serializers.ListField):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(
            child=CatalogOptionKeyField("goal"),
            allow_empty=False,
            max_length=5,
            **kwargs,
        )

    def to_internal_value(self, data: Any) -> list[CatalogOption]:
        values = super().to_internal_value(data)
        keys = [option.key for option in values]
        if len(keys) != len(set(keys)):
            raise serializers.ValidationError("اهداف تکراری مجاز نیستند.")
        return values


class AdvisorRequestSerializer(serializers.Serializer[dict[str, Any]]):
    job_role = CatalogOptionKeyField("job_role")
    business_size = CatalogOptionKeyField("business_size")
    city_scale = CatalogOptionKeyField("city_scale")
    budget_range = CatalogOptionKeyField("budget_range")
    team_size = CatalogOptionKeyField("team_size")
    goals = GoalsField()


class EstimatorRequestSerializer(AdvisorRequestSerializer):
    delivery_scope = CatalogOptionKeyField("delivery_scope")


class AILeadContactSerializer(serializers.Serializer[dict[str, Any]]):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    project_type = CatalogOptionKeyField("project_type")
    budget_range = CatalogOptionKeyField("budget_range")
    timeline = CatalogOptionKeyField("timeline")
    message = serializers.CharField(max_length=5000, required=False, allow_blank=True, default="")
    consent_given = serializers.BooleanField()

    def validate_consent_given(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError("برای ارسال درخواست باید رضایت اعلام شود.")
        return value


class AdvisorLeadRequestSerializer(serializers.Serializer[dict[str, Any]]):
    share_token = serializers.RegexField(regex=r"^[A-Za-z0-9_-]{32,128}$", max_length=128)
    concept_public_id = serializers.UUIDField()
    contact = AILeadContactSerializer()


class EstimatorResponseSerializer(serializers.Serializer[dict[str, Any]]):
    delivery_scope = serializers.CharField()
    delivery_scope_label = serializers.CharField()
    minimum_working_days = serializers.IntegerField(min_value=1, allow_null=True)
