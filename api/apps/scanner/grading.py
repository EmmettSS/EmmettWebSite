"""Weighted 0–100 scoring and A–F grades. Weights live in settings, not in code."""

from __future__ import annotations

from django.conf import settings

DEFAULT_WEIGHTS = {
    "headers": 0.30,
    "tls": 0.25,
    "dns": 0.15,
    "cookies": 0.10,
    "content": 0.10,
    "leak": 0.10,
}

GRADE_BANDS = ((90, "A"), (80, "B"), (70, "C"), (60, "D"), (50, "E"))


def weights() -> dict[str, float]:
    return getattr(settings, "SCANNER_SECTION_WEIGHTS", DEFAULT_WEIGHTS)


def grade_for(score: int) -> str:
    for threshold, grade in GRADE_BANDS:
        if score >= threshold:
            return grade
    return "F"


def overall(sections: list[dict]) -> tuple[int, str]:
    """`sections` = [{id, score, checked}] — unchecked sections keep their weight."""
    total_weight = 0.0
    weighted = 0.0
    for section in sections:
        weight = weights().get(section["id"], 0.0)
        if not section.get("checked"):
            continue
        total_weight += weight
        weighted += weight * section["score"]
    if total_weight == 0:
        return 0, "F"
    score = round(weighted / total_weight)
    return score, grade_for(score)
