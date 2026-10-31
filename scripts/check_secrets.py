#!/usr/bin/env python3
"""اسکنر جلوگیری از کامیت رازها و کلیدهای خصوصی (قانون ۵ — ADR-0034).

این اسکریپت در Pre-commit و در جاب ``security-scan`` پایپ‌لاین GitHub Actions
اجرا می‌شود و بررسی می‌کند که:
۱) هیچ فایل ``.env`` واقعی (غیر از ``.env.example``) در Git ردیابی نشده باشد؛
۲) هیچ کلید خصوصی (PEM/SSH) یا توکن شناخته‌شده‌ای (OpenAI/GitHub/AWS) در کد نباشد.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

FORBIDDEN_FILENAMES = {".env", ".env.local", ".env.production", ".env.development"}

SECRET_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("Private Key Header", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----")),
    ("OpenAI API Key", re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b")),
    ("GitHub Personal/App Token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b")),
    ("AWS Access Key ID", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
)

BINARY_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".woff",
    ".woff2",
    ".mo",
    ".sqlite3",
    ".gz",
}


def _git_tracked_files(repo_root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files"],
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    )
    return [repo_root / line.strip() for line in result.stdout.splitlines() if line.strip()]


def main(argv: list[str]) -> int:
    repo_root = Path(__file__).resolve().parent.parent
    files = [Path(arg).resolve() for arg in argv[1:]] if len(argv) > 1 else _git_tracked_files(repo_root)

    violations: list[str] = []
    for path in files:
        if not path.is_file():
            continue
        rel = path.relative_to(repo_root) if path.is_relative_to(repo_root) else path
        if path.name in FORBIDDEN_FILENAMES:
            violations.append(f"{rel}: فایل محیطی حساس (.env) نباید در Git قرار بگیرد.")
            continue
        if path.suffix.lower() in BINARY_EXTENSIONS:
            continue

        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue

        for label, pattern in SECRET_PATTERNS:
            match = pattern.search(content)
            if match:
                violations.append(f"{rel}: الگوی مشکوک به راز شناسایی شد ({label}).")

    if violations:
        for item in violations:
            print(f"[SECURITY ERROR] {item}", file=sys.stderr)
        return 1

    print(f"Secret scan passed ({len(files)} files checked).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
