"""Idempotent developer bootstrap command support; production is seeded by migration."""

from __future__ import annotations

from apps.ai_engine.catalog.defaults import CATALOGS, ESTIMATION_DAYS, GUARDRAILS, PROMPTS
from apps.ai_engine.models import Catalog, CatalogOption, EstimationRule, GuardrailRule, PromptTemplate


def seed_ai_engine_data() -> int:
    created_count = 0
    options_by_key: dict[tuple[str, str], CatalogOption] = {}
    for catalog_key, label_fa, label_en, options in CATALOGS:
        catalog, created = Catalog.objects.get_or_create(
            key=catalog_key,
            defaults={"label_fa": label_fa, "label_en": label_en, "is_public": True, "is_active": True},
        )
        created_count += int(created)
        for order, (key, option_fa, option_en) in enumerate(options):
            option, created = CatalogOption.objects.get_or_create(
                catalog=catalog,
                key=key,
                defaults={
                    "label_fa": option_fa,
                    "label_en": option_en,
                    "order": order,
                    "is_public": True,
                    "is_active": True,
                },
            )
            options_by_key[(catalog_key, key)] = option
            created_count += int(created)

    for feature, locale, version, system_prompt in PROMPTS:
        _prompt, created = PromptTemplate.objects.get_or_create(
            feature=feature,
            locale=locale,
            version=version,
            defaults={"system_prompt": system_prompt, "is_active": True},
        )
        created_count += int(created)

    for rule_key, rule_type, severity, description_fa, description_en, config in GUARDRAILS:
        _rule, created = GuardrailRule.objects.get_or_create(
            rule_key=rule_key,
            defaults={
                "rule_type": rule_type,
                "severity": severity,
                "description_fa": description_fa,
                "description_en": description_en,
                "config": config,
                "is_active": True,
            },
        )
        created_count += int(created)

    for delivery_key, minimum_days in ESTIMATION_DAYS.items():
        scope = options_by_key[("delivery_scope", delivery_key)]
        _rule, created = EstimationRule.objects.get_or_create(
            delivery_scope=scope,
            defaults={"minimum_working_days": minimum_days, "is_active": True},
        )
        created_count += int(created)
    return created_count
