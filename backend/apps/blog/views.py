from __future__ import annotations

from django.db.models import F, QuerySet
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.blog.models import BlogPost, Comment
from apps.blog.serializers import (
    BlogPostDetailSerializer,
    BlogPostListSerializer,
    CommentCreateSerializer,
    CommentSerializer,
)
from apps.core.viewsets import PublicReadOnlyViewSet


class BlogPostViewSet(PublicReadOnlyViewSet[BlogPost]):
    serializer_class = BlogPostListSerializer
    filterset_fields = ["categories__slug", "tags__slug"]
    search_fields = ["title_fa", "title_en", "excerpt_fa", "excerpt_en", "content_fa", "content_en"]
    ordering_fields = ["published_at"]

    def get_queryset(self) -> QuerySet[BlogPost]:
        # ر.ک. توضیح مشابه در ``apps.services.views.ServiceViewSet.get_queryset``.
        qs: QuerySet[BlogPost] = BlogPost.objects.filter(status=BlogPost.Status.PUBLISHED).select_related(
            "author", "cover_image"
        )
        if self.action == "retrieve":
            qs = qs.prefetch_related("categories", "tags", "comments__author")
        return qs.order_by("-published_at")

    def get_serializer_class(self) -> type[BlogPostListSerializer | BlogPostDetailSerializer]:
        if self.action == "retrieve":
            return BlogPostDetailSerializer
        return BlogPostListSerializer

    def retrieve(self, request: Request, *args: object, **kwargs: object) -> Response:
        response = super().retrieve(request, *args, **kwargs)
        BlogPost.objects.filter(pk=self.get_object().pk).update(view_count=F("view_count") + 1)
        return response

    @action(
        detail=True,
        methods=["post"],
        url_path="comments",
        permission_classes=[IsAuthenticated],
        serializer_class=CommentCreateSerializer,
    )
    def add_comment(self, request: Request, slug: str | None = None) -> Response:
        """ثبت کامنت جدید — همیشه با ``status=pending`` تا تأیید ادمین (ADR-0025)."""

        post = self.get_object()
        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(post=post, author=request.user, status=Comment.Status.PENDING)
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)
