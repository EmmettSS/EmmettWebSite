from django.urls import path
from .views import HealthView, PublicToolsView
from .feeds import content_sitemap, posts_feed

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("public/tools/", PublicToolsView.as_view(), name="public-tools"),
    path("sitemap.xml", content_sitemap, name="content-sitemap"),
    path("feed.xml", posts_feed, name="posts-feed"),
]
