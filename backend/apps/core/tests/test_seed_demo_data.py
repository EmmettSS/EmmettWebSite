"""تست‌های فرمان مدیریتی ``seed_demo_data`` — پوشش ساخت دادهٔ نمایشی و ایدمپوتنسی."""

from __future__ import annotations

from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings

from apps.academy.models import Course, Enrollment, Instructor, Lesson
from apps.accounts.models import User
from apps.blog.models import BlogPost, Comment
from apps.company.models import TeamMember, Testimonial
from apps.core.models import SiteSettings
from apps.leads.models import Newsletter
from apps.portfolio.models import CaseStudy, Project
from apps.services.models import Service
from apps.taxonomy.models import Category, Tag

pytestmark = pytest.mark.django_db


def test_seed_demo_data_refuses_production_without_force() -> None:
    with override_settings(DEBUG=False):
        with pytest.raises(CommandError):
            call_command("seed_demo_data", stdout=StringIO())


def test_seed_demo_data_is_idempotent_and_populates_all_domains() -> None:
    out = StringIO()
    with override_settings(DEBUG=False):
        call_command("seed_demo_data", force=True, stdout=out)

    assert "seed دادهٔ نمایشی با موفقیت کامل شد" in out.getvalue()
    user_count = User.objects.count()
    service_count = Service.objects.count()
    project_count = Project.objects.count()
    course_count = Course.objects.count()
    post_count = BlogPost.objects.count()

    assert user_count >= 3
    assert Category.objects.count() >= 4
    assert Tag.objects.count() >= 4
    assert TeamMember.objects.count() >= 3
    assert Testimonial.objects.count() >= 2
    assert service_count >= 3
    assert project_count >= 3
    assert CaseStudy.objects.count() >= 1
    assert Instructor.objects.count() >= 2
    assert course_count >= 2
    assert Lesson.objects.count() >= 4
    assert Enrollment.objects.count() >= 1
    assert post_count >= 3
    assert Comment.objects.count() >= 1
    assert Newsletter.objects.count() >= 1
    assert SiteSettings.load().site_name != ""

    # اجرای بار دوم نباید هیچ رکورد تکراری بسازد (idempotency).
    with override_settings(DEBUG=True):
        call_command("seed_demo_data", stdout=StringIO())

    assert User.objects.count() == user_count
    assert Service.objects.count() == service_count
    assert Project.objects.count() == project_count
    assert Course.objects.count() == course_count
    assert BlogPost.objects.count() == post_count
