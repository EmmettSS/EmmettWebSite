from django.db import models
from apps.jobs.models import Job


class ScanJob(models.Model):
    job = models.OneToOneField(Job, on_delete=models.CASCADE, related_name="scan")
    domain = models.CharField(max_length=253)
    consented = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class ScanResult(models.Model):
    scan = models.ForeignKey(ScanJob, on_delete=models.CASCADE, related_name="results")
    grade = models.CharField(max_length=2, blank=True)
    checks = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
