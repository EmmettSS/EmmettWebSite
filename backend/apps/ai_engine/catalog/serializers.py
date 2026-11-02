from __future__ import annotations

from typing import Any, cast

from django.db.models import QuerySet
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.ai_engine.models import Catalog, CatalogOption
from apps.ai_engine.utils import resolve_locale


@extend_schema_field(OpenApiTypes.STR)
class CatalogOptionKeyField(serializers.RelatedField[CatalogOption, CatalogOption, str]):
    """Accept a stable option key but hand a validated CatalogOption to model serializers."""

    def __init__(self, catalog_key: str, **kwargs: Any) -> None:
        self.catalog_key = catalog_key
        super().__init__(queryset=cast(QuerySet[CatalogOption], CatalogOption.objects.none()), **kwargs)

    def get_queryset(self) -> QuerySet[CatalogOption]:
        return cast(
            QuerySet[CatalogOption],
            CatalogOption.objects.select_related("catalog").filter(
                catalog__key=self.catalog_key,
                catalog__is_active=True,
                catalog__is_public=True,
                catalog__deleted_at__isnull=True,
                is_active=True,
                is_public=True,
                deleted_at__isnull=True,
            ),
        )

    def to_internal_value(self, data: Any) -> CatalogOption:
        if not isinstance(data, str) or not data.strip():
            raise serializers.ValidationError("گزینهٔ انتخاب‌شده معتبر یا فعال نیست.")
        try:
            return self.get_queryset().get(key=data.strip())
        except CatalogOption.DoesNotExist as exc:
            raise serializers.ValidationError("گزینهٔ انتخاب‌شده معتبر یا فعال نیست.") from exc

    def to_representation(self, value: Any) -> str:
        if isinstance(value, CatalogOption):
            return value.key
        return str(value)


class CatalogOptionSerializer(serializers.ModelSerializer[CatalogOption]):
    label: Any = serializers.SerializerMethodField()

    class Meta:
        model = CatalogOption
        fields = ("key", "label", "order")

    def get_label(self, obj: CatalogOption) -> str:
        request = self.context.get("request")
        locale = resolve_locale(request) if request is not None else "fa"
        return obj.label_for(locale)


class CatalogSerializer(serializers.ModelSerializer[Catalog]):
    label: Any = serializers.SerializerMethodField()
    options = CatalogOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Catalog
        fields = ("key", "label", "options")

    def get_label(self, obj: Catalog) -> str:
        request = self.context.get("request")
        locale = resolve_locale(request) if request is not None else "fa"
        return obj.label_en if locale == "en" else obj.label_fa
