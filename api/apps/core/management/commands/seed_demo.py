from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand
from django.contrib.contenttypes.models import ContentType
from apps.content.models import CaseStudy, JobOpening, Post, SiteConfig, TeamMember


class Command(BaseCommand):
    help = "Create clearly marked local-only sample content and editor permissions."

    def handle(self, *args, **opts):
        site, _ = SiteConfig.objects.get_or_create(pk=1)
        self.stdout.write(f"Site config: {site.brand_en} / {site.brand_fa}")
        for model in (Post, CaseStudy, JobOpening):
            group, _ = Group.objects.get_or_create(name="Content editors")
            ct = ContentType.objects.get_for_model(model)
            group.permissions.add(
                *Permission.objects.filter(
                    content_type=ct,
                    codename__in=[
                        f"add_{model._meta.model_name}",
                        f"change_{model._meta.model_name}",
                        f"view_{model._meta.model_name}",
                    ],
                )
            )
        for index in range(1, 5):
            Post.objects.get_or_create(
                slug=f"sample-note-{index}",
                defaults={
                    "title_fa": f"یادداشت نمونهٔ {index} — منتشرنشده",
                    "title_en": f"Unpublished sample note {index}",
                    "body_fa": "این محتوای نمونهٔ توسعه است و ادعای تجربهٔ واقعی نیست.",
                    "body_en": "Development sample content; this does not claim real client work.",
                    "status": "draft",
                },
            )
        for index in range(1, 3):
            CaseStudy.objects.get_or_create(
                slug=f"sample-case-{index}",
                defaults={
                    "title_fa": f"مطالعهٔ موردی نمونهٔ {index} — بدون ادعای واقعی",
                    "title_en": f"Sample case study {index} — no real claims",
                    "body_fa": "نمونهٔ محلی؛ تا زمان تأیید مالک داده منتشر نشود.",
                    "body_en": "Local sample; do not publish before data-owner approval.",
                    "status": "draft",
                },
            )
        for index in range(1, 5):
            TeamMember.objects.get_or_create(
                name_en=f"Sample team member {index} (not a real person)",
                defaults={
                    "name_fa": f"[نمونه] عضو تیم {index}",
                    "role_fa": "نقش نمونه",
                    "role_en": "Sample role",
                    "sort_order": index,
                },
            )
        for index in range(1, 3):
            JobOpening.objects.get_or_create(
                slug=f"sample-role-{index}",
                defaults={
                    "title_fa": f"موقعیت شغلی نمونهٔ {index}",
                    "title_en": f"Sample role {index}",
                    "body_fa": "موقعیت نمونهٔ توسعه؛ منتشر نشود.",
                    "body_en": "Development sample role; do not publish.",
                    "status": "draft",
                },
            )
        self.stdout.write(
            self.style.SUCCESS(
                "Demo seed complete: every seeded record stays a draft and is labelled as a sample — nothing is presented as real."
            )
        )
