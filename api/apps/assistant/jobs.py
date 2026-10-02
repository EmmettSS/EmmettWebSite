"""Registers the F-08 handlers on the phase-1 job engine.

* ``embed`` — nightly cron: re-chunk + hash-compare + embed only what changed.
* ``ask``   — created by the API. The card allows the worker to be the request itself
  ("worker (همان درخواست، چون سبک است)"), so the view prepares the answer synchronously and the
  client still uses the poll contract (ADR-008) — no WebSocket, no API change if this ever moves
  to a background worker.
"""

from apps.jobs.runner import register

from .answers import answer_question
from .indexer import sync_corpus
from .models import AssistantAnswer


@register("embed")
def run_embed(payload: dict, progress) -> dict:
    progress({"step": "chunk", "state": "running"})
    stats = sync_corpus(embed=True)
    progress({"step": "embed", "state": "done", "embedded": stats["embedded"]})
    return stats


@register("ask")
def run_ask(payload: dict, progress) -> dict:
    progress({"step": "retrieval", "state": "running"})
    result = answer_question(payload.get("question", ""), payload.get("locale", "fa"))
    progress({"step": "answer", "state": "done", "mode": result["mode"]})

    answer = AssistantAnswer.objects.create(
        job_id=payload["job_id"],
        query_hash=payload.get("query_hash", ""),
        question_locale=payload.get("locale", "fa"),
        answer=result["answer"],
        citations=result["citations"],
        retrieval=result["retrieval"],
        provider=result.get("provider", "bm25"),
        mode=result["mode"],
        cached=result.get("cached", False),
        latency_ms=result.get("latency_ms", 0),
    )
    return {
        "answer_id": answer.pk,
        "answer": result["answer"],
        "citations": result["citations"],
        "retrieval": result["retrieval"],
        "mode": result["mode"],
        "provider": result.get("provider", "bm25"),
        "cached": result.get("cached", False),
        "disclosure": result["disclosure"],
        "latency_ms": result.get("latency_ms", 0),
    }
