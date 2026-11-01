from __future__ import annotations

from typing import Any

from rest_framework import serializers

from apps.ai_engine.models import AIConcept, AISuggestion
from apps.ai_engine.pipelines.serializers import EstimatorResponseSerializer


class AIConceptPublicSerializer(serializers.ModelSerializer[AIConcept]):
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    benefit = serializers.SerializerMethodField()
    solution_area = serializers.SerializerMethodField()
    complexity = serializers.SerializerMethodField()
    delivery_scope = serializers.SerializerMethodField()
    related_item = serializers.SerializerMethodField()

    class Meta:
        model = AIConcept
        fields = (
            "public_id",
            "position",
            "title",
            "description",
            "benefit",
            "solution_area",
            "complexity",
            "delivery_scope",
            "minimum_working_days",
            "related_item",
        )

    def _locale(self) -> str:
        return str(self.context.get("locale", "fa"))

    def get_title(self, obj: AIConcept) -> str:
        return obj.title_for(self._locale())

    def get_description(self, obj: AIConcept) -> str:
        return obj.description_for(self._locale())

    def get_benefit(self, obj: AIConcept) -> str:
        return obj.benefit_for(self._locale())

    def _option(self, option: Any) -> dict[str, str]:
        locale = self._locale()
        return {"key": option.key, "label": option.label_for(locale)}

    def get_solution_area(self, obj: AIConcept) -> dict[str, str]:
        return self._option(obj.solution_area)

    def get_complexity(self, obj: AIConcept) -> dict[str, str]:
        return self._option(obj.complexity)

    def get_delivery_scope(self, obj: AIConcept) -> dict[str, str]:
        return self._option(obj.delivery_scope)

    def get_related_item(self, obj: AIConcept) -> dict[str, str] | None:
        locale = self._locale()
        if obj.related_service is not None:
            title = getattr(obj.related_service, f"title_{locale}", "") or obj.related_service.title
            return {"type": "service", "title": title, "slug": obj.related_service.slug}
        if obj.related_product is not None:
            title = getattr(obj.related_product, f"title_{locale}", "") or obj.related_product.title
            return {"type": "product", "title": title, "slug": obj.related_product.slug}
        return None


class AISuggestionPublicSerializer(serializers.ModelSerializer[AISuggestion]):
    concepts = AIConceptPublicSerializer(many=True, read_only=True)

    class Meta:
        model = AISuggestion
        fields = ("public_id", "locale", "concepts")


class AdvisorCreateResponseSerializer(serializers.Serializer[dict[str, Any]]):
    share_token = serializers.CharField()
    suggestion = AISuggestionPublicSerializer()


class SharedAISuggestionSerializer(AISuggestionPublicSerializer):
    pass


class EstimateResponseSerializer(EstimatorResponseSerializer):
    pass


__all__ = [
    "AIConceptPublicSerializer",
    "AISuggestionPublicSerializer",
    "AdvisorCreateResponseSerializer",
    "EstimateResponseSerializer",
    "SharedAISuggestionSerializer",
]
