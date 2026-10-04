from __future__ import annotations

from typing import cast

import pytest
from rest_framework.test import APIClient

from apps.academy.models import Course
from apps.academy.tests.factories import CourseFactory, InstructorFactory, LessonFactory
from apps.core.models import PublishableModel

pytestmark = pytest.mark.django_db


class TestCourseViewSet:
    def test_list_only_returns_published_courses(self) -> None:
        CourseFactory(status=PublishableModel.Status.PUBLISHED, slug="published-course")
        CourseFactory(status=PublishableModel.Status.DRAFT, slug="draft-course")

        client = APIClient()
        response = client.get("/api/v1/academy/")

        slugs = [item["slug"] for item in response.data.get("results", response.data)]
        assert "published-course" in slugs
        assert "draft-course" not in slugs

    def test_filter_by_level(self) -> None:
        CourseFactory(slug="beginner-course", level=Course.Level.BEGINNER)
        CourseFactory(slug="advanced-course", level=Course.Level.ADVANCED)

        client = APIClient()
        response = client.get("/api/v1/academy/", {"level": "advanced"})
        slugs = [item["slug"] for item in response.data.get("results", response.data)]
        assert slugs == ["advanced-course"]

    def test_retrieve_includes_instructor_and_lessons(self) -> None:
        instructor = InstructorFactory(name="استاد نمونه")
        course = cast(Course, CourseFactory(slug="full-course", instructor=instructor))
        LessonFactory(course=course, order=0, title="درس اول", is_preview=True)
        LessonFactory(course=course, order=1, title="درس دوم", is_preview=False)

        client = APIClient()
        response = client.get("/api/v1/academy/full-course/")

        assert response.status_code == 200
        assert response.data["instructor"]["name"] == "استاد نمونه"
        assert len(response.data["lessons"]) == 2
        assert response.data["lessons"][0]["title"] == "درس اول"

    def test_lesson_preview_flag_is_exposed(self) -> None:
        course = cast(Course, CourseFactory(slug="preview-course"))
        LessonFactory(course=course, order=0, is_preview=True)

        client = APIClient()
        response = client.get("/api/v1/academy/preview-course/")
        assert response.data["lessons"][0]["is_preview"] is True
