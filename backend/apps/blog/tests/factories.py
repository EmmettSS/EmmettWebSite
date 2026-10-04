from __future__ import annotations

from factory.declarations import Sequence
from factory.django import DjangoModelFactory

from apps.blog.models import BlogPost, Comment
from apps.core.models import PublishableModel


class BlogPostFactory(DjangoModelFactory[BlogPost]):
    class Meta:
        model = BlogPost
        django_get_or_create = ("slug",)

    title = Sequence(lambda n: f"مقالهٔ شماره {n}")
    slug = Sequence(lambda n: f"post-{n}")
    excerpt = "خلاصهٔ کوتاه مقاله"
    content = "متن مقاله " * 20
    status = PublishableModel.Status.PUBLISHED


class CommentFactory(DjangoModelFactory[Comment]):
    class Meta:
        model = Comment

    post = None
    author = None
    body = "نظر نمونه"
    status = Comment.Status.PENDING
