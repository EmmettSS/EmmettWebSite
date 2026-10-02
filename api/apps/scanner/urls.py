from django.urls import path

from .views import ScanJobCreateView, ScanJobPollView, ScanResultView, ScanUnlockView

urlpatterns = [
    path("scanner/jobs/", ScanJobCreateView.as_view(), name="scanner-job-create"),
    path("scanner/jobs/<int:job_id>/poll/", ScanJobPollView.as_view(), name="scanner-job-poll"),
    path("scanner/results/<str:result_id>/", ScanResultView.as_view(), name="scanner-result"),
    path("scanner/results/<str:result_id>/unlock/", ScanUnlockView.as_view(), name="scanner-result-unlock"),
]
