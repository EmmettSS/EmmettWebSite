"""تست‌های System Check پنل بومی — ADR-0043 (با حفظ تبادل دادهٔ ADR-0029).

این checkها خطاهای پیکربندی سرور را زود آشکار می‌کنند: ترتیب اپ‌ها، نبود مسیر
قالب/دارایی یا template اجباری، بازگشت اپ legacy و نبود ترجمهٔ فارسی کامپایل‌شده.
هر check مهم باید هم «حالت سالم» و هم «حالت خطا» را داشته باشد.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from django.conf import settings as django_settings
from django.core.checks import run_checks

from apps.core import checks as emmett_checks
from apps.core.admin_theme import ADMIN_THEME_ASSETS, ADMIN_THEME_TEMPLATES

pytestmark = pytest.mark.django_db


def _ids(messages: list[Any]) -> set[str]:
    return {message.id for message in messages}


class TestHealthyProject:
    def test_no_check_errors_on_current_settings(self) -> None:
        messages = run_checks()

        assert [message for message in messages if message.id and message.is_serious()] == []
        assert _ids(messages) == set()  # حتی هشدار هم نداریم (ترجمه‌ها کامپایل شده‌اند)

    def test_checks_are_registered_and_run_end_to_end(self, settings: Any) -> None:
        """بدون import در ``CoreConfig.ready`` این checkها بی‌صدا بی‌اثر می‌شدند.

        پس صرفاً تابع را صدا نمی‌زنیم: تنظیمات را می‌شکنیم و از مسیر واقعی
        ``run_checks()`` انتظار گزارش داریم.
        """

        settings.INSTALLED_APPS = [app for app in settings.INSTALLED_APPS if app != "import_export"]

        assert "emmett_admin.E002" in _ids(run_checks())


class TestAppOrderCheck:
    def test_missing_admin_is_reported(self, settings: Any) -> None:
        settings.INSTALLED_APPS = [app for app in settings.INSTALLED_APPS if app != "django.contrib.admin"]

        assert "emmett_admin.E001" in _ids(emmett_checks.check_admin_theme_apps())

    def test_missing_modeltranslation_is_reported(self, settings: Any) -> None:
        settings.INSTALLED_APPS = [app for app in settings.INSTALLED_APPS if app != "modeltranslation"]

        assert "emmett_admin.E001" in _ids(emmett_checks.check_admin_theme_apps())

    def test_modeltranslation_after_admin_is_reported(self, settings: Any) -> None:
        apps = list(settings.INSTALLED_APPS)
        apps.remove("modeltranslation")
        apps.insert(apps.index("django.contrib.admin") + 1, "modeltranslation")
        settings.INSTALLED_APPS = apps

        assert "emmett_admin.E001" in _ids(emmett_checks.check_admin_theme_apps())

    def test_legacy_jazzmin_app_is_reported(self, monkeypatch: Any) -> None:
        """The guard must not reinstall/import the intentionally removed app."""

        installed_apps = [*django_settings.INSTALLED_APPS, "jazzmin"]
        # Patch LazySettings' cached value without triggering INSTALLED_APPS' registry reload.
        monkeypatch.setitem(django_settings.__dict__, "INSTALLED_APPS", installed_apps)

        assert "emmett_admin.E005" in _ids(emmett_checks.check_admin_theme_apps())

    def test_missing_import_export_is_reported(self, settings: Any) -> None:
        settings.INSTALLED_APPS = [app for app in settings.INSTALLED_APPS if app != "import_export"]

        assert "emmett_admin.E002" in _ids(emmett_checks.check_admin_theme_apps())


class TestThemeChecks:
    def test_missing_template_dir_is_reported(self, settings: Any) -> None:
        settings.TEMPLATES = [{**settings.TEMPLATES[0], "DIRS": []}]

        assert "emmett_admin.E003" in _ids(emmett_checks.check_admin_theme_paths())

    def test_missing_static_asset_is_reported(self, monkeypatch: Any) -> None:
        monkeypatch.setitem(ADMIN_THEME_ASSETS, "does_not_exist", "brand/does-not-exist.png")

        assert "emmett_admin.E004" in _ids(emmett_checks.check_admin_theme_assets())

    def test_missing_theme_template_is_reported(self, settings: Any, tmp_path: Path) -> None:
        settings.BASE_DIR = tmp_path

        assert "emmett_admin.E006" in _ids(emmett_checks.check_admin_theme_templates())

    def test_all_declared_theme_templates_exist(self) -> None:
        templates_dir = Path(__file__).resolve().parents[3] / "templates"

        assert all((templates_dir / path).is_file() for path in ADMIN_THEME_TEMPLATES.values())

    def test_missing_compiled_translations_are_reported(self, settings: Any, tmp_path: Path) -> None:
        settings.BASE_DIR = tmp_path

        assert "emmett_admin.W005" in _ids(emmett_checks.check_fa_translations_compiled())

    def test_default_public_site_url_in_production_is_reported(self, settings: Any) -> None:
        settings.DEBUG = False
        settings.PUBLIC_SITE_URL = "http://localhost:3000"

        assert "emmett_admin.W007" in _ids(emmett_checks.check_public_site_url())

    def test_local_url_check_is_a_deployment_check(self) -> None:
        """W007 فقط با ``check --deploy`` اجرا می‌شود (نویز ندادن در توسعه)."""

        from django.core.checks import run_checks as run_checks_with_deploy

        messages = run_checks_with_deploy(include_deployment_checks=True)

        assert "emmett_admin.W007" in _ids(messages)  # در تست DEBUG=False است

    def test_configured_public_site_url_passes_in_production(self, settings: Any) -> None:
        settings.DEBUG = False
        settings.PUBLIC_SITE_URL = "https://emmett.example"

        assert emmett_checks.check_public_site_url() == []
