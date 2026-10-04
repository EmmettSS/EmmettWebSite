from __future__ import annotations

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.academy.views import CourseViewSet, EnrollmentCreateView, EnrollmentListView

router = DefaultRouter()
router.register("", CourseViewSet, basename="course")

urlpatterns = [
    path("enrollments/", EnrollmentListView.as_view(), name="enrollment-list"),
    path("enrollments/add/", EnrollmentCreateView.as_view(), name="enrollment-create"),
    *router.urls,
]
