from __future__ import annotations

from typing import cast

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.blog.models import BlogPost, Comment
from apps.blog.tests.factories import BlogPostFactory, CommentFactory
from apps.core.models import PublishableModel
from apps.taxonomy.models import Category
from apps.taxonomy.tests.factories import CategoryFactory

pytestmark = pytest.mark.django_db


class TestBlogPostViewSet:
    def test_list_only_returns_published_posts(self) -> None:
        BlogPostFactory(status=PublishableModel.Status.PUBLISHED, slug="published-post")
        BlogPostFactory(status=PublishableModel.Status.DRAFT, slug="draft-post")

        client = APIClient()
        response = client.get("/api/v1/blog/")
        slugs = [item["slug"] for item in response.data.get("results", response.data)]
        assert "published-post" in slugs
        assert "draft-post" not in slugs

    def test_retrieve_increments_view_count(self) -> None:
        post = cast(BlogPost, BlogPostFactory(slug="view-count-post"))
        assert post.view_count == 0

        client = APIClient()
        client.get("/api/v1/blog/view-count-post/")
        client.get("/api/v1/blog/view-count-post/")

        post.refresh_from_db()
        assert post.view_count == 2

    def test_retrieve_includes_toc(self) -> None:
        BlogPostFactory(slug="toc-post", content="## بخش اول\n\nمتن.\n\n## بخش دوم\n\nمتن.")
        client = APIClient()
        response = client.get("/api/v1/blog/toc-post/")
        assert len(response.data["toc"]) == 2

    def test_retrieve_only_includes_approved_top_level_comments(self) -> None:
        post = cast(BlogPost, BlogPostFactory(slug="commented-post"))
        user = cast(User, UserFactory())
        CommentFactory(post=post, author=user, body="تایید‌شده", status=Comment.Status.APPROVED)
        CommentFactory(post=post, author=user, body="در انتظار", status=Comment.Status.PENDING)
        CommentFactory(post=post, author=user, body="رد‌شده", status=Comment.Status.REJECTED)

        client = APIClient()
        response = client.get("/api/v1/blog/commented-post/")
        bodies = [c["body"] for c in response.data["comments"]]
        assert bodies == ["تایید‌شده"]

    def test_retrieve_includes_related_posts_by_shared_category(self) -> None:
        category = cast(Category, CategoryFactory(slug="shared-cat"))
        main = cast(BlogPost, BlogPostFactory(slug="main-post"))
        main.categories.add(category)
        related = cast(BlogPost, BlogPostFactory(slug="related-post"))
        related.categories.add(category)
        BlogPostFactory(slug="unrelated-post")

        client = APIClient()
        response = client.get("/api/v1/blog/main-post/")
        related_slugs = [p["slug"] for p in response.data["related_posts"]]
        assert related_slugs == ["related-post"]

    def test_add_comment_requires_authentication(self) -> None:
        BlogPostFactory(slug="needs-auth")
        client = APIClient()
        response = client.post("/api/v1/blog/needs-auth/comments/", {"body": "سلام"})
        assert response.status_code == 403

    def test_add_comment_creates_pending_comment(self) -> None:
        post = cast(BlogPost, BlogPostFactory(slug="add-comment-post"))
        user = cast(User, UserFactory())
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(
            "/api/v1/blog/add-comment-post/comments/",
            {"body": "نظر من دربارهٔ این مقاله"},
        )

        assert response.status_code == 201
        assert response.data["status"] == Comment.Status.PENDING
        comment = Comment.objects.get(post=post, author=user)
        assert comment.status == Comment.Status.PENDING

    def test_new_comment_is_not_immediately_visible_in_detail(self) -> None:
        BlogPostFactory(slug="moderation-post")
        user = cast(User, UserFactory())
        client = APIClient()
        client.force_authenticate(user=user)
        client.post("/api/v1/blog/moderation-post/comments/", {"body": "نظر در انتظار تایید"})

        anon_client = APIClient()
        response = anon_client.get("/api/v1/blog/moderation-post/")
        assert response.data["comments"] == []

    def test_search_by_title(self) -> None:
        BlogPostFactory(slug="unique-search-post", title_fa="عبارت منحصربه‌فرد")
        BlogPostFactory(slug="other-post", title_fa="چیز دیگر")

        client = APIClient()
        response = client.get("/api/v1/blog/", {"search": "منحصربه‌فرد"})
        slugs = [item["slug"] for item in response.data.get("results", response.data)]
        assert slugs == ["unique-search-post"]


class TestBlogRssFeed:
    def test_rss_feed_is_public_and_lists_published_posts(self) -> None:
        BlogPostFactory(slug="rss-post", title="مطلب فید")
        BlogPostFactory(slug="rss-draft", status=PublishableModel.Status.DRAFT)

        client = APIClient()
        response = client.get("/api/v1/blog/rss/")

        assert response.status_code == 200
        content = response.content.decode()
        assert "rss-post" in content
        assert "rss-draft" not in content

    def test_rss_item_link_uses_localized_path(self) -> None:
        BlogPostFactory(slug="localized-rss-post")
        client = APIClient()
        response = client.get("/api/v1/blog/rss/")
        content = response.content.decode()
        assert "/blog/localized-rss-post/" in content
