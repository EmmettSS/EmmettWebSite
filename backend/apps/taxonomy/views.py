from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

from apps.core.viewsets import PublicReadOnlyViewSet
from apps.taxonomy.models import Category, Tag
from apps.taxonomy.serializers import CategorySerializer, TagSerializer


class CategoryViewSet(PublicReadOnlyViewSet[Category]):
    queryset = Category.objects.select_related("parent").all()
    serializer_class = CategorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["scope"]
    search_fields = ["name_fa", "name_en", "slug"]


class TagViewSet(PublicReadOnlyViewSet[Tag]):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    filter_backends = [SearchFilter]
    search_fields = ["name_fa", "name_en", "slug"]
