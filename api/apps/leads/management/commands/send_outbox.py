from datetime import timedelta
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from apps.leads.models import EmailOutbox


class Command(BaseCommand):
    help = "Send pending transactional email outbox messages with bounded retries."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **opts):
        now = timezone.now()
        EmailOutbox.objects.filter(
            state="sending", locked_at__lt=now - timedelta(minutes=15)
        ).update(
            state="pending", locked_at=None, last_error="Recovered stale send lock"
        )
        ids = list(
            EmailOutbox.objects.filter(state="pending")
            .filter(Q(next_attempt_at__isnull=True) | Q(next_attempt_at__lte=now))
            .order_by("created_at")
            .values_list("pk", flat=True)[: max(0, min(opts["limit"], 200))]
        )
        for pk in ids:
            with transaction.atomic():
                item = (
                    EmailOutbox.objects.select_for_update()
                    .filter(pk=pk, state="pending")
                    .first()
                )
                if not item:
                    continue
                item.state = "sending"
                item.locked_at = timezone.now()
                item.attempts += 1
                item.save(update_fields=["state", "locked_at", "attempts"])
            try:
                send_mail(
                    item.subject, item.body, None, [item.recipient], fail_silently=False
                )
                EmailOutbox.objects.filter(pk=pk, state="sending").update(
                    state="sent", locked_at=None, last_error=""
                )
            except Exception as exc:
                delay = min(3600, 60 * (2 ** min(item.attempts, 6)))
                item.state = "failed" if item.attempts >= 5 else "pending"
                item.next_attempt_at = timezone.now() + timedelta(seconds=delay)
                item.locked_at = None
                item.last_error = str(exc)[:1000]
                item.save(
                    update_fields=[
                        "state",
                        "next_attempt_at",
                        "locked_at",
                        "last_error",
                    ]
                )
                self.stderr.write(f"Outbox {pk} deferred: {type(exc).__name__}")
