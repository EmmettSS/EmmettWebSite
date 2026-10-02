from django.db import models


class ToolUsage(models.Model):
    tool = models.CharField(max_length=80, db_index=True)
    locale = models.CharField(max_length=2, default="fa")
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)


class SharedResult(models.Model):
    tool = models.CharField(max_length=80, db_index=True)
    payload = models.JSONField()
    share_id = models.CharField(max_length=32, unique=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
