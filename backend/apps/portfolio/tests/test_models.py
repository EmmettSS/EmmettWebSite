from __future__ import annotations

from typing import cast

import pytest

from apps.portfolio.models import CaseStudy, Project
from apps.portfolio.tests.factories import CaseStudyFactory, ProjectFactory

pytestmark = pytest.mark.django_db


class TestProjectModel:
    def test_str_returns_title(self) -> None:
        project = cast(Project, ProjectFactory(title="پروژهٔ نمونه"))
        assert str(project) == "پروژهٔ نمونه"

    def test_is_product_defaults_to_false(self) -> None:
        project = cast(Project, ProjectFactory())
        assert project.is_product is False

    def test_default_ordering_by_order_then_year_desc(self) -> None:
        ProjectFactory(title="قدیمی‌تر", order=0, year=2020)
        ProjectFactory(title="جدیدتر", order=0, year=2024)
        titles = list(Project.objects.values_list("title", flat=True))
        assert titles == ["جدیدتر", "قدیمی‌تر"]


class TestCaseStudyModel:
    def test_str_includes_project_title(self) -> None:
        project = cast(Project, ProjectFactory(title="پروژهٔ A"))
        case_study = cast(CaseStudy, CaseStudyFactory(project=project))
        assert str(case_study) == "Case Study: پروژهٔ A"

    def test_markdown_fields_rendered_to_html_on_save(self) -> None:
        project = cast(Project, ProjectFactory())
        case_study = cast(
            CaseStudy,
            CaseStudyFactory(project=project, challenge="## چالش\n\nمتن.", result="نتیجهٔ **عالی**."),
        )
        assert "<h2" in case_study.challenge_html
        assert "<strong>" in case_study.result_html

    def test_one_to_one_with_project(self) -> None:
        project = cast(Project, ProjectFactory())
        case_study = cast(CaseStudy, CaseStudyFactory(project=project))
        assert project.case_study == case_study
