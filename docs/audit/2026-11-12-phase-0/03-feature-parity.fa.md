# فاز ۰ — ماتریس Feature Parity

وضعیت‌ها: `COMPLETE`, `BACKEND_ONLY`, `FRONTEND_ONLY`, `PARTIAL`, `INACCESSIBLE`, `DEFECTIVE`, `BLOCKED`, `INTERNAL`.

زنجیرهٔ بررسی: Model → Migration → Admin → Serializer → View/URL → Frontend → Result.

| فیچر | زنجیرهٔ بک‌اند | مصرف فرانت‌اند | وضعیت | شاهد/توضیح |
|---|---|---|---|---|
| ثبت‌نام/ورود/خروج | User → auth serializers/views → `/auth/*` | profile-view, client.ts, E2E | COMPLETE | E2E ثبت‌نام تا خروج PASSED |
| مشاهدهٔ پروفایل | User/Profile → MeSerializer → `/auth/me/` | profile-view | COMPLETE | صفحهٔ profile noindex |
| ویرایش پروفایل | MeUpdateSerializer → PATCH `/auth/me/` | `updateMe` export شده ولی مصرف‌کننده ندارد | BACKEND_ONLY | نام/تلفن/bio/locale/job/company قابل PATCH است |
| علاقه‌مندی‌ها | Favorite → serializers/views → `/auth/favorites*` | توابع client وجود دارد ولی UI مصرف نمی‌کند | BACKEND_ONLY | add/list/remove در UI دیده نشد |
| بازیابی/تغییر رمز کاربر | endpoint اختصاصی یافت نشد | UI یافت نشد | INACCESSIBLE | فقط password validation هنگام ثبت‌نام |
| خدمات | Service → admin/serializer/viewset → `/services/` | pages + server.ts | COMPLETE | E2E فهرست/جزئیات PASSED |
| پروژه‌ها/محصولات | Project/CaseStudy → `/projects/` | projects/products pages | COMPLETE | فیلتر is_product و case study |
| صفحهٔ CRM | Project slug=crm در seed نیست | ComingSoon | FRONTEND_ONLY | `/projects/crm` عمداً 404؛ پوستهٔ ComingSoon |
| صفحهٔ Pentestor | Project منتشرشده | redirect به `/projects/pentestor` | COMPLETE | E2E canonical/waگذار PASSED |
| دسته‌بندی/برچسب | Category/Tag → `/taxonomy/*` | مصرف مستقیم UI یافت نشد؛ در جزئیات محتوا nested می‌آید | BACKEND_ONLY | فیلترهای API فعال، صفحهٔ مستقل ندارد |
| تیم | TeamMember → `/company/team/` | about/home sections | COMPLETE | lookup=public_id |
| توصیه‌نامه‌ها | Testimonial → `/company/testimonials/` | home/about | COMPLETE | featured filter |
| دوره‌ها | Course/Lesson/Instructor → `/academy/` | academy pages | COMPLETE | سرفصل و جزئیات |
| ثبت‌نام دوره | Enrollment → `/academy/enrollments/` | enroll-button, profile | COMPLETE | E2E کاربر جدید PASSED |
| پیشرفت دوره | Enrollment.progress_percent | UI پیشرفت/تکمیل درس ندارد | PARTIAL | مدل/ادمین دارد، عملیات کاربر ندارد |
| مقالات | BlogPost → `/blog/` | blog pages, RSS | COMPLETE | TOC/related/ai_summary |
| نظرات مقاله | Comment → `/blog/{slug}/comments/` | comment-form | COMPLETE | pending تا moderation ادمین |
| RSS بلاگ/آکادمی | feed views | routeهای RSS | COMPLETE | E2E RSS 2.0 PASSED |
| تماس | Contact/Lead → `/leads/contact/` | contact-form | COMPLETE | E2E موفق/الزامی PASSED |
| خبرنامه | Newsletter → `/leads/newsletter/` | newsletter-form | PARTIAL | subscribe هست؛ confirm/unsubscribe endpoint نیست |
| جست‌وجوی سراسری | SearchIndexEntry/FTS → `/search/` | search page + ⌘K | COMPLETE | SQLite FTS5 محلی؛ MySQL NOT EXECUTED |
| SEO settings/sitemap/redirect/FAQ | core SEO models/views | metadata, sitemap, robots, proxy | COMPLETE | E2E sitemap/robots/JSON-LD PASSED |
| ترجمه‌های سایت | Translation → `/site-content/translations/` | i18n/request + database-messages | COMPLETE | فقط namespace `site.copy` |
| Media | Media → storage/validators | `/media/*` proxy, next/image | COMPLETE | SVG sanitize هنوز backlog |
| Advisor | Catalog/Prompt/Guardrail → AIRequest/Suggestion/Concept → `/ai/advisor/` | advisor-form | BLOCKED | UI/API کامل؛ provider خارجی در محیط محلی configured نیست |
| نتیجهٔ اشتراکی Advisor | share_token_hash → `/ai/results/{token}/` | results/[token] | COMPLETE | no-store/noindex، revoke در ادمین |
| تبدیل Advisor به Lead | Contact/Lead + concept → `/ai/leads/` | advisor lead form | COMPLETE | اطلاعات تماس وارد audit هوش مصنوعی نمی‌شود |
| تخمین پروژه | EstimationRule → deterministic estimator → `/ai/estimates/` | estimator-form | COMPLETE | حداقل روز کاری، بدون قیمت جعلی |
| کاتالوگ‌های AI | Catalog/CatalogOption → `/ai/catalogs/` | advisor/estimate | COMPLETE | انتخاب‌های بسته |
| خلاصهٔ مقاله | AIContentArtifact + command | blog ai_summary | PARTIAL | pipeline/admin هست؛ تولید provider وابسته و عملیاتی محلی تأیید نشد |
| داشبورد ادمین | core/dashboard + template tag | `/admin/` | DEFECTIVE | داده/کش سالم؛ سرریز افقی و redirect پس از login نقص دارد |
| مدیریت محتوا | PublishWorkflow/SoftDelete/ImportExport | ادمین بومی فعلی | COMPLETE | تست‌های surface/workflow/exchange PASSED |
| import/export | resources + EmmettImportExportAdmin | import/export pages | COMPLETE | CSV/TSV/JSON، schema_version=1 |
| 2FA ادمین | django-otp + twofa views/middleware | `/admin/2fa/*` | COMPLETE | تست‌ها PASSED؛ قالب‌ها هنوز Jazzmin/Bootstrap |
| backup/restore | backup_db + restore_backup | عملیاتی | INTERNAL | SQLite/فایل manifest؛ MySQL محلی NOT EXECUTED |
| SEO redirect fallback | Redirect + middleware | proxy.ts | COMPLETE | 301/302/410 |
| health/proxy diagnostic | core views | deploy/monitoring | INTERNAL | proxy diagnostic فقط IsAdminUser |
| design-system | UI tokens/components | `/design-system` | INTERNAL | صفحهٔ مرجع طراحی |

## جمع‌بندی شکاف‌ها

- `BACKEND_ONLY`: ویرایش پروفایل، علاقه‌مندی‌ها، taxonomy مستقل.
- `PARTIAL`: خبرنامه، پیشرفت دوره، خلاصهٔ مقاله.
- `FRONTEND_ONLY`: پوستهٔ CRM ComingSoon.
- `INACCESSIBLE`: بازیابی/تغییر رمز کاربر.
- `DEFECTIVE`: تجربهٔ ادمین فعلی از نظر سرریز/redirect پس از ورود.
- `BLOCKED`: Advisor با provider واقعی و MySQL/cPanel واقعی.

هیچ فیچر جعلی یا mock جایگزین production در محصول دیده نشد؛ موارد مسدود به credential/محیط وابسته‌اند.
