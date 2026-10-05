"""تست‌های صادرات/واردات ادمین — فاز ۶ (ADR-0029).

سه چیز اینجا قفل می‌شود:

1. **دادهٔ حساس صادر نمی‌شود** — فهرست فیلدها صریح است؛ فیلدهای داخلی مثل
   ``deleted_at``/``checksum`` و توکن‌های اشتراک هرگز در فایل نمی‌آیند.
2. **فرمت‌ها محدودند** — فقط CSV/TSV/JSON (بدون وابستگی سنگین در هاست هدف).
3. **واردات کنترل‌شده است** — مدل‌های ورودی کاربر (تماس/سرنخ/خبرنامه/لاگ)
   واردات ندارند؛ واردات روی مدل‌های محتوایی idempotent است و با ستون
   ``schema_version`` هم نمی‌شکند، و تزریق فرمول در Excel بی‌اثر می‌شود.
"""

from __future__ import annotations

from typing import Any, cast

import pytest
from django.contrib import admin as django_admin
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from django.urls import reverse
from import_export.formats import base_formats

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.core.admin_mixins import EmmettImportExportAdmin
from apps.core.resources import emmett_export_formats
from apps.leads.admin import ContactAdmin
from apps.leads.models import Contact
from apps.services.admin import ServiceAdmin
from apps.services.models import Service
from apps.services.resources import ServiceResource
from apps.services.tests.factories import ServiceFactory

pytestmark = pytest.mark.django_db


def _staff(*codens: str) -> User:
    from django.contrib.auth.models import Permission

    user = cast(User, UserFactory(is_staff=True))
    user.user_permissions.add(*Permission.objects.filter(codename__in=codens))
    return User.objects.get(pk=user.pk)


class TestExportFormatPolicy:
    def test_only_lightweight_formats_are_offered(self) -> None:
        formats = {fmt.__name__ for fmt in emmett_export_formats()}
        assert formats == {"CSV", "JSON", "TSV"}

    def test_admin_exposes_the_same_restricted_list(self) -> None:
        admin = ServiceAdmin(Service, django_admin.site)
        assert {fmt.__name__ for fmt in admin.get_export_formats()} == {"CSV", "JSON", "TSV"}

    def test_export_filename_is_branded_and_timestamped(self) -> None:
        admin = ServiceAdmin(Service, django_admin.site)
        name = admin.get_export_filename(None, Service.objects.none(), "csv")  # type: ignore[arg-type]
        assert name.startswith("emmett-service-")
        assert name.endswith(".csv")


class TestResourceFieldPolicy:
    def test_resource_exports_explicit_columns_only(self) -> None:
        columns = list(ServiceResource().get_export_headers())

        assert "schema_version" in columns
        assert {"slug", "status", "published_at", "title_fa", "title_en"} <= set(columns)
        # فیلدهای داخلی/مشتق‌شده هرگز صادر نمی‌شوند.
        for forbidden in ("id", "deleted_at", "checksum", "public_id", "description_html_fa"):
            assert forbidden not in columns

    def test_read_only_models_export_without_internal_columns(self) -> None:
        from apps.core.resources import AuditLogResource, LogEntryResource

        audit_columns = list(AuditLogResource().get_export_headers())
        log_columns = list(LogEntryResource().get_export_headers())
        assert "action" in audit_columns and "deleted_at" not in audit_columns
        assert "action_time" in log_columns


class TestCsvExport:
    def _export_form_data(self, admin: Any) -> dict[str, str]:
        """دادهٔ POST فرم صادرات: فرمت + همهٔ ستون‌های منبع (مثل دکمهٔ خود پنل)."""

        form = admin.get_export_form_class()(
            admin.get_export_formats(), admin.get_export_resource_classes(None)
        )
        data = {"format": "0"}  # ۰ = CSV (اندیس فهرست فرمت‌های مجاز)
        data.update({name: "on" for name in form.fields if name.startswith("serviceresource_")})
        return data

    def test_export_view_returns_csv_with_bilingual_columns(self, client: Client) -> None:
        actor = _staff("view_service")
        service = cast(
            Service,
            ServiceFactory(slug="export-me", title_fa="صادرات نمونه", title_en="Export sample"),
        )
        client.force_login(actor)

        # صفحهٔ صادرات django-import-export با POST کار می‌کند: «اندیس فرمت» +
        # انتخاب ستون‌ها؛ در GET فقط فرم انتخاب نمایش داده می‌شود.
        response = client.post(
            reverse("admin:services_service_export"),
            self._export_form_data(ServiceAdmin(Service, django_admin.site)),
        )

        assert response.status_code == 200
        assert response["Content-Type"].startswith("text/csv")
        body = response.content.decode("utf-8-sig")
        header, *rows = body.splitlines()
        assert header.startswith("schema_version,slug,status")
        assert "title_fa" in header and "title_en" in header
        # نام فایل باید پسوند واقعی فرمت را داشته باشد (باگ شیءِ فرمت در نام فایل).
        disposition = response["Content-Disposition"]
        assert ".csv" in disposition
        assert "object at 0x" not in disposition
        assert "صادرات نمونه" in body and "Export sample" in body
        assert any(str(service.slug) in row for row in rows)

    def test_export_escapes_spreadsheet_formulae(self) -> None:
        """جلوگیری از CSV/formula injection: مقدار «=…» نباید فرمول Excel شود.

        این محافظت در لایهٔ فرمت (``Format.export_data``) و با تنظیم
        ``IMPORT_EXPORT_ESCAPE_FORMULAE_ON_EXPORT`` اعمال می‌شود — پس تست هم
        باید از همان مسیر (رندر نهایی CSV) استفاده کند، نه از Dataset خام.
        """

        from import_export.formats import base_formats

        malicious = '=HYPERLINK("http://evil.example","click")'
        ServiceFactory(slug="formula", title_en=malicious)

        csv_text = base_formats.CSV().export_data(ServiceResource().export(Service.objects.all()))

        assert "HYPERLINK(" in csv_text
        assert "=HYPERLINK(" not in csv_text


class TestCsvImport:
    def _resource(self) -> ServiceResource:
        return ServiceResource()

    def test_import_creates_new_row(self) -> None:
        csv_content = (
            "schema_version,slug,status,title_fa,title_en\n"
            "1,imported-service,published,خدمت واردشده,Imported service\n"
        )
        dataset = base_formats.CSV().create_dataset(csv_content)

        result = self._resource().import_data(dataset, dry_run=False, raise_errors=True)

        assert result.totals["new"] == 1
        service = Service.objects.get(slug="imported-service")
        assert service.title_en == "Imported service"
        assert service.title_fa == "خدمت واردشده"
        assert service.status == "published"

    def test_import_is_idempotent_for_unchanged_rows(self) -> None:
        ServiceFactory(slug="stable", title_fa="ثابت", title_en="Stable")
        csv_content = (
            "schema_version,slug,status,title_fa,title_en\n"
            "1,stable,published,ثابت,Stable\n"
        )
        dataset = base_formats.CSV().create_dataset(csv_content)

        result = self._resource().import_data(dataset, dry_run=False, raise_errors=True)

        assert result.totals["update"] == 0
        assert result.totals["skip"] == 1
        assert Service.objects.filter(slug="stable").count() == 1

    def test_import_updates_existing_row(self) -> None:
        ServiceFactory(slug="editable", title_fa="قدیمی", title_en="Old")
        csv_content = (
            "schema_version,slug,status,title_fa,title_en\n"
            "1,editable,published,تازه,New\n"
        )
        dataset = base_formats.CSV().create_dataset(csv_content)

        result = self._resource().import_data(dataset, dry_run=False, raise_errors=True)

        assert result.totals["update"] == 1
        service = Service.objects.get(slug="editable")
        assert service.title_en == "New"
        assert service.title_fa == "تازه"

    def test_import_without_schema_version_column_still_works(self) -> None:
        """فایل دست‌ساز کاربر لزوماً ستون ``schema_version`` ندارد."""

        csv_content = "slug,status,title_fa,title_en\nno-version,published,بی‌نسخه,No version\n"
        dataset = base_formats.CSV().create_dataset(csv_content)

        result = self._resource().import_data(dataset, dry_run=False, raise_errors=True)

        assert result.totals["new"] == 1
        assert Service.objects.filter(slug="no-version").exists()

    def test_json_round_trip_is_stable(self) -> None:
        ServiceFactory(slug="round-trip", title_fa="رفت‌وبرگشت", title_en="Round trip")
        resource = self._resource()

        exported = resource.export(Service.objects.all()).export("json")
        dataset = base_formats.JSON().create_dataset(
            exported.decode() if isinstance(exported, bytes) else exported
        )

        result = resource.import_data(dataset, dry_run=False, raise_errors=True)

        assert result.totals["update"] == 0
        assert result.totals["new"] == 0
        assert Service.objects.filter(slug="round-trip").count() == 1

    def test_admin_import_view_is_a_safe_two_step_flow(self, client: Client) -> None:
        """جریان واقعی پنل: آپلود → صفحهٔ پیش‌نمایش (dry-run) → تأیید → ثبت.

        این دو مرحله‌ای بودن عمدی و امنیتی است: کاربر پیش از نوشتن در دیتابیس،
        نتیجهٔ خشک (چه چیزی ساخته/به‌روز می‌شود) را می‌بیند (ADR-0029).
        """

        from django.contrib.auth.models import Permission

        actor = cast(User, UserFactory(is_staff=True))
        actor.user_permissions.add(
            *Permission.objects.filter(codename__in=["view_service", "add_service", "change_service"])
        )
        client.force_login(User.objects.get(pk=actor.pk))
        csv_file = SimpleUploadedFile(
            "services.csv",
            "slug,status,title_fa,title_en\nadmin-import,published,ورود ادمین,Admin import\n".encode(),
            content_type="text/csv",
        )
        import_url = reverse("admin:services_service_import")

        preview = client.post(import_url, {"format": "0", "import_file": csv_file})

        assert preview.status_code == 200
        assert not Service.objects.filter(slug="admin-import").exists()  # هنوز چیزی ذخیره نشده

        # ``TemplateResponse.context`` ممکن است مجموعه‌ای از contextها باشد؛
        # دسترسی با کلید، میان همهٔ آن‌ها جست‌وجو می‌کند. مقادیر پنهان فرم تأیید
        # (نام فایل موقت، فرمت، منبع) در ``form.initial`` قرار دارند.
        confirm_data = dict(preview.context["confirm_form"].initial)
        result = client.post(reverse("admin:services_service_process_import"), confirm_data, follow=True)

        assert result.status_code == 200
        assert Service.objects.filter(slug="admin-import").exists()


class TestImportPolicy:
    def test_contact_admin_disables_import(self) -> None:
        admin = ContactAdmin(Contact, django_admin.site)
        request = cast(Any, type("R", (), {"user": _staff()})())

        assert admin.has_import_permission(request) is False
        assert admin.get_import_formats() == []

    def test_export_only_admins_still_export(self) -> None:
        admin = ContactAdmin(Contact, django_admin.site)
        assert {fmt.__name__ for fmt in admin.get_export_formats()} == {"CSV", "JSON", "TSV"}

    #: ادمین‌هایی که عمداً صادرات ندارند:
    #: - ``auth.Group`` مال جنگو است و این پروژه از گروه‌های پیش‌فرض استفاده نمی‌کند.
    #: - ``core.SiteSettings`` سینگلتون است؛ صادرات/واردات JSON آن معنا ندارد.
    EXPORT_EXEMPT = {"auth.Group", "core.SiteSettings"}

    def test_every_project_admin_can_be_exported(self) -> None:
        """همهٔ ادمین‌های پروژه (به‌جز استثناهای مستند) باید صادرات داشته باشند."""

        missing: list[str] = []
        for model, model_admin in django_admin.site._registry.items():
            label = model._meta.label
            if label in self.EXPORT_EXEMPT:
                continue
            if not isinstance(model_admin, EmmettImportExportAdmin):
                missing.append(label)
        assert missing == []

class TestExportAuditTrail:
    """صادرات باید رد حسابرسی داشته باشد (خود پکیج برای export ردی ``LogEntry`` نمی‌سازد)."""

    def _export_form_data(self, admin: Any) -> dict[str, str]:
        form = admin.get_export_form_class()(
            admin.get_export_formats(), admin.get_export_resource_classes(None)
        )
        data = {"format": "0"}
        data.update({name: "on" for name in form.fields if name.startswith("serviceresource_")})
        return data

    def test_admin_export_writes_an_audit_log_row(self, client: Client) -> None:
        from apps.core.models import AuditLog

        ServiceFactory(slug="audit-export", title_fa="خدمت حسابرسی‌شده", title_en="Audited")
        client.force_login(_staff("view_service"))

        response = client.post(
            reverse("admin:services_service_export"),
            self._export_form_data(ServiceAdmin(Service, django_admin.site)),
        )

        assert response.status_code == 200
        entry = AuditLog.objects.filter(action="services.Service.exported").first()
        assert entry is not None
        assert entry.metadata["rows"] == 1
        assert entry.actor is not None
        assert "attachment" in entry.metadata["file_name"]

    def test_export_without_columns_is_not_audited(self, client: Client) -> None:
        """فرم نامعتبر (بدون ستون) نباید ردی حسابرسی «صادرات» بسازد."""

        from apps.core.models import AuditLog

        ServiceFactory(slug="no-columns")
        client.force_login(_staff("view_service"))

        client.post(reverse("admin:services_service_export"), {"format": "0"})

        assert AuditLog.objects.filter(action="services.Service.exported").exists() is False
