from __future__ import annotations

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.blog.models import BlogPost, Comment
from apps.core.utils.markdown import extract_toc
from apps.taxonomy.serializers import CategorySerializer, TagSerializer


class BlogPostListSerializer(serializers.ModelSerializer[BlogPost]):
    cover_image_url = serializers.SerializerMethodField()
    author_name = serializers.CharField(source="author.get_full_name", read_only=True, default=None)

    class Meta:
        model = BlogPost
        fields = (
            "public_id",
            "title",
            "slug",
            "excerpt",
            "cover_image_url",
            "author_name",
            "reading_time_minutes",
            "published_at",
        )

    def get_cover_image_url(self, obj: BlogPost) -> str | None:
        return obj.cover_image.file.url if obj.cover_image else None


class CommentSerializer(serializers.ModelSerializer[Comment]):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = Comment
        fields = ("id", "author_name", "parent", "body", "status", "created_at")
        read_only_fields = ("status",)


class CommentCreateSerializer(serializers.ModelSerializer[Comment]):
    class Meta:
        model = Comment
        fields = ("parent", "body")


class BlogPostDetailSerializer(serializers.ModelSerializer[BlogPost]):
    cover_image_url = serializers.SerializerMethodField()
    author_name = serializers.CharField(source="author.get_full_name", read_only=True, default=None)
    categories = CategorySerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    toc = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    related_posts = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = (
            "public_id",
            "title",
            "slug",
            "excerpt",
            "content_html",
            "cover_image_url",
            "author_name",
            "categories",
            "tags",
            "reading_time_minutes",
            "view_count",
            "published_at",
            "toc",
            "comments",
            "related_posts",
            "meta_title",
            "meta_description",
            "canonical_path",
        )

    def get_cover_image_url(self, obj: BlogPost) -> str | None:
        return obj.cover_image.file.url if obj.cover_image else None

    def get_toc(self, obj: BlogPost) -> list[dict[str, str]]:
        return extract_toc(obj.content_html)

    @extend_schema_field(CommentSerializer(many=True))
    def get_comments(self, obj: BlogPost) -> list[dict[str, object]]:
        approved = obj.comments.filter(status=Comment.Status.APPROVED, parent__isnull=True).select_related(
            "author"
        )
        return list(CommentSerializer(approved, many=True).data)

    @extend_schema_field(BlogPostListSerializer(many=True))
    def get_related_posts(self, obj: BlogPost) -> list[dict[str, object]]:
        related = (
            BlogPost.objects.filter(status=BlogPost.Status.PUBLISHED, categories__in=obj.categories.all())
            .exclude(pk=obj.pk)
            .distinct()[:3]
        )
        return list(BlogPostListSerializer(related, many=True).data)
