from django.db import models


class ContactLead(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    message = models.TextField(max_length=5000)
    locale = models.CharField(
        max_length=2, choices=[("fa", "Persian"), ("en", "English")], default="fa"
    )
    created_at = models.DateTimeField(auto_now_add=True)


class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    locale = models.CharField(max_length=2, default="fa")
    active = models.BooleanField(default=False)
    confirmation_token = models.CharField(max_length=320, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class WaitlistSignup(models.Model):
    product = models.CharField(max_length=80)
    email = models.EmailField()
    use_case = models.TextField(max_length=2000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class JobApplication(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    role = models.CharField(max_length=120)
    cover_letter = models.TextField(max_length=5000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class EmailOutbox(models.Model):
    recipient = models.EmailField()
    subject = models.CharField(max_length=200)
    body = models.TextField()
    state = models.CharField(max_length=12, default="pending", db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
