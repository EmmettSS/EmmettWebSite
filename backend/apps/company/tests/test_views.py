from __future__ import annotations

from typing import cast

import pytest
from rest_framework.test import APIClient

from apps.company.models import TeamMember
from apps.company.tests.factories import TeamMemberFactory, TestimonialFactory

pytestmark = pytest.mark.django_db


class TestTeamMemberViewSet:
    def test_list_is_public(self) -> None:
        TeamMemberFactory()
        client = APIClient()
        response = client.get("/api/v1/company/team/")
        assert response.status_code == 200

    def test_retrieve_by_public_id(self) -> None:
        member = cast(TeamMember, TeamMemberFactory())
        client = APIClient()
        response = client.get(f"/api/v1/company/team/{member.public_id}/")
        assert response.status_code == 200
        assert response.data["full_name"] == member.full_name

    def test_inactive_members_are_excluded(self) -> None:
        member = cast(TeamMember, TeamMemberFactory())
        member.delete()
        client = APIClient()
        response = client.get("/api/v1/company/team/")
        results = response.data.get("results", response.data)
        assert all(item["public_id"] != str(member.public_id) for item in results)


class TestTestimonialViewSet:
    def test_list_is_public(self) -> None:
        TestimonialFactory()
        client = APIClient()
        response = client.get("/api/v1/company/testimonials/")
        assert response.status_code == 200

    def test_filter_by_featured(self) -> None:
        TestimonialFactory(is_featured=True, author_name="Featured")
        TestimonialFactory(is_featured=False, author_name="Normal")

        client = APIClient()
        response = client.get("/api/v1/company/testimonials/", {"featured": "true"})
        results = response.data.get("results", response.data)
        names = [item["author_name"] for item in results]
        assert names == ["Featured"]
