"""Guard 4 — versioned blocklist, evaluated *before* any job row is created.

The list lives in the database (versioned, editable without a deploy). The seed covers
sensitive government suffixes, private/localhost addresses and obvious mass-scan patterns.
Matching is deliberately conservative: a false positive costs a user one clear message,
a false negative would let the passive checker touch infrastructure it may not touch.
"""

from __future__ import annotations

import ipaddress
import re
import socket

BLOCKLIST_VERSION = "blocklist-1404.07.1"

# Suffix matches (the domain equals the pattern or ends with ".<pattern>").
GOV_SUFFIXES = (
    "gov.ir",
    "gov",
    "mil.ir",
    "ac.ir",
    "police.ir",
    "mfa.ir",
    " judiciary.ir",
)
PRIVATE_SUFFIXES = (
    "localhost",
    "local",
    "internal",
    "intranet",
    "lan",
    "home.arpa",
    "in-addr.arpa",
    "ip6.arpa",
)
BULK_PATTERNS = (
    # Mass-scan style input (ranges, wildcards, lists) is refused outright.
    r"[,\s]",
    r"\*",
    r"/\d{1,3}$",
    r"^(\d{1,3}\.){3}\d{1,3}-\d{1,3}$",
)
GOV_NOTES = ("دامنه‌های دولتی/حساس در فهرست مسدود هستند.", "Sensitive government domains are blocklisted.")
PRIVATE_NOTES = (
    "آدرس‌های داخلی و localhost اسکن نمی‌شوند.",
    "Private addresses and localhost are never checked.",
)
BULK_NOTES = (
    "ورودی شبیه اسکن انبوه است؛ فقط یک دامنهٔ ساده پذیرفته می‌شود.",
    "Input looks like a mass scan; only a single plain domain is accepted.",
)


def seed_entries():
    from .models import BlocklistEntry

    rows = []
    rows.extend((BlocklistEntry.Kind.GOV, suffix, *GOV_NOTES) for suffix in GOV_SUFFIXES if suffix.strip())
    rows.extend((BlocklistEntry.Kind.PRIVATE, suffix, *PRIVATE_NOTES) for suffix in PRIVATE_SUFFIXES)
    rows.extend((BlocklistEntry.Kind.BULK, pattern, *BULK_NOTES) for pattern in BULK_PATTERNS)
    created = 0
    for kind, pattern, note_fa, note_en in rows:
        _, is_new = BlocklistEntry.objects.get_or_create(
            version=BLOCKLIST_VERSION,
            pattern=pattern,
            defaults={"kind": kind, "note_fa": note_fa, "note_en": note_en},
        )
        created += int(is_new)
    return created


def normalize_domain(value: str) -> str:
    domain = (value or "").strip().lower().rstrip(".")
    if "://" in domain:
        from urllib.parse import urlparse

        domain = (urlparse(domain).hostname or "").lower()
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


def _is_private_ip(domain: str) -> bool:
    try:
        address = ipaddress.ip_address(domain)
    except ValueError:
        # Not an IP literal: resolve it and check every answer (best effort, stdlib resolver).
        try:
            infos = socket.getaddrinfo(domain, None)
        except OSError:
            return False
        for info in infos:
            try:
                address = ipaddress.ip_address(info[4][0])
            except ValueError:
                continue
            if address.is_private or address.is_loopback or address.is_link_local or address.is_reserved:
                return True
        return False
    return address.is_private or address.is_loopback or address.is_link_local or address.is_reserved


def check_domain(value: str) -> tuple[bool, str, str]:
    """Returns ``(allowed, reason_fa, reason_en)``. Called before job creation."""
    from .models import BlocklistEntry

    domain = normalize_domain(value)
    if not domain or "." not in domain and domain != "localhost":
        return False, "دامنهٔ معتبر وارد کنید (مثال: example.com).", "Enter a valid domain (e.g. example.com)."
    if len(domain) > 253 or any(not label or len(label) > 63 for label in domain.split(".")):
        return False, "دامنهٔ وارد‌شده معتبر نیست.", "That domain is not valid."

    entries = list(BlocklistEntry.objects.filter(version=BLOCKLIST_VERSION))
    for entry in entries:
        if entry.kind == BlocklistEntry.Kind.BULK:
            if re.search(entry.pattern, domain):
                return False, entry.note_fa, entry.note_en
        elif domain == entry.pattern or domain.endswith(f".{entry.pattern}"):
            return False, entry.note_fa or "این دامنه مسدود است.", entry.note_en or "This domain is blocklisted."
    if _is_private_ip(domain):
        return False, PRIVATE_NOTES[0], PRIVATE_NOTES[1]
    return True, "", ""
