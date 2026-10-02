from django.apps import AppConfig


class AssistantConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.assistant"

    def ready(self):
        from . import jobs  # noqa: F401  (registers the embed/ask handlers)
