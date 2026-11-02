from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.ai_engine.models import AIRequest


class Command(BaseCommand):
    help = "Permanently purge AI operational request audit older than the configured retention period."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--days", type=int, default=settings.AI_AUDIT_RETENTION_DAYS)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args: Any, **options: Any) -> None:
        days = int(options["days"])
        if days < 1:
            raise CommandError("--days must be at least 1")
        cutoff = timezone.now() - timedelta(days=days)
        queryset = AIRequest.all_objects.filter(created_at__lt=cutoff)
        count = queryset.count()
        if bool(options["dry_run"]):
            self.stdout.write(f"{count} AI request audit rows are eligible for purge.")
            return
        queryset.hard_delete()
        self.stdout.write(self.style.SUCCESS(f"Purged {count} AI request audit rows older than {days} days."))
