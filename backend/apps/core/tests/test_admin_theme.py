"""تست‌های تم/برند ادمین و لایهٔ RTL — فاز ۶ (ADR-0027).

چون در این محیط مرورگر واقعی وجود ندارد (تست بصری ممکن نیست)، صحت چیدمان از
دو راه «قابل تست» بررسی می‌شود:

1. **وجود و ساختار دارایی‌ها** — فایل‌های CSS/JS/فونت/برند روی دیسک، فرمت woff2،
   و نبود هیچ ارجاعی به CDN بیرونی (قانون ۶/۱۸: خوداستقرار).
2. **قیدهای اسکوپ** — هر قاعدهٔ لایهٔ RTL باید زیر ``html[dir="rtl"]`` باشد؛
   بنابراین در پنل انگلیسی هیچ اثری ندارد. این تست جلوی «CSS hack» سراسری را
   می‌گیرد (قانون ۱۱).
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from django.conf import settings
from django.contrib import admin as django_admin
from django.test import Client
from django.urls import reverse

from apps.core.admin_theme import ADMIN_THEME_ASSETS, ADMIN_THEME_VERSION, apply_admin_branding
from apps.core.tests.admin_helpers import superuser

STATIC_DIR = Path(str(settings.BASE_DIR)) / "static"
TEMPLATES_DIR = Path(str(settings.BASE_DIR)) / "templates"
RTL_CSS = STATIC_DIR / "admin_theme" / "css" / "emmett-rtl.css"
THEME_CSS = STATIC_DIR / "admin_theme" / "css" / "emmett-admin.css"
THEME_JS = STATIC_DIR / "admin_theme" / "js" / "emmett-admin.js"


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

    def test_no_external_font_or_css_cdn_is_referenced(self) -> None:
        haystack = "\n".join(
            [THEME_CSS.read_text(encoding="utf-8"), THEME_JS.read_text(encoding="utf-8")]
            + [path.read_text(encoding="utf-8") for path in TEMPLATES_DIR.rglob("*.html")]
        )
        forbidden_hosts = (
            "fonts.googleapis.com",
            "fonts.gstatic.com",
            "cdn.jsdelivr.net",
            "cdnjs.cloudflare.com",
        )
        for forbidden in forbidden_hosts:
            assert forbidden not in haystack

    def test_jazzmin_settings_point_to_our_assets(self) -> None:
        jazzmin = settings.JAZZMIN_SETTINGS
        assert jazzmin["custom_css"] == "admin_theme/css/emmett-admin.css"
        assert jazzmin["custom_js"] == "admin_theme/js/emmett-admin.js"
        assert jazzmin["use_google_fonts_cdn"] is False
        assert jazzmin["show_ui_builder"] is False
        assert (STATIC_DIR / str(jazzmin["site_logo"])).exists()


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
            ".app-sidebar",  # ستون کناری (AdminLTE 4)
            ".sidebar-menu",  # منوی کنارگذر
            ".nav-arrow",  # فلش زیرمنو
            ".select2",  # ویجت انتخاب رابطه‌ای
            "#changelist",  # فهرست تغییرات
            ".object-tools",  # دکمه‌های بالای فهرست
            ".submit-row",  # نوار ذخیره در فرم
            ".inline-group",  # inlineها
            ".ui-tabs",  # تب‌های modeltranslation
            "text-align",  # ترازبندی متن (Django admin)
            "direction: ltr",  # جزیره‌های لاتین (ایمیل/کد/عدد)
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
        assert 'href="/static/admin/css/rtl.css"' in response_fa.content.decode()

        client.cookies[settings.LANGUAGE_COOKIE_NAME] = "en"
        response_en = client.get(reverse("admin:index"))
        assert "admin/css/rtl.css" not in response_en.content.decode()

    def test_dashboard_template_is_not_jazzmin_default(self) -> None:
        custom = (TEMPLATES_DIR / "admin" / "index.html").read_text(encoding="utf-8")
        assert "emmett-kpi-grid" in custom
        assert "{% emmett_dashboard as dashboard %}" in custom


@pytest.mark.django_db
def test_dashboard_page_renders_brand_assets(client: Client) -> None:
    client.force_login(superuser())

    content = client.get(reverse("admin:index")).content.decode()

    assert "admin_theme/css/emmett-admin.css" in content
    assert "admin_theme/js/emmett-admin.js" in content
    assert "brand/emmett-wordmark.png" in content or "emmett-logo-192.png" in content
