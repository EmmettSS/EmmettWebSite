"""F-08 storage. No vector DB: embeddings are BLOBs, search happens in memory (cPanel pattern §5.3).

Guardrails encoded in the schema:
* ``AssistantChunk.content_hash`` → only changed content is re-embedded by the nightly cron.
* ``AssistantQueryCache`` → identical normalized questions never pay the provider twice.
* ``AssistantAnswer`` → ``mode`` tells the client whether the answer came from the LLM or BM25.
* ``AssistantFeedback`` has no free-text field on purpose: aggregated signal only.
* ``AssistantUsage`` → daily cost accounting backs the cost cap.
"""

from django.db import models

from apps.jobs.models import Job


class AssistantChunk(models.Model):
    class Kind(models.TextChoices):
        DOC = "doc", "Documentation"
        TOOL = "tool", "Tool"
        FAQ = "faq", "FAQ"

    source = models.CharField(max_length=240)
    url = models.CharField(max_length=300, blank=True)
    title = models.CharField(max_length=240, blank=True)
    kind = models.CharField(max_length=8, choices=Kind.choices, default=Kind.DOC)
    locale = models.CharField(max_length=2, choices=[("fa", "Persian"), ("en", "English")], default="fa")
    ordinal = models.PositiveIntegerField(default=0)
    text = models.TextField()
    content_hash = models.CharField(max_length=64, db_index=True, default="")
    embedding = models.BinaryField(null=True, blank=True)
    embed_provider = models.CharField(max_length=40, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("source", "ordinal")
        ordering = ["source", "ordinal"]
        indexes = [models.Index(fields=["kind", "locale"])]

    def __str__(self):
        return f"{self.source}#{self.ordinal}"


class AssistantAnswer(models.Model):
    job = models.OneToOneField(Job, on_delete=models.CASCADE)
    query_hash = models.CharField(max_length=64, db_index=True)
    question_locale = models.CharField(max_length=2, default="fa")
    answer = models.TextField(blank=True)
    citations = models.JSONField(default=list)
    retrieval = models.JSONField(default=list)
    provider = models.CharField(max_length=60, default="bm25")
    mode = models.CharField(max_length=8, default="bm25")
    cached = models.BooleanField(default=False)
    latency_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class AssistantQueryCache(models.Model):
    query_hash = models.CharField(max_length=64, unique=True)
    locale = models.CharField(max_length=2, default="fa")
    answer = models.TextField()
    citations = models.JSONField(default=list)
    retrieval = models.JSONField(default=list)
    mode = models.CharField(max_length=8, default="bm25")
    hits = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class AssistantFeedback(models.Model):
    answer = models.ForeignKey(AssistantAnswer, on_delete=models.CASCADE, related_name="feedback")
    helpful = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)


class AssistantUsage(models.Model):
    day = models.DateField(unique=True)
    requests = models.PositiveIntegerField(default=0)
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    cost_usd = models.FloatField(default=0.0)

    @classmethod
    def today(cls):
        from django.utils import timezone

        row, _ = cls.objects.get_or_create(day=timezone.localdate())
        return row
