from django.urls import path
from .views import CasesView, JobsView, PostsView, SiteConfigView, TeamView

urlpatterns = [
    path("public/posts/", PostsView.as_view()),
    path("public/case-studies/", CasesView.as_view()),
    path("public/team/", TeamView.as_view()),
    path("site-config/", SiteConfigView.as_view()),
    path("content/posts/", PostsView.as_view()),
    path("content/case-studies/", CasesView.as_view()),
    path("content/jobs/", JobsView.as_view()),
]
