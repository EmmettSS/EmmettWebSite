from __future__ import annotations

from typing import cast

import pytest

from apps.company.models import TeamMember, Testimonial
from apps.company.tests.factories import TeamMemberFactory, TestimonialFactory

pytestmark = pytest.mark.django_db


class TestTeamMemberModel:
    def test_str_returns_full_name(self) -> None:
        member = cast(TeamMember, TeamMemberFactory(full_name="سارا احمدی"))
        assert str(member) == "سارا احمدی"

    def test_default_ordering(self) -> None:
        TeamMemberFactory(full_name="ب", order=2)
        TeamMemberFactory(full_name="آ", order=1)
        names = list(TeamMember.objects.values_list("full_name", flat=True))
        assert names == ["آ", "ب"]

    def test_social_links_default_is_empty_dict(self) -> None:
        member = cast(TeamMember, TeamMemberFactory())
        assert member.social_links == {}


class TestTestimonialModel:
    def test_str_combines_author_and_company(self) -> None:
        testimonial = cast(
            Testimonial, TestimonialFactory(author_name="علی", author_company="شرکت الف")
        )
        assert str(testimonial) == "علی — شرکت الف"

    def test_is_featured_defaults_to_false(self) -> None:
        testimonial = cast(Testimonial, TestimonialFactory())
        assert testimonial.is_featured is False
