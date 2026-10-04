from __future__ import annotations

from factory.declarations import Sequence
from factory.django import DjangoModelFactory

from apps.company.models import TeamMember, Testimonial


class TeamMemberFactory(DjangoModelFactory[TeamMember]):
    class Meta:
        model = TeamMember

    full_name = Sequence(lambda n: f"عضو تیم {n}")
    role_title = "توسعه‌دهنده"
    order = 0


class TestimonialFactory(DjangoModelFactory[Testimonial]):
    class Meta:
        model = Testimonial

    author_name = Sequence(lambda n: f"مشتری {n}")
    author_company = "شرکت نمونه"
    quote = "تجربهٔ عالی بود."
    order = 0
