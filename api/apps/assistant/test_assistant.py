"""F-08 exit-gate tests — the four mandatory guards plus the order of operations."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.jobs.models import Job

from . import answers, indexer, retrieval
from .answers import AI_DISCLOSURE_FA, DEGRADED_FA, NOT_FOUND_FA
from .models import AssistantAnswer, AssistantChunk, AssistantQueryCache, AssistantUsage

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def corpus():
    indexer.sync_corpus(embed=False)
    retrieval.cache.delete(retrieval.CACHE_KEY)
    yield


@pytest.fixture
def api():
    return APIClient()


class SpyProvider:
    """Records every call so tests can assert the LLM was never contacted."""

    name = "spy"
    available = True

    def __init__(self, answer: str = "پاسخ آزمایشی [1]"):
        self.answer = answer
        self.calls: list[list[dict]] = []
        self.embed_calls = 0

    def embed(self, texts):
        self.embed_calls += 1
        return [[1.0, 0.0, 0.0] for _ in texts]

    def complete(self, messages, **kwargs):
        from .providers import Completion

        self.calls.append(messages)
        return Completion(text=self.answer, prompt_tokens=10, completion_tokens=10, provider=self.name)


@pytest.fixture
def spy(monkeypatch):
    provider = SpyProvider()
    monkeypatch.setattr(answers, "get_provider", lambda: provider)
    monkeypatch.setenv("ASSISTANT_DAILY_COST_CAP_USD", "5")
    return provider


# --------------------------------------------------------------------------- #
# 1 — a question the corpus can answer
# --------------------------------------------------------------------------- #

def test_question_with_corpus_answer_returns_valid_citations(api):
    response = api.post(
        "/api/v1/assistant/ask/",
        {"question": "پن‌تستور چطور کار می‌کند؟", "locale": "fa"},
        format="json",
    )
    assert response.status_code == 202
    job_id = response.json()["job_id"]
    payload = api.get(f"/api/v1/assistant/ask/{job_id}/poll/?offset=0").json()["result"]

    assert payload["citations"], "an answer must carry at least one citation"
    assert payload["mode"] == "bm25"  # B7 open → BM25 is the shipped default
    assert DEGRADED_FA in payload["answer"]
    for citation in payload["citations"]:
        assert citation["source"]


def test_bm25_fallback_works_without_any_provider(api):
    """Card test 3 — provider off must still answer, with an honest notice and no error."""
    response = api.post("/api/v1/assistant/ask/", {"question": "روی چه پشته‌ای کار می‌کنید؟", "locale": "fa"}, format="json")
    payload = api.get(f"/api/v1/assistant/ask/{response.json()['job_id']}/poll/").json()["result"]
    assert payload["mode"] == "bm25"
    assert payload["provider"] == "bm25"
    assert payload["citations"]
    assert payload["answer"].strip()
    assert "error" not in payload


# --------------------------------------------------------------------------- #
# 2 — the threshold must run *before* the provider
# --------------------------------------------------------------------------- #

def test_unrelated_question_makes_no_llm_call(spy):
    result = answers.answer_question("دستور پخت کیک شکلاتی با خامه چیست؟", "fa")
    assert result["mode"] == "not_found"
    assert result["answer"].startswith(NOT_FOUND_FA)
    assert result["citations"] == []
    assert spy.calls == []  # ← the whole point: similarity threshold comes first


def test_llm_path_is_used_when_a_provider_exists(spy):
    result = answers.answer_question("روی چه پشته‌ای کار می‌کنید؟", "fa")
    assert result["mode"] == "llm"
    assert result["provider"] == "spy"
    assert spy.calls, "a provider with budget must be contacted"


# --------------------------------------------------------------------------- #
# 4 — cost cap falls back to BM25 instead of erroring
# --------------------------------------------------------------------------- #

def test_cost_cap_reached_falls_back_to_bm25(spy, monkeypatch):
    row = AssistantUsage.today()
    row.cost_usd = 9.0
    row.save(update_fields=["cost_usd"])
    monkeypatch.setenv("ASSISTANT_DAILY_COST_CAP_USD", "5")

    result = answers.answer_question("روی چه پشته‌ای کار می‌کنید؟", "fa")
    assert result["mode"] == "bm25"
    assert spy.calls == []
    assert DEGRADED_FA in result["answer"]


# --------------------------------------------------------------------------- #
# 7 — an answer without a usable citation is never shown
# --------------------------------------------------------------------------- #

def test_answer_without_citation_is_discarded(spy):
    spy.answer = "این یک پاسخ بدون هیچ ارجاعی است."
    result = answers.answer_question("روی چه پشته‌ای کار می‌کنید؟", "fa")
    assert result["mode"] == "bm25"
    assert "بدون هیچ ارجاعی" not in result["answer"]
    assert spy.calls  # it was contacted, but its answer was rejected by the output filter


def test_citation_filter_unit():
    citations = [{"chunk_id": 1, "title": "a", "source": "s", "url": ""}]
    assert answers._has_valid_citation("پاسخ با [1] ارجاع", citations) is True
    assert answers._has_valid_citation("پاسخ بدون ارجاع", citations) is False
    assert answers._has_valid_citation("پاسخ با [2] که وجود ندارد", citations) is False


# --------------------------------------------------------------------------- #
# 8 — the AI disclosure is always present
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("question", ["روی چه پشته‌ای کار می‌کنید؟", "دستور پخت کیک شکلاتی چیست؟"])
def test_every_answer_declares_it_is_ai(question):
    result = answers.answer_question(question, "fa")
    assert result["disclosure"] == AI_DISCLOSURE_FA


# --------------------------------------------------------------------------- #
# 9 — hash-based embedding
# --------------------------------------------------------------------------- #

def test_only_changed_content_is_re_embedded(monkeypatch):
    provider = SpyProvider()
    monkeypatch.setattr(indexer, "get_provider", lambda: provider)
    first = indexer.sync_corpus(embed=True, provider=provider)
    assert first["embedded"] == 0 and provider.embed_calls == 0  # fixture already embedded nothing new

    provider.embed_calls = 0
    second = indexer.sync_corpus(embed=True, provider=provider)
    assert second["embedded"] == 0 and provider.embed_calls == 0
    assert second["skipped"] == second["chunks"]

    rows = indexer.chunk_documents()
    target_source = rows[0]["source"]
    for row in rows:
        if row["source"] == target_source:
            row["text"] += " نسخهٔ تازه"
            from .chunking import content_hash

            row["content_hash"] = content_hash(row["text"])
    monkeypatch.setattr(indexer, "chunk_documents", lambda: rows)

    third = indexer.sync_corpus(embed=True, provider=provider)
    assert third["embedded"] >= 1
    assert provider.embed_calls >= 1
    assert AssistantChunk.objects.exclude(embedding=None).count() >= third["embedded"]


def test_changed_content_invalidates_cached_answers(monkeypatch):
    """A re-indexed corpus must not keep serving the answer — especially a cached «پیدا نکردم» —
    that the old corpus produced: that is exactly the state a fresh deploy lands in."""
    monkeypatch.setattr(indexer, "get_provider", lambda: SpyProvider())
    answers.answer_question("سؤال تازه‌ای که هنوز در مطالب نیست", "fa")
    assert AssistantQueryCache.objects.count() >= 1

    # Nothing changed → the every-5-minutes cron must not wipe the cache.
    unchanged = indexer.sync_corpus(embed=True, provider=SpyProvider())
    assert unchanged["chunks"] > 0 and unchanged["cache_invalidated"] == 0
    assert AssistantQueryCache.objects.count() >= 1

    rows = indexer.chunk_documents()
    rows[0]["text"] += " نسخهٔ تازه"
    from .chunking import content_hash

    rows[0]["content_hash"] = content_hash(rows[0]["text"])
    monkeypatch.setattr(indexer, "chunk_documents", lambda: rows)

    changed = indexer.sync_corpus(embed=True, provider=SpyProvider())
    assert changed["updated"] >= 1
    assert changed["cache_invalidated"] >= 1
    assert AssistantQueryCache.objects.count() == 0
    # The negative answer is gone too, so the next visitor gets a fresh judgement of the new corpus.
    fresh = answers.answer_question("سؤال تازه‌ای که هنوز در مطالب نیست", "fa")
    assert fresh["cached"] is False


# --------------------------------------------------------------------------- #
# 10 — the question text is never retained
# --------------------------------------------------------------------------- #

def test_question_text_is_not_stored_anywhere(api):
    question = "آیا این پرسش در جایی ذخیره می‌شود؟"
    response = api.post("/api/v1/assistant/ask/", {"question": question, "locale": "fa"}, format="json")
    job = Job.objects.get(pk=response.json()["job_id"])
    assert question not in str(job.payload)
    assert question not in str(AssistantAnswer.objects.values_list("query_hash", "answer"))
    assert question not in str(AssistantQueryCache.objects.values_list("query_hash", "answer"))
    assert question not in str(list(AssistantUsage.objects.values_list("day", "cost_usd")))


def test_question_longer_than_the_limit_is_rejected(api):
    response = api.post("/api/v1/assistant/ask/", {"question": "x" * 501, "locale": "fa"}, format="json")
    assert response.status_code == 400
    assert "message_fa" in response.json()


def test_honeypot_is_silently_accepted(api):
    before = Job.objects.count()
    response = api.post(
        "/api/v1/assistant/ask/",
        {"question": "سلام", "locale": "fa", "website": "http://spam.example"},
        format="json",
    )
    assert response.status_code == 202
    assert Job.objects.count() == before


# --------------------------------------------------------------------------- #
# 5 + 6 — rate limit and polling
# --------------------------------------------------------------------------- #

def test_twenty_first_request_in_the_hour_is_429(api):
    statuses = [
        api.post("/api/v1/assistant/ask/", {"question": "سلام", "locale": "fa"}, format="json").status_code
        for _ in range(21)
    ]
    assert statuses[:20] == [202] * 20
    assert statuses[20] == 429
    last = api.post("/api/v1/assistant/ask/", {"question": "سلام", "locale": "fa"}, format="json")
    assert "message_fa" in last.json()


def test_polling_offset_returns_no_repeated_text(api):
    response = api.post("/api/v1/assistant/ask/", {"question": "روی چه پشته‌ای کار می‌کنید؟", "locale": "fa"}, format="json")
    job_id = response.json()["job_id"]
    first = api.get(f"/api/v1/assistant/ask/{job_id}/poll/?offset=0").json()
    second = api.get(f"/api/v1/assistant/ask/{job_id}/poll/?offset={first['offset_next']}").json()
    assert first["progress"]
    assert second["progress"] == []


def test_cache_serves_the_second_identical_question(spy):
    first = answers.answer_question("روی چه پشته‌ای کار می‌کنید؟", "fa")
    calls_after_first = len(spy.calls)
    second = answers.answer_question("روی چه  پشته‌ای   کار می‌کنید؟", "fa")
    assert second["cached"] is True
    assert len(spy.calls) == calls_after_first  # normalized hash hit → no new provider call
    assert second["answer"] == first["answer"]


# --------------------------------------------------------------------------- #
# extras
# --------------------------------------------------------------------------- #

def test_suggestions_are_cached_and_localized(api):
    fa = api.get("/api/v1/assistant/suggestions/?lang=fa").json()["suggestions"]
    en = api.get("/api/v1/assistant/suggestions/?lang=en").json()["suggestions"]
    assert len(fa) >= 3 and len(en) >= 3
    assert fa[0]["question"] != en[0]["question"]


def test_feedback_records_only_a_signal(api):
    response = api.post("/api/v1/assistant/ask/", {"question": "روی چه پشته‌ای کار می‌کنید؟", "locale": "fa"}, format="json")
    job_id = response.json()["job_id"]
    result = api.get(f"/api/v1/assistant/ask/{job_id}/poll/").json()["result"]
    answer_id = result.get("answer_id") or AssistantAnswer.objects.latest("pk").pk
    ok = api.post("/api/v1/assistant/feedback/", {"answer_id": answer_id, "helpful": True}, format="json")
    assert ok.status_code == 202
    assert list(AssistantAnswer.objects.get(pk=answer_id).feedback.values_list("helpful", flat=True)) == [True]


def test_embed_job_is_registered_on_the_cron_engine():
    from apps.jobs import runner

    assert "embed" in runner.JOBS and "ask" in runner.JOBS
