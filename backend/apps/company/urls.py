from __future__ import annotations

from rest_framework.routers import DefaultRouter

from apps.company.views import TeamMemberViewSet, TestimonialViewSet

router = DefaultRouter()
router.register("team", TeamMemberViewSet, basename="team-member")
router.register("testimonials", TestimonialViewSet, basename="testimonial")

urlpatterns = router.urls
