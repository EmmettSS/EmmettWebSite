"""تست‌های ساختاری تم/برند ادمین بومی و لایهٔ RTL (ADR-0043; supersedes ADR-0027).

این ماژول قیدهای ساکن پوسته را بررسی می‌کند؛ ماتریس viewport واقعی با Playwright
در ``frontend/e2e/admin-responsive.spec.ts`` پوشش داده می‌شود:

1. **وجود و ساختار دارایی‌ها** — فایل‌های CSS/JS/فونت/برند روی دیسک، فرمت woff2،
   و نبود ارجاع CDN در دارایی‌های Admin (خودمیزبانی).
2. **قیدهای scope** — قواعد RTL باید زیر ``html[dir="rtl"]`` بمانند تا روی
   پنل انگلیسی اثر نگذارند.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from django.conf import settings
from django.contrib import admin as django_admin
from django.test import Client
from django.urls import reverse

from apps.core.admin_theme import (
    ADMIN_THEME_ASSETS,
    ADMIN_THEME_TEMPLATES,
    ADMIN_THEME_VERSION,
    apply_admin_branding,
)
from apps.core.tests.admin_helpers import superuser

STATIC_DIR = Path(str(settings.BASE_DIR)) / "static"
TEMPLATES_DIR = Path(str(settings.BASE_DIR)) / "templates"
RTL_CSS = STATIC_DIR / "admin_theme" / "css" / "emmett-rtl.css"
THEME_CSS = STATIC_DIR / "admin_theme" / "css" / "emmett-admin.css"
THEME_JS = STATIC_DIR / "admin_theme" / "js" / "emmett-admin.js"
THEME_DEFAULT_JS = STATIC_DIR / "admin_theme" / "js" / "emmett-theme-default.js"


class TestBranding:
    def test_admin_site_branding_is_translated(self) -> None:
        from django.utils import translation

        with translation.override("fa"):
            assert str(django_admin.site.site_header) == "پنل مدیریت گروه امیت"
            assert str(django_admin.site.site_title) == "پنل مدیریت امیت"
            assert str(django_admin.site.index_title) == "داشبورد"

        with translation.override("en"):
            assert str(django_admin.site.site_header) == "Emmett Group admin"

    def test_branding_can_be_applied_to_a_custom_site(self) -> None:
        from django.contrib.admin.sites import AdminSite

        site = AdminSite(name="custom")
        apply_admin_branding(site)

        assert site.site_title is not None
        assert site.empty_value_display == "—"

    def test_theme_version_is_semver(self) -> None:
        assert re.fullmatch(r"\d+\.\d+\.\d+", ADMIN_THEME_VERSION)


class TestStaticAssets:
    def test_every_declared_asset_exists(self) -> None:
        missing = [name for name, path in ADMIN_THEME_ASSETS.items() if not (STATIC_DIR / path).exists()]
        assert missing == []

    def test_fonts_are_self_hosted_woff2(self) -> None:
        fonts = sorted((STATIC_DIR / "admin_theme" / "fonts").glob("vazirmatn-*.woff2"))
        assert len(fonts) >= 8
        # امضای فایل woff2: "wOF2"
        assert all(font.read_bytes()[:4] == b"wOF2" for font in fonts)
        assert (STATIC_DIR / "admin_theme" / "fonts" / "LICENSE-Vazirmatn-OFL.txt").exists()

    def test_modeltranslation_tabs_use_self_hosted_jquery_assets(self) -> None:
        from modeltranslation.admin import TabbedExternalJqueryTranslationAdmin, TabbedTranslationAdmin

        from apps.services.models import Service

        assert settings.JQUERY_URL == "admin/js/vendor/jquery/jquery.min.js"
        assert settings.JQUERY_UI_URL == "admin_theme/js/vendor/jquery-ui-1.13.3.min.js"
        assert (STATIC_DIR / settings.JQUERY_UI_URL).is_file()
        assert "OpenJS Foundation" in (STATIC_DIR / "admin_theme/js/vendor/jquery-ui-LICENSE.txt").read_text(
            encoding="utf-8"
        )

        for admin_class in (TabbedTranslationAdmin, TabbedExternalJqueryTranslationAdmin):
            media = str(admin_class(Service, django_admin.site).media)
            assert "ajax.googleapis.com" not in media
            assert settings.JQUERY_UI_URL in media
        external_media = str(TabbedExternalJqueryTranslationAdmin(Service, django_admin.site).media)
        assert settings.JQUERY_URL in external_media

    def test_no_external_font_or_css_cdn_is_referenced(self) -> None:
        haystack = "\n".join(
            [
                THEME_CSS.read_text(encoding="utf-8"),
                RTL_CSS.read_text(encoding="utf-8"),
                THEME_JS.read_text(encoding="utf-8"),
                THEME_DEFAULT_JS.read_text(encoding="utf-8"),
            ]
            + [path.read_text(encoding="utf-8") for path in TEMPLATES_DIR.rglob("*.html")]
        )
        forbidden_hosts = (
            "fonts.googleapis.com",
            "fonts.gstatic.com",
            "cdn.jsdelivr.net",
            "cdnjs.cloudflare.com",
            "ajax.googleapis.com",
        )
        for forbidden in forbidden_hosts:
            assert forbidden not in haystack

    def test_admin_templates_do_not_use_inline_script_handlers(self) -> None:
        templates = "\n".join(path.read_text(encoding="utf-8") for path in TEMPLATES_DIR.rglob("*.html"))

        assert re.search(r"\son(?:click|change|submit|load|input)\s*=", templates, re.IGNORECASE) is None

    def test_native_admin_is_used_without_jazzmin_settings(self) -> None:
        assert "django.contrib.admin" in settings.INSTALLED_APPS
        assert "jazzmin" not in settings.INSTALLED_APPS
        assert not hasattr(settings, "JAZZMIN_SETTINGS")
        assert not hasattr(settings, "JAZZMIN_UI_TWEAKS")
        assert set(ADMIN_THEME_TEMPLATES.values()) <= {
            path.relative_to(TEMPLATES_DIR).as_posix() for path in TEMPLATES_DIR.rglob("*.html")
        }


class TestRtlLayer:
    def test_rtl_rules_are_scoped_to_the_rtl_document(self) -> None:
        """هر قاعدهٔ این فایل باید به ``html[dir="rtl"]`` مقید باشد."""

        source = RTL_CSS.read_text(encoding="utf-8")
        # حذف کامنت‌ها و at-ruleها ( @media/@font-face/@import/@supports)
        cleaned = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
        cleaned = re.sub(r"@[^{]+\{[^{}]*\}", "", cleaned, flags=re.DOTALL)

        unscoped: list[str] = []
        depth = 0
        buffer = ""
        for char in cleaned:
            if char == "{":
                depth += 1
                if depth == 1:
                    selector = buffer.strip()
                    if selector.startswith("@"):
                        selector = ""  # at-rule (مثل @media) خودش اسکوپ نیست
                    if selector and 'html[dir="rtl"]' not in selector:
                        unscoped.append(selector.splitlines()[0][:80])
                    buffer = ""
                continue
            if char == "}":
                depth -= 1
                buffer = ""
                continue
            if depth == 0:
                buffer += char

        assert unscoped == []

    def test_rtl_layer_covers_the_areas_that_break_in_django_admin(self) -> None:
        source = RTL_CSS.read_text(encoding="utf-8")
        expected_markers = (
            "#nav-sidebar",
            ".select2",
            "#changelist",
            ".object-tools",
            ".submit-row",
            ".inline-group",
            ".ui-tabs",
            ".emmett-auth-form",
            "text-align",
            "direction: ltr",
        )
        missing = [marker for marker in expected_markers if marker not in source]
        assert missing == []

    def test_theme_css_defines_brand_tokens(self) -> None:
        source = THEME_CSS.read_text(encoding="utf-8")
        assert "--emmett-indigo: #5b62e0" in source
        assert "--emmett-emerald: #1fae6e" in source
        assert ".emmett-pill--published" in source
        assert ".emmett-kpi" in source
        assert "@font-face" in source


@pytest.mark.django_db
class TestAdminTemplates:
    def test_rtl_stylesheet_is_loaded_only_in_bidi_locales(self, client: Client) -> None:
        client.force_login(superuser())

        response_fa = client.get(reverse("admin:index"))
        # نام فایل را بدون پسوند می‌سنجیم: در production که
        # ``ManifestStaticFilesStorage`` فعال است، URL به
        # ``admin/css/rtl.<hash>.css`` تبدیل می‌شود. پیش‌تر همین تست فقط در
        # محیطی پاس می‌شد که ``collectstatic`` اجرا نشده بود — یعنی یک
        # تفاوت رفتار بین CI و هاست که هیچ‌کس نمی‌دید.
        assert "admin/css/rtl" in response_fa.content.decode()

        client.cookies[settings.LANGUAGE_COOKIE_NAME] = "en"
        response_en = client.get(reverse("admin:index"))
        assert "admin/css/rtl" not in response_en.content.decode()

    def test_dashboard_template_uses_native_admin_branding(self) -> None:
        custom = (TEMPLATES_DIR / "admin" / "index.html").read_text(encoding="utf-8")
        assert "emmett-kpi-grid" in custom
        assert "{% emmett_dashboard as dashboard %}" in custom

    def test_login_page_uses_branded_native_form(self, client: Client) -> None:
        response = client.get(reverse("admin:login"))

        assert response.status_code == 200
        content = response.content.decode()
        assert "emmett-login-card" in content
        assert 'name="username"' in content
        assert 'name="password"' in content
        assert "emmett-language-switcher" in content

    def test_language_switcher_updates_the_django_language_cookie(self, client: Client) -> None:
        client.force_login(superuser())

        response = client.post(
            reverse("set_language"),
            {"language": "en", "next": reverse("admin:index")},
        )

        assert response.status_code == 302
        assert response.cookies[settings.LANGUAGE_COOKIE_NAME].value == "en"

    def test_navigation_uses_permission_filtered_native_app_list(self, client: Client) -> None:
        client.force_login(superuser())

        content = client.get(reverse("admin:index")).content.decode()

        assert 'id="nav-sidebar"' in content
        assert 'id="nav-filter"' in content
        assert 'id="emmett-nav-content"' in content
        assert reverse("admin:services_service_changelist") in content


@pytest.mark.django_db
def test_dashboard_page_renders_brand_assets(client: Client) -> None:
    client.force_login(superuser())

    content = client.get(reverse("admin:index")).content.decode()

    # بدون پسوند، چون در production نام فایل با hash مانیفست جمع‌آوری می‌شود
    # (``NonStrictCompressedManifestStaticFilesStorage``).
    assert "admin_theme/css/emmett-admin" in content
    assert "admin_theme/js/emmett-admin" in content
    assert "admin_theme/js/emmett-theme-default" in content
    assert "brand/emmett-wordmark" in content or "emmett-logo-192" in content
