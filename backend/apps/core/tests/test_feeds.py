"""تست فیدهای RSS/Atom بلاگ و آکادمی (فاز ۷ — ADR-0031).

دو قاعدهٔ SEO اینجا قفل می‌شود:

1. **URL مطلق** — ``<link>`` و ``<guid>`` باید با ``PUBLIC_SITE_URL`` شروع
   شوند (فید با مسیر نسبی برای خواننده‌ها نامعتبر است).
2. **صحت زبان** — ``?language=en`` باید مسیرهای ``/en/...`` بدهد.
"""

from __future__ import annotations

from typing import Any

import pytest
from django.test import Client

from apps.academy.tests.factories import CourseFactory
from apps.blog.tests.factories import BlogPostFactory
from apps.core.models import PublishableModel

pytestmark = pytest.mark.django_db


class TestBlogFeed:
    def test_items_use_absolute_urls(self, client: Client, settings: Any) -> None:
        settings.PUBLIC_SITE_URL = "https://emmett.example"
        post = BlogPostFactory(slug="rss-post-1")

        response = client.get("/api/v1/blog/rss/")

        assert response.status_code == 200
        assert response["Content-Type"].startswith("application/rss+xml")
        body = response.content.decode()
        assert f"https://emmett.example/blog/{post.slug}/" in body
        assert body.count("<item>") == 1

    def test_english_language_query_switches_paths(self, client: Client, settings: Any) -> None:
        settings.PUBLIC_SITE_URL = "https://emmett.example"
        BlogPostFactory(slug="rss-post-en")

        response = client.get("/api/v1/blog/rss/", {"language": "en"})

        body = response.content.decode()
        assert "https://emmett.example/en/blog/rss-post-en/" in body

    def test_drafts_are_not_in_the_feed(self, client: Client) -> None:
        BlogPostFactory(slug="published-post")
        BlogPostFactory(slug="draft-post", status=PublishableModel.Status.DRAFT)

        response = client.get("/api/v1/blog/rss/")

        body = response.content.decode()
        assert "published-post" in body
        assert "draft-post" not in body


class TestAcademyFeed:
    def test_course_feed_is_published_only(self, client: Client, settings: Any) -> None:
        settings.PUBLIC_SITE_URL = "https://emmett.example"
        CourseFactory(slug="course-live")
        CourseFactory(slug="course-hidden", status=PublishableModel.Status.DRAFT)

        response = client.get("/api/v1/academy/rss/")

        assert response.status_code == 200
        body = response.content.decode()
        assert "https://emmett.example/academy/course-live/" in body
        assert "course-hidden" not in body
        # عنوان فید و توضیح هم باید درست بیاید.
        assert "<title>Emmett Academy</title>" in body

    def test_english_course_paths(self, client: Client, settings: Any) -> None:
        settings.PUBLIC_SITE_URL = "https://emmett.example"
        CourseFactory(slug="course-en")

        response = client.get("/api/v1/academy/rss/", {"language": "en"})

        assert "https://emmett.example/en/academy/course-en/" in response.content.decode()
