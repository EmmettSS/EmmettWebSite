from __future__ import annotations

from factory.declarations import Sequence
from factory.django import DjangoModelFactory

from apps.core.models import PublishableModel
from apps.portfolio.models import CaseStudy, Project


class ProjectFactory(DjangoModelFactory[Project]):
    class Meta:
        model = Project
        django_get_or_create = ("slug",)

    title = Sequence(lambda n: f"پروژهٔ شماره {n}")
    slug = Sequence(lambda n: f"project-{n}")
    summary = "خلاصهٔ کوتاه پروژه"
    status = PublishableModel.Status.PUBLISHED


class CaseStudyFactory(DjangoModelFactory[CaseStudy]):
    class Meta:
        model = CaseStudy

    project = None
    challenge = "## چالش\n\nمتن چالش."
    approach = "رویکرد ما."
    result = "نتیجهٔ **نهایی**."
