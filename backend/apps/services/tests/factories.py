from __future__ import annotations

from factory.declarations import Sequence
from factory.django import DjangoModelFactory

from apps.core.models import PublishableModel
from apps.services.models import Service


class ServiceFactory(DjangoModelFactory[Service]):
    class Meta:
        model = Service
        django_get_or_create = ("slug",)

    title = Sequence(lambda n: f"خدمت شماره {n}")
    slug = Sequence(lambda n: f"service-{n}")
    summary = "خلاصهٔ کوتاه خدمت"
    description = "## توضیحات\n\nمتن **کامل** خدمت."
    status = PublishableModel.Status.PUBLISHED
