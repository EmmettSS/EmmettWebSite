from __future__ import annotations

from rest_framework import serializers

from apps.company.models import TeamMember, Testimonial


class TeamMemberSerializer(serializers.ModelSerializer[TeamMember]):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = TeamMember
        fields = ("public_id", "full_name", "role_title", "bio", "photo_url", "social_links", "order")

    def get_photo_url(self, obj: TeamMember) -> str | None:
        return obj.photo.file.url if obj.photo else None


class TestimonialSerializer(serializers.ModelSerializer[Testimonial]):
    author_photo_url = serializers.SerializerMethodField()
    related_project_slug = serializers.SlugField(source="related_project.slug", read_only=True, default=None)

    class Meta:
        model = Testimonial
        fields = (
            "id",
            "author_name",
            "author_role",
            "author_company",
            "author_photo_url",
            "quote",
            "related_project_slug",
            "is_featured",
        )

    def get_author_photo_url(self, obj: Testimonial) -> str | None:
        return obj.author_photo.file.url if obj.author_photo else None
