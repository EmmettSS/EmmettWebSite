from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import CaseStudy, JobOpening, Post, SiteConfig, TeamMember
from .serializers import ContentSerializer, SiteConfigSerializer, TeamSerializer


class PublicList(APIView):
    serializer_class = ContentSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    model = None

    def get(self, request):
        lang = "en" if request.query_params.get("lang") == "en" else "fa"
        rows = self.model.objects.filter(status="published").order_by("-created_at")
        return Response(
            [
                {
                    "slug": r.slug,
                    "slug_fa": r.slug_fa,
                    "title": getattr(r, f"title_{lang}") or r.title_fa,
                    "body": getattr(r, f"body_{lang}") or r.body_fa,
                    "published_at": getattr(r, "published_at", None),
                }
                for r in rows
            ]
        )


class PostsView(PublicList):
    model = Post


class CasesView(PublicList):
    model = CaseStudy


class JobsView(PublicList):
    model = JobOpening


class SiteConfigView(APIView):
    serializer_class = SiteConfigSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        item = SiteConfig.objects.first()
        if not item:
            return Response(
                {
                    "brand_en": "Emmett",
                    "brand_fa": "امت",
                    "telegram_handle": "[INPUT B5]",
                    "building_fa": "[INPUT B4]",
                    "building_en": "[INPUT B4]",
                }
            )
        return Response(
            {
                "brand_en": item.brand_en,
                "brand_fa": item.brand_fa,
                "telegram_handle": item.telegram_handle,
                "building_fa": item.building_fa,
                "building_en": item.building_en,
            }
        )


class TeamView(APIView):
    serializer_class = TeamSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(
            list(
                TeamMember.objects.order_by("sort_order").values(
                    "name_fa", "name_en", "role_fa", "role_en"
                )
            )
        )
