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


class HolidayCalendar(models.Model):
    """Versioned holiday source. Data, never hardcoded logic (F-01 cPanel note)."""

    year = models.PositiveSmallIntegerField(unique=True)
    version = models.CharField(max_length=32)
    source = models.CharField(max_length=240, blank=True)
    coverage = models.CharField(max_length=32, default="solar-fixed")
    note_fa = models.CharField(max_length=300, blank=True)
    note_en = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["year"]

    def __str__(self):
        return f"{self.year} ({self.version})"


class Holiday(models.Model):
    calendar = models.ForeignKey(HolidayCalendar, related_name="items", on_delete=models.CASCADE)
    month = models.PositiveSmallIntegerField()
    day = models.PositiveSmallIntegerField()
    label_fa = models.CharField(max_length=120)
    label_en = models.CharField(max_length=120, blank=True)
    kind = models.CharField(max_length=16, default="solar")

    class Meta:
        unique_together = ("calendar", "month", "day")
        ordering = ["month", "day"]

    def __str__(self):
        return f"{self.calendar.year}/{self.month:02d}/{self.day:02d} — {self.label_fa}"
