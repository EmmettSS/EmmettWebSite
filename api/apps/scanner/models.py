import secrets

from django.db import models
from django.utils import timezone
from datetime import timedelta

from apps.jobs.models import Job

RESULT_TTL_DAYS = 7


def result_expiry():
    return timezone.now() + timedelta(days=RESULT_TTL_DAYS)


def new_result_id():
    """22-char URL-safe id for ScanResult.result_id.

    Keep it short enough for the ``varchar(32)`` column: MariaDB/MySQL refuse a DDL
    default that does not fit the column ("1067 Invalid default value for 'result_id'"),
    and Django does synthesise such a default when it adds a NOT NULL column to an
    existing table (migration 0002 ran on MariaDB in CI and failed exactly that way).
    """
    return secrets.token_urlsafe(16)


class ScanJob(models.Model):
    job = models.OneToOneField(Job, on_delete=models.CASCADE, related_name="scan")
    domain = models.CharField(max_length=253)
    consented = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.domain


class ScanResult(models.Model):
    """Guard 5 — never attributable: random id, no IP, 7-day TTL, noindex page."""

    scan = models.ForeignKey(ScanJob, on_delete=models.CASCADE, related_name="results")
    result_id = models.CharField(max_length=32, unique=True, db_index=True, default=new_result_id)
    grade = models.CharField(max_length=2, blank=True)
    score = models.PositiveSmallIntegerField(default=0)
    checks = models.JSONField(default=list)
    blocklist_version = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField(default=result_expiry)

    class Meta:
        ordering = ["-created_at"]


class BlocklistEntry(models.Model):
    """Guard 4 — versioned blocklist, checked *before* a job row is created."""

    class Kind(models.TextChoices):
        GOV = "gov", "Sensitive government"
        PRIVATE = "private", "Private / RFC1918 / localhost"
        BULK = "bulk", "Mass-scan pattern"
        CUSTOM = "custom", "Custom"

    version = models.CharField(max_length=32, db_index=True)
    kind = models.CharField(max_length=16, choices=Kind.choices)
    pattern = models.CharField(max_length=200, help_text="suffix match, or regex when kind=bulk")
    note_fa = models.CharField(max_length=200, blank=True)
    note_en = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = ("version", "pattern")
        ordering = ["kind", "pattern"]

    def __str__(self):
        return f"{self.version}:{self.pattern}"
