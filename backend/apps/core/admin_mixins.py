"""Mixinهای مشترک ادمین — فاز ۶ (ADR-0028 / ADR-0029).

چهار دستهٔ مسئولیت اینجا متمرکز شده تا هر ``admin.py`` فقط «پیکربندی» باشد و
منطق تکراری نداشته باشد:

1. ``EmmettAdminDefaults``  — پیش‌فرض‌های کارایی/خوانایی مشترک + ادغام اکشن‌های
   تعریف‌شده در mixinها (Django فقط ``actions`` تک‌مقداری را می‌خواند؛ تداخل
   MRO با گروه‌های نام‌دار ``publish_actions``/``soft_delete_actions`` حل شده).
2. ``PublishWorkflowMixin`` — اکشن‌های گروهی گردش‌کار انتشار + برچسب رنگی وضعیت
   + ثبت در ``AuditLog``.
3. ``SoftDeleteAdminMixin`` — فیلتر «فعال/حذف‌شده» و اکشن «بازگردانی»
   (تکمیل حذف نرم ADR-0012 که تا امروز هیچ راه بازگردانی از ادمین نداشت).
4. ``ExportImportAdminMixin``/``ExportOnlyAdminMixin`` — صادرات/واردات کنترل‌شده
   (ADR-0029) با فهرست صریح فرمت‌ها و بدون نشت فیلدهای داخلی.

قاعدهٔ حسابرسی (تفکیک مسئولیت با ``admin.LogEntry``): تغییرات معمولِ فرم‌ها
توسط خود Django در ``LogEntry`` ثبت می‌شوند؛ اما اقدامات گروهی/حساس
(انتشار، بازگردانی، لغو اشتراک لینک AI، تأیید خلاصه) با ``queryset.update``
انجام می‌شوند و Django هیچ ردی از آن‌ها نمی‌گذارد — پس همهٔ آن‌ها **باید** از
``log_action`` رد شوند. این تفکیک صریح در ADR-0028 مستند شده است.
"""

from __future__ import annotations

from typing import Any, cast

from django.contrib import admin, messages
from django.contrib.admin.options import IS_POPUP_VAR
from django.db.models import QuerySet, Value
from django.db.models.functions import Coalesce
from django.http import HttpRequest
from django.utils import timezone
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

# ``import_export`` هیچ ``py.typed`` ندارد؛ ارث‌بری از کلاس‌هایش نوع ``Any``
# می‌سازد و mypy سخت‌گیر آن را نمی‌پذیرد. محدودیت در ADR-0029 ثبت شده و
# ``# type: ignore[misc]`` فقط روی همان کلاس پایه نشسته است (نه روی همهٔ ادمین‌ها).
from import_export.admin import ImportExportModelAdmin

from apps.core.models import PublishableModel, log_action


class EmmettAdminDefaults(admin.ModelAdmin[Any]):
    """پیش‌فرض‌های کارایی سبک که همهٔ ادمین‌های پروژه از آن ارث می‌برند."""

    list_per_page = 25
    # شمارش کل رکوردها در فهرست‌های بزرگ کوئری گران است؛ ادمین این پروژه به آن
    # نیازی ندارد (کاربر با صفحه‌بندی/فیلتر جلو می‌رود) — قانون ۱۵.
    show_full_result_count = False
    save_on_top = True

    # گروه‌های اکشنی که mixinها اعلام می‌کنند (به‌جای بازنویسی ``actions`` که
    # در MRO فقط یکی از آن‌ها برنده می‌شد).
    extra_action_groups: tuple[str, ...] = ("publish_actions", "soft_delete_actions")

    def get_actions(self, request: HttpRequest) -> dict[str, Any]:
        """اکشن‌های گروه‌دار mixinها را با همان منطق مجوز خود Django ادغام می‌کند."""

        actions = super().get_actions(request)
        # در حالت پنجرهٔ modal و وقتی اکشن‌ها صریحاً خاموش شده‌اند، دست نمی‌زنیم.
        if self.actions is None or IS_POPUP_VAR in request.GET:
            return actions

        group_names: list[str] = []
        for group in self.extra_action_groups:
            group_names.extend(name for name in (getattr(self, group, ()) or ()) if name not in actions)

        # این دو متد خصوصیِ ``ModelAdmin`` در ``django-stubs`` اعلام نشده‌اند؛
        # دسترسی از مسیر ``Any`` انجام می‌شود تا رفتار دقیقاً همان فیلتر مجوزِ
        # خود جنگو بماند (هیچ بازپیاده‌سازی‌ای که از جنگو جدا شود نداریم).
        #
        # ⚠️ نکتهٔ حیاتی: توابع اکشن باید **unbound** باشند. ``response_action``
        # خودِ جنگو فراخوانی را ``func(self, request, queryset)`` انجام می‌دهد
        # (همان قرارداد ``ModelAdmin.get_action`` که از ``self.__class__``
        # می‌خواند). اگر متد bound ثبت شود، هر اکشن گروهی با خطای
        # ``TypeError: takes 3 positional arguments but 4 were given`` → HTTP 500
        # می‌شکند (باگ کشف‌شده در تست «سطح ادمین» فاز ۶).
        admin_self = cast(Any, self)
        extra_actions = [
            (func, name, admin_self._get_action_description(func, name))
            for name, func in ((name, getattr(self.__class__, name, None)) for name in group_names)
            if func is not None
        ]
        for func, name, description in admin_self._filter_actions_by_permissions(request, extra_actions):
            actions[name] = (func, name, description)
        return actions


# ---------------------------------------------------------------------------
# گردش‌کار انتشار
# ---------------------------------------------------------------------------


def render_status_pill(status: str, choices: Any) -> str:
    """برچسب رنگی وضعیت را می‌سازد (کلاس CSS پروژه؛ هیچ style درون‌خطی نیست).

    مشترک بین گردش‌کار انتشار، تعدیل کامنت و وضعیت ثبت‌نام دوره‌ها.
    """

    label = dict(choices).get(status, status)
    return format_html('<span class="emmett-pill emmett-pill--{}">{}</span>', status, str(label))


class PublishWorkflowMixin(admin.ModelAdmin[Any]):
    """اکشن‌های گروهی انتشار/بازگشت/بایگانی + برچسب وضعیت + ثبت حسابرسی.

    فرض: مدل از ``PublishableModel`` ارث‌بری می‌کند (``status``/``published_at``).
    """

    publish_actions: tuple[str, ...] = (
        "publish_selected",
        "unpublish_selected",
        "archive_selected",
    )

    @admin.action(description=_("Publish selected content"), permissions=["change"])
    def publish_selected(self, request: HttpRequest, queryset: QuerySet[Any]) -> None:
        """وضعیت را Published می‌کند و ``published_at`` را فقط اگر خالی بود پر می‌کند.

        (تاریخ انتشار اولیهٔ یک محتوا هرگز با انتشار دوباره بازنویسی نمی‌شود؛
        تاریخ‌های بعدی از ``updated_at`` و ``AuditLog`` قابل ردیابی‌اند.)
        """

        pending = list(
            queryset.exclude(status=PublishableModel.Status.PUBLISHED).values_list("pk", flat=True)
        )
        if not pending:
            self.message_user(request, _("Nothing to do: the selected items are already published."))
            return

        now = timezone.now()
        updated = queryset.filter(pk__in=pending).update(
            status=PublishableModel.Status.PUBLISHED,
            published_at=Coalesce("published_at", Value(now)),
            updated_at=now,
        )
        self._log_bulk_action(
            request,
            action="published",
            ids=pending,
            metadata={"requested": len(pending), "updated": updated},
        )
        self.message_user(
            request,
            _("Published %(count)s item(s).") % {"count": updated},
            messages.SUCCESS,
        )

    @admin.action(description=_("Return selected content to draft"), permissions=["change"])
    def unpublish_selected(self, request: HttpRequest, queryset: QuerySet[Any]) -> None:
        """بازگشت به پیش‌نویس و پاک‌کردن ``published_at`` (مفهوم انتشار از دست می‌رود)."""

        pending = list(queryset.exclude(status=PublishableModel.Status.DRAFT).values_list("pk", flat=True))
        if not pending:
            self.message_user(request, _("Nothing to do: the selected items are already drafts."))
            return

        now = timezone.now()
        updated = queryset.filter(pk__in=pending).update(
            status=PublishableModel.Status.DRAFT, published_at=None, updated_at=now
        )
        self._log_bulk_action(request, action="unpublished", ids=pending, metadata={"updated": updated})
        self.message_user(
            request,
            _("Returned %(count)s item(s) to draft.") % {"count": updated},
            messages.WARNING,
        )

    @admin.action(description=_("Archive selected content"), permissions=["change"])
    def archive_selected(self, request: HttpRequest, queryset: QuerySet[Any]) -> None:
        """بایگانی: محتوا از API عمومی حذف می‌شود ولی رکورد و تاریخچهٔ انتشار می‌ماند."""

        pending = list(queryset.exclude(status=PublishableModel.Status.ARCHIVED).values_list("pk", flat=True))
        if not pending:
            self.message_user(request, _("Nothing to do: the selected items are already archived."))
            return

        now = timezone.now()
        updated = queryset.filter(pk__in=pending).update(
            status=PublishableModel.Status.ARCHIVED, updated_at=now
        )
        self._log_bulk_action(request, action="archived", ids=pending, metadata={"updated": updated})
        self.message_user(
            request,
            _("Archived %(count)s item(s).") % {"count": updated},
            messages.WARNING,
        )

    @admin.display(description=_("Publication status"), ordering="status")
    def status_badge(self, obj: Any) -> str:
        """برچسب رنگی وضعیت انتشار (CSS در static/admin_theme — بدون style درون‌خطی)."""

        status = str(getattr(obj, "status", "") or "")
        return render_status_pill(status, PublishableModel.Status.choices)

    def _log_bulk_action(
        self,
        request: HttpRequest,
        *,
        action: str,
        ids: list[Any],
        metadata: dict[str, Any],
    ) -> None:
        log_action(
            action=f"{self.model._meta.label}.{action}",
            actor=request.user if request.user.is_authenticated else None,
            metadata={"ids": ids, **metadata},
        )


# ---------------------------------------------------------------------------
# حذف نرم
# ---------------------------------------------------------------------------


class RecordStateFilter(admin.SimpleListFilter):
    """فیلتر «وضعیت رکورد»: فعال / حذف‌شده (نرم) / همه."""

    title = _("record state")
    parameter_name = "record_state"
    request_key = "record_state"

    def lookups(self, request: HttpRequest, model_admin: admin.ModelAdmin[Any]) -> list[tuple[str, Any]]:
        return [
            ("active", _("Active only")),
            ("deleted", _("Soft-deleted only")),
            ("all", _("All records")),
        ]

    def queryset(self, request: HttpRequest, queryset: QuerySet[Any]) -> QuerySet[Any]:
        value = self.value()
        if value == "deleted":
            return queryset.filter(deleted_at__isnull=False)
        if value == "all":
            return queryset
        return queryset.filter(deleted_at__isnull=True)


class SoftDeleteAdminMixin(admin.ModelAdmin[Any]):
    """نمایش/بازگردانی رکوردهای حذف‌شدهٔ نرم از پنل (تکمیل ADR-0012)."""

    soft_delete_actions: tuple[str, ...] = ("restore_selected",)

    def get_queryset(self, request: HttpRequest) -> QuerySet[Any]:
        """با انتخاب فیلتر «حذف‌شده/همه»، منیجر کامل (``all_objects``) استفاده می‌شود."""

        if request.GET.get(RecordStateFilter.request_key):
            model = cast(Any, self.model)
            return cast(QuerySet[Any], model.all_objects.all())
        return super().get_queryset(request)

    @admin.action(description=_("Restore selected records"), permissions=["change"])
    def restore_selected(self, request: HttpRequest, queryset: QuerySet[Any]) -> None:
        deleted_ids = list(queryset.filter(deleted_at__isnull=False).values_list("pk", flat=True))
        if not deleted_ids:
            self.message_user(request, _("Nothing to restore: no soft-deleted item was selected."))
            return

        model = cast(Any, self.model)
        now = timezone.now()
        restored = model.all_objects.filter(pk__in=deleted_ids).update(
            is_active=True, deleted_at=None, updated_at=now
        )
        log_action(
            action=f"{self.model._meta.label}.restored",
            actor=request.user if request.user.is_authenticated else None,
            metadata={"ids": deleted_ids, "restored": restored},
        )
        self.message_user(
            request,
            _("Restored %(count)s record(s).") % {"count": restored},
            messages.SUCCESS,
        )

    @admin.display(description=_("Deleted?"), boolean=True)
    def is_deleted(self, obj: Any) -> bool:
        return cast(Any, obj).deleted_at is not None


# ---------------------------------------------------------------------------
# صادرات/واردات
# ---------------------------------------------------------------------------


class ExportFormatsMixin:
    """فرمت‌های مجاز صادرات/واردات (ADR-0029) — بدون ارث‌بری از ModelAdmin.

    عمداً یک mixin ساده (نه زیرکلاس ModelAdmin) است تا ترکیب آن با کلاس‌های
    دیگر هیچ درگیری MRO ایجاد نکند. فقط CSV/TSV/JSON مجاز است؛ XLSX/ODS/YAML
    به‌خاطر نبود وابستگی سبکِ سازگار با هاست اشتراکی هدف حذف شده‌اند.
    """

    def get_export_formats(self) -> list[Any]:
        from apps.core.resources import emmett_export_formats

        return list(emmett_export_formats())

    def get_import_formats(self) -> list[Any]:
        from apps.core.resources import emmett_export_formats

        return list(emmett_export_formats())

    def get_export_filename(self, request: HttpRequest, queryset: QuerySet[Any], file_format: Any) -> str:
        """نام فایل صادرات با پیشوند برند و تاریخ میلادی (سازگاری بین‌المللی).

        توجه: ``file_format`` یک **نمونهٔ** کلاس فرمت است (نه رشتهٔ پسوند)؛ جنگو/پکیج
        همان شیء را پاس می‌دهد. پسوند از ``get_extension()`` خوانده می‌شود. اگر این
        مقدار را مستقیماً در f-string بگذاریم، نام فایل به
        ``emmett-…-<import_export.formats.base_formats.CSV object at 0x…>`` تبدیل
        می‌شود (باگی که در smoke تست پیش‌نمایش زندهٔ فاز ۶ دیده شد و اکنون تست دارد).
        """

        stamp = timezone.now().strftime("%Y%m%d-%H%M")
        get_extension = getattr(file_format, "get_extension", None)
        extension = str(get_extension()) if callable(get_extension) else str(file_format)
        model_name: str = cast(Any, self).model._meta.model_name
        return f"emmett-{model_name}-{stamp}.{extension}"


class ImportDisabledMixin:
    """غیرفعال‌کردن کامل واردات — برای داده‌های ورودی کاربر و لاگ‌ها."""

    def has_import_permission(self, request: HttpRequest, obj: Any | None = None) -> bool:
        return False

    def get_import_formats(self) -> list[Any]:
        return []


class EmmettImportExportAdmin(ExportFormatsMixin, EmmettAdminDefaults, ImportExportModelAdmin):  # type: ignore[misc]
    """ادمین پروژه به‌همراه صفحه/اکشن‌های صادرات و واردات + رد حسابرسی صادرات.

    واردات در خود پکیج ``LogEntry`` می‌سازد (``IMPORT_EXPORT_SKIP_ADMIN_LOG=False``)،
    ولی **صادرات** در import_export 4.4.1 هیچ ردی حسابرسی ندارد. چون صادرات می‌تواند
    دادهٔ حساس (لید/تماس/کاربر) را از سازمان بیرون ببرد، این کلاس هر صادرات ادمین را
    در ``AuditLog`` با تعداد ردیف‌ها و فرمت ثبت می‌کند (قانون ۱۶ / ADR-0013).
    """

    def export_action(self, request: HttpRequest) -> Any:
        """صادرات فایل (POST روی view) را در ``AuditLog`` ثبت می‌کند.

        نکته: در import_export 4.4.1 متد ``export_admin_action`` فقط **فرم** انتخاب
        ستون/فرمت را رندر می‌کند و خودِ فایل در ``export_action`` ساخته می‌شود؛ پس
        قلاب درست برای حسابرسی همین متد است (تست رگرسیون در ``test_admin_exchange``).
        """

        response = super().export_action(request)
        if (
            request.method == "POST"
            and getattr(response, "status_code", 0) == 200
            and response.get("Content-Disposition")
        ):
            queryset = self.get_export_queryset(request)
            log_action(
                action=f"{self.model._meta.label}.exported",
                actor=request.user if request.user.is_authenticated else None,
                metadata={
                    "rows": queryset.count(),
                    "format": request.POST.get("format", ""),
                    "file_name": response.get("Content-Disposition", ""),
                },
            )
        return response


__all__ = [
    "EmmettAdminDefaults",
    "EmmettImportExportAdmin",
    "ExportFormatsMixin",
    "ImportDisabledMixin",
    "PublishWorkflowMixin",
    "RecordStateFilter",
    "SoftDeleteAdminMixin",
    "render_status_pill",
]
