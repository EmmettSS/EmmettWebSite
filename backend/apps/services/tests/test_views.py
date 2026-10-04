from __future__ import annotations

from typing import cast

import pytest
from rest_framework.test import APIClient

from apps.core.models import PublishableModel
from apps.services.models import Service
from apps.services.tests.factories import ServiceFactory
from apps.taxonomy.models import Category

pytestmark = pytest.mark.django_db


class TestServiceViewSet:
    def test_list_is_public(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/services/")
        assert response.status_code == 200

    def test_list_only_returns_published_services(self) -> None:
        ServiceFactory(status=PublishableModel.Status.PUBLISHED, slug="published-one")
        ServiceFactory(status=PublishableModel.Status.DRAFT, slug="draft-one")

        client = APIClient()
        response = client.get("/api/v1/services/")

        slugs = [item["slug"] for item in response.data["results"]] if "results" in response.data else [
            item["slug"] for item in response.data
        ]
        assert "published-one" in slugs
        assert "draft-one" not in slugs

    def test_retrieve_by_slug(self) -> None:
        service = cast(Service, ServiceFactory(slug="retrieve-me"))
        client = APIClient()
        response = client.get("/api/v1/services/retrieve-me/")
        assert response.status_code == 200
        assert response.data["public_id"] == str(service.public_id)
        assert "description_html" in response.data

    def test_retrieve_unknown_slug_returns_404(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/services/does-not-exist/")
        assert response.status_code == 404

    def test_filter_by_category_slug(self) -> None:
        category = Category.objects.create(name="طراحی", slug="design", scope=Category.Scope.SERVICE)
        matching = cast(Service, ServiceFactory(slug="with-category"))
        matching.categories.add(category)
        ServiceFactory(slug="without-category")

        client = APIClient()
        response = client.get("/api/v1/services/", {"categories__slug": "design"})

        results = response.data.get("results", response.data)
        slugs = [item["slug"] for item in results]
        assert slugs == ["with-category"]

    def test_write_methods_are_not_allowed(self) -> None:
        client = APIClient()
        response = client.post("/api/v1/services/", {"title": "x"})
        assert response.status_code in (401, 403, 405)
