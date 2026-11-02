from __future__ import annotations

from django.urls import path

from apps.leads.views import ContactCreateView, NewsletterSubscribeView

urlpatterns = [
    path("contact/", ContactCreateView.as_view(), name="contact-create"),
    path("newsletter/", NewsletterSubscribeView.as_view(), name="newsletter-subscribe"),
]
