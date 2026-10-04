from __future__ import annotations

from rest_framework import serializers

from apps.services.models import Service
from apps.taxonomy.serializers import CategorySerializer, TagSerializer


class ServiceListSerializer(serializers.ModelSerializer[Service]):
    class Meta:
        model = Service
        fields = ("public_id", "title", "slug", "summary", "icon", "is_featured", "order")


class ServiceDetailSerializer(serializers.ModelSerializer[Service]):
    categories = CategorySerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = (
            "public_id",
            "title",
            "slug",
            "summary",
            "description_html",
            "icon",
            "categories",
            "tags",
            "meta_title",
            "meta_description",
            "canonical_path",
            "published_at",
        )
