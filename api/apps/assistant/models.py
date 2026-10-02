from django.db import models
from apps.jobs.models import Job


class AssistantChunk(models.Model):
    source = models.CharField(max_length=240)
    locale = models.CharField(
        max_length=2, choices=[("fa", "Persian"), ("en", "English")]
    )
    text = models.TextField()
    embedding = models.BinaryField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class AssistantAnswer(models.Model):
    job = models.OneToOneField(Job, on_delete=models.CASCADE)
    query_hash = models.CharField(max_length=64, db_index=True)
    answer = models.TextField(blank=True)
    citations = models.JSONField(default=list)
    provider = models.CharField(max_length=60, default="bm25")
    created_at = models.DateTimeField(auto_now_add=True)
