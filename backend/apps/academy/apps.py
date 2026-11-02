from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class AcademyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.academy"
    label = "academy"
    verbose_name = _("Academy")

    def ready(self) -> None:
        from apps.academy import signals  # noqa: F401
