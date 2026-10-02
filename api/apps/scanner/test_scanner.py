"""F-06 exit-gate tests — the six guards are enforced here, not just documented."""

from __future__ import annotations

import datetime as dt
import socket
import ssl

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.jobs import runner
from apps.jobs.models import Job

from . import blocklist, engine, transport
from .models import BlocklistEntry, ScanJob, ScanResult

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    return APIClient()


# --------------------------------------------------------------------------- #
# Guard 1 — passive only: nothing may leave ports 80/443
# --------------------------------------------------------------------------- #

def test_guard1_non_standard_port_is_refused_before_any_io(monkeypatch):
    calls = []
    monkeypatch.setattr(transport, "_open", lambda request, timeout: calls.append(request) or (_ for _ in ()).throw(AssertionError("network touched")))

    for url in (
        "http://example.com:8080/",
        "https://example.com:8443/",
        "ftp://example.com/",
        "http://example.com:22/",
    ):
        with pytest.raises(transport.PassiveGuardError):
            transport.guarded_request(url)
    assert calls == []


def test_guard1_redirect_to_another_port_is_refused(monkeypatch):
    class _Fake:
        status = 302
        headers = {"Location": "http://example.com:9001/"}

    def fake_open(request, timeout):
        raise AssertionError("redirect must be validated before following")

    monkeypatch.setattr(transport, "_open", fake_open)
    handler = transport._GuardedRedirectHandler()
    with pytest.raises(transport.PassiveGuardError):
        handler.redirect_request(None, None, 302, "", {}, "https://example.com:9001/")


def test_guard1_tls_handshake_only_ever_uses_443(monkeypatch):
    seen = []

    def fake_create_connection(address, timeout=None):
        seen.append(address)
        raise OSError("refused")

    monkeypatch.setattr(socket, "create_connection", fake_create_connection)
    with pytest.raises(OSError):
        transport.tls_handshake("example.com")
    assert seen == [("example.com", 443)]


def test_guard1_engine_uses_one_page_request_and_doh_only(monkeypatch):
    """The whole scan touches exactly one page URL and nothing outside 80/443."""
    urls: list[str] = []

    def fake_open(request, timeout):
        urls.append(request.full_url)
        raise OSError("no network in tests")

    monkeypatch.setattr(transport, "_open", fake_open)
    monkeypatch.setattr(transport, "tls_handshake", lambda host, timeout=5: {"protocol": "TLSv1.3", "cipher": "TLS_AES_128_GCM_SHA256", "cipher_bits": 128, "verified": True, "certificate": {}})
    monkeypatch.setattr(transport, "polite_delay", lambda *a, **k: None)

    scan = ScanJob.objects.create(job=Job.objects.create(kind="scan", payload={}), domain="example.com", consented=True)
    steps: list[dict] = []
    engine.run(scan, steps.append)

    page_requests = [url for url in urls if url.startswith("https://example.com/")]
    assert page_requests == ["https://example.com/"]  # exactly one passive request
    assert urls and all(transport._validate(url) for url in urls)  # every URL inside the envelope
    emitted = [step["step"] for step in steps]
    for step_id in engine.STEP_ORDER:
        assert step_id in emitted


# --------------------------------------------------------------------------- #
# Guard 4 — blocklist, evaluated before any job row exists
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize(
    "domain",
    ["gov.ir", "salam.gov.ir", "localhost", "127.0.0.1", "10.0.0.5", "192.168.1.10", "172.16.9.9", "example.com,example.org", "*.example.com"],
)
def test_guard4_blocked_domains_are_rejected(domain):
    allowed, reason_fa, _ = blocklist.check_domain(domain)
    assert allowed is False and reason_fa


def test_guard4_public_domain_is_allowed():
    allowed, _, _ = blocklist.check_domain("example.com")
    assert allowed is True


def test_guard4_blocklist_is_versioned_and_seeded():
    assert BlocklistEntry.objects.filter(version=blocklist.BLOCKLIST_VERSION).exists()


def test_guard4_rejection_happens_before_job_creation(api):
    jobs_before = Job.objects.count()
    response = api.post("/api/v1/scanner/jobs/", {"domain": "salam.gov.ir", "consent": True}, format="json")
    assert response.status_code == 400
    assert response.json()["reason"] == "blocked"
    assert Job.objects.count() == jobs_before  # no row was created


# --------------------------------------------------------------------------- #
# Guard 2 — consent
# --------------------------------------------------------------------------- #

def test_guard2_consent_is_mandatory(api):
    response = api.post("/api/v1/scanner/jobs/", {"domain": "example.com", "consent": False}, format="json")
    assert response.status_code == 400
    assert "message_fa" in response.json()
    assert Job.objects.count() == 0


# --------------------------------------------------------------------------- #
# Guard 3 — rate limit + honeypot
# --------------------------------------------------------------------------- #

def test_guard3_sixth_request_in_the_hour_is_429(api, monkeypatch):
    monkeypatch.setattr(blocklist, "check_domain", lambda value: (True, "", ""))
    statuses = [
        api.post("/api/v1/scanner/jobs/", {"domain": "example.com", "consent": True}, format="json").status_code
        for _ in range(6)
    ]
    assert statuses[:5] == [202] * 5
    assert statuses[5] == 429
    throttled = api.post("/api/v1/scanner/jobs/", {"domain": "example.com", "consent": True}, format="json")
    assert "message_fa" in throttled.json()


def test_guard3_honeypot_is_silently_accepted(api):
    jobs_before = Job.objects.count()
    response = api.post(
        "/api/v1/scanner/jobs/",
        {"domain": "example.com", "consent": True, "website": "http://spam.example"},
        format="json",
    )
    assert response.status_code == 202
    assert Job.objects.count() == jobs_before


# --------------------------------------------------------------------------- #
# Engine — six sections, grade, degraded steps
# --------------------------------------------------------------------------- #

def _fake_network(monkeypatch, *, fail_tls: bool = False):
    body = "<html><head><meta name='generator' content='WordPress 6.4.1'></head><body><script src='http://cdn.example/x.js'></script></body></html>"
    homepage = transport.HttpResult(
        url="https://example.com/",
        status=200,
        headers={
            "strict-transport-security": "max-age=31536000",
            "server": "nginx/1.24.0",
        },
        body=body,
    )
    monkeypatch.setattr(transport, "guarded_request", lambda url, **kw: homepage)
    monkeypatch.setattr(transport, "dns_over_https", lambda name, record_type, **kw: {"Status": 0, "AD": True, "Answer": [{"type": 16, "data": '"v=spf1 -all"'}] if record_type == "TXT" and name == "example.com" else []})
    monkeypatch.setattr(transport, "polite_delay", lambda *a, **k: None)
    if fail_tls:
        def boom(host, timeout=5):
            raise ssl.SSLError("handshake failed")

        monkeypatch.setattr(transport, "tls_handshake", boom)
    else:
        monkeypatch.setattr(
            transport,
            "tls_handshake",
            lambda host, timeout=5: {
                "protocol": "TLSv1.3",
                "cipher": "TLS_AES_128_GCM_SHA256",
                "cipher_bits": 128,
                "verified": True,
                "certificate": {
                    "notAfter": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=60)).strftime("%b %d %H:%M:%S %Y GMT"),
                    "subject": "CN=example.com",
                    "issuer": "CN=R3, O=Let's Encrypt",
                },
            },
        )


def test_engine_produces_six_sections_and_a_grade(monkeypatch):
    _fake_network(monkeypatch)
    scan = ScanJob.objects.create(job=Job.objects.create(kind="scan", payload={"blocklist_version": "v"}), domain="example.com", consented=True)
    steps: list[dict] = []
    result = engine.run(scan, steps.append)

    stored = ScanResult.objects.get(result_id=result["result_id"])
    assert [section["id"] for section in stored.checks] == list(engine.STEP_ORDER)
    assert all(section["checked"] for section in stored.checks)
    assert stored.grade in "ABCDEF" and 0 <= stored.score <= 100, (stored.grade, stored.score)
    assert result["ttl_days"] == 7
    assert any(step["state"] == "running" for step in steps)


def test_engine_step_failure_keeps_other_sections(monkeypatch):
    _fake_network(monkeypatch, fail_tls=True)
    scan = ScanJob.objects.create(job=Job.objects.create(kind="scan", payload={}), domain="example.com", consented=True)
    result = engine.run(scan, lambda step: None)
    stored = ScanResult.objects.get(result_id=result["result_id"])

    tls_section = next(section for section in stored.checks if section["id"] == "tls")
    assert tls_section["checked"] is False
    assert all(section["checked"] for section in stored.checks if section["id"] != "tls")
    assert stored.grade  # a grade is still produced


def test_polling_offset_returns_no_repeated_steps(api):
    scan = ScanJob.objects.create(job=Job.objects.create(kind="scan", payload={}), domain="example.com", consented=True)
    runner.JOBS["scan"] = lambda payload, progress: (progress({"step": "dns", "state": "done"}), {"ok": True})[1]
    runner.process_one("scan")
    first = api.get(f"/api/v1/scanner/jobs/{scan.job_id}/poll/?offset=0").json()
    second = api.get(f"/api/v1/scanner/jobs/{scan.job_id}/poll/?offset={first['offset_next']}").json()
    assert len(first["progress"]) == 1
    assert second["progress"] == []


# --------------------------------------------------------------------------- #
# Guard 5 — TTL + no attribution
# --------------------------------------------------------------------------- #

def test_guard5_result_is_unattributable_and_expires_after_seven_days(monkeypatch):
    _fake_network(monkeypatch)
    scan = ScanJob.objects.create(job=Job.objects.create(kind="scan", payload={}), domain="example.com", consented=True)
    result = engine.run(scan, lambda step: None)
    stored = ScanResult.objects.get(result_id=result["result_id"])

    assert len(stored.result_id) >= 16 and stored.result_id != str(stored.pk)
    assert not any(field.name in {"ip", "ip_address", "remote_addr"} for field in ScanResult._meta.get_fields())
    delta = stored.expires_at - stored.created_at
    assert 6.9 <= delta.total_seconds() / 86400 <= 7.1

    stored.expires_at = timezone.now() - dt.timedelta(seconds=1)
    stored.save(update_fields=["expires_at"])
    assert engine.purge_expired() >= 1
    assert not ScanResult.objects.filter(pk=stored.pk).exists()


def test_guard5_public_result_carries_noindex_header(api, monkeypatch):
    _fake_network(monkeypatch)
    scan = ScanJob.objects.create(job=Job.objects.create(kind="scan", payload={}), domain="example.com", consented=True)
    result = engine.run(scan, lambda step: None)
    response = api.get(f"/api/v1/scanner/results/{result['result_id']}/")
    assert response.status_code == 200
    assert response["X-Robots-Tag"].startswith("noindex")
    assert response.json()["noindex"] is True


# --------------------------------------------------------------------------- #
# Guard 6 — public output is masked
# --------------------------------------------------------------------------- #

def test_guard6_public_output_masks_versions_and_internal_shows_them(api, monkeypatch):
    _fake_network(monkeypatch)
    scan = ScanJob.objects.create(job=Job.objects.create(kind="scan", payload={}), domain="example.com", consented=True)
    result = engine.run(scan, lambda step: None)

    public = api.get(f"/api/v1/scanner/results/{result['result_id']}/").json()
    public_text = str(public)
    assert "1.24.0" not in public_text and "6.4.1" not in public_text
    assert "nginx" in public_text  # category stays visible

    from django.core import signing

    from .views import UNLOCK_SALT

    token = signing.TimestampSigner(salt=UNLOCK_SALT).sign(result["result_id"])
    internal = api.get(f"/api/v1/scanner/results/{result['result_id']}/?unlock={token}").json()
    assert internal["internal"] is True
    assert "nginx/1.24.0" in str(internal)


def test_unlock_token_is_required_for_internal_detail(api, monkeypatch):
    _fake_network(monkeypatch)
    scan = ScanJob.objects.create(job=Job.objects.create(kind="scan", payload={}), domain="example.com", consented=True)
    result = engine.run(scan, lambda step: None)
    forged = api.get(f"/api/v1/scanner/results/{result['result_id']}/?unlock=forged").json()
    assert forged["internal"] is False


# --------------------------------------------------------------------------- #
# Job wiring
# --------------------------------------------------------------------------- #

def test_scan_is_registered_on_the_job_engine():
    assert "scan" in runner.JOBS


def test_unknown_result_id_is_a_soft_404(api):
    response = api.get("/api/v1/scanner/results/does-not-exist/")
    assert response.status_code == 404
    assert "message_fa" in response.json()
