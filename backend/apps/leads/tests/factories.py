from __future__ import annotations

from factory.declarations import LazyFunction
from factory.django import DjangoModelFactory

from apps.ai_engine.models import CatalogOption
from apps.leads.models import Contact


class ContactFactory(DjangoModelFactory[Contact]):
    class Meta:
        model = Contact

    name = "مشتری نمونه"
    email = "customer@example.com"
    project_type = LazyFunction(lambda: CatalogOption.objects.get(catalog__key="project_type", key="website"))
    budget_range = LazyFunction(lambda: CatalogOption.objects.get(catalog__key="budget_range", key="50_150m"))
    timeline = LazyFunction(lambda: CatalogOption.objects.get(catalog__key="timeline", key="within_1_month"))
    message = "سلام، نیاز به مشاوره دارم."
    consent_given = True
