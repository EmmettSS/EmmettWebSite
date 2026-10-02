"""Guard 6 — two levels of output. Public is masked, internal is for a confirmed lead.

Masking is done at serialization time (the DB keeps the full finding so the internal report
and the PDF can show it). Everything that could help an attacker — exact software versions,
certificate issuer details — is reduced to a category in the public payload.
"""

from __future__ import annotations

import re
from typing import Any

from rest_framework import serializers

VERSION_RE = re.compile(r"\d+(?:\.\d+)+")
HOST_RE = re.compile(r"(?:[a-z0-9-]+\.)+[a-z]{2,}", re.I)


def mask_text(value: str) -> str:
    masked = VERSION_RE.sub("•", value or "")
    return masked


def public_finding(finding: dict[str, Any]) -> dict[str, Any]:
    public = {
        "key": finding.get("key", ""),
        "label_fa": finding.get("label_fa", ""),
        "label_en": finding.get("label_en", ""),
        "status": finding.get("status", "info"),
        "detail_fa": mask_text(finding.get("detail_fa", "")),
        "detail_en": mask_text(finding.get("detail_en", "")),
        "advice_fa": finding.get("advice_fa", ""),
        "snippet": finding.get("snippet", ""),
    }
    return public


def public_sections(checks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": section.get("id", ""),
            "label_fa": section.get("label_fa", ""),
            "label_en": section.get("label_en", ""),
            "checked": bool(section.get("checked")),
            "reason_fa": section.get("reason_fa", ""),
            "reason_en": section.get("reason_en", ""),
            "score": section.get("score", 0),
            "findings": [public_finding(item) for item in section.get("findings", [])],
        }
        for section in checks
    ]


def scan_result_payload(result, *, internal: bool = False) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "result_id": result.result_id,
        "domain": result.scan.domain,
        "grade": result.grade,
        "score": result.score,
        "created_at": result.created_at.isoformat(),
        "expires_at": result.expires_at.isoformat(),
        "ttl_days": 7,
        "noindex": True,
        "blocklist_version": result.blocklist_version,
        "sections": result.checks if internal else public_sections(result.checks),
        "internal": internal,
    }
    return payload


class ScanPollResponseSerializer(serializers.Serializer):
    job_id = serializers.IntegerField()
    state = serializers.CharField()
    progress = serializers.ListField(child=serializers.JSONField())
    offset_next = serializers.IntegerField()
    result = serializers.JSONField(required=False, allow_null=True)
    error = serializers.CharField(required=False, allow_null=True)


class ScanResultResponseSerializer(serializers.Serializer):
    result_id = serializers.CharField()
    domain = serializers.CharField()
    grade = serializers.CharField()
    score = serializers.IntegerField()
    created_at = serializers.CharField()
    expires_at = serializers.CharField()
    ttl_days = serializers.IntegerField()
    noindex = serializers.BooleanField()
    blocklist_version = serializers.CharField(allow_blank=True)
    sections = serializers.ListField(child=serializers.JSONField())
    internal = serializers.BooleanField()


class ScanCreatedResponseSerializer(serializers.Serializer):
    job_id = serializers.IntegerField()
    result_id = serializers.CharField(allow_null=True)
    domain = serializers.CharField()
    blocklist_version = serializers.CharField()
    estimated_seconds = serializers.IntegerField()
