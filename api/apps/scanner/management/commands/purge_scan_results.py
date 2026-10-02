from django.core.management.base import BaseCommand

from apps.scanner.engine import purge_expired


class Command(BaseCommand):
    help = "Guard 5 — delete scan results past their 7-day TTL (run daily via cron)."

    def handle(self, *args, **options):
        deleted = purge_expired()
        self.stdout.write(f"purged {deleted} expired scan result(s)")
