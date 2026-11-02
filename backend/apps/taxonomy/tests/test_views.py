from __future__ import annotations

from typing import cast

import pytest
from rest_framework.test import APIClient

from apps.taxonomy.models import Category
from apps.taxonomy.tests.factories import CategoryFactory, TagFactory

pytestmark = pytest.mark.django_db


class TestCategoryViewSet:
    def test_list_is_public(self) -> None:
        CategoryFactory()
        client = APIClient()
        response = client.get("/api/v1/taxonomy/categories/")
        assert response.status_code == 200

    def test_filter_by_scope(self) -> None:
        CategoryFactory(slug="blog-cat", scope=Category.Scope.BLOG)
        CategoryFactory(slug="service-cat", scope=Category.Scope.SERVICE)

        client = APIClient()
        response = client.get("/api/v1/taxonomy/categories/", {"scope": "blog"})
        results = response.data.get("results", response.data)
        slugs = [item["slug"] for item in results]
        assert slugs == ["blog-cat"]

    def test_retrieve_by_slug(self) -> None:
        category = cast(Category, CategoryFactory(slug="retrieve-cat"))
        client = APIClient()
        response = client.get("/api/v1/taxonomy/categories/retrieve-cat/")
        assert response.status_code == 200
        assert response.data["public_id"] == str(category.public_id)


class TestTagViewSet:
    def test_list_is_public(self) -> None:
        TagFactory()
        client = APIClient()
        response = client.get("/api/v1/taxonomy/tags/")
        assert response.status_code == 200

    def test_search_by_name(self) -> None:
        TagFactory(name_fa="پایتون", slug="python")
        TagFactory(name_fa="جاوااسکریپت", slug="javascript")

        client = APIClient()
        response = client.get("/api/v1/taxonomy/tags/", {"search": "پایتون"})
        results = response.data.get("results", response.data)
        slugs = [item["slug"] for item in results]
        assert slugs == ["python"]
