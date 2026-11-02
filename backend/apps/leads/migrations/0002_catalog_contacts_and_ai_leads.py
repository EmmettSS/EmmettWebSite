# Contact option values stay stable while storage moves from free-standing strings to DB catalogs.
import django.db.models.deletion
from django.db import migrations, models


def migrate_contact_catalog_keys(apps, schema_editor):
    db_alias = schema_editor.connection.alias
    Contact = apps.get_model("leads", "Contact")
    CatalogOption = apps.get_model("ai_engine", "CatalogOption")
    catalog_by_field = {
        "project_type": "project_type",
        "budget_range": "budget_range",
        "timeline": "timeline",
    }
    for contact in Contact.objects.using(db_alias).all().iterator(chunk_size=500):
        for field_name, catalog_key in catalog_by_field.items():
            legacy_value = getattr(contact, f"legacy_{field_name}")
            try:
                option = CatalogOption.objects.using(db_alias).get(
                    catalog__key=catalog_key,
                    key=legacy_value,
                    is_active=True,
                    deleted_at__isnull=True,
                )
            except CatalogOption.DoesNotExist as exc:
                raise RuntimeError(
                    f"Cannot migrate Contact {contact.pk}: missing {catalog_key}:{legacy_value}"
                ) from exc
            setattr(contact, f"{field_name}_id", option.pk)
        contact.save(
            using=db_alias,
            update_fields=["project_type", "budget_range", "timeline"],
        )


def restore_contact_catalog_keys(apps, schema_editor):
    db_alias = schema_editor.connection.alias
    Contact = apps.get_model("leads", "Contact")
    CatalogOption = apps.get_model("ai_engine", "CatalogOption")
    for contact in Contact.objects.using(db_alias).all().iterator(chunk_size=500):
        for field_name in ("project_type", "budget_range", "timeline"):
            option_id = getattr(contact, f"{field_name}_id")
            key = CatalogOption.objects.using(db_alias).get(pk=option_id).key
            setattr(contact, f"legacy_{field_name}", key)
        contact.save(
            using=db_alias,
            update_fields=["legacy_project_type", "legacy_budget_range", "legacy_timeline"],
        )


class Migration(migrations.Migration):
    dependencies = [
        ("ai_engine", "0002_seed_initial_catalogs"),
        ("leads", "0001_initial"),
    ]

    operations = [
        migrations.RenameField("contact", "project_type", "legacy_project_type"),
        migrations.RenameField("contact", "budget_range", "legacy_budget_range"),
        migrations.RenameField("contact", "timeline", "legacy_timeline"),
        migrations.AddField(
            model_name="contact",
            name="project_type",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"catalog__key": "project_type"},
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="project_contacts",
                to="ai_engine.catalogoption",
                verbose_name="project type",
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="budget_range",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"catalog__key": "budget_range"},
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="budget_contacts",
                to="ai_engine.catalogoption",
                verbose_name="budget range",
            ),
        ),
        migrations.AddField(
            model_name="contact",
            name="timeline",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"catalog__key": "timeline"},
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="timeline_contacts",
                to="ai_engine.catalogoption",
                verbose_name="timeline",
            ),
        ),
        migrations.RunPython(migrate_contact_catalog_keys, restore_contact_catalog_keys),
        migrations.RemoveField(model_name="contact", name="legacy_project_type"),
        migrations.RemoveField(model_name="contact", name="legacy_budget_range"),
        migrations.RemoveField(model_name="contact", name="legacy_timeline"),
        migrations.AlterField(
            model_name="contact",
            name="project_type",
            field=models.ForeignKey(
                limit_choices_to={"catalog__key": "project_type"},
                on_delete=django.db.models.deletion.PROTECT,
                related_name="project_contacts",
                to="ai_engine.catalogoption",
                verbose_name="project type",
            ),
        ),
        migrations.AlterField(
            model_name="contact",
            name="budget_range",
            field=models.ForeignKey(
                limit_choices_to={"catalog__key": "budget_range"},
                on_delete=django.db.models.deletion.PROTECT,
                related_name="budget_contacts",
                to="ai_engine.catalogoption",
                verbose_name="budget range",
            ),
        ),
        migrations.AlterField(
            model_name="contact",
            name="timeline",
            field=models.ForeignKey(
                limit_choices_to={"catalog__key": "timeline"},
                on_delete=django.db.models.deletion.PROTECT,
                related_name="timeline_contacts",
                to="ai_engine.catalogoption",
                verbose_name="timeline",
            ),
        ),
        migrations.AddField(
            model_name="lead",
            name="ai_suggestion",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="leads",
                to="ai_engine.aisuggestion",
            ),
        ),
        migrations.AddField(
            model_name="lead",
            name="ai_concept",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="leads",
                to="ai_engine.aiconcept",
            ),
        ),
    ]
