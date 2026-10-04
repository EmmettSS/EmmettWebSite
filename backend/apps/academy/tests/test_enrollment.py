from __future__ import annotations

from typing import cast

import pytest
from django.db import IntegrityError
from rest_framework.test import APIClient

from apps.academy.models import Course, Enrollment
from apps.academy.tests.factories import CourseFactory
from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.core.models import PublishableModel

pytestmark = pytest.mark.django_db


class TestEnrollmentModel:
    def test_str_includes_user_course_and_status(self) -> None:
        user = cast(User, UserFactory())
        course = cast(Course, CourseFactory())
        enrollment = Enrollment.objects.create(user=user, course=course)
        assert str(enrollment) == f"{user.id} → {course.id} (active)"

    def test_default_status_is_active(self) -> None:
        user = cast(User, UserFactory())
        course = cast(Course, CourseFactory())
        enrollment = Enrollment.objects.create(user=user, course=course)
        assert enrollment.status == Enrollment.Status.ACTIVE

    def test_user_cannot_enroll_twice_in_same_course(self) -> None:
        user = cast(User, UserFactory())
        course = cast(Course, CourseFactory())
        Enrollment.objects.create(user=user, course=course)
        with pytest.raises(IntegrityError):
            Enrollment.objects.create(user=user, course=course)


class TestEnrollmentViews:
    def test_list_requires_authentication(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/academy/enrollments/")
        assert response.status_code == 403

    def test_create_requires_authentication(self) -> None:
        client = APIClient()
        response = client.post("/api/v1/academy/enrollments/add/", {"course_slug": "x"})
        assert response.status_code == 403

    def test_enroll_in_published_course(self) -> None:
        user = cast(User, UserFactory())
        course = cast(Course, CourseFactory(slug="enroll-me"))
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post("/api/v1/academy/enrollments/add/", {"course_slug": "enroll-me"})

        assert response.status_code == 201
        assert Enrollment.objects.filter(user=user, course=course).exists()

    def test_enroll_in_unknown_course_returns_404(self) -> None:
        user = cast(User, UserFactory())
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post("/api/v1/academy/enrollments/add/", {"course_slug": "does-not-exist"})
        assert response.status_code == 404

    def test_enroll_in_draft_course_returns_404(self) -> None:
        CourseFactory(slug="draft-course", status=PublishableModel.Status.DRAFT)
        user = cast(User, UserFactory())
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post("/api/v1/academy/enrollments/add/", {"course_slug": "draft-course"})
        assert response.status_code == 404

    def test_enrolling_twice_is_idempotent(self) -> None:
        user = cast(User, UserFactory())
        CourseFactory(slug="idempotent-course")
        client = APIClient()
        client.force_authenticate(user=user)

        first = client.post("/api/v1/academy/enrollments/add/", {"course_slug": "idempotent-course"})
        second = client.post("/api/v1/academy/enrollments/add/", {"course_slug": "idempotent-course"})

        assert first.status_code == 201
        assert second.status_code == 200
        assert Enrollment.objects.filter(user=user).count() == 1

    def test_list_only_returns_own_enrollments(self) -> None:
        user_a = cast(User, UserFactory())
        user_b = cast(User, UserFactory())
        course = cast(Course, CourseFactory(slug="shared-course"))
        Enrollment.objects.create(user=user_a, course=course)
        Enrollment.objects.create(user=user_b, course=course)

        client = APIClient()
        client.force_authenticate(user=user_a)
        response = client.get("/api/v1/academy/enrollments/")

        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["course"]["slug"] == "shared-course"
