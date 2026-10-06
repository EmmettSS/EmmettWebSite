from __future__ import annotations

from typing import cast

import pytest

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.blog.models import BlogPost, Comment
from apps.blog.tests.factories import BlogPostFactory, CommentFactory

pytestmark = pytest.mark.django_db


class TestBlogPostModel:
    def test_str_returns_title(self) -> None:
        post = cast(BlogPost, BlogPostFactory(title="عنوان مقاله"))
        assert str(post) == "عنوان مقاله"

    def test_content_rendered_to_html_on_save(self) -> None:
        post = cast(BlogPost, BlogPostFactory(content="## سرتیتر\n\nمتن **پررنگ**."))
        assert "<h2" in post.content_html
        assert "<strong>" in post.content_html

    def test_reading_time_is_computed_and_at_least_one(self) -> None:
        post = cast(BlogPost, BlogPostFactory(content="یک کلمه"))
        assert post.reading_time_minutes >= 1

    def test_reading_time_increases_with_longer_content(self) -> None:
        short_post = cast(BlogPost, BlogPostFactory(slug="short-post", content="متن کوتاه"))
        long_post = cast(BlogPost, BlogPostFactory(slug="long-post", content="کلمه طولانی " * 500))
        assert long_post.reading_time_minutes > short_post.reading_time_minutes

    def test_view_count_defaults_to_zero(self) -> None:
        post = cast(BlogPost, BlogPostFactory())
        assert post.view_count == 0


class TestCommentModel:
    def test_str_includes_author_and_post_ids(self) -> None:
        user = cast(User, UserFactory())
        post = cast(BlogPost, BlogPostFactory())
        comment = cast(Comment, CommentFactory(post=post, author=user))
        assert str(comment) == f"Comment by {user.id} on {post.id}"

    def test_default_status_is_pending(self) -> None:
        user = cast(User, UserFactory())
        post = cast(BlogPost, BlogPostFactory())
        comment = cast(Comment, CommentFactory(post=post, author=user))
        assert comment.status == Comment.Status.PENDING

    def test_reply_relationship(self) -> None:
        user = cast(User, UserFactory())
        post = cast(BlogPost, BlogPostFactory())
        parent = cast(Comment, CommentFactory(post=post, author=user))
        reply = cast(Comment, CommentFactory(post=post, author=user, parent=parent))
        assert reply.parent == parent
        assert parent.replies.first() == reply

    def test_deleting_post_cascades_comments(self) -> None:
        user = cast(User, UserFactory())
        post = cast(BlogPost, BlogPostFactory())
        comment = cast(Comment, CommentFactory(post=post, author=user))
        post.delete(hard=True)
        assert not Comment.objects.filter(pk=comment.pk).exists()
