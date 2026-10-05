"""فیلترهای پیشرفتهٔ ادمین — فاز ۶ (ADR-0028).

فیلترهای عمومی که در چند اپ استفاده می‌شوند:

- ``RelatedPresenceFilter``: «فقط رکوردهایی که رابطهٔ معکوس خاصی دارند/ندارند»
  (مثلاً دوره‌هایی که ثبت‌نام دارند، مقاله‌هایی که کامنت دارند). پیاده‌سازی با
  ``Exists`` انجام می‌شود، نه ``annotate(Count)`` — چون وجود/عدم‌وجود کافی است و
  ``Exists`` در MySQL/SQLite هر دو ایندکس‌پذیر و ارزان است (قانون ۱۵).
- ``TranslationCompletenessFilter``: برای مدیریت ترجمه‌ها — «این کلید در
  کدام زبان‌ها ثبت شده است؟». مستقیماً یکی از نیازهای فاز ۶ (مدیریت ترجمه در
  ادمین) را حل می‌کند: پیدا کردن سریع کلیدهایی که یک زبان را جا انداخته‌اند.
"""

from __future__ import annotations

from typing import Any, ClassVar, cast

from django.contrib import admin
from django.db.models import Exists, OuterRef, QuerySet
from django.http import HttpRequest
from django.utils.translation import gettext_lazy as _

from apps.core.models import Translation


class RelatedPresenceFilter(admin.SimpleListFilter):
    """فیلتر عمومی «دارد/ندارد» روی یک رابطهٔ معکوس."""

    #: نام رابطهٔ معکوس روی مدل (مثلاً ``enrollments``).
    relation: ClassVar[str] = ""
    yes_label = _("Has related items")
    no_label = _("No related items")

    def lookups(self, request: HttpRequest, model_admin: admin.ModelAdmin[Any]) -> list[tuple[str, Any]]:
        return [("yes", self.yes_label), ("no", self.no_label)]

    def queryset(self, request: HttpRequest, queryset: QuerySet[Any]) -> QuerySet[Any]:
        value = self.value()
        if value not in {"yes", "no"} or not self.relation:
            return queryset

        try:
            relation_field = self.model._meta.get_field(self.relation)  # type: ignore[attr-defined]
        except Exception:  # pragma: no cover - پیکربندی اشتباه در کد، نه ورودی کاربر
            return queryset

        related_model = cast(Any, relation_field.related_model)
        filter_kwargs = {cast(Any, relation_field.field).name: OuterRef("pk")}
        related_qs = related_model.all_objects.filter(**filter_kwargs)

        if value == "yes":
            return queryset.filter(Exists(related_qs))
        return queryset.filter(~Exists(related_qs))


class TranslationCompletenessFilter(admin.SimpleListFilter):
    """فیلتر «چه زبان‌هایی ثبت شده‌اند؟» برای مدل ``core.Translation``."""

    title = _("translation completeness")
    parameter_name = "completeness"

    def lookups(self, request: HttpRequest, model_admin: admin.ModelAdmin[Any]) -> list[tuple[str, Any]]:
        return [
            ("missing_fa", _("Missing Persian (fa)")),
            ("missing_en", _("Missing English (en)")),
            ("both", _("Registered in both languages")),
        ]

    def queryset(self, request: HttpRequest, queryset: QuerySet[Any]) -> QuerySet[Any]:
        value = self.value()
        if value is None:
            return queryset

        has_fa = Translation.objects.filter(
            namespace=OuterRef("namespace"),
            key=OuterRef("key"),
            locale="fa",
            value__gt="",
        )
        has_en = Translation.objects.filter(
            namespace=OuterRef("namespace"),
            key=OuterRef("key"),
            locale="en",
            value__gt="",
        )

        if value == "missing_fa":
            return queryset.filter(~Exists(has_fa))
        if value == "missing_en":
            return queryset.filter(~Exists(has_en))
        if value == "both":
            return queryset.filter(Exists(has_fa) & Exists(has_en))
        return queryset


__all__ = ["RelatedPresenceFilter", "TranslationCompletenessFilter"]
