from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.ai_engine.catalog.bootstrap import seed_ai_engine_data


class Command(BaseCommand):
    help = "Create any missing starter AI catalogs, prompt templates, guardrails, and estimate rules."

    def handle(self, *args: object, **options: object) -> None:
        created = seed_ai_engine_data()
        self.stdout.write(self.style.SUCCESS(f"AI engine bootstrap complete ({created} rows created)."))
