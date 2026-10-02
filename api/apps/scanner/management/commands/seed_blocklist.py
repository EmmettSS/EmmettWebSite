from django.core.management.base import BaseCommand

from apps.scanner import blocklist


class Command(BaseCommand):
    help = "Guard 4 — load the versioned scan blocklist (idempotent)."

    def handle(self, *args, **options):
        created = blocklist.seed_entries()
        self.stdout.write(f"blocklist {blocklist.BLOCKLIST_VERSION}: {created} new entry(ies)")
