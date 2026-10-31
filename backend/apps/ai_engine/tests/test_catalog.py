from __future__ import annotations

import pytest
from django.core.exceptions import ValidationError

from apps.ai_engine.models import Catalog, CatalogOption

pytestmark = pytest.mark.django_db


def test_catalog_and_option_keys_are_immutable_after_creation() -> None:
    catalog = Catalog.objects.get(key="goal")
    catalog.key = "business_goal"
    with pytest.raises(ValidationError):
        catalog.save()

    option = CatalogOption.objects.get(catalog__key="goal", key="automate_processes")
    option.key = "automate_work"
    with pytest.raises(ValidationError):
        option.save()

    option.refresh_from_db()
    assert option.key == "automate_processes"
