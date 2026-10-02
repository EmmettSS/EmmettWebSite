from django.contrib import admin
from .models import (
    Category,
    CaseStudy,
    JobOpening,
    Post,
    SiteConfig,
    TeamMember,
    Testimonial,
)


class BilingualAdmin(admin.ModelAdmin):
    list_display = ("slug", "title_fa", "title_en", "status", "updated_at")
    list_filter = ("status",)
    search_fields = ("slug", "title_fa", "title_en")
    fieldsets = (
        ("Publishing", {"fields": ("status", "slug", "slug_fa")}),
        ("فارسی", {"fields": ("title_fa", "body_fa")}),
        ("English", {"fields": ("title_en", "body_en")}),
    )


@admin.register(Post)
class PostAdmin(BilingualAdmin):
    list_display = BilingualAdmin.list_display + ("category",)


@admin.register(CaseStudy)
class CaseStudyAdmin(BilingualAdmin):
    pass


@admin.register(JobOpening)
class JobAdmin(BilingualAdmin):
    list_editable = ("status",)


@admin.register(TeamMember)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name_fa", "name_en", "role_fa", "sort_order")
    ordering = ("sort_order",)


admin.site.register([Category, Testimonial, SiteConfig])
