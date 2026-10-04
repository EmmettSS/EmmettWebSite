from __future__ import annotations

from factory.declarations import Sequence
from factory.django import DjangoModelFactory

from apps.academy.models import Course, Instructor, Lesson
from apps.core.models import PublishableModel


class InstructorFactory(DjangoModelFactory[Instructor]):
    class Meta:
        model = Instructor

    name = Sequence(lambda n: f"مدرس {n}")
    title = "مدرس ارشد"


class CourseFactory(DjangoModelFactory[Course]):
    class Meta:
        model = Course
        django_get_or_create = ("slug",)

    title = Sequence(lambda n: f"دورهٔ شماره {n}")
    slug = Sequence(lambda n: f"course-{n}")
    summary = "خلاصهٔ کوتاه دوره"
    description = "## سرفصل\n\nمتن دوره."
    status = PublishableModel.Status.PUBLISHED
    level = Course.Level.BEGINNER


class LessonFactory(DjangoModelFactory[Lesson]):
    class Meta:
        model = Lesson

    course = None
    title = Sequence(lambda n: f"درس {n}")
    content = "محتوای درس."
    order = Sequence(lambda n: n)
