from django.core.management.base import BaseCommand
from apps.jobs.runner import process_one


class Command(BaseCommand):
    help = "Process a bounded number of queued jobs (safe for cPanel cron)."

    def add_arguments(self, parser):
        parser.add_argument("--kind", default=None)
        parser.add_argument("--limit", type=int, default=5)
        parser.add_argument("--timeout", type=int, default=90)

    def handle(self, *args, **opts):
        for _ in range(max(0, min(opts["limit"], 100))):
            job = process_one(opts["kind"], opts["timeout"])
            if job is None:
                break
            self.stdout.write(f"{job.pk}: {job.state}")
