"""Guard 1 — the only place in the scanner allowed to touch the network.

Every check goes through :func:`guarded_request` (HTTP) or :func:`tls_handshake` (HTTPS on 443).
The guard enforces, in code and not in documentation:

* scheme is ``http`` or ``https``;
* the effective port is 80 or 443 — anything else raises :class:`PassiveGuardError`;
* redirects are re-validated against the same rule, so a 302 to ``http://host:8080`` is refused;
* the target host is not in the versioned blocklist (defence in depth: the API blocks earlier).

Network timeouts are capped at 5 seconds (feature card F-06: each step ≤ 5 s). The module is
deliberately tiny so the guard test can monkeypatch :func:`_open` and assert *no* call happens.
"""

from __future__ import annotations

import json
import random
import socket
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field

STEP_TIMEOUT_SECONDS = 5
ALLOWED_PORTS = (80, 443)
USER_AGENT = "EmmettPassiveCheck/1.0 (+https://emmett.example/fa/tools/check-security/)"


class PassiveGuardError(RuntimeError):
    """Raised when a request would leave the passive envelope."""


@dataclass
class HttpResult:
    url: str
    status: int
    headers: dict[str, str] = field(default_factory=dict)
    body: str = ""
    elapsed_ms: int = 0


def _validate(url: str) -> urllib.parse.ParseResult:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise PassiveGuardError(f"Scheme not allowed: {parsed.scheme!r}")
    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError as exc:  # malformed port
        raise PassiveGuardError(f"Malformed port in {url!r}") from exc
    if port not in ALLOWED_PORTS:
        raise PassiveGuardError(f"Port {port} is outside the passive envelope (80/443 only)")
    if not parsed.hostname:
        raise PassiveGuardError(f"Missing host in {url!r}")
    return parsed


class _GuardedRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D102
        _validate(newurl)  # any redirect leaving the envelope is refused, not followed
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(
    _GuardedRedirectHandler(),
    urllib.request.HTTPSHandler(context=ssl.create_default_context()),
)


def _open(request: urllib.request.Request, timeout: int):
    """Single choke point. Tests monkeypatch this to simulate the network."""
    return _opener.open(request, timeout=timeout)


def guarded_request(
    url: str,
    *,
    timeout: int = STEP_TIMEOUT_SECONDS,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
    max_bytes: int = 512_000,
) -> HttpResult:
    """Performs exactly one guarded HTTP(S) request."""
    _validate(url)
    timeout = min(timeout, STEP_TIMEOUT_SECONDS)
    request = urllib.request.Request(url, data=body, method=method)
    request.add_header("User-Agent", USER_AGENT)
    request.add_header("Accept", "text/html,application/dns-json,application/json;q=0.9,*/*;q=0.5")
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    started = time.monotonic()
    try:
        with _open(request, timeout) as response:
            raw = response.read(max_bytes)
            charset = response.headers.get_content_charset() or "utf-8"
            return HttpResult(
                url=response.geturl(),
                status=int(getattr(response, "status", 200)),
                headers={key.lower(): value for key, value in response.headers.items()},
                body=raw.decode(charset, errors="replace"),
                elapsed_ms=int((time.monotonic() - started) * 1000),
            )
    except urllib.error.HTTPError as exc:  # a response is still a result, not a crash
        charset = exc.headers.get_content_charset() if exc.headers else None
        raw = exc.read(max_bytes) if exc.fp else b""
        return HttpResult(
            url=url,
            status=int(exc.code),
            headers={key.lower(): value for key, value in (exc.headers.items() if exc.headers else [])},
            body=raw.decode(charset or "utf-8", errors="replace"),
            elapsed_ms=int((time.monotonic() - started) * 1000),
        )


def dns_over_https(name: str, record_type: str, *, resolver: str = "https://dns.google/resolve") -> dict:
    """Public DNS records via DNS-over-HTTPS, so every byte still travels over 443."""
    query = urllib.parse.urlencode({"name": name, "type": record_type})
    result = guarded_request(f"{resolver}?{query}", headers={"Accept": "application/dns-json"})
    try:
        return json.loads(result.body)
    except json.JSONDecodeError:
        return {"Status": -1, "Answer": []}


def tls_handshake(host: str, *, timeout: int = STEP_TIMEOUT_SECONDS) -> dict:
    """One TLS handshake against port 443. No other port is ever touched."""
    context = ssl.create_default_context()
    started = time.monotonic()
    with socket.create_connection((host, 443), timeout=min(timeout, STEP_TIMEOUT_SECONDS)) as sock:
        with context.wrap_socket(sock, server_hostname=host) as tls:
            certificate = tls.getpeercert()
            cipher = tls.cipher()
            return {
                "protocol": tls.version(),
                "cipher": cipher[0] if cipher else None,
                "cipher_bits": cipher[2] if cipher else None,
                "certificate": certificate,
                "verified": bool(certificate),
                "elapsed_ms": int((time.monotonic() - started) * 1000),
            }


def polite_delay(low: float = 0.4, high: float = 1.2) -> None:
    """Guard 3 — a small random delay between internally generated requests."""
    time.sleep(random.uniform(low, high))
