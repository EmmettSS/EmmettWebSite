from __future__ import annotations

from modeltranslation.translator import TranslationOptions, register

from apps.company.models import TeamMember, Testimonial


@register(TeamMember)
class TeamMemberTranslationOptions(TranslationOptions):
    fields = ("role_title", "bio")


@register(Testimonial)
class TestimonialTranslationOptions(TranslationOptions):
    fields = ("author_role", "quote")
