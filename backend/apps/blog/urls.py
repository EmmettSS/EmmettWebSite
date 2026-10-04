from __future__ import annotations

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.blog.feeds import LatestBlogPostsFeed
from apps.blog.views import BlogPostViewSet

router = DefaultRouter()
router.register("", BlogPostViewSet, basename="blog-post")

urlpatterns = [
    path("rss/", LatestBlogPostsFeed(), name="blog-rss"),
    *router.urls,
]
