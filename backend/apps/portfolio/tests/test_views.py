from __future__ import annotations

from typing import cast

import pytest
from rest_framework.test import APIClient

from apps.core.models import PublishableModel
from apps.portfolio.models import Project
from apps.portfolio.tests.factories import CaseStudyFactory, ProjectFactory
from apps.taxonomy.models import Category, Tag
from apps.taxonomy.tests.factories import CategoryFactory, TagFactory

pytestmark = pytest.mark.django_db


class TestProjectViewSet:
    def test_list_only_returns_published_projects(self) -> None:
        ProjectFactory(status=PublishableModel.Status.PUBLISHED, slug="published-project")
        ProjectFactory(status=PublishableModel.Status.DRAFT, slug="draft-project")

        client = APIClient()
        response = client.get("/api/v1/projects/")

        slugs = [item["slug"] for item in response.data.get("results", response.data)]
        assert "published-project" in slugs
        assert "draft-project" not in slugs

    def test_retrieve_includes_case_study_when_present(self) -> None:
        project = cast(Project, ProjectFactory(slug="with-case-study"))
        CaseStudyFactory(project=project, result="نتیجهٔ خوب")

        client = APIClient()
        response = client.get("/api/v1/projects/with-case-study/")

        assert response.status_code == 200
        assert response.data["case_study"] is not None
        assert "result_html" in response.data["case_study"]

    def test_retrieve_without_case_study_returns_none(self) -> None:
        ProjectFactory(slug="no-case-study")
        client = APIClient()
        response = client.get("/api/v1/projects/no-case-study/")
        assert response.data["case_study"] is None

    def test_filter_by_technology_tag(self) -> None:
        tag = cast(Tag, TagFactory(slug="react"))
        matching = cast(Project, ProjectFactory(slug="react-project"))
        matching.tags.add(tag)
        ProjectFactory(slug="other-project")

        client = APIClient()
        response = client.get("/api/v1/projects/", {"tags__slug": "react"})
        slugs = [item["slug"] for item in response.data.get("results", response.data)]
        assert slugs == ["react-project"]

    def test_filter_by_industry_category(self) -> None:
        category = cast(Category, CategoryFactory(slug="fintech"))
        matching = cast(Project, ProjectFactory(slug="fintech-project"))
        matching.categories.add(category)
        ProjectFactory(slug="other-industry-project")

        client = APIClient()
        response = client.get("/api/v1/projects/", {"categories__slug": "fintech"})
        slugs = [item["slug"] for item in response.data.get("results", response.data)]
        assert slugs == ["fintech-project"]

    def test_filter_by_is_product(self) -> None:
        ProjectFactory(slug="product-one", is_product=True)
        ProjectFactory(slug="client-project", is_product=False)

        client = APIClient()
        response = client.get("/api/v1/projects/", {"is_product": "true"})
        slugs = [item["slug"] for item in response.data.get("results", response.data)]
        assert slugs == ["product-one"]
