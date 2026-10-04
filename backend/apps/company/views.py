from __future__ import annotations

from django.db.models import QuerySet
from rest_framework.filters import OrderingFilter

from apps.company.models import TeamMember, Testimonial
from apps.company.serializers import TeamMemberSerializer, TestimonialSerializer
from apps.core.viewsets import PublicReadOnlyViewSet


class TeamMemberViewSet(PublicReadOnlyViewSet[TeamMember]):
    queryset = TeamMember.objects.filter(is_active=True).select_related("photo").order_by("order")
    serializer_class = TeamMemberSerializer
    lookup_field = "public_id"
    filter_backends = [OrderingFilter]
    ordering_fields = ["order"]


class TestimonialViewSet(PublicReadOnlyViewSet[Testimonial]):
    queryset = (
        Testimonial.objects.filter(is_active=True)
        .select_related("author_photo", "related_project")
        .order_by("order", "-created_at")
    )
    serializer_class = TestimonialSerializer
    lookup_field = "pk"
    filter_backends = [OrderingFilter]
    ordering_fields = ["order", "created_at"]

    def get_queryset(self) -> QuerySet[Testimonial]:
        qs = super().get_queryset()
        featured = self.request.query_params.get("featured")
        if featured is not None:
            qs = qs.filter(is_featured=featured.lower() in {"1", "true", "yes"})
        return qs
