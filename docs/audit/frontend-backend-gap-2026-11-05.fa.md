# گزارش شکاف فرانت‌اند و بک‌اند — فاز ۱ (AUDIT & CONTRACT)

**تاریخ:** ۵ نوامبر ۲۰۲۶ · **شاخه:** `arena/5caca262-emmettwebsite` · **نقطهٔ مبنا:** `f8c0fa0`
**مخاطب:** مالک پروژه · **وضعیت:** تأییدشده توسط مالک در ۵ نوامبر ۲۰۲۶ — فاز ۲ مجاز است
**دامنهٔ بررسی:** ۱۱ اپ بک‌اند (`core`, `accounts`, `taxonomy`, `company`, `services`, `portfolio`, `academy`, `blog`, `leads`, `ai_engine`, `api`) و تمام ۳۰ روت موجود در `frontend/src/app`، لایهٔ `lib/api`، `lib/seo`, `i18n`, `components/**` و `messages/{fa,en}.json`.

این گزارش **فقط خواندن و مستندسازی** است؛ هیچ فایل کدی در این فاز تغییر نکرده است.

---

## ۰. چکیدهٔ اجرایی

| سنجه | مقدار |
|---|---|
| endpointهای عمومی/عملیاتی فهرست‌شده | **۶۴** (شامل ۴ مسیر ۲FA، ۳ مسیر اسکیما و ۶ api-root) |
| endpoint با نمایش کامل و صحیح | **۲۶** |
| endpoint با نمایش ناقص (فیلد/زیرقابلیت گم‌شده) | **۱۵** |
| endpoint پنهان (بدون هیچ مصرف‌کنندهٔ UI) | **۱۵** |
| endpoint زیرساختی (عمداً بدون UI) | **۸** |
| CatalogOptionهای تعریف‌شده / استفاده‌شده به‌عنوان ورودی | **۴۴ گزینه در ۱۱ کاتالوگ / ۹ کاتالوگ** |
| فیلتر filterset تعریف‌شده / دارای UI | **۱۹ / ۱** (`is_product`) |
| فیلد سریالایزر که در UI خوانده نمی‌شود | **۱۹** |
| تسک فاز ۴ تعریف‌شده برای بستن شکاف‌ها | **۲۴** (+ یک تسک رگرسیون بصری) |

سه یافتهٔ تعیین‌کننده که پیش از هر بازنویسی باید تصمیم مالک را بگیرند:

1. **صفحه‌بندی در هیچ صفحهٔ فهرستی وجود ندارد.** بک‌اند envelope کامل (`count`, `total_pages`, `next`, `previous`) برمی‌گرداند و `page_size` پیش‌فرض ۲۰ است؛ فرانت‌اند فقط `results` را می‌خواند. یعنی **از آیتم ۲۱ به بعد هیچ‌گاه دیده نمی‌شود** — یک باگ محتوایی خاموش که با مهاجرت فناوری برطرف نمی‌شود.
2. **FAQ فقط در JSON-LD است، نه روی صفحه.** سه مسیر (`/`, `/contact`, `/services/<slug>`) اسکیمای `FAQPage` می‌فرستند بدون آن‌که پرسش و پاسخ قابل‌مشاهده رندر شود؛ این همان الگویی است که Google برای rich result آن را «محتوای پنهان» می‌داند.
3. **سه قابلیت کامل بک‌اند هیچ مصرف‌کننده‌ای ندارند:** `PATCH /auth/me/`، `POST /auth/favorites/add/` + `DELETE /auth/favorites/<pk>/`، و `GET /api/v1/taxonomy/*`. طبق هدف ۳ مسترپرامپت، این‌ها باید نمایان شوند.

---

## الف) قرارداد endpoint → نمایش

ستون‌ها: `Permission` (کلاس مجوز DRF)، `Throttle` (سطل نرخ)، `Cache` (کش سمت بک‌اند)، `Filter` (پارامترهای مؤثر).
وضعیت: **کامل** = دادهٔ endpoint به‌طور کامل و درست در UI مصرف می‌شود · **ناقص** = بخشی از قرارداد در UI غایب است · **پنهان** = مصرف‌کنندهٔ UI ندارد · **زیرساختی** = عمداً UI ندارد.

### الف-۱. زیرساخت، جست‌وجو، SEO و i18n (`apps/api`, `apps/core`)

| # | Endpoint | Method | Serializer | Model | Permission | Throttle | Cache | Filter | وضعیت | تسک |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `/api/v1/health/` | GET | inline | — (DB+cache probe) | AllowAny | بدون throttle | — | — | زیرساختی | T4-R |
| 2 | `/api/v1/health/proxy/` | GET | inline | — | IsAdminUser | پیش‌فرض anon/user | — | — | زیرساختی | T4-R |
| 3 | `/api/v1/search/` | GET | inline | `core.SearchIndexEntry` (FTS) | AllowAny | anon 100/h | — | `q`, `locale`, `limit` (سقف ۵۰) | **کامل** (صفحه + پالت ⌘K) | T4-R |
| 4 | `/api/v1/seo/settings/` | GET | `SEOSettingsSerializer` | `core.SiteSettings` | AllowAny | — (authentication_classes=[]) | ۹۰۰s (`seo:settings:v1`) | — | **ناقص** — `search_console_help`, `sitemap_sections`, `generated_at`, `two_factor_required` هیچ‌جا خوانده نمی‌شود | T4-10 |
| 5 | `/api/v1/seo/sitemap/` | GET | `SitemapEntrySerializer` | Service/Project/Course/BlogPost | AllowAny | — | ۹۰۰s (`seo:sitemap:entries:v1`) | — | **کامل** (تولید XML در فرانت) | T4-10 |
| 6 | `/api/v1/seo/redirects/` | GET | `RedirectEntrySerializer` | `core.Redirect` | AllowAny | — | بدون کش در view؛ نقشه ۳۰۰s در `RedirectFallbackMiddleware` | — | **کامل** (proxy + کش ۶۰s فرانت) | T4-12 |
| 7 | `/api/v1/seo/faq/` | GET | `FAQItemSerializer` | `core.FAQItem` | AllowAny | — | — | `path` (الزامی) | **ناقص** — فقط JSON-LD؛ بلوک قابل‌مشاهده وجود ندارد | T4-02 |
| 8 | `/api/v1/schema/` | GET | OpenAPI | — | AllowAny | پیش‌فرض | — | — | زیرساختی | T4-20 |
| 9 | `/api/v1/schema/swagger-ui/` | GET | — | — | AllowAny | پیش‌فرض | — | — | زیرساختی | T4-20 |
| 10 | `/api/v1/schema/redoc/` | GET | — | — | AllowAny | پیش‌فرض | — | — | زیرساختی | T4-20 |
| 11 | `/i18n/setlang/` | POST | فرم جنگو | — | AllowAny | — | — | `language` | **پنهان** — سوییچ زبان فرانت از routing خودش استفاده می‌کند | T4-17 |
| 12 | `/api/v1/site-content/translations/` | GET | inline | `core.Translation` (`namespace=site.copy`, `is_html=False`) | AllowAny | — | ۶۰s (کش Next) | `locale` (الزامی، enum) | **کامل** (`mergeDatabaseMessages`) | T4-21 |
| 13 | `/media/*` | GET | — | `core.Media` روی دیسک | AllowAny | — | `immutable` در route فرانت | — | **کامل** (با route اختصاصی Next) | T4-19 |
| 14 | `/static/*` | GET | — | WhiteNoise/manifest | AllowAny | — | manifest hashed | — | **کامل** | T4-19 |

### الف-۲. حساب کاربری و احراز هویت (`apps/accounts`)

| # | Endpoint | Method | Serializer | Model | Permission | Throttle | Cache | Filter | وضعیت | تسک |
|---|---|---|---|---|---|---|---|---|---|---|
| 15 | `/api/v1/auth/csrf/` | GET | — (`ensure_csrf_cookie`) | — | AllowAny | پیش‌فرض | — | — | **کامل** | T4-R |
| 16 | `/api/v1/auth/register/` | POST | `RegisterSerializer` | `accounts.User` | AllowAny | auth 10/h | — | — | **کامل** | T4-R |
| 17 | `/api/v1/auth/login/` | POST | `LoginSerializer` | `accounts.User` + `core.LoginLockout` | AllowAny | auth 10/h | — | — | **ناقص** — `429` و `retry_after` از بدنه به UI منتقل نمی‌شود؛ کاربر فقط پیام عمومی می‌بیند | T4-06 |
| 18 | `/api/v1/auth/logout/` | POST | — | — | IsAuthenticated | کاربر ۱۰۰۰/h | — | — | **کامل** | T4-R |
| 19 | `/api/v1/auth/me/` | GET | `MeSerializer` | `accounts.User` + `Profile` | IsAuthenticated | کاربر | — | — | **کامل** (نمایش) | T4-R |
| 20 | `/api/v1/auth/me/` | PATCH | `MeUpdateSerializer` | `User` + `Profile` | IsAuthenticated | کاربر | — | `first_name`, `last_name`, `phone`, `bio`, `locale_preference`, `job_title`, `company_name` | **پنهان** — `updateMe` در `client.ts` تعریف شده ولی هیچ فرمی صدایش نمی‌زند | T4-23 |
| 21 | `/api/v1/auth/favorites/` | GET | `FavoriteSerializer` | `accounts.Favorite` | IsAuthenticated | کاربر | — | — | **ناقص** — فقط `target_title`؛ بدون لینک، بدون نوع، بدون حذف | T4-05 |
| 22 | `/api/v1/auth/favorites/add/` | POST | `FavoriteCreateSerializer` | `Favorite` (GFK) | IsAuthenticated | کاربر | — | — | **پنهان** — هیچ دکمهٔ «ذخیره» در هیچ صفحه‌ای نیست | T4-05 |
| 23 | `/api/v1/auth/favorites/<pk>/` | DELETE | — | `Favorite` | IsAuthenticated | کاربر | — | — | **پنهان** | T4-05 |
| 24 | `/admin/2fa/` | GET | JSON وضعیت | `otp_totp`/`otp_static` | staff | — | — | — | زیرساختی (پنل ادمین) | T4-18 |
| 25 | `/admin/2fa/setup/` | GET/POST | JSON | همان | staff | — | — | — | زیرساختی | T4-18 |
| 26 | `/admin/2fa/verify/` | GET/POST | JSON | همان | staff | — | — | — | زیرساختی | T4-18 |
| 27 | `/admin/2fa/recovery/` | POST | JSON | همان | staff | — | — | — | زیرساختی | T4-18 |

### الف-۳. تاکسونومی (`apps/taxonomy`)

| # | Endpoint | Method | Serializer | Model | Permission | Throttle | Cache | Filter | وضعیت | تسک |
|---|---|---|---|---|---|---|---|---|---|---|
| 28 | `/api/v1/taxonomy/` | GET | — (api-root) | — | AllowAny | anon | — | — | زیرساختی | T4-R |
| 29 | `/api/v1/taxonomy/categories/` | GET | `CategorySerializer` | `taxonomy.Category` | AllowAny | anon | — | `scope`, `search` | **پنهان** — هیچ صفحهٔ دسته/فیلتر دسته وجود ندارد | T4-03 |
| 30 | `/api/v1/taxonomy/categories/<pk>/` | GET | `CategorySerializer` | همان | AllowAny | anon | — | — | **پنهان** | T4-03 |
| 31 | `/api/v1/taxonomy/tags/` | GET | `TagSerializer` | `taxonomy.Tag` | AllowAny | anon | — | `search` | **پنهان** | T4-03 |
| 32 | `/api/v1/taxonomy/tags/<pk>/` | GET | `TagSerializer` | همان | AllowAny | anon | — | — | **پنهان** | T4-03 |

> نکته: دادهٔ تاکسونومی از طریق serializerهای تودرتو (`categories`, `tags`) در کارت‌ها **نمایش داده می‌شود**؛ آنچه غایب است endpointهای مستقل و ناوبری فیلتر/دسته است.

### الف-۴. شرکت (`apps/company`)

| # | Endpoint | Method | Serializer | Model | Permission | Throttle | Cache | Filter | وضعیت | تسک |
|---|---|---|---|---|---|---|---|---|---|---|
| 33 | `/api/v1/company/` | GET | — (api-root) | — | AllowAny | anon | — | — | زیرساختی | T4-R |
| 34 | `/api/v1/company/team/` | GET | `TeamMemberSerializer` | `company.TeamMember` | AllowAny | anon | — | `ordering` | **ناقص** — `bio` و `social_links` هرگز رندر نمی‌شوند (فقط نام/نقش/آواتار) | T4-04 |
| 35 | `/api/v1/company/team/<public_id>/` | GET | `TeamMemberSerializer` | همان | AllowAny | anon | — | — | **پنهان** | T4-04 |
| 36 | `/api/v1/company/testimonials/` | GET | `TestimonialSerializer` | `company.Testimonial` | AllowAny | anon | — | `featured`, `ordering` | **ناقص** — پارامتر `featured` هیچ‌گاه فرستاده نمی‌شود؛ `related_project_slug` بی‌استفاده | T4-04 |
| 37 | `/api/v1/company/testimonials/<pk>/` | GET | `TestimonialSerializer` | همان | AllowAny | anon | — | — | **پنهان** | T4-04 |

### الف-۵. خدمات (`apps/services`)

| # | Endpoint | Method | Serializer | Model | Permission | Throttle | Cache | Filter | وضعیت | تسک |
|---|---|---|---|---|---|---|---|---|---|---|
| 38 | `/api/v1/services/` | GET | `ServiceListSerializer` | `services.Service` | AllowAny | anon | — | `categories__slug`, `tags__slug`, `is_featured`, `search`, `ordering` | **ناقص** — هیچ‌کدام از چهار فیلتر UI ندارد؛ سقف ۲۰ آیتم بدون صفحه‌بندی | T4-01 |
| 39 | `/api/v1/services/<slug>/` | GET | `ServiceDetailSerializer` | `Service` | AllowAny | anon | — | — | **ناقص** — `icon`, `published_at`, `canonical_path` خوانده نمی‌شوند | T4-04 |

### الف-۶. نمونه‌کار/محصول (`apps/portfolio`)

| # | Endpoint | Method | Serializer | Model | Permission | Throttle | Cache | Filter | وضعیت | تسک |
|---|---|---|---|---|---|---|---|---|---|---|
| 40 | `/api/v1/projects/` | GET | `ProjectListSerializer` | `portfolio.Project` (+`CaseStudy`) | AllowAny | anon | — | `categories__slug`, `tags__slug`, `is_product`, `is_featured`, `year`, `ordering` | **ناقص** — فقط `is_product` استفاده می‌شود؛ فیلتر صنعت/تکنولوژی/سال و صفحه‌بندی غایب | T4-01 |
| 41 | `/api/v1/projects/<slug>/` | GET | `ProjectDetailSerializer` | `Project` + `CaseStudy` + `Media` | AllowAny | anon | — | — | **ناقص** — `service_slug` (لینک خدمت مرتبط) نمایش داده نمی‌شود؛ `canonical_path` نادیده گرفته می‌شود | T4-04 |

### الف-۷. آکادمی (`apps/academy`)

| # | Endpoint | Method | Serializer | Model | Permission | Throttle | Cache | Filter | وضعیت | تسک |
|---|---|---|---|---|---|---|---|---|---|---|
| 42 | `/api/v1/academy/` | GET | `CourseListSerializer` | `academy.Course` (+`lesson_count`) | AllowAny | anon | — | `level`, `categories__slug`, `tags__slug`, `is_featured`, `ordering` | **ناقص** — فیلتر سطح و صفحه‌بندی غایب | T4-01 |
| 43 | `/api/v1/academy/<slug>/` | GET | `CourseDetailSerializer` | `Course` + `Lesson` + `Instructor` | AllowAny | anon | — | — | **ناقص** — `lessons[].content_html` و `video_url` هرگز رندر نمی‌شود (درس قابل خواندن نیست) | T4-07 |
| 44 | `/api/v1/academy/rss/` | GET | Feed | `Course` | AllowAny | anon | — | `?language=` | **کامل** (پراکسی `/academy/rss`) | T4-22 |
| 45 | `/api/v1/academy/enrollments/` | GET | `EnrollmentSerializer` | `academy.Enrollment` | IsAuthenticated | کاربر | — | — | **ناقص** — `status` و `completed_at` نمایش داده نمی‌شود | T4-05 |
| 46 | `/api/v1/academy/enrollments/add/` | POST | `EnrollmentCreateSerializer` | `Enrollment` | IsAuthenticated | کاربر | — | — | **کامل** | T4-R |

### الف-۸. بلاگ (`apps/blog`)

| # | Endpoint | Method | Serializer | Model | Permission | Throttle | Cache | Filter | وضعیت | تسک |
|---|---|---|---|---|---|---|---|---|---|---|
| 47 | `/api/v1/blog/` | GET | `BlogPostListSerializer` | `blog.BlogPost` | AllowAny | anon | — | `categories__slug`, `tags__slug`, `search`, `ordering` | **ناقص** — فیلتر دسته/برچسب و صفحه‌بندی غایب | T4-01 |
| 48 | `/api/v1/blog/<slug>/` | GET | `BlogPostDetailSerializer` | `BlogPost` + `Comment` + `AIContentArtifact` | AllowAny | anon | — | — | **ناقص** — `view_count`, `canonical_path`, `comments[].parent` (پاسخ‌ها) خوانده نمی‌شود | T4-04 |
| 49 | `/api/v1/blog/<slug>/comments/` | POST | `CommentCreateSerializer` | `blog.Comment` | IsAuthenticated | کاربر | — | `parent`, `body` | **ناقص** — UI فقط نظر سطح اول می‌فرستد؛ حالت پاسخ (thread) پشتیبانی نمی‌شود | T4-07 |
| 50 | `/api/v1/blog/rss/` | GET | Feed | `BlogPost` | AllowAny | anon | — | `?language=` | **کامل** | T4-22 |

### الف-۹. سرنخ‌ها (`apps/leads`)

| # | Endpoint | Method | Serializer | Model | Permission | Throttle | Cache | Filter | وضعیت | تسک |
|---|---|---|---|---|---|---|---|---|---|---|
| 51 | `/api/v1/leads/contact/` | POST | `ContactCreateSerializer` | `leads.Contact` + `leads.Lead` | AllowAny + `csrf_protect` | contact_form 5/h | `no-store` | — | **ناقص** — `429` با پیام اختصاصی و شمارندهٔ تلاش به کاربر نشان داده نمی‌شود | T4-06 |
| 52 | `/api/v1/leads/newsletter/` | POST | `NewsletterCreateSerializer` | `leads.Newsletter` | AllowAny + `csrf_protect` | newsletter 3/day | `no-store` | — | **کامل** (idempotent) | T4-R |

### الف-۱۰. موتور هوش مصنوعی (`apps/ai_engine`)

| # | Endpoint | Method | Serializer | Model | Permission | Throttle | Cache | Filter | وضعیت | تسک |
|---|---|---|---|---|---|---|---|---|---|---|
| 53 | `/api/v1/ai/catalogs/` | GET | `CatalogSerializer` → `CatalogOptionSerializer` | `ai_engine.Catalog`/`CatalogOption` | AllowAny | anon | — | `keys` (سقف ۱۶، اعتبارسنجی alnum) | **ناقص** — از ۱۱ کاتالوگ فقط ۹ کاتالوگ درخواست می‌شود؛ `order` گزینه‌ها استفاده نمی‌شود | T4-08 |
| 54 | `/api/v1/ai/advisor/` | POST | `AdvisorRequestSerializer` | `AIRequest`, `AISuggestion`, `AIConcept` | AllowAny + `csrf_protect` | ai_engine 20/h | `no-store` + `X-Robots-Tag` | — | **کامل** | T4-R |
| 55 | `/api/v1/ai/results/<token>/` | GET | `AISuggestionPublicSerializer` | `AISuggestion` (share token hash) | AllowAny | anon | `no-store` + `X-Robots-Tag` | — | **کامل** | T4-R |
| 56 | `/api/v1/ai/estimates/` | POST | `EstimatorRequestSerializer` | `EstimatorRule`, `AIRequest` | AllowAny + `csrf_protect` | ai_engine 20/h | `no-store` | — | **ناقص** — `EstimatorRule.note_fa/note_en` در هیچ serializer نیست، پس قابل نمایش هم نیست | T4-08 |
| 57 | `/api/v1/ai/leads/` | POST | `AdvisorLeadRequestSerializer` | `Contact` + `Lead` (+`AISuggestion`/`AIConcept`) | AllowAny + `csrf_protect` | contact_form 5/h | `no-store` | — | **کامل** | T4-R |

### الف-۱۱. ترکیب API و api-rootها (`apps/api`)

| # | Endpoint | Method | Serializer | Model | Permission | Throttle | Cache | Filter | وضعیت | تسک |
|---|---|---|---|---|---|---|---|---|---|---|
| 58 | `/api/v1/services/` (api-root) | GET | — | — | AllowAny | anon | — | — | زیرساختی | T4-R |
| 59 | `/api/v1/projects/` (api-root) | GET | — | — | AllowAny | anon | — | — | زیرساختی | T4-R |
| 60 | `/api/v1/academy/` (api-root) | GET | — | — | AllowAny | anon | — | — | زیرساختی | T4-R |
| 61 | `/api/v1/blog/` (api-root) | GET | — | — | AllowAny | anon | — | — | زیرساختی | T4-R |
| 62 | `/api/v1/seo/` | GET | — | — | AllowAny | — | — | — | زیرساختی | T4-R |
| 63 | `/api/v1/ai/` | GET | — | — | AllowAny | — | — | — | زیرساختی | T4-R |
| 64 | `/admin/` + `/admin/login/` | GET/POST | قالب‌های ادمین | همه | staff + ۲FA | lockout 5/900s | — | — | زیرساختی (پنل ادمین) | T4-18 |

> **نمونهٔ قرارداد کامل (end-to-end):** `POST /api/v1/ai/advisor/` → `share_token` → ناوبری به `/advisor/results/<token>` → `GET /api/v1/ai/results/<token>/` → هر سه مفهوم با `title/description/benefit/solution_area/complexity/delivery_scope/minimum_working_days/related_item` → فرم «درخواست بررسی» → `POST /api/v1/ai/leads/`. این مسیر کامل است و **باید بدون تغییر بصری حفظ شود**.
>
> **نمونهٔ قرارداد نیمه‌کاره:** `POST /api/v1/leads/contact/` سه فیلد کاتالوگ (`project_type`, `budget_range`, `timeline`) را به‌صورت `key` می‌پذیرد؛ فرم این سه را از `/ai/catalogs/?keys=…` پر می‌کند، پس ورودی درست است — اما پاسخ `429` (throttle 5/h) در UI به «خطای عمومی» تبدیل می‌شود و کاربر نمی‌داند باید یک ساعت صبر کند.

### فیلدهای سریالایزر بدون مصرف در UI (۱۹ مورد)

`SEOSettings.search_console_help` · `SEOSettings.sitemap_sections` · `SEOSettings.generated_at` · `SEOSettings.two_factor_required` · `ServiceList.order` · `ServiceDetail.icon` · `ServiceDetail.published_at` · `ServiceDetail.canonical_path` · `ProjectDetail.service_slug` · `ProjectDetail.canonical_path` · `CourseList.lesson_count` (فقط در صفحهٔ اصلی) · `Lesson.content_html` · `Lesson.video_url` · `Enrollment.status` · `Enrollment.completed_at` · `BlogPostDetail.view_count` · `BlogPostDetail.canonical_path` · `Comment.parent` · `TeamMember.bio` / `TeamMember.social_links` · `Testimonial.related_project_slug`.

---

## ب) کاتالوگ‌های `ai_engine` و فیلترهای تاکسونومی استفاده‌نشده

### ب-۱. وضعیت کاتالوگ‌ها (منبع: `apps/ai_engine/catalog/defaults.py` + migration seed)

| کاتالوگ | گزینه‌ها | مصرف ورودی در UI | وضعیت |
|---|---|---|---|
| `project_type` | ۶ | فرم تماس + فرم سرنخ مشاور | استفاده‌شده |
| `budget_range` | ۵ | تماس، مشاور، تخمین‌گر | استفاده‌شده |
| `timeline` | ۴ | تماس + سرنخ مشاور | استفاده‌شده |
| `job_role` | ۹ | مشاور، تخمین‌گر | استفاده‌شده |
| `business_size` | ۵ | مشاور، تخمین‌گر | استفاده‌شده |
| `city_scale` | ۲ | مشاور، تخمین‌گر | استفاده‌شده |
| `team_size` | ۴ | مشاور، تخمین‌گر | استفاده‌شده |
| `goal` | ۹ | مشاور، تخمین‌گر (چندانتخابی، سقف ۵) | استفاده‌شده |
| `delivery_scope` | ۴ | فقط تخمین‌گر | استفادهٔ جزئی |
| `solution_area` | ۹ | هیچ‌گاه به‌عنوان **ورودی**؛ فقط برچسب خروجی مفهوم | **بدون مصرف ورودی** |
| `complexity` | ۳ | همان — فقط برچسب خروجی | **بدون مصرف ورودی** |

**جمع:** ۴۴ گزینه در ۱۱ کاتالوگ؛ ۹ کاتالوگ ورودی گرفته‌اند، ۲ کاتالوگ (`solution_area`, `complexity`) هیچ راهی برای انتخاب یا فیلتر ندارند. `CatalogOption.order` در UI بی‌اثر است (ترتیب نمایش از API می‌آید ولی هرگز صریح مرتب/نمایش داده نمی‌شود).

### ب-۲. مدل‌های `ai_engine` بدون سطح نمایش عمومی

| مدل | وضعیت | توضیح |
|---|---|---|
| `EstimationRule` | **نیمه‌پنهان** | فقط `minimum_working_days` از طریق `/ai/estimates/` بیرون می‌آید؛ `note_fa`/`note_en` در هیچ serializer نیست → محتوایی که ادمین می‌نویسد هرگز دیده نمی‌شود. |
| `GuardrailRule` | **عمداً پنهان** | فقط برای سانسور خروجی؛ نمایش عمومی ندارد و نباید داشته باشد. |
| `PromptTemplate` | **عمداً پنهان** | پیکربندی ادمین. |
| `AIRequest` | **عمداً پنهان** | حسابرسی؛ فقط ادمین. |
| `AISuggestion` | **کامل** | فقط از طریق توکن اشتراک. |
| `AIConcept` | **کامل** | در صفحهٔ نتیجه به‌طور کامل رندر می‌شود. |
| `AIContentArtifact` | **ناقص** | فقط `blog.BlogPost` را نشان می‌دهد (`ai_summary`)؛ برای `service`, `project`, `course` هیچ UIای وجود ندارد. |

### ب-۳. فیلترهای filterset و تاکسونومی بدون UI (۱۸ از ۱۹)

| فیلتر | محل | UI |
|---|---|---|
| `is_product` | `/projects/` | ✅ تنها فیلتر دارای UI (`/products`) |
| `categories__slug` | services, projects, academy, blog | ❌ |
| `tags__slug` | services, projects, academy, blog | ❌ |
| `is_featured` | services, academy | ❌ |
| `year` | projects | ❌ |
| `level` | academy | ❌ |
| `scope` | taxonomy/categories | ❌ |
| `search` | services, projects, academy, blog, taxonomy | ❌ (جست‌وجوی سراسری جای آن را گرفته) |
| `ordering` | همهٔ ویوست‌ها | ❌ (فقط در صفحهٔ اصلی hard-code شده) |
| `featured` | company/testimonials | ❌ |

همچنین دوسطحی‌بودن `Category.parent` و `Category.scope` هیچ بازتابی در URL یا ناوبری ندارد: صفحهٔ `/categories/<slug>` وجود ندارد، پس «برچسب»ها بن‌بست‌اند.

---

## ج) شکاف‌های سئو، مدیا و احراز هویت

### ج-۱. سئو

| # | شکاف | شاهد در کد | اثر | تسک |
|---|---|---|---|---|
| S1 | FAQ فقط اسکیمای `FAQPage` می‌سازد، بلوک قابل‌مشاهده ندارد | `(ui)/page.tsx:43`, `contact/page.tsx:50`, `services/[slug]/page.tsx:82` | مغایرت با سیاست rich result؛ محتوای تأییدشدهٔ ادمین دیده نمی‌شود | T4-02 |
| S2 | `canonical_path` ادمین نادیده گرفته می‌شود؛ canonical همیشه از روت محاسبه می‌شود | `lib/seo/metadata.ts:60` (`absoluteUrl(locale, input.path)`) | ادمین نمی‌تواند canonical را مدیریت کند (خلاف ADR-0031) | T4-04 |
| S3 | هدر `Link: rel=alternate` فقط در `proxy.ts` ساخته می‌شود؛ معادل Django ندارد | `proxy.ts` + `buildAlternateLinkHeader` | با حذف Next، hreflang در هدر از دست می‌رود | T4-10 |
| S4 | sitemap/robots در Next ساخته می‌شوند؛ بک‌اند فقط دادهٔ خام می‌دهد | `app/sitemap.ts`, `app/robots.ts` | هدف «سرو کامل HTML/سئو از Django» محقق نمی‌شود | T4-10 |
| S5 | `sitemap.ts` ورودی‌های `alternates` را خودش می‌سازد؛ `SitemapEntry` بک‌اند فیلد alternate ندارد | `lib/seo/types.ts` | XML ساخته‌شده در Django بدون hreflang ناقص است | T4-10 |
| S6 | تصویر OG با `next/og` (satori) تولید می‌شود | `app/[locale]/opengraph-image.tsx` | با حذف Next، هیچ تصویر OG پویایی نمی‌مانَد | T4-11 |
| S7 | `X-Robots-Tag` فقط روی دو endpoint مشاوره ست می‌شود | `apps/ai_engine/pipelines/views.py:93,127` | `/advisor`, `/estimate`, `/profile`, `/search`, `/advisor/results/*` فاقد هدر سرور هستند؛ فقط متاتگ Next دارند | T4-13 |
| S8 | فهرست noindex بین دو لایه واگرا است | `SEO_NOINDEX_PATHS` بک‌اند فاقد `/advisor/results` است؛ `SYSTEM_NOINDEX_PATHS` فرانت دارد | robots.txt و پاسخ سرور می‌توانند متفاوت شوند | T4-13 |
| S9 | ریدایرکت‌های `.xml` و `/products/pentestor` در `next.config.ts` هستند (کد ۳۰۸) | `next.config.ts` | جدول `Redirect` فقط ۳۰۱/۳۰۲/۴۱۰ می‌پذیرد؛ مهاجرت باید ۳۰۸→۳۰۱ نگاشت کند | T4-12 |
| S10 | فیدها با `?language=` و پراکسی Next سرو می‌شوند | `lib/seo/feed.ts` | پس از حذف Next، `/blog/rss` و `/academy/rss` باید از URLconf جنگو بیایند | T4-22 |
| S11 | `Vary: Accept-Language` و `Content-Language` توسط بک‌اند ست نمی‌شود | جست‌وجو در `apps/` و `config/` نتیجه‌ای ندارد | با سرو مستقیم JSON/HTML از Django، کش مشترک میانی می‌تواند نسخهٔ فارسی و انگلیسی را قاطی کند | T4-16 |
| S12 | `lang`/`dir` فقط در `[locale]/layout.tsx` تولید می‌شود | همان فایل | رندر HTML از Django نیازمند معادل قالب است | T4-09 |
| S13 | `search_console_verification` فقط در متادیتای Next تزریق می‌شود | `[locale]/layout.tsx` | پس از مهاجرت باید در `<head>` قالب جنگو بیاید | T4-09 |
| S14 | `og:locale` از نگاشت `fa-IR`/`en` با `_` ساخته می‌شود؛ نقشهٔ معادل سمت جنگو وجود ندارد | `LOCALE_LANGUAGE_TAG` | ناهمخوانی زبان در OG/JSON-LD | T4-10 |

### ج-۲. مدیا

| # | شکاف | شاهد | اثر | تسک |
|---|---|---|---|---|
| M1 | `Media.alt_text` در هیچ serializer نیست | `apps/*/serializers.py` (`cover_image_url`, `photo_url`, `avatar_url` فقط URL) | تصاویر محتوایی با `alt=""` رندر می‌شوند — نقص a11y و سئوی تصویر | T4-14 |
| M2 | `Media.width/height/caption` هم بیرون نمی‌آیند | همان | بدون ابعاد، CLS و `sizes` قابل محاسبهٔ دقیق نیست | T4-14 |
| M3 | بهینه‌سازی تصویر (`next/image`: AVIF/WebP + اندازهٔ دستگاه) کاملاً وابسته به Next است | `next.config.ts` (images) | حذف Next یعنی از دست رفتن کاهش حجم؛ بودجهٔ Lighthouse ≥۹۵ در خطر است | T4-14 |
| M4 | ترتیب گالری پروژه قطعی نیست | `Project.gallery = M2M` بدون `ordering` | ترتیب تصاویر بین درخواست‌ها تغییرپذیر (نقض قاعدهٔ «ترتیب قطعی») | T4-15 |
| M5 | سرو `/media/*` از route دستی Next با whitelist پسوند + `attachment` برای اسناد انجام می‌شود | `app/media/[...path]/route.ts`, `lib/media.ts` | با حذف Next باید همین قرارداد (nosniff، attachment، cache immutable) در Django معادل شود | T4-19 |
| M6 | `static()` جنگو فقط در `DEBUG` مسیر رسانه را سرو می‌کند | `config/urls.py` | در تولید، مسیر رسانه باید صریح از Django/WhiteNoise بیاید | T4-19 |

### ج-۳. احراز هویت و نشست

| # | شکاف | شاهد | اثر | تسک |
|---|---|---|---|---|
| A1 | `429` ورود با `retry_after` به UI نمی‌رسد | `apps/accounts/views.py:88-100` + `client.ts` (فقط `detail`) | کاربر دلیل قفل و زمان انتظار را نمی‌داند | T4-06 |
| A2 | `PATCH /auth/me/` بی‌مصرف | `updateMe` فقط در `client.ts` | پروفایل فقط-خواندنی است، در حالی که serializer کامل آماده است | T4-23 |
| A3 | علاقه‌مندی: افزودن/حذف بدون UI | `addFavorite`/`removeFavorite` بی‌مصرف | «علاقه‌مندی‌ها» همیشه خالی می‌مانَد مگر با API | T4-05 |
| A4 | بازیابی رمز و تأیید ایمیل در بک‌اند وجود ندارد | جست‌وجو در `accounts/views.py` | کاربری که رمز را فراموش کند راهی ندارد (خارج از دامنهٔ فرانت، اما باید ثبت شود) | T4-23 |
| A5 | `clientFetch` هدر `Accept-Language` نمی‌فرستد | `lib/api/client.ts` | هر GET سمت مرورگر (مثلاً catalogs آینده) به‌طور پیش‌فرض `fa` می‌گیرد | T4-17 |
| A6 | `CORS_ALLOWED_ORIGINS` پیش‌فرض خالی + `CORS_ALLOW_CREDENTIALS=True` | `config/settings/base.py:237` | با تک‌دامنه‌شدن بی‌اثر می‌شود؛ باید صریح بسته شود | T4-17 |
| A7 | نشست/CSRF روی `SameSite=Lax` تکیه دارد | `production.py:43-44` | در معماری تک‌دامنه درست است؛ در پراکسی فعلی Next شکننده بود | T4-17 |

### ج-۴. صفحه‌بندی (ریشهٔ خاموش باگ محتوایی)

`StandardResultsSetPagination` (`page_size=20`, `max_page_size=100`) و کلید `pagination` در هر دو فایل پیام موجود است، اما:
- هیچ صفحه‌ای `total_pages`/`next` را نمی‌خواند؛
- کلیدهای `pagination.previous|next|pageOf` هیچ مصرف‌کننده‌ای ندارند؛
- `getServices(locale)`, `getProjects(locale)`, `getCourses(locale)`, `getBlogPosts(locale)` بدون `page_size` صدا زده می‌شوند ⇒ **سقف ۲۰ آیتم**.

تنها جایی که `page_size=100` استفاده شده صفحهٔ اصلی است (`(ui)/page.tsx:31`).

---

## د) نگاشت شکاف‌ها به تسک‌های فاز ۴

| تسک | عنوان | endpoint/شکاف پوشش‌داده‌شده |
|---|---|---|
| **T4-R** | خط مبنای رگرسیون بصری و قراردادی (اسکرین‌شات + تست قرارداد) | ردیف‌های «کامل» و «زیرساختی» |
| **T4-01** | صفحه‌بندی، فیلترها و chips تاکسونومی در چهار فهرست | #38, #40, #42, #47 + ج-۴ |
| **T4-02** | بلوک قابل‌مشاهدهٔ FAQ با اتصال به JSON-LD | #7, S1 |
| **T4-03** | endpointهای تاکسونومی: صفحهٔ دسته/برچسب و ناوبری | #28–#32, ب-۳ |
| **T4-04** | فیلدهای CMS غایب: `canonical_path`, `icon`, `published_at`, `view_count`, `bio`, `social_links`, `related_project_slug`, `service_slug` | #34, #36, #39, #41, #48, S2 |
| **T4-05** | علاقه‌مندی کامل + وضعیت ثبت‌نام | #21, #22, #23, #45, A3 |
| **T4-06** | نمایش دقیق خطاهای نرخ (۴۲۹ + Retry-After) در فرم‌ها | #17, #51, A1 |
| **T4-07** | محتوای درس (HTML/ویدیو/پیش‌نمایش) و پاسخ‌های تودرتوی کامنت | #43, #49 |
| **T4-08** | کامل‌کردن سطح مشاورهٔ AI: `solution_area`/`complexity` و `EstimationRule.note_*` | #53, #56, ب-۱, ب-۲ |
| **T4-09** | لایهٔ قالب HTML جنگو: `lang`, `dir`, متای پیش‌فرض، تأیید Search Console | S12, S13 |
| **T4-10** | انتقال sitemap.xml / robots.txt / هدر Link از Next به Django | #5, S3, S4, S5, S14 |
| **T4-11** | `OpenGraphImageView` با Pillow و فونت وزیرمتن | S6 |
| **T4-12** | نگاشت ریدایرکت‌های `next.config.ts` به جدول `Redirect` (۳۰۸→۳۰۱ + مسیرهای `.xml`) | #6, S9 |
| **T4-13** | `X-Robots-Tag` سرور روی مسیرهای noindex + یکسان‌سازی فهرست | S7, S8 |
| **T4-14** | `alt_text`/`width`/`height` در serializerها + استراتژی تصویر بدون Next | M1, M2, M3 |
| **T4-15** | ترتیب قطعی گالری | M4 |
| **T4-16** | `Vary: Accept-Language` و `Content-Language` | S11 |
| **T4-17** | مهاجرت Vite + React Router + react-i18next و هدر زبان در `clientFetch` | A5, A6, A7, #11 |
| **T4-18** | بازسازی پنل ادمین (حذف Jazzmin، پنل کاستوم) | #24–#27, #64 |
| **T4-19** | قرارداد سرو مدیا از Django (nosniff/attachment/immutable) | #13, #14, M5, M6 |
| **T4-20** | به‌روزرسانی دروازه‌های کیفیت (mypy/tsc/spectacular/Lighthouse/CI) | #8–#10 |
| **T4-21** | برابری کامل pipeline کپی CMS (`site.copy`) | #12 |
| **T4-22** | سرو فیدهای RSS از Django | #44, #50, S10 |
| **T4-23** | فرم ویرایش پروفایل + مسیر بازیابی رمز | #20, A2, A4 |
| **T4-24** | ADRهای جدید و به‌روزرسانی `cms-content-inventory`/`cms-cache-contract` | همهٔ تصمیم‌های معماری این سند |

---

## ه) معیارهای پذیرش این فاز

- [x] همهٔ ۱۱ اپ پوشش داده شد (`core`, `accounts`, `taxonomy`, `company`, `services`, `portfolio`, `academy`, `blog`, `leads`, `ai_engine`, `api`).
- [x] هر ۶۴ ردیف endpoint دارای وضعیت نمایش و شناسهٔ تسک فاز ۴ است.
- [x] کاتالوگ‌ها، فیلترها، شکاف‌های سئو/مدیا/احراز هویت جداگانه فهرست شدند.
- [x] `docs/cms-content-inventory.md` به v2 ارتقا یافت.
- [x] **تأیید مالک** — در تاریخ ۵ نوامبر ۲۰۲۶ ثبت شد؛ فاز ۲ (بازنویسی) مجاز است.

### برگهٔ تأیید مالک

تصمیم‌های زیر در تاریخ ۵ نوامبر ۲۰۲۶ توسط مالک محصول ثبت شد.

| مورد | تصمیم مالک | یادداشت |
|---|---|---|
| اولویت T4-01 (صفحه‌بندی/فیلتر) بالاتر از مهاجرت فناوری | تأیید | صفحه‌بندی یک باگ محتوایی فعال است؛ پیش از مهاجرت بسته می‌شود |
| T4-02 (FAQ قابل‌مشاهده) در فاز ۴ الزامی است | تأیید | اتصال بلوک دیداری به همان `FAQPage` موجود |
| `canonical_path` ادمین بر مسیر محاسبه‌شده اولویت دارد | تأیید | منطبق با ADR-0031 |
| `solution_area`/`complexity` به‌عنوان ورودی به فرم‌ها اضافه شوند | تأیید | اختیاری و دارای پیش‌فرض، تا فرم سنگین نشود |
| `EstimationRule.note_*` در پاسخ تخمین‌گر نمایش داده شود | تأیید | نیازمند افزودن فیلد به serializer تخمین |
| انتشار `ai_summary` برای service/project/course مجاز است | تأیید | فقط آرتیفکت `approved` و غیر `stale` |
| مسیر `/categories/<slug>` ایجاد شود | تأیید | برچسب‌ها از بن‌بست خارج می‌شوند |

**تفسیر قانون ۳ (ظاهر بدون تغییر):** قاب فعلی — توکن‌های Emerald/Obsidian، فونت‌های خودمیزبان، کلاس‌های منطقی RTL، چیدمان و فاصله‌ها و تمام کامپوننت‌های `ui-port/*` و `ui/*` — پیکسل‌به‌پیکسل حفظ می‌شود. عناصر تازه (FAQ دیداری، صفحه‌بندی، chips فیلتر، صفحهٔ دسته) فقط از همان توکن‌ها و همان زبان بصری ساخته می‌شوند و هیچ استایل سراسری موجود بازنویسی نمی‌شود.

**دامنهٔ مجاز:** هر ۲۴ تسک `T4-*` این سند، با اولویت `T4-01` ← `T4-08` ← `T4-17` ← `T4-18`.

**امضا / تاریخ:** مالک محصول — ۵ نوامبر ۲۰۲۶ · **وضعیت: تأییدشده**

