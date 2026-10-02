"""Registers the F-06 scan handler on the phase-1 job engine."""

from apps.jobs.runner import register

from . import engine
from .models import ScanJob


@register("scan")
def run_scan(payload: dict, progress) -> dict:
    scan = ScanJob.objects.select_related("job").get(pk=payload["scan_id"])
    return engine.run(scan, progress)
