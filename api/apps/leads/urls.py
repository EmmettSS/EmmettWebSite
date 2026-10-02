from django.urls import path
from .application import JobApplicationView
from .views import (
    ContactView,
    NewsletterConfirmView,
    NewsletterUnsubscribeView,
    NewsletterView,
    WaitlistView,
)

urlpatterns = [
    path("leads/contact/", ContactView.as_view()),
    path("leads/newsletter/", NewsletterView.as_view()),
    path(
        "leads/newsletter/confirm/",
        NewsletterConfirmView.as_view(),
        name="newsletter-confirm",
    ),
    path(
        "leads/newsletter/unsubscribe/",
        NewsletterUnsubscribeView.as_view(),
        name="newsletter-unsubscribe",
    ),
    path("leads/waitlist/", WaitlistView.as_view()),
    path("leads/job-application/", JobApplicationView.as_view()),
]
