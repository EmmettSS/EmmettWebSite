from django.urls import path

from .views import (
    HolidayCalendarView,
    JalaliConvertView,
    PersianTextNormalizeView,
    ShareCreateView,
    ShareDetailView,
    ToolUsageView,
)

urlpatterns = [
    path("tools/jalali/holidays/", HolidayCalendarView.as_view(), name="tool-jalali-holidays"),
    path("tools/jalali/convert/", JalaliConvertView.as_view(), name="tool-jalali-convert"),
    path("tools/persian-text/normalize/", PersianTextNormalizeView.as_view(), name="tool-persian-text-normalize"),
    path("tools/share/", ShareCreateView.as_view(), name="tool-share-create"),
    path("tools/share/<str:share_id>/", ShareDetailView.as_view(), name="tool-share-detail"),
    path("tools/usage/", ToolUsageView.as_view(), name="tool-usage"),
]
