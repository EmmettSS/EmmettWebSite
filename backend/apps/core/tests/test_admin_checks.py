"""تست‌های System Checkهای ادمین — فاز ۶ (ADR-0027/0029).

چرا تست برای checkها؟ چون این‌ها تنها محافظِ خودکار در برابر خطاهایی هستند که
«فقط روی سرور» دیده می‌شوند (ترتیب اپ‌ها، نبود فایل استاتیک در collectstatic،
فراموش‌شدن کامپایل ترجمه، روشن‌شدن CDN). هر check باید هم «حالت سالم» و هم
«حالت خطا» را داشته باشد؛ وگرنه ممکن است هیچ‌وقت اجرا نشود.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from django.core.checks import run_checks

from apps.core import checks as emmett_checks
from apps.core.admin_theme import ADMIN_THEME_ASSETS

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
    def test_missing_jazzmin_is_reported(self, settings: Any) -> None:
        settings.INSTALLED_APPS = [app for app in settings.INSTALLED_APPS if app != "jazzmin"]

        messages = emmett_checks.check_admin_theme_apps()

        assert "emmett_admin.E001" in _ids(messages)

    def test_jazzmin_after_admin_is_reported(self, settings: Any) -> None:
        apps = list(settings.INSTALLED_APPS)
        apps.remove("jazzmin")
        apps.insert(apps.index("django.contrib.admin") + 1, "jazzmin")
        settings.INSTALLED_APPS = apps

        messages = emmett_checks.check_admin_theme_apps()

        assert "emmett_admin.E001" in _ids(messages)

    def test_missing_import_export_is_reported(self, settings: Any) -> None:
        settings.INSTALLED_APPS = [app for app in settings.INSTALLED_APPS if app != "import_export"]

        assert "emmett_admin.E002" in _ids(emmett_checks.check_admin_theme_apps())


class TestThemeChecks:
    def test_missing_template_dir_is_reported(self, settings: Any) -> None:
        settings.TEMPLATES = [{**settings.TEMPLATES[0], "DIRS": []}]

        assert "emmett_admin.E003" in _ids(emmett_checks.check_admin_theme_paths())

    def test_missing_static_asset_is_reported(self, monkeypatch: Any) -> None:
        monkeypatch.setitem(
            ADMIN_THEME_ASSETS, "does_not_exist", "brand/does-not-exist.png"
        )

        assert "emmett_admin.E004" in _ids(emmett_checks.check_admin_theme_assets())

    def test_google_font_cdn_is_reported(self, settings: Any) -> None:
        settings.JAZZMIN_SETTINGS = {**settings.JAZZMIN_SETTINGS, "use_google_fonts_cdn": True}

        assert "emmett_admin.W006" in _ids(emmett_checks.check_jazzmin_font_cdn())

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
