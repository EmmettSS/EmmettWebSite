from __future__ import annotations

from typing import cast

import pytest
from django.db import IntegrityError

from apps.academy.models import Course, Instructor, Lesson
from apps.academy.tests.factories import CourseFactory, InstructorFactory, LessonFactory

pytestmark = pytest.mark.django_db


class TestInstructorModel:
    def test_str_returns_name(self) -> None:
        instructor = cast(Instructor, InstructorFactory(name="مریم رضایی"))
        assert str(instructor) == "مریم رضایی"


class TestCourseModel:
    def test_str_returns_title(self) -> None:
        course = cast(Course, CourseFactory(title="دورهٔ پایتون"))
        assert str(course) == "دورهٔ پایتون"

    def test_description_rendered_to_html(self) -> None:
        course = cast(Course, CourseFactory(description="## سرفصل\n\nمتن **مهم**."))
        assert "<h2" in course.description_html
        assert "<strong>" in course.description_html

    def test_default_level_is_beginner(self) -> None:
        course = cast(Course, CourseFactory())
        assert course.level == Course.Level.BEGINNER

    def test_instructor_relation(self) -> None:
        instructor = cast(Instructor, InstructorFactory())
        course = cast(Course, CourseFactory(instructor=instructor))
        assert course.instructor == instructor
        assert instructor.courses.first() == course


class TestLessonModel:
    def test_str_combines_course_and_lesson_title(self) -> None:
        course = cast(Course, CourseFactory(title="دورهٔ A"))
        lesson = cast(Lesson, LessonFactory(course=course, title="مقدمه", order=0))
        assert str(lesson) == "دورهٔ A — مقدمه"

    def test_content_rendered_to_html_on_save(self) -> None:
        course = cast(Course, CourseFactory())
        lesson = cast(Lesson, LessonFactory(course=course, content="متن با **تاکید**.", order=0))
        assert "<strong>" in lesson.content_html

    def test_order_must_be_unique_per_course(self) -> None:
        course = cast(Course, CourseFactory())
        LessonFactory(course=course, order=1)
        with pytest.raises(IntegrityError):
            LessonFactory(course=course, order=1)

    def test_is_preview_defaults_to_false(self) -> None:
        course = cast(Course, CourseFactory())
        lesson = cast(Lesson, LessonFactory(course=course, order=0))
        assert lesson.is_preview is False
