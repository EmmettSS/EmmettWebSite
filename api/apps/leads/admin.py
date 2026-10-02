import csv
from django.contrib import admin
from django.http import HttpResponse
from .models import (
    ContactLead,
    EmailOutbox,
    JobApplication,
    NewsletterSubscriber,
    WaitlistSignup,
)


def safe_csv(value):
    text = str(value)
    return (
        "'" + text
        if text.lstrip().startswith(("=", "+", "-", "@", "\t", "\r"))
        else text
    )


@admin.action(description="Export selected leads as CSV")
def export_leads_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = "attachment; filename=emmett-leads.csv"
    response.write("\ufeff")
    writer = csv.writer(response)
    writer.writerow(["name", "email", "message", "locale", "created_at"])
    for lead in queryset.iterator():
        writer.writerow(
            [
                safe_csv(lead.name),
                safe_csv(lead.email),
                safe_csv(lead.message),
                safe_csv(lead.locale),
                lead.created_at.isoformat(),
            ]
        )
    return response


@admin.register(ContactLead)
class ContactLeadAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "locale", "created_at")
    search_fields = ("name", "email")
    actions = (export_leads_csv,)
    readonly_fields = tuple(f.name for f in ContactLead._meta.fields)


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "role", "created_at")
    search_fields = ("name", "email", "role")
    readonly_fields = tuple(field.name for field in JobApplication._meta.fields)


admin.site.register([NewsletterSubscriber, WaitlistSignup, EmailOutbox])
