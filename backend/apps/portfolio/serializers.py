from __future__ import annotations

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.portfolio.models import CaseStudy, Project
from apps.taxonomy.serializers import CategorySerializer, TagSerializer


class ProjectListSerializer(serializers.ModelSerializer[Project]):
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "public_id",
            "title",
            "slug",
            "summary",
            "client_name",
            "cover_image_url",
            "year",
            "is_product",
            "is_featured",
        )

    def get_cover_image_url(self, obj: Project) -> str | None:
        return obj.cover_image.file.url if obj.cover_image else None


class CaseStudySerializer(serializers.ModelSerializer[CaseStudy]):
    class Meta:
        model = CaseStudy
        fields = (
            "challenge_html",
            "approach_html",
            "architecture_notes_html",
            "technology_stack",
            "implementation_notes_html",
            "result_html",
            "metrics",
        )


class ProjectDetailSerializer(serializers.ModelSerializer[Project]):
    cover_image_url = serializers.SerializerMethodField()
    gallery_urls = serializers.SerializerMethodField()
    categories = CategorySerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    case_study = serializers.SerializerMethodField()
    service_slug = serializers.SlugField(source="service.slug", read_only=True, default=None)

    class Meta:
        model = Project
        fields = (
            "public_id",
            "title",
            "slug",
            "summary",
            "client_name",
            "service_slug",
            "categories",
            "tags",
            "cover_image_url",
            "gallery_urls",
            "year",
            "is_product",
            "case_study",
            "meta_title",
            "meta_description",
            "canonical_path",
        )

    def get_cover_image_url(self, obj: Project) -> str | None:
        return obj.cover_image.file.url if obj.cover_image else None

    def get_gallery_urls(self, obj: Project) -> list[str]:
        return [media.file.url for media in obj.gallery.all()]

    @extend_schema_field(CaseStudySerializer)
    def get_case_study(self, obj: Project) -> dict[str, object] | None:
        try:
            case_study = obj.case_study
        except CaseStudy.DoesNotExist:
            return None
        return CaseStudySerializer(case_study).data
