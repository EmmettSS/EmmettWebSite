from django.apps import AppConfig


class ScannerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.scanner"

    def ready(self):
        from . import jobs  # noqa: F401  (registers the "scan" job handler)
