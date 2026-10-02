from django.core.exceptions import ValidationError
from django.db import models


class BilingualContent(models.Model):
    slug = models.SlugField(unique=True)
    slug_fa = models.SlugField(blank=True)
    title_fa = models.CharField(max_length=240, blank=True)
    title_en = models.CharField(max_length=240, blank=True)
    body_fa = models.TextField(blank=True)
    body_en = models.TextField(blank=True)
    status = models.CharField(
        max_length=12,
        choices=[("draft", "Draft"), ("published", "Published")],
        default="draft",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def clean(self):
        if self.status == "published" and not (self.title_fa and self.body_fa):
            raise ValidationError(
                "Published content requires complete Persian title and body."
            )


class Category(models.Model):
    slug = models.SlugField(unique=True)
    slug_fa = models.SlugField(blank=True)
    name_fa = models.CharField(max_length=120)
    name_en = models.CharField(max_length=120, blank=True)

    def __str__(self):
        return self.name_fa


class Post(BilingualContent):
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="posts"
    )
    published_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title_fa or self.slug


class CaseStudy(BilingualContent):
    def __str__(self):
        return self.title_fa or self.slug


class TeamMember(models.Model):
    name_fa = models.CharField(max_length=160)
    name_en = models.CharField(max_length=160, blank=True)
    role_fa = models.CharField(max_length=160)
    role_en = models.CharField(max_length=160, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)


class Testimonial(models.Model):
    quote_fa = models.TextField()
    quote_en = models.TextField(blank=True)
    attribution_fa = models.CharField(max_length=200)
    attribution_en = models.CharField(max_length=200, blank=True)


class JobOpening(BilingualContent):
    salary_min_toman = models.PositiveBigIntegerField(null=True, blank=True)
    salary_max_toman = models.PositiveBigIntegerField(null=True, blank=True)


class SiteConfig(models.Model):
    brand_en = models.CharField(max_length=100, default="Emmett")
    brand_fa = models.CharField(max_length=100, default="امت")
    telegram_handle = models.CharField(max_length=80, blank=True)
    building_fa = models.CharField(max_length=240, blank=True)
    building_en = models.CharField(max_length=240, blank=True)

    class Meta:
        verbose_name = "Site configuration"
        verbose_name_plural = "Site configuration"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
