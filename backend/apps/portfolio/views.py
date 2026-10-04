from __future__ import annotations

from django.db.models import QuerySet

from apps.core.viewsets import PublicReadOnlyViewSet
from apps.portfolio.models import Project
from apps.portfolio.serializers import ProjectDetailSerializer, ProjectListSerializer


class ProjectViewSet(PublicReadOnlyViewSet[Project]):
    """فیلتر تکنولوژی (``tags__slug``) و صنعت (``categories__slug``) — آیتم ۲ بریف."""

    serializer_class = ProjectListSerializer
    filterset_fields = ["categories__slug", "tags__slug", "is_product", "is_featured", "year"]
    search_fields = ["title_fa", "title_en", "summary_fa", "summary_en", "client_name"]
    ordering_fields = ["order", "year"]

    def get_queryset(self) -> QuerySet[Project]:
        # ر.ک. توضیح مشابه در ``apps.services.views.ServiceViewSet.get_queryset``
        # دربارهٔ محدودیت شناخته‌شدهٔ django-stubs با منیجر سفارشی BaseModel.
        queryset: QuerySet[Project] = Project.objects.filter(status=Project.Status.PUBLISHED)
        return (
            queryset.select_related("service", "cover_image")
            .prefetch_related("categories", "tags", "gallery")
            .order_by("order", "-year")
        )

    def get_serializer_class(self) -> type[ProjectListSerializer | ProjectDetailSerializer]:
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectListSerializer
