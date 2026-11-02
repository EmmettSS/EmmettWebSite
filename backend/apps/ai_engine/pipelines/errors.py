from __future__ import annotations


class AIRequestError(RuntimeError):
    """A safe, user-displayable pipeline error with no provider details."""

    code = "generation_failed"
    http_status = 503


class AIOutputInvalid(AIRequestError):
    code = "invalid_model_output"


class AIOutputBlocked(AIRequestError):
    code = "output_blocked"
    http_status = 422


class AIContentUnavailable(AIRequestError):
    code = "content_unavailable"
    http_status = 404
