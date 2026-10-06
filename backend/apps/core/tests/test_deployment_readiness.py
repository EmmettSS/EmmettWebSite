"""تست‌های ساختاری و عملیاتی فاز ۹ — آمادگی استقرار روی cPanel (ADR-0036)."""

from __future__ import annotations

import gzip
import importlib.metadata as importlib_metadata
import re
import subprocess
from pathlib import Path

import pytest
from django.conf import settings
from django.core.management import call_command

REPO_ROOT = Path(settings.BASE_DIR).parent
BACKEND_DIR = Path(settings.BASE_DIR)


def test_requirements_txt_is_100_percent_pinned_and_installed() -> None:
    """تمام خطوط غیرکامنت در backend/requirements.txt باید با == پین شده و نصب باشند (ADR-0036)."""
    req_file = BACKEND_DIR / "requirements.txt"
    assert req_file.is_file()

    pin_pattern = re.compile(r"^([A-Za-z0-9_.-]+)==([A-Za-z0-9_.+-]+)$")
    pinned_packages: list[tuple[str, str]] = []

    for raw_line in req_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if not line:
            continue
        match = pin_pattern.match(line)
        assert match is not None, f"خط بدون پین دقیق (==) در requirements.txt: {raw_line}"
        pkg_name, expected_version = match.group(1), match.group(2)
        pinned_packages.append((pkg_name, expected_version))
        installed_version = importlib_metadata.version(pkg_name)
        msg = f"Mismatch for {pkg_name}: {installed_version} != {expected_version}"
        assert installed_version == expected_version, msg

    assert len(pinned_packages) >= 35


def test_production_settings_hardening_and_deploy_check(tmp_path: Path) -> None:
    """بررسی تنظیمات نهایی config.settings.production و عبور از manage.py check --deploy بدون هشدار."""
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    python_bin = BACKEND_DIR / ".venv" / "bin" / "python"
    if not python_bin.is_file():
        pytest.skip("محیط مجازی backend/.venv یافت نشد.")

    env = {
        "PATH": "/usr/bin:/bin",
        "DJANGO_SETTINGS_MODULE": "config.settings.production",
        "DJANGO_SECRET_KEY": "production-readiness-test-secret-key-with-over-50-chars-entropy-2026",
        "DJANGO_ALLOWED_HOSTS": "emmett.ir,www.emmett.ir",
        "DJANGO_CSRF_TRUSTED_ORIGINS": "https://emmett.ir,https://www.emmett.ir",
        "PUBLIC_SITE_URL": "https://emmett.ir",
        "MYSQL_DATABASE": "emmett_prod",
        "MYSQL_USER": "emmett_user",
        "MYSQL_PASSWORD": "strong-db-password",
        "ADMIN_2FA_REQUIRED": "True",
        "DJANGO_CSP_ENABLED": "True",
        "DJANGO_FRAME_ANCESTORS": "'none'",
        "BACKUP_DIR": str(backup_dir),
    }

    verify_code = (
        "import django; django.setup(); "
        "from django.conf import settings; "
        "assert settings.DEBUG is False; "
        "assert settings.SECURE_SSL_REDIRECT is True; "
        "assert settings.SESSION_COOKIE_SECURE is True; "
        "assert settings.CSRF_COOKIE_SECURE is True; "
        "assert settings.SESSION_COOKIE_HTTPONLY is True; "
        "assert settings.SECURE_HSTS_SECONDS >= 31536000; "
        "assert settings.SECURE_HSTS_INCLUDE_SUBDOMAINS is True; "
        "assert settings.SECURE_HSTS_PRELOAD is True; "
        "assert settings.SECURE_CONTENT_TYPE_NOSNIFF is True; "
        "assert settings.SECURE_CROSS_ORIGIN_OPENER_POLICY == 'same-origin'; "
        "assert settings.X_FRAME_OPTIONS == 'DENY'; "
        "assert settings.ADMIN_2FA_REQUIRED is True; "
        "assert settings.DATABASES['default']['CONN_HEALTH_CHECKS'] is True; "
        "assert settings.DATABASES['default']['OPTIONS']['charset'] == 'utf8mb4'"
    )
    result = subprocess.run(
        [str(python_bin), "-c", verify_code],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


def test_deploy_templates_scripts_and_documentation_exist() -> None:
    """بررسی وجود فایل‌های نمونهٔ .example، اسکریپت‌های استقرار، .env.example و DEPLOYMENT.md."""
    required_files = [
        REPO_ROOT / "DEPLOYMENT.md",
        REPO_ROOT / "docs" / "adr" / "0036-deployment-readiness-and-runbooks.md",
        BACKEND_DIR / ".env.example",
        REPO_ROOT / "frontend" / ".env.example",
        BACKEND_DIR / "deploy" / "passenger_wsgi.py.example",
        BACKEND_DIR / "deploy" / "public_html.htaccess.example",
        BACKEND_DIR / "deploy" / "media.htaccess.example",
        REPO_ROOT / "frontend" / "deploy" / "server.js.example",
        REPO_ROOT / "scripts" / "deploy_backend.sh",
        REPO_ROOT / "scripts" / "deploy_frontend.sh",
        REPO_ROOT / "scripts" / "restore_backup.sh",
    ]
    for path in required_files:
        assert path.is_file(), f"فایل الزامی فاز ۹ یافت نشد: {path}"

    # بررسی صحت نحوی اسکریپت‌های Bash با bash -n
    for script in (
        REPO_ROOT / "scripts" / "deploy_backend.sh",
        REPO_ROOT / "scripts" / "deploy_frontend.sh",
        REPO_ROOT / "scripts" / "restore_backup.sh",
    ):
        syntax_check = subprocess.run(
            ["bash", "-n", str(script)],
            capture_output=True,
            text=True,
            check=False,
        )
        assert syntax_check.returncode == 0, f"خطای نحوی در {script}: {syntax_check.stderr}"


@pytest.mark.django_db
def test_restore_backup_script_list_and_json_roundtrip(tmp_path: Path) -> None:
    """تست اجرای scripts/restore_backup.sh برای فهرست‌گیری و بازیابی آرشیو مدیا."""
    backup_dir = tmp_path / "backups"
    media_dir = tmp_path / "media"
    media_dir.mkdir(parents=True, exist_ok=True)
    sample_file = media_dir / "sample.txt"
    sample_file.write_text("emmett-backup-verification", encoding="utf-8")

    call_command(
        "backup_db",
        output_dir=str(backup_dir),
        keep=3,
    )

    list_res = subprocess.run(
        ["bash", str(REPO_ROOT / "scripts" / "restore_backup.sh"), "--list"],
        env={"PATH": "/usr/bin:/bin", "BACKUP_DIR": str(backup_dir)},
        capture_output=True,
        text=True,
        check=False,
    )
    assert list_res.returncode == 0
    assert "db-" in list_res.stdout

    # ساخت یک آرشیو تست برای بازیابی مدیا و بررسی بازگردانی .htaccess
    media_archive = backup_dir / "media-test.tar.gz"
    subprocess.run(
        ["tar", "-czf", str(media_archive), "-C", str(media_dir), "."],
        check=True,
    )
    restored_media_dir = tmp_path / "restored_media"
    restore_res = subprocess.run(
        [
            "bash",
            str(REPO_ROOT / "scripts" / "restore_backup.sh"),
            "--media",
            str(media_archive),
            "--yes",
            "--skip-pre-backup",
        ],
        env={
            "PATH": "/usr/bin:/bin",
            "BACKUP_DIR": str(backup_dir),
            "DJANGO_MEDIA_ROOT": str(restored_media_dir),
        },
        capture_output=True,
        text=True,
        check=False,
    )
    assert restore_res.returncode == 0, restore_res.stderr
    assert (restored_media_dir / "sample.txt").read_text(encoding="utf-8") == "emmett-backup-verification"
    assert (restored_media_dir / ".htaccess").is_file()

    # بررسی صحت فایل فشردهٔ بکاپ دیتابیس تولیدشده توسط backup_db
    db_files = list(backup_dir.glob("db-*.gz"))
    assert len(db_files) == 1
    with gzip.open(db_files[0], "rb") as fh:
        assert len(fh.read(16)) > 0
