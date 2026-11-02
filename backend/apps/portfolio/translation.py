from __future__ import annotations

from modeltranslation.translator import TranslationOptions, register

from apps.portfolio.models import CaseStudy, Project


@register(Project)
class ProjectTranslationOptions(TranslationOptions):
    fields = ("title", "summary", "meta_title", "meta_description")


@register(CaseStudy)
class CaseStudyTranslationOptions(TranslationOptions):
    fields = (
        "challenge",
        "challenge_html",
        "approach",
        "approach_html",
        "architecture_notes",
        "architecture_notes_html",
        "implementation_notes",
        "implementation_notes_html",
        "result",
        "result_html",
    )
