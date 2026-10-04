from __future__ import annotations

from django.db.models import QuerySet
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.academy.models import Course, Enrollment
from apps.academy.serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    EnrollmentCreateSerializer,
    EnrollmentSerializer,
)
from apps.core.viewsets import PublicReadOnlyViewSet


class CourseViewSet(PublicReadOnlyViewSet[Course]):
    serializer_class = CourseListSerializer
    filterset_fields = ["level", "categories__slug", "tags__slug", "is_featured"]
    search_fields = ["title_fa", "title_en", "summary_fa", "summary_en"]
    ordering_fields = ["order", "published_at"]

    def get_queryset(self) -> QuerySet[Course]:
        # ر.ک. توضیح مشابه در ``apps.services.views.ServiceViewSet.get_queryset``.
        qs: QuerySet[Course] = Course.objects.filter(status=Course.Status.PUBLISHED).select_related(
            "instructor", "cover_image"
        )
        if self.action == "retrieve":
            qs = qs.prefetch_related("categories", "tags", "lessons")
        return qs.order_by("order")

    def get_serializer_class(self) -> type[CourseListSerializer | CourseDetailSerializer]:
        if self.action == "retrieve":
            return CourseDetailSerializer
        return CourseListSerializer


class EnrollmentListView(ListAPIView[Enrollment]):
    """فهرست «دوره‌های من» — آیتم ۷ بریف (تاریخچهٔ کاربر)."""

    permission_classes = [IsAuthenticated]
    serializer_class = EnrollmentSerializer

    def get_queryset(self) -> QuerySet[Enrollment]:
        if getattr(self, "swagger_fake_view", False):  # pragma: no cover - فقط تولید اسکیمای OpenAPI
            empty: QuerySet[Enrollment] = Enrollment.objects.none()
            return empty
        queryset: QuerySet[Enrollment] = Enrollment.objects.filter(user=self.request.user)
        return queryset.select_related("course")


class EnrollmentCreateView(APIView):
    """ثبت‌نام کاربر در یک دوره — آیتم ۴ بریف."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=EnrollmentCreateSerializer,
        responses={200: EnrollmentSerializer, 201: EnrollmentSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = EnrollmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = Course.objects.filter(
            slug=serializer.validated_data["course_slug"], status=Course.Status.PUBLISHED
        ).first()
        if course is None:
            return Response({"detail": "دوره پیدا نشد."}, status=status.HTTP_404_NOT_FOUND)

        enrollment, created = Enrollment.objects.get_or_create(user=request.user, course=course)
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(EnrollmentSerializer(enrollment).data, status=response_status)
