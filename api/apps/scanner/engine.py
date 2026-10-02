"""Scan orchestration: dns → tls → headers → cookies → content → leak.

Runs inside the job queue (cron each minute, ``process_jobs --kind=scan --timeout=90``).
Each step is independent: a failure marks that section unchecked and the scan continues.
Every network call is made through ``transport`` (guard 1) and every step is bounded at 5 s.
"""

from __future__ import annotations

import secrets

from . import checks, grading, transport
from .models import RESULT_TTL_DAYS, ScanResult

STEP_ORDER = ("dns", "tls", "headers", "cookies", "content", "leak")

STEP_LABELS = {
    "dns": ("بررسی رکوردهای DNS", "Checking DNS records"),
    "tls": ("بررسی TLS و گواهی", "Checking TLS and the certificate"),
    "headers": ("بررسی هدرهای امنیتی", "Checking security headers"),
    "cookies": ("بررسی کوکی‌ها", "Checking cookies"),
    "content": ("بررسی قرارگیری محتوا", "Checking content placement"),
    "leak": ("بررسی نشت اطلاعات", "Checking information leaks"),
}


def _emit(progress, section_id: str, state: str, note_fa: str = "", note_en: str = "") -> None:
    label_fa, label_en = STEP_LABELS[section_id]
    progress(
        {
            "step": section_id,
            "label_fa": label_fa,
            "label_en": label_en,
            "state": state,
            "note_fa": note_fa,
            "note_en": note_en,
        }
    )


def run(scan, progress) -> dict:
    domain = scan.domain
    sections: list[dict] = []

    # 1 — DNS (public records only, via DoH on 443)
    _emit(progress, "dns", "running")
    try:
        sections.append(checks.check_dns(domain))
        _emit(progress, "dns", "done")
    except Exception as exc:  # noqa: BLE001
        sections.append(checks.make_section("dns", *STEP_LABELS["dns"], [], str(exc), str(exc)))
        _emit(progress, "dns", "failed", str(exc), str(exc))
    transport.polite_delay(0.2, 0.6)

    # 2 — TLS (one handshake, port 443 only)
    _emit(progress, "tls", "running")
    handshake, tls_error = None, ""
    try:
        handshake = transport.tls_handshake(domain)
        _emit(progress, "tls", "done")
    except Exception as exc:  # noqa: BLE001
        tls_error = f"{type(exc).__name__}"
        _emit(progress, "tls", "failed", "اتصال TLS برقرار نشد.", "The TLS handshake failed.")
    sections.append(checks.check_tls(domain, handshake, tls_error))
    transport.polite_delay(0.2, 0.6)

    # 3–6 share exactly one HTTPS response (guard 1: passive, single request)
    homepage = None
    home_error = ""
    try:
        homepage = transport.guarded_request(f"https://{domain}/")
    except Exception as exc:  # noqa: BLE001
        home_error = f"{type(exc).__name__}"

    for section_id, builder in (
        ("headers", lambda: checks.check_headers(homepage)),
        ("cookies", lambda: checks.check_cookies(homepage)),
        ("content", lambda: checks.check_content(domain, homepage)),
        ("leak", lambda: checks.check_leak(homepage)),
    ):
        _emit(progress, section_id, "running")
        try:
            section = builder()
            if section.get("checked"):
                _emit(progress, section_id, "done")
            else:
                _emit(progress, section_id, "failed", home_error, home_error)
        except Exception as exc:  # noqa: BLE001
            label_fa, label_en = STEP_LABELS[section_id]
            section = checks.make_section(section_id, label_fa, label_en, [], str(exc), str(exc))
            _emit(progress, section_id, "failed", str(exc), str(exc))
        sections.append(section)

    score, grade = grading.overall(sections)
    result = ScanResult.objects.create(
        scan=scan,
        result_id=secrets.token_urlsafe(16),
        grade=grade,
        score=score,
        checks=sections,
        blocklist_version=scan.job.payload.get("blocklist_version", ""),
    )

    return {
        "result_id": result.result_id,
        "grade": result.grade,
        "score": result.score,
        "ttl_days": RESULT_TTL_DAYS,
        "sections": [{"id": item["id"], "score": item["score"], "checked": item["checked"]} for item in sections],
    }


def purge_expired() -> int:
    """Guard 5 — cron deletes anything past its 7-day TTL."""
    from django.utils import timezone

    deleted, _ = ScanResult.objects.filter(expires_at__lt=timezone.now()).delete()
    return deleted
