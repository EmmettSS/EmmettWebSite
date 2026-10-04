"""تولید دادهٔ نمایشی دوزبانه (fa/en) برای توسعه/دمو — هرگز در پروداکشن اجرا نشود.

idempotent است: با ``get_or_create``/``update_or_create`` روی کلید طبیعی هر
مدل (slug/email) نوشته شده تا اجرای چندبارهٔ آن رکورد تکراری نسازد.

استفاده::

    python manage.py seed_demo_data
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.academy.models import Course, Enrollment, Instructor, Lesson
from apps.accounts.models import User
from apps.blog.models import BlogPost, Comment
from apps.company.models import TeamMember, Testimonial
from apps.core.models import PublishableModel, SiteSettings
from apps.leads.models import Newsletter
from apps.portfolio.models import CaseStudy, Project
from apps.services.models import Service
from apps.taxonomy.models import Category, Tag

_NOW = timezone.now


class Command(BaseCommand):
    help = "دادهٔ نمایشی دوزبانهٔ فاز ۴ را برای محیط توسعه/دمو ایجاد می‌کند (idempotent)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--force",
            action="store_true",
            help="اجرا حتی اگر DEBUG=False باشد (فقط برای محیط‌های دمو کنترل‌شده، نه پروداکشن واقعی).",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "این دستور فقط برای محیط توسعه/دمو است. در DEBUG=False باید صراحتاً --force بدهید."
            )

        self.stdout.write(self.style.MIGRATE_HEADING("شروع seed دادهٔ نمایشی..."))

        admin_user = self._create_admin_user()
        author_user, client_user = self._create_demo_users()
        categories = self._create_categories()
        tags = self._create_tags()
        self._create_team_and_testimonials()
        services = self._create_services(categories, tags)
        self._create_projects(categories, tags, services)
        self._create_academy(categories, tags, client_user)
        self._create_blog(categories, tags, author_user, client_user)
        self._create_newsletter_subscriber()
        self._update_site_settings()

        self.stdout.write(self.style.SUCCESS("seed دادهٔ نمایشی با موفقیت کامل شد."))
        self.stdout.write(
            self.style.WARNING(
                f"کاربر ادمین دمو: {admin_user.email} / رمز عبور پیش‌فرض dev (در .env قابل‌تغییر با "
                "DEMO_ADMIN_PASSWORD)."
            )
        )

    # -- کاربران -----------------------------------------------------------------

    def _create_admin_user(self) -> User:
        password = getattr(settings, "DEMO_ADMIN_PASSWORD", None) or "DemoAdmin!2024"
        admin_user, created = User.objects.get_or_create(
            email="admin@emmett.dev",
            defaults={
                "first_name": "Admin",
                "last_name": "Emmett",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password(password)
            admin_user.save(update_fields=["password"])
        return admin_user

    def _create_demo_users(self) -> tuple[User, User]:
        author_user, created = User.objects.get_or_create(
            email="author@emmett.dev",
            defaults={"first_name": "سارا", "last_name": "نویسنده", "role": User.Role.EDITOR},
        )
        if created:
            author_user.set_password("DemoAuthor!2024")
            author_user.save(update_fields=["password"])

        client_user, created = User.objects.get_or_create(
            email="client@emmett.dev",
            defaults={"first_name": "علی", "last_name": "مشتری", "role": User.Role.CLIENT},
        )
        if created:
            client_user.set_password("DemoClient!2024")
            client_user.save(update_fields=["password"])

        return author_user, client_user

    # -- طبقه‌بندی -----------------------------------------------------------------

    def _create_categories(self) -> dict[str, Category]:
        data = [
            ("web-design", "طراحی وب", "Web Design", Category.Scope.SERVICE),
            ("mobile-apps", "اپلیکیشن موبایل", "Mobile Apps", Category.Scope.SERVICE),
            ("security", "امنیت", "Security", Category.Scope.SERVICE),
            ("fintech", "فین‌تک", "Fintech", Category.Scope.PORTFOLIO),
            ("ecommerce", "فروشگاهی", "E-commerce", Category.Scope.PORTFOLIO),
            ("programming", "برنامه‌نویسی", "Programming", Category.Scope.ACADEMY),
            ("security-course", "امنیت سایبری", "Cybersecurity", Category.Scope.ACADEMY),
            ("tech-news", "اخبار فناوری", "Tech News", Category.Scope.BLOG),
            ("tutorials", "آموزش‌ها", "Tutorials", Category.Scope.BLOG),
        ]
        categories: dict[str, Category] = {}
        for slug, name_fa, name_en, scope in data:
            category, _created = Category.objects.get_or_create(
                slug=slug,
                defaults={"name_fa": name_fa, "name_en": name_en, "scope": scope},
            )
            categories[slug] = category
        return categories

    def _create_tags(self) -> dict[str, Tag]:
        data = [
            ("react", "ری‌اکت", "React"),
            ("django", "جنگو", "Django"),
            ("nextjs", "Next.js", "Next.js"),
            ("python", "پایتون", "Python"),
            ("devops", "DevOps", "DevOps"),
            ("ai", "هوش مصنوعی", "AI"),
        ]
        tags: dict[str, Tag] = {}
        for slug, name_fa, name_en in data:
            tag, _created = Tag.objects.get_or_create(
                slug=slug, defaults={"name_fa": name_fa, "name_en": name_en}
            )
            tags[slug] = tag
        return tags

    # -- شرکت -----------------------------------------------------------------

    def _create_team_and_testimonials(self) -> None:
        # نکته: ``full_name`` در TeamMember و ``author_name``/``author_company`` در
        # Testimonial عمداً در ``translation.py`` ثبت نشده‌اند (نام افراد/شرکت‌ها
        # بین زبان‌ها یکسان می‌ماند)؛ فقط ``role_title``/``bio`` و
        # ``author_role``/``quote`` ترجمه‌پذیرند.
        members = [
            ("حسین امیری", "مدیرعامل و بنیان‌گذار", "CEO & Founder"),
            ("نگار صادقی", "مدیر فنی", "CTO"),
            ("رضا کریمی", "توسعه‌دهندهٔ ارشد بک‌اند", "Senior Backend Developer"),
            ("مهسا رستمی", "طراح محصول", "Product Designer"),
        ]
        for index, (full_name, role_fa, role_en) in enumerate(members):
            TeamMember.objects.get_or_create(
                full_name=full_name,
                defaults={
                    "role_title_fa": role_fa,
                    "role_title_en": role_en,
                    "order": index,
                },
            )

        testimonials = [
            ("شرکت آلفا", "همکاری فوق‌العاده‌ای بود؛ تیم امیت دقیق و حرفه‌ای عمل کرد."),
            ("فروشگاه بتا", "محصول نهایی فراتر از انتظارمان بود."),
            ("استارتاپ گاما", "پشتیبانی بی‌نظیر بعد از تحویل پروژه."),
        ]
        for index, (company, quote_fa) in enumerate(testimonials):
            Testimonial.objects.get_or_create(
                author_company=company,
                defaults={
                    "author_name": "مشتری راضی",
                    "quote_fa": quote_fa,
                    "quote_en": "An excellent collaboration from start to finish.",
                    "is_featured": index == 0,
                    "order": index,
                },
            )

    # -- خدمات -----------------------------------------------------------------

    def _create_services(
        self, categories: dict[str, Category], tags: dict[str, Tag]
    ) -> dict[str, Service]:
        data = [
            (
                "web-development",
                "توسعهٔ وب‌سایت",
                "Web Development",
                "ساخت وب‌سایت‌های سریع، امن و مقیاس‌پذیر با Next.js و Django.",
                "Fast, secure, and scalable websites built with Next.js and Django.",
                ["web-design"],
                ["react", "nextjs", "django"],
            ),
            (
                "mobile-development",
                "توسعهٔ اپلیکیشن موبایل",
                "Mobile App Development",
                "طراحی و توسعهٔ اپلیکیشن‌های iOS و Android با کیفیت بالا.",
                "High-quality iOS and Android application design and development.",
                ["mobile-apps"],
                ["react"],
            ),
            (
                "penetration-testing",
                "تست نفوذ و امنیت",
                "Penetration Testing",
                "ارزیابی امنیتی زیرساخت و اپلیکیشن‌های شما با متدولوژی استاندارد.",
                "Security assessment of your infrastructure and applications with standard methodology.",
                ["security"],
                ["devops"],
            ),
            (
                "ai-consulting",
                "مشاورهٔ هوش مصنوعی",
                "AI Consulting",
                "طراحی و پیاده‌سازی راهکارهای هوش مصنوعی متناسب با کسب‌وکار شما.",
                "Designing and implementing AI solutions tailored to your business.",
                [],
                ["ai", "python"],
            ),
        ]
        services: dict[str, Service] = {}
        for index, (slug, title_fa, title_en, desc_fa, desc_en, cat_slugs, tag_slugs) in enumerate(data):
            service, created = Service.objects.get_or_create(
                slug=slug,
                defaults={
                    "title_fa": title_fa,
                    "title_en": title_en,
                    "summary_fa": desc_fa,
                    "summary_en": desc_en,
                    "description_fa": f"## معرفی\n\n{desc_fa}",
                    "description_en": f"## Overview\n\n{desc_en}",
                    "status": PublishableModel.Status.PUBLISHED,
                    "published_at": _NOW() - timedelta(days=30 - index),
                    "is_featured": index < 2,
                    "order": index,
                },
            )
            if created:
                service.categories.set([categories[s] for s in cat_slugs])
                service.tags.set([tags[s] for s in tag_slugs])
            services[slug] = service
        return services

    # -- نمونه‌کار -----------------------------------------------------------------

    def _create_projects(
        self,
        categories: dict[str, Category],
        tags: dict[str, Tag],
        services: dict[str, Service],
    ) -> None:
        data = [
            (
                "pentestor",
                "Pentestor",
                "Pentestor",
                "پلتفرم داخلی مدیریت تست نفوذ و گزارش‌دهی امنیتی.",
                "Internal platform for penetration test management and security reporting.",
                True,
                True,
                ["security"],
                ["python", "django"],
                None,
                2024,
            ),
            (
                "fintech-dashboard",
                "داشبورد فین‌تک آلفا",
                "Alpha Fintech Dashboard",
                "داشبورد تحلیلی بلادرنگ برای شرکت فین‌تک آلفا.",
                "Real-time analytics dashboard for Alpha Fintech.",
                False,
                True,
                ["fintech"],
                ["react", "nextjs"],
                "web-development",
                2023,
            ),
            (
                "beta-ecommerce",
                "فروشگاه آنلاین بتا",
                "Beta Online Store",
                "فروشگاه آنلاین کامل با درگاه پرداخت و مدیریت موجودی.",
                "Full online store with payment gateway and inventory management.",
                False,
                False,
                ["ecommerce"],
                ["nextjs", "django"],
                "web-development",
                2022,
            ),
        ]
        for index, (
            slug,
            title_fa,
            title_en,
            summary_fa,
            summary_en,
            is_product,
            is_featured,
            cat_slugs,
            tag_slugs,
            service_slug,
            year,
        ) in enumerate(data):
            project, created = Project.objects.get_or_create(
                slug=slug,
                defaults={
                    "title_fa": title_fa,
                    "title_en": title_en,
                    "summary_fa": summary_fa,
                    "summary_en": summary_en,
                    "service": services.get(service_slug) if service_slug else None,
                    "is_product": is_product,
                    "is_featured": is_featured,
                    "year": year,
                    "order": index,
                    "status": PublishableModel.Status.PUBLISHED,
                    "published_at": _NOW() - timedelta(days=60 - index * 10),
                },
            )
            if created:
                project.categories.set([categories[s] for s in cat_slugs])
                project.tags.set([tags[s] for s in tag_slugs])
                CaseStudy.objects.get_or_create(
                    project=project,
                    defaults={
                        "challenge_fa": "## چالش\n\nتیم مشتری نیاز به راهکاری مقیاس‌پذیر داشت.",
                        "challenge_en": "## Challenge\n\nThe client needed a scalable solution.",
                        "approach_fa": "با معماری میکروسرویس و زیرساخت ابری پیش رفتیم.",
                        "approach_en": "We proceeded with a microservice architecture and cloud infra.",
                        "result_fa": "افزایش ۴۰ درصدی عملکرد و کاهش ۶۰ درصدی زمان پاسخ‌دهی.",
                        "result_en": "40% performance increase and 60% reduction in response time.",
                        "technology_stack": tag_slugs,
                        "metrics": {"performance_gain": "40%", "response_time_reduction": "60%"},
                    },
                )

    # -- آکادمی -----------------------------------------------------------------

    def _create_academy(
        self, categories: dict[str, Category], tags: dict[str, Tag], client_user: User
    ) -> None:
        # نکته: ``name`` در Instructor ترجمه‌پذیر نیست (فقط ``title``/``bio``).
        instructor_fa, _ = Instructor.objects.get_or_create(
            name="دکتر محمد قاسمی",
            defaults={"title_fa": "مدرس امنیت", "title_en": "Security Instructor"},
        )
        instructor_en, _ = Instructor.objects.get_or_create(
            name="پریسا یوسفی",
            defaults={"title_fa": "مدرس برنامه‌نویسی", "title_en": "Programming Instructor"},
        )

        courses_data = [
            (
                "python-for-beginners",
                "پایتون برای مبتدیان",
                "Python for Beginners",
                "آموزش پایتون از صفر تا ساخت اولین پروژهٔ واقعی.",
                "Learn Python from zero to building your first real project.",
                Course.Level.BEGINNER,
                instructor_en,
                ["programming"],
                ["python"],
            ),
            (
                "django-rest-api",
                "ساخت API با جنگو",
                "Building APIs with Django",
                "طراحی و پیاده‌سازی REST API حرفه‌ای با Django REST Framework.",
                "Designing and implementing professional REST APIs with Django REST Framework.",
                Course.Level.INTERMEDIATE,
                instructor_en,
                ["programming"],
                ["django", "python"],
            ),
            (
                "web-security-fundamentals",
                "مبانی امنیت وب",
                "Web Security Fundamentals",
                "آشنایی با آسیب‌پذیری‌های رایج وب و روش‌های مقابله با آن‌ها.",
                "Understanding common web vulnerabilities and mitigation techniques.",
                Course.Level.ADVANCED,
                instructor_fa,
                ["security-course"],
                ["devops"],
            ),
        ]
        for c_index, (
            slug,
            title_fa,
            title_en,
            summary_fa,
            summary_en,
            level,
            instructor,
            cat_slugs,
            tag_slugs,
        ) in enumerate(courses_data):
            course, created = Course.objects.get_or_create(
                slug=slug,
                defaults={
                    "title_fa": title_fa,
                    "title_en": title_en,
                    "summary_fa": summary_fa,
                    "summary_en": summary_en,
                    "description_fa": f"## دربارهٔ این دوره\n\n{summary_fa}",
                    "description_en": f"## About this course\n\n{summary_en}",
                    "level": level,
                    "instructor": instructor,
                    "duration_hours": 8 + c_index * 2,
                    "status": PublishableModel.Status.PUBLISHED,
                    "published_at": _NOW() - timedelta(days=20 - c_index * 5),
                    "is_featured": c_index == 0,
                    "order": c_index,
                },
            )
            if created:
                course.categories.set([categories[s] for s in cat_slugs])
                course.tags.set([tags[s] for s in tag_slugs])
                for lesson_index in range(3):
                    Lesson.objects.get_or_create(
                        course=course,
                        order=lesson_index,
                        defaults={
                            "title_fa": f"درس {lesson_index + 1}: مقدمه و مفاهیم پایه",
                            "title_en": f"Lesson {lesson_index + 1}: Introduction & Basics",
                            "content_fa": "محتوای آموزشی این درس به‌زودی تکمیل می‌شود.",
                            "content_en": "Lesson content will be completed soon.",
                            "duration_minutes": 15,
                            "is_preview": lesson_index == 0,
                        },
                    )

        first_course = Course.objects.filter(slug="python-for-beginners").first()
        if first_course is not None:
            Enrollment.objects.get_or_create(user=client_user, course=first_course)

    # -- بلاگ -----------------------------------------------------------------

    def _create_blog(
        self,
        categories: dict[str, Category],
        tags: dict[str, Tag],
        author_user: User,
        client_user: User,
    ) -> None:
        posts_data = [
            (
                "future-of-web-development-2026",
                "آیندهٔ توسعهٔ وب در ۲۰۲۶",
                "The Future of Web Development in 2026",
                "نگاهی به مهم‌ترین روندهای توسعهٔ وب در سال پیش رو.",
                "A look at the most important web development trends for the year ahead.",
                ["tech-news"],
                ["nextjs", "react"],
            ),
            (
                "django-best-practices",
                "بهترین شیوه‌های توسعه با جنگو",
                "Django Best Practices",
                "نکاتی کلیدی برای نوشتن کد جنگوی تمیز و قابل‌نگهداری.",
                "Key tips for writing clean, maintainable Django code.",
                ["tutorials"],
                ["django", "python"],
            ),
            (
                "intro-to-web-security",
                "مقدمه‌ای بر امنیت وب",
                "Introduction to Web Security",
                "آشنایی با مفاهیم پایه‌ای امنیت برای توسعه‌دهندگان وب.",
                "Basic security concepts every web developer should know.",
                ["tutorials", "tech-news"],
                ["devops"],
            ),
        ]
        for index, (slug, title_fa, title_en, excerpt_fa, excerpt_en, cat_slugs, tag_slugs) in enumerate(
            posts_data
        ):
            body_fa = "متن کامل مقاله در این بخش قرار می‌گیرد. "
            body_en = "The full article content goes here. "
            content_fa = f"## مقدمه\n\n{excerpt_fa}\n\n## جزئیات\n\n{body_fa * 3}"
            content_en = f"## Introduction\n\n{excerpt_en}\n\n## Details\n\n{body_en * 3}"
            post, created = BlogPost.objects.get_or_create(
                slug=slug,
                defaults={
                    "title_fa": title_fa,
                    "title_en": title_en,
                    "excerpt_fa": excerpt_fa,
                    "excerpt_en": excerpt_en,
                    "content_fa": content_fa,
                    "content_en": content_en,
                    "author": author_user,
                    "status": PublishableModel.Status.PUBLISHED,
                    "published_at": _NOW() - timedelta(days=15 - index * 5),
                },
            )
            if created:
                post.categories.set([categories[s] for s in cat_slugs])
                post.tags.set([tags[s] for s in tag_slugs])
                if index == 0:
                    Comment.objects.get_or_create(
                        post=post,
                        author=client_user,
                        body="مقالهٔ بسیار مفیدی بود، ممنون از اشتراک‌گذاری.",
                        defaults={"status": Comment.Status.APPROVED},
                    )
                    Comment.objects.get_or_create(
                        post=post,
                        author=client_user,
                        body="آیا ادامهٔ این موضوع را هم پوشش می‌دهید؟",
                        defaults={"status": Comment.Status.PENDING},
                    )

    # -- سایر -----------------------------------------------------------------

    def _create_newsletter_subscriber(self) -> None:
        Newsletter.objects.get_or_create(
            email="subscriber@emmett.dev",
            defaults={"is_confirmed": True, "subscribed_at": _NOW()},
        )

    def _update_site_settings(self) -> None:
        site_settings = SiteSettings.load()
        site_settings.site_name = "Emmett"
        site_settings.contact_email = "info@emmett.dev"
        site_settings.contact_phone = "+98-21-00000000"
        site_settings.social_links = {
            "instagram": "https://instagram.com/emmett",
            "linkedin": "https://linkedin.com/company/emmett",
            "twitter": "https://twitter.com/emmett",
        }
        site_settings.save()
