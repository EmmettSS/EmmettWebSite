from __future__ import annotations

from rest_framework import serializers

from apps.taxonomy.models import Category, Tag


class CategorySerializer(serializers.ModelSerializer[Category]):
    parent_slug = serializers.SlugField(source="parent.slug", read_only=True, default=None)

    class Meta:
        model = Category
        fields = ("public_id", "name", "slug", "scope", "parent_slug")


class TagSerializer(serializers.ModelSerializer[Tag]):
    class Meta:
        model = Tag
        fields = ("name", "slug")
