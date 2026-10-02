import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.tools import jalali as core
from apps.tools.normalize import normalize_persian

pytestmark = pytest.mark.django_db

client = APIClient()


# --------------------------------------------------------------------------- #
# Jalali calendar — server port must match the client canonical anchors (F-01)
# --------------------------------------------------------------------------- #

def test_jalali_anchors_match_client_canonical_cases():
    assert core.jalali_to_gregorian(1403, 12, 30) == (2025, 3, 20)
    assert core.jalali_to_gregorian(1404, 1, 1) == (2025, 3, 21)
    assert core.gregorian_to_jalali(2025, 3, 20) == (1403, 12, 30)
    # 1404/01/01 is a Friday → weekday index 6 with the Iranian week start on Saturday.
    assert core.jalali_weekday(1404, 1, 1) == 6


def test_jalali_leap_years_are_algorithmic_not_tabulated():
    assert core.is_leap_year(1403) is True
    assert core.is_leap_year(1404) is False
    assert core.is_leap_year(1399) is True


def test_jalali_range_guard_is_explicit():
    with pytest.raises(core.OutOfRange):
        core.jalali_to_gregorian(1501, 1, 1)
    with pytest.raises(ValueError):
        core.jalali_to_gregorian(1404, 13, 1)


def test_convert_endpoint_round_trips_and_reports_weekday():
    response = client.get("/api/v1/tools/jalali/convert/", {"from": "jalali", "to": "gregorian", "value": "1404/01/01"})
    assert response.status_code == 200
    assert response.data["gregorian"] == "2025-03-21"
    assert response.data["weekday_en"] == "Friday"
    assert response.data["leap_year"] is False

    back = client.get("/api/v1/tools/jalali/convert/", {"from": "gregorian", "to": "jalali", "value": "2025-03-20"})
    assert back.status_code == 200 and back.data["jalali"] == "1403/12/30"


def test_convert_endpoint_rejects_bad_input_with_persian_message():
    response = client.get("/api/v1/tools/jalali/convert/", {"from": "jalali", "to": "gregorian", "value": "1404/13/40"})
    assert response.status_code == 400
    assert "message_fa" in response.data and "message_en" in response.data


def test_holidays_endpoint_is_versioned_and_cached():
    cache.clear()
    response = client.get("/api/v1/tools/jalali/holidays/", {"year": 1404})
    assert response.status_code == 200
    assert response.data["version"] == "solar-fixed-1404.1"
    assert response.data["coverage"] == "solar-fixed"
    dates = {item["date"]: item["label"] for item in response.data["items"]}
    assert dates["1404/01/01"] == "نوروز"
    assert dates["1404/01/13"] == "روز طبیعت"
    assert cache.get("tools:holidays:1404") is not None
    assert "1404/01/01" in cache.get("tools:holidays:1404")["items"][0]["date"]


def test_holidays_endpoint_is_honest_for_out_of_range_and_unknown_years():
    out_of_range = client.get("/api/v1/tools/jalali/holidays/", {"year": 1600})
    assert out_of_range.status_code == 400
    unknown = client.get("/api/v1/tools/jalali/holidays/", {"year": 1410})
    assert unknown.status_code == 200
    assert unknown.data["coverage"] == "unknown-year" and unknown.data["items"] == []
    missing = client.get("/api/v1/tools/jalali/holidays/")
    assert missing.status_code == 400


# --------------------------------------------------------------------------- #
# Persian text normaliser — parity with the client examples (F-04)
# --------------------------------------------------------------------------- #

def test_normalize_parity_with_client_examples():
    result = normalize_persian("مي شود اين كتاب را دید")
    assert result["normalized"] == "می شود این کتاب را دید"
    assert result["total"] > 0
    assert result["rules_version"]


def test_normalize_is_idempotent_and_conservative_with_exceptions():
    once = normalize_persian("میز و دفتر را ببین")["normalized"]
    assert "میز" in once and "دفتر" in once
    twice = normalize_persian(once)["normalized"]
    assert twice == once


def test_normalize_endpoint_validates_rules_and_size():
    ok = client.post("/api/v1/tools/persian-text/normalize/", {"text": "مي شود", "rules": ["yeh", "zwnj"]}, format="json")
    assert ok.status_code == 200 and "می" in ok.data["normalized"]
    bad_rule = client.post("/api/v1/tools/persian-text/normalize/", {"text": "x", "rules": ["nope"]}, format="json")
    assert bad_rule.status_code == 400
    too_large = client.post("/api/v1/tools/persian-text/normalize/", {"text": "ا" * 50_001}, format="json")
    assert too_large.status_code == 400


# --------------------------------------------------------------------------- #
# Share links + usage pings (permanent noindex links, aggregate-only telemetry)
# --------------------------------------------------------------------------- #

def test_share_round_trip_and_permanent_noindex_contract():
    created = client.post(
        "/api/v1/tools/share/",
        {"tool": "jalali", "locale": "fa", "summary_fa": "تبدیل تاریخ: ۱۴۰۴/۰۱/۰۱", "summary_en": "Conversion", "params": {"d": "1404/01/01"}},
        format="json",
    )
    assert created.status_code == 201
    assert created.data["permanent"] is True and created.data["noindex"] is True
    assert created.data["path"] == f"/fa/share/{created.data['share_id']}/"

    detail = client.get(f"/api/v1/tools/share/{created.data['share_id']}/")
    assert detail.status_code == 200
    assert detail.data["summary_fa"].startswith("تبدیل تاریخ")
    assert detail.data["params"] == {"d": "1404/01/01"}
    assert client.get("/api/v1/tools/share/does-not-exist/").status_code == 400


def test_share_rejects_unknown_tools_and_oversized_payloads():
    unknown = client.post("/api/v1/tools/share/", {"tool": "scanner", "locale": "fa", "summary_fa": "x", "summary_en": "x"}, format="json")
    assert unknown.status_code == 400
    oversized = client.post(
        "/api/v1/tools/share/",
        {"tool": "toman", "locale": "fa", "summary_fa": "x" * 401, "summary_en": "x"},
        format="json",
    )
    assert oversized.status_code == 400


def test_usage_ping_stores_aggregate_only():
    from apps.tools.models import ToolUsage

    response = client.post("/api/v1/tools/usage/", {"tool": "jwt", "locale": "fa", "completed": True}, format="json")
    assert response.status_code == 202
    row = ToolUsage.objects.get()
    assert (row.tool, row.locale, row.completed) == ("jwt", "fa", True)
    assert not hasattr(row, "ip")
    assert client.post("/api/v1/tools/usage/", {"tool": "nope"}, format="json").status_code == 400
