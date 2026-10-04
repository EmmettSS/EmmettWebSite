from __future__ import annotations

from factory.django import DjangoModelFactory

from apps.leads.models import Contact


class ContactFactory(DjangoModelFactory[Contact]):
    class Meta:
        model = Contact

    name = "مشتری نمونه"
    email = "customer@example.com"
    project_type = Contact.ProjectType.WEBSITE
    budget_range = Contact.BudgetRange.R_50_150M
    timeline = Contact.Timeline.WITHIN_1_MONTH
    message = "سلام، نیاز به مشاوره دارم."
    consent_given = True
