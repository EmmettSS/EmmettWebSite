#!/usr/bin/env python3
"""اعتبارسنجی فرمت پیام کامیت بر اساس استاندارد Conventional Commits (ADR-0034).

فرمت مجاز:
    <type>(<optional-scope>)!: <description>

انواع مجاز:
    feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert, security
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

CONVENTIONAL_PATTERN = re.compile(
    r"^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|security)"
    r"(\([a-z0-9_./-]+\))?!?: .+",
)


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: check_commit_msg.py <commit-msg-file>", file=sys.stderr)
        return 1

    msg_file = Path(argv[1])
    lines = [
        line.strip()
        for line in msg_file.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    if not lines:
        print("[COMMIT-MSG ERROR] پیام کامیت خالی است.", file=sys.stderr)
        return 1

    subject = lines[0]
    if subject.startswith(("Merge ", "Revert ")):
        return 0

    if not CONVENTIONAL_PATTERN.match(subject):
        print(
            "[COMMIT-MSG ERROR] خط اول پیام کامیت باید از الگوی Conventional Commits پیروی کند:\n"
            "  <type>(<scope>): <subject>\n"
            "  مثال: feat(seo): add dynamic sitemap and hreflang headers\n"
            "  انواع مجاز: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert, security",
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
