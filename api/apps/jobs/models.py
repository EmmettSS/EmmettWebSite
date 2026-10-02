from django.db import models


class Job(models.Model):
    class State(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    class Kind(models.TextChoices):
        SCAN = "scan", "Scan"
        EMBED = "embed", "Embed"
        OG_IMAGE = "og_image", "Open Graph image"
        DIGEST = "digest", "Digest"

    kind = models.CharField(max_length=32, choices=Kind.choices, db_index=True)
    payload = models.JSONField(default=dict)
    state = models.CharField(
        max_length=12, choices=State.choices, default=State.PENDING, db_index=True
    )
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=3)
    locked_by = models.CharField(max_length=128, null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    result = models.JSONField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)
    progress = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["state", "kind", "created_at"])]
