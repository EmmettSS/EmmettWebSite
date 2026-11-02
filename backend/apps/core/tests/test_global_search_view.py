from __future__ import annotations

import uuid

import pytest
from rest_framework.test import APIClient

from apps.core.search import sync_search_index

pytestmark = pytest.mark.django_db


class TestGlobalSearchView:
    def test_is_public_no_auth_required(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/search/", {"q": "test"})
        assert response.status_code != 401
        assert response.status_code != 403

    def test_empty_query_returns_empty_results(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/search/")
        assert response.status_code == 200
        assert response.data["count"] == 0
        assert response.data["results"] == []

    def test_defaults_locale_to_fa(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/search/", {"q": "x"})
        assert response.data["locale"] == "fa"

    def test_finds_indexed_entry_and_serializes_public_id_as_str(self) -> None:
        public_id = uuid.uuid4()
        sync_search_index(
            content_type="service",
            object_id=1,
            public_id=public_id,
            locale="fa",
            title="طراحی اپلیکیشن موبایل",
            body="توضیحات",
            url_path="/services/mobile-app",
        )

        client = APIClient()
        response = client.get("/api/v1/search/", {"q": "موبایل", "locale": "fa"})

        assert response.status_code == 200
        assert response.data["count"] == 1
        result = response.data["results"][0]
        assert result["public_id"] == str(public_id)
        assert result["url_path"] == "/services/mobile-app"

    def test_limit_is_capped_at_50(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/search/", {"q": "x", "limit": "500"})
        assert response.status_code == 200

    def test_explicit_locale_query_param_overrides_default(self) -> None:
        sync_search_index(
            content_type="service",
            object_id=2,
            public_id=uuid.uuid4(),
            locale="en",
            title="Mobile App Design",
            body="Body",
            url_path="/en/services/mobile-app",
        )
        client = APIClient()
        response = client.get("/api/v1/search/", {"q": "Mobile", "locale": "en"})
        assert response.data["locale"] == "en"
        assert response.data["count"] == 1
