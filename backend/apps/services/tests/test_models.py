from __future__ import annotations

from typing import cast

import pytest
from django.utils import timezone

from apps.core.models import PublishableModel
from apps.services.models import Service
from apps.services.tests.factories import ServiceFactory

pytestmark = pytest.mark.django_db


class TestServiceModel:
    def test_str_returns_title(self) -> None:
        service = cast(Service, ServiceFactory(title="طراحی وب"))
        assert str(service) == "طراحی وب"

    def test_description_is_rendered_to_html_on_save(self) -> None:
        service = cast(Service, ServiceFactory(description="## عنوان\n\nمتن **پررنگ**."))
        assert "<h2" in service.description_html
        assert "<strong>" in service.description_html

    def test_is_published_property(self) -> None:
        draft = cast(Service, ServiceFactory(status=PublishableModel.Status.DRAFT))
        published = cast(Service, ServiceFactory(status=PublishableModel.Status.PUBLISHED))
        assert draft.is_published is False
        assert published.is_published is True

    def test_public_id_is_unique_per_instance(self) -> None:
        a = cast(Service, ServiceFactory())
        b = cast(Service, ServiceFactory())
        assert a.public_id != b.public_id

    def test_default_ordering_is_by_order_then_title(self) -> None:
        ServiceFactory(title="ب", order=2)
        ServiceFactory(title="آ", order=1)
        titles = list(Service.objects.values_list("title", flat=True))
        assert titles == ["آ", "ب"]

    def test_soft_delete_hides_from_default_manager(self) -> None:
        service = cast(Service, ServiceFactory())
        service.delete()
        assert not Service.objects.filter(pk=service.pk).exists()
        assert Service.all_objects.filter(pk=service.pk).exists()

    def test_published_at_defaults_to_none(self) -> None:
        service = cast(Service, ServiceFactory())
        assert service.published_at is None
        service.published_at = timezone.now()
        service.save()
        service.refresh_from_db()
        assert service.published_at is not None
