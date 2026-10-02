from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .models import Job


class PollableJobView(APIView):
    """Reusable short-poll response. Subclasses define job_kind and permissions."""

    job_kind: str | None = None

    def get(self, request, job_id: int):
        try:
            job = (
                Job.objects.get(pk=job_id, kind=self.job_kind)
                if self.job_kind
                else Job.objects.get(pk=job_id)
            )
        except Job.DoesNotExist:
            return Response(
                {"detail": "Job not found"}, status=status.HTTP_404_NOT_FOUND
            )
        try:
            offset = int(request.query_params.get("offset", "0"))
            if offset < 0:
                raise ValueError
        except ValueError:
            return Response(
                {"detail": "offset must be a non-negative integer"}, status=400
            )
        steps = job.progress or []
        return Response(
            {
                "job_id": job.pk,
                "state": job.state,
                "progress": steps[offset:],
                "offset_next": len(steps),
                "result": job.result if job.state == Job.State.DONE else None,
                "error": job.error if job.state == Job.State.FAILED else None,
            }
        )
