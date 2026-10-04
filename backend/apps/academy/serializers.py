from __future__ import annotations

from rest_framework import serializers

from apps.academy.models import Course, Enrollment, Instructor, Lesson
from apps.taxonomy.serializers import CategorySerializer, TagSerializer


class InstructorSerializer(serializers.ModelSerializer[Instructor]):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Instructor
        fields = ("public_id", "name", "title", "bio", "photo_url")

    def get_photo_url(self, obj: Instructor) -> str | None:
        return obj.photo.file.url if obj.photo else None


class LessonSerializer(serializers.ModelSerializer[Lesson]):
    class Meta:
        model = Lesson
        fields = (
            "id",
            "title",
            "summary",
            "content_html",
            "video_url",
            "order",
            "duration_minutes",
            "is_preview",
        )


class CourseListSerializer(serializers.ModelSerializer[Course]):
    cover_image_url = serializers.SerializerMethodField()
    instructor_name = serializers.CharField(source="instructor.name", read_only=True, default=None)

    class Meta:
        model = Course
        fields = (
            "public_id",
            "title",
            "slug",
            "summary",
            "level",
            "duration_hours",
            "instructor_name",
            "cover_image_url",
            "is_featured",
        )

    def get_cover_image_url(self, obj: Course) -> str | None:
        return obj.cover_image.file.url if obj.cover_image else None


class CourseDetailSerializer(serializers.ModelSerializer[Course]):
    cover_image_url = serializers.SerializerMethodField()
    instructor = InstructorSerializer(read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = (
            "public_id",
            "title",
            "slug",
            "summary",
            "description_html",
            "level",
            "duration_hours",
            "instructor",
            "categories",
            "tags",
            "cover_image_url",
            "lessons",
            "meta_title",
            "meta_description",
            "canonical_path",
        )

    def get_cover_image_url(self, obj: Course) -> str | None:
        return obj.cover_image.file.url if obj.cover_image else None


class EnrollmentCourseSerializer(serializers.ModelSerializer[Course]):
    """نسخهٔ خلاصهٔ دوره برای نمایش در فهرست «دوره‌های من»."""

    class Meta:
        model = Course
        fields = ("public_id", "title", "slug", "summary", "level")


class EnrollmentSerializer(serializers.ModelSerializer[Enrollment]):
    course = EnrollmentCourseSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = (
            "public_id",
            "course",
            "status",
            "enrolled_at",
            "completed_at",
            "progress_percent",
        )


class EnrollmentCreateSerializer(serializers.Serializer[dict[str, object]]):
    course_slug = serializers.SlugField()
