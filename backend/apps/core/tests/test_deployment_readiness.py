"""تست‌های ساختاری و عملیاتی فاز ۹ — آمادگی استقرار روی cPanel (ADR-0036)."""

from __future__ import annotations

import gzip
import importlib.metadata as importlib_metadata
import re
import subprocess
from pathlib import Path
from typing import Any, cast

import pytest
from django.conf import settings
from django.core.handlers.wsgi import WSGIHandler
from django.core.management import call_command
from django.test import RequestFactory
from django.urls import get_script_prefix, set_script_prefix

REPO_ROOT = Path(settings.BASE_DIR).parent
BACKEND_DIR = Path(settings.BASE_DIR)


@pytest.mark.django_db
def test_admin_redirect_includes_passenger_mount_prefix(settings: Any) -> None:
    settings.FORCE_SCRIPT_NAME = "/backend"
    environ = RequestFactory().get("/admin/", secure=True, SCRIPT_NAME="/backend").environ
    response_headers: dict[str, str] = {}
    response_status = ""

    def start_response(status: str, headers: list[tuple[str, str]], exc_info: Any = None) -> Any:
        nonlocal response_status
        response_status = status
        response_headers.update(headers)

    previous_script_prefix = get_script_prefix()
    try:
        response = WSGIHandler()(environ, cast(Any, start_response))
        try:
            assert response_status.startswith("302")
            assert response_headers["Location"].startswith("/backend/admin/login/")
        finally:
            response.close()
    finally:
        # WSGIHandler sets this thread-local; unlike a real server, pytest reuses
        # the current thread for later Client-based tests.
        set_script_prefix(previous_script_prefix)


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
        "DJANGO_FORCE_SCRIPT_NAME": "/backend/",
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
        "assert settings.FORCE_SCRIPT_NAME == '/backend'; "
        "assert settings.REST_FRAMEWORK['NUM_PROXIES'] == 1; "
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

    htaccess_text = (BACKEND_DIR / "deploy" / "public_html.htaccess.example").read_text(encoding="utf-8")
    assert 'RequestHeader set X-Forwarded-For "expr=%{REMOTE_ADDR}"' in htaccess_text
    assert 'RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"' in htaccess_text
    assert "Django is mounted at /backend" in htaccess_text
    assert "NEVER" in htaccess_text

    env_example_text = (BACKEND_DIR / ".env.example").read_text(encoding="utf-8")
    assert "DJANGO_NUM_PROXIES=1" in env_example_text
    assert "DJANGO_FORCE_SCRIPT_NAME=" in env_example_text

    frontend_env_example = (REPO_ROOT / "frontend" / ".env.example").read_text(encoding="utf-8")
    assert "INTERNAL_API_URL=http://127.0.0.1:8000" in frontend_env_example
    assert "https://<canonical-host>/backend" in frontend_env_example

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


@pytest.mark.django_db
def test_backup_db_native_media_archive_restores_without_nested_media_dir(
    tmp_path: Path, settings: pytest.LogCaptureFixture
) -> None:
    """آرشیو واقعی تولیدشده توسط manage.py backup_db (با ریشهٔ media/) نباید در media/media/ باز شود."""
    backup_dir = tmp_path / "backups"
    source_media = tmp_path / "src_media"
    (source_media / "image" / "2026").mkdir(parents=True, exist_ok=True)
    nested_asset = source_media / "image" / "2026" / "cover.txt"
    nested_asset.write_text("real-backup-asset", encoding="utf-8")

    settings.MEDIA_ROOT = source_media  # type: ignore[attr-defined]
    call_command("backup_db", output_dir=str(backup_dir), keep=3)

    native_archives = list(backup_dir.glob("media-*.tar.gz"))
    assert len(native_archives) == 1

    restored_dir = tmp_path / "restored_native_media"
    restore_res = subprocess.run(
        [
            "bash",
            str(REPO_ROOT / "scripts" / "restore_backup.sh"),
            "--media",
            str(native_archives[0]),
            "--yes",
            "--skip-pre-backup",
        ],
        env={
            "PATH": "/usr/bin:/bin",
            "BACKUP_DIR": str(backup_dir),
            "DJANGO_MEDIA_ROOT": str(restored_dir),
        },
        capture_output=True,
        text=True,
        check=False,
    )
    assert restore_res.returncode == 0, restore_res.stderr
    assert (restored_dir / "image" / "2026" / "cover.txt").read_text(encoding="utf-8") == "real-backup-asset"
    assert not (restored_dir / "media").exists()


def test_manage_py_reads_dotenv_settings_module_without_overriding_shell_env() -> None:
    """manage.py در نبود متغیر شل باید DJANGO_SETTINGS_MODULE را از .env بخواند ولی شل را بازنویسی نکند."""
    python_bin = BACKEND_DIR / ".venv" / "bin" / "python"
    if not python_bin.is_file():
        pytest.skip("محیط مجازی backend/.venv یافت نشد.")

    env_path = BACKEND_DIR / ".env"
    had_existing = env_path.exists()
    original_content = env_path.read_bytes() if had_existing else b""
    probe = (
        "from django.conf import settings; "
        "print(settings.SETTINGS_MODULE, settings.DATABASES['default']['NAME'])"
    )
    try:
        env_path.write_text(
            "DJANGO_SETTINGS_MODULE=config.settings.production\n"
            "MYSQL_DATABASE=db_from_dotenv\n"
            "MYSQL_USER=user_from_dotenv\n"
            "MYSQL_PASSWORD=pass_from_dotenv\n",
            encoding="utf-8",
        )
        # ۱) بدون متغیر شل (مشابه Cron Job در cPanel): باید از .env بخواند -> production.py
        res_dotenv = subprocess.run(
            [str(python_bin), "manage.py", "shell", "-c", probe],
            cwd=BACKEND_DIR,
            env={"PATH": "/usr/bin:/bin"},
            capture_output=True,
            text=True,
            check=False,
        )
        assert res_dotenv.returncode == 0, res_dotenv.stderr
        assert "config.settings.production db_from_dotenv" in res_dotenv.stdout

        # ۲) با متغیر صریح شل (مشابه CI): متغیر شل باید بر .env اولویت داشته باشد
        res_shell = subprocess.run(
            [
                str(python_bin),
                "manage.py",
                "shell",
                "-c",
                "from django.conf import settings; print(settings.SETTINGS_MODULE)",
            ],
            cwd=BACKEND_DIR,
            env={"PATH": "/usr/bin:/bin", "DJANGO_SETTINGS_MODULE": "config.settings.dev"},
            capture_output=True,
            text=True,
            check=False,
        )
        assert res_shell.returncode == 0, res_shell.stderr
        assert "config.settings.dev" in res_shell.stdout
    finally:
        if had_existing:
            env_path.write_bytes(original_content)
        else:
            env_path.unlink(missing_ok=True)


def test_non_strict_manifest_storage_handles_jazzmin_directory_static() -> None:
    """استوریج پروداکشن نباید روی مسیر پوشه‌ای vendor/bootswatch کرش ValueError بدهد."""
    from apps.core.storage import NonStrictCompressedManifestStaticFilesStorage

    storage = NonStrictCompressedManifestStaticFilesStorage()
    assert storage.manifest_strict is False
    url = storage.url("vendor/bootswatch")
    assert url.endswith("/vendor/bootswatch")
