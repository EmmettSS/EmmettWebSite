from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class BlogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.blog"
    label = "blog"
    verbose_name = _("Blog")

    def ready(self) -> None:
        from apps.blog import signals  # noqa: F401
