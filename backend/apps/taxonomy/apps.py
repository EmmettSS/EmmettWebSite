from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class TaxonomyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.taxonomy"
    label = "taxonomy"
    verbose_name = _("Taxonomy")
