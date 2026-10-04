from __future__ import annotations

from django.db.models import QuerySet

from apps.core.viewsets import PublicReadOnlyViewSet
from apps.services.models import Service
from apps.services.serializers import ServiceDetailSerializer, ServiceListSerializer


class ServiceViewSet(PublicReadOnlyViewSet[Service]):
    serializer_class = ServiceListSerializer
    filterset_fields = ["categories__slug", "tags__slug", "is_featured"]
    search_fields = ["title_fa", "title_en", "summary_fa", "summary_en"]
    ordering_fields = ["order", "published_at"]

    def get_queryset(self) -> QuerySet[Service]:
        # نکته: ``BaseManager``/``BaseQuerySet`` در ``apps.core.models`` با
        # ``# type: ignore[misc]`` ساخته شده‌اند (الگوی پویای Django
        # ``Manager.from_queryset``)، بنابراین mypy نوع برگشتی زنجیرهٔ
        # ``.objects.filter(...)`` را ``Any`` می‌بیند؛ انتساب به یک متغیر
        # صریحاً تایپ‌شده این Any را به نوع درست محدود می‌کند.
        queryset: QuerySet[Service] = Service.objects.filter(status=Service.Status.PUBLISHED)
        return queryset.prefetch_related("categories", "tags").order_by("order")

    def get_serializer_class(self) -> type[ServiceListSerializer | ServiceDetailSerializer]:
        if self.action == "retrieve":
            return ServiceDetailSerializer
        return ServiceListSerializer
