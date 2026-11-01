"""URLهای ۲FA ادمین — زیر ``/admin/2fa/`` (فاز ۷، ADR-0033).

در ``config/urls.py`` **قبل از** ``admin.site.urls`` قرار می‌گیرند تا الگوهای
اختصاصی بر الگوهای عمومی ادمین اولویت داشته باشند.
"""

from __future__ import annotations

from django.urls import path

from apps.accounts.twofa_views import (
    TwoFactorRecoveryView,
    TwoFactorSetupView,
    TwoFactorStatusView,
    TwoFactorVerifyView,
)

urlpatterns = [
    path("", TwoFactorStatusView.as_view(), name="admin-2fa-status"),
    path("setup/", TwoFactorSetupView.as_view(), name="admin-2fa-setup"),
    path("verify/", TwoFactorVerifyView.as_view(), name="admin-2fa-verify"),
    path("recovery/", TwoFactorRecoveryView.as_view(), name="admin-2fa-recovery"),
]
