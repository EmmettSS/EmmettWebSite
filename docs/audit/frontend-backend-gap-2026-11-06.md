# شکاف فرانت‌اند ↔ بک‌اند — ۶ نوامبر ۲۰۲۶ (فاز ۱ از مسترپرامپت مهاجرت: ممیزی و قرارداد)

> **وضعیت سند:** تکمیل‌شدهٔ فاز ۱ — **پیش از تأیید مالک محصول، ورود به فاز ۲ ممنوع است.**
> هیچ فایل کدی در این فاز تغییر نکرده؛ خروجی این فاز فقط همین سند و به‌روزرسانی
> [`docs/cms-content-inventory.md`](../cms-content-inventory.md) به نسخهٔ ۲ است.
>
> **دامنه:** تمام بک‌اند (`apps/*` — ۱۱ اپ) و تمام فرانت‌اند (`src/app/**`, `src/components/**`,
> `src/lib/**`, `src/i18n/**`, `messages/*.json`) در شاخهٔ `arena/9d4c44c9-emmettwebsite` در تاریخ
> ۲۰۲۶-۱۱-۰۶ خوانده و مقایسه شد.
>
> **هدف سند:** مرجع قرارداد مهاجرت فرانت از Next.js به Vite+React (Backend-Base) —
> ۱) جدول کامل endpointهای `/api/v1/*` + زیرساخت با وضعیت نمایش در UI
> ۲) کاتالوگ‌های ai_engine و فیلترهای taxonomy که در فرانت استفاده نمی‌شوند
> ۳) قابلیت‌های سئو/مدیا/احراز هویت که فرانت نیمه‌کاره یا جاافتاده دارد
> ۴) نگاشت هر سطر به تسک فاز ۴ (رجیستری تسک‌ها در بخش ۵ همین سند)
>
> **صحت‌سنجی مستقل:** هر ادعایی در این سند با خواندن فایل واقعی در همین شاخه ثابت شده؛
> دستور بازتولید در پی‌نوشت بخش ۷ آمده است.

---

## ۰. اصلاح نام‌بردن‌ها و آمار واقعی مخزن (پیش از هر جدول)

پرامپت فاز ۱ چند عدد را به‌عنوان فرض می‌آورد که اندازه‌گیری روبرو آن‌ها را دقیق نمی‌کند؛ این سند
همان واقعیت را مبنا می‌گیرد:

| مورد در پرامپت | واقعیت اندازه‌گیری‌شده روی همین شاخه | اثر بر قرارداد |
|---|---|---|
| «۷۰ مدل» | **۳۵ مدل concrete** (کلاس‌های تعریفی در `models.py`ها: ۴۴ که شامل `BaseQuerySet/BaseManager/AllObjectsManager/BaseModel/TimeStampedModel/PublishableModel/SEOMetaModel/UserManager` انتزاعی/منیجر می‌شوند). جزئیات در بخش ۶ | تسک‌های فاز ۴ بر اساس مدل واقعی نوشته شده‌اند، نه عدد پرامپت |
| «۲۱ روت فرانت» | **۲۲ مسیر** = ۲۰ صفحهٔ قابل رندر (۱۷ صفحهٔ `(pages)` + صفحهٔ خانه + `products/pentestor` + `products/crm`) + ۲ Route Handler فید (`/blog/rss`, `/academy/rss`) + صفحات وضعیت (`not-found`, `error`, `global-error`). جزئیات در بخش ۴ | جدول صفحه→API در بخش ۴ هر ۲۲ مسیر را پوشش می‌دهد |
| «endpoint `/ai/advisor/lead`» | در بک‌اند **وجود ندارد**؛ مسیر واقعی `POST /api/v1/ai/leads/` است (`apps/ai_engine/pipelines/urls.py`) | خطای نام‌گذاری در پرامپت؛ در تسک F4-050 و قرارداد فرانت جدید مسیر درست استفاده می‌شود |
| «مشاورهٔ AI در فرانت نمایش داده نمی‌شود» | **تأیید شد** — `/advisor`, `/estimate`, `/advisor/results/[token]` هیچ لینکی در ناوبری، فوتر، صفحهٔ اصلی، `ui-port/*` یا `footer.tsx` ندارند؛ فقط در (۱) پالت فرمان ⌘K، (۲) لینک متقاطع داخل `/advisor` ↔ `/estimate`، (۳) نام مسیرها در `robots.ts` و `seo/site.ts`. جزئیات در بخش ۳.۲ | تسک F4-051 (ورودی‌های نمایان) و F4-050 الزامی‌اند |
| «بازنویسی فرانت با React» | تصمیم مالک محصول است و محترم شمرده می‌شود. یادآوری واقعیتی که در تاریخ ۲۰۲۶-۱۰-۳۱ ثبت شده ([`docs/audit/2026-10-31-deep-audit.fa.md`](./2026-10-31-deep-audit.fa.md)): همان ممیزی نتیجه گرفت «بازنویسی به React لازم نیست». این سند آن تصمیم را به پرسش نمی‌کشد؛ فقط مواد قرارداد مهاجرت را فراهم می‌کند | — |

**شمارش مدل‌های concrete (مبنای بخش ۶):**
core ۷ (`AuditLog, Media, Translation, SiteSettings, SearchIndexEntry, Redirect, FAQItem`) +
accounts ۳ (`User, Profile, Favorite`) + taxonomy ۲ (`Category, Tag`) +
company ۲ (`TeamMember, Testimonial`) + services ۱ (`Service`) +
portfolio ۲ (`Project, CaseStudy`) + academy ۴ (`Instructor, Course, Lesson, Enrollment`) +
blog ۲ (`BlogPost, Comment`) + leads ۳ (`Contact, Lead, Newsletter`) +
ai_engine ۹ (`Catalog, CatalogOption, PromptTemplate, GuardrailRule, EstimationRule, AIRequest, AISuggestion, AIConcept, AIContentArtifact`) = **۳۵**.
ثبت در ادمین: **۳۶** ثبت (همان ۳۵ + `auth.LogEntry` در `apps/core/admin.py`).

**شمارش endpointهای عمومی `/api/v1/*`:** **۴۸** (که با احتساب `/admin/`, `/admin/2fa/` (۴ view),
`/i18n/setlang/` و مسیرهای فرانت‌ساید (۶ مورد) به **۶۰+** ردیف در بخش ۲ می‌رسد).

---

## ۱. جمع‌بندی اجرایی — بزرگ‌ترین شکاف‌ها

| # | شکاف | شواهد | شدّت | تسک فاز ۴ |
|---|---|---|---|---|
| G1 | سه مسیر AI (`/advisor`, `/estimate`, `/advisor/results/[token]`) برای کاربر نهایی **وجود ندارند** (نه در ناوبری، نه فوتر، نه صفحهٔ اصلی) | بخش ۳.۲ همین سند | بحرانی (هدف صریح ۳ پرامپت) | F4-050, F4-051 |
| G2 | فرانت Next.js با `next/image`, Route Handlerهای پراکسی (`/api/[...path]`, `/media/[...path]`), ISR و `revalidateTag` گره خورده؛ هدف مهاجرت (WhiteNoise + Passenger WSGI تک‌دامنه، بدون Node) با این ساختار سازگار نیست | `src/app/api/*`, `src/app/media/*`, `src/lib/api/server.ts`, `redirect-cache.ts`, `next.config.ts` | بحرانی | F4-001..F4-006, F4-060..F4-064 |
| G3 | سئوی تولیدشده در لایهٔ Node (sitemap.ts, robots.ts, opengraph-image.tsx با satori, metadata API, ISR) — طبق معماری هدف باید به Django منتقل شود؛ سرویس‌های بک‌اند (`apps/core/seo.py`) و endpointهای `/api/v1/seo/*` از قبل موجود و کش‌شده‌اند ولی مصرف‌کنندهٔ آن‌ها فقط لایهٔ Node است | بخش ۳.۱ | بحرانی | F4-010..F4-018 |
| G4 | «علاقه‌مندی‌ها» در UI نمایش داده می‌شوند ولی **هیچ دکمهٔ افزودن/حذف** جایی از فرانت وجود ندارد؛ endpointهای `add`/`delete` مرده‌اند | `profile-view.tsx` در برابر `client.ts` (`addFavorite`, `removeFavorite`) | بالا | F4-022 |
| G5 | ویرایش پروفایل (`PATCH /auth/me/`) و `updateMe` در کلاینت پیاده شده ولی **هیچ فرم ویرایشی** در UI متصل نیست | `client.ts` در برابر `profile-view.tsx` | بالا | F4-021 |
| G6 | فیلدهای fetch‌شده ولی بی‌کاربرد در کارت‌ها/جزئیات: `service.icon`, `BlogPost.view_count`, `CourseListItem.instructor_name`, `TeamMember.social_links`, `ProjectDetail.service_slug`, `seo.two_factor_required`, `seo.sitemap_sections`, `seo.generated_at`, `seo.search_console_help`, `seo.default_locale` | بخش ۳.۴ | متوسط | F4-033..F4-045 |
| G7 | endpointهای taxonomy (`categories`, `tags`) و تمام فیلترهای `categories__slug`/`tags__slug`/`level`/`year`/`is_featured`/`search` در بک‌اند آماده و تست‌شده‌اند ولی **فرانت هیچ UI فیلتری ندارد** و هیچ‌کدام را صدا نمی‌زند | بخش ۳.۵ | متوسط | F4-034, F4-037, F4-040, F4-043 |
| G8 | فیدهای RSS در جریان دوتایی‌اند: بک‌اند `/api/v1/{blog,academy}/rss/` + بازنشر فرانت در `/blog/rss` با `FEED_REVALIDATE_SECONDS = 60` ولی Route Handler مقدار `revalidate = 900` می‌گیرد (عدم‌سازگاری داخلی)؛ هدف معماری «Django مستقیم سرو کند» است | `lib/seo/feed.ts:15` در برابر `app/[locale]/(ui)/(pages)/blog/rss/route.ts:5` | متوسط | F4-017, F4-018 |
| G9 | ریدایرکت‌های ۳۰۱/۳۰۲/۴۱۰ ادمین در `proxy.ts` فرانت اعمال می‌شوند؛ طبق هدف معماری و ADR-0031/ADR-0041 باید میدلور جنگو (`apps/core/middleware.RedirectFallbackMiddleware`) و بدون پروسهٔ Node عمل کنند؛ امروز مسیر عمومی از زیر نظر فرانت رد می‌شود نه از زیر نظر جنگو | `middleware.py` (جنگو) در برابر `proxy.ts` (فرانت) | بحرانی | F4-014 |
| G10 | پنل ادمین Jazzmin + ۲FA + داشبورد KPI موجود است و appهای backend برای بازسازی «جنگو کاستوم» آماده‌اند؛ اما هیچ `templates/admin/base_site.html` کاستومی کامل برای خروج از Jazzmin ثبت نشده (فقط بازنویسی بخش‌هایی موجود است) — برنامهٔ فاز ۲ | بخش ۶ | بالا (فاز ۲) | — (فاز ۲) |
| G11 | فیلدهای نمایش‌داده‌نشدهٔ بک‌اند در UI: کامنت‌ها فقط approve می‌شوند ولی `status` در لِر نمایش نمی‌یابد؛ `Comment.parent` (پاسخ) در API پشتیبانی می‌شود ولی در UI فقط لیست تخت + فرم؛ ثبت کامنت guest‌پسند نیست (فقط IsAuthenticated) — طراحی درست است ولی باید در بازنویسی حفظ شود | `blog/[slug]/page.tsx`, `comment-form.tsx` | متوسط | F4-041 |
| G12 | هیچ صفحه‌ای از فرانت فراتر از خانه/جزئیاتِ خدمت/تماس از `FAQPage` JSON-LD و endpoint `/seo/faq/` استفاده نمی‌کند؛ پروژکت‌ها/آکادمی/بلاگ جزئیات FAQ ندارند | بخش ۳.۱ | متوسط | F4-012, F4-037, F4-040, F4-043 |
| G13 | وب‌هوک `FRONTEND_REVALIDATE_URL` و توکن `INTERNAL_API_TOKEN` پل اختصاصی Next هستند؛ در معماری هدف (Django+WhiteNoise تک‌دامنه) هر دو باید حذف و کش‌کش داخلی جنگو جایگزین شود؛ امروز هر دو تنظیم در `base.py` فعال و ضروری‌اند (حذف زودهنگام = ۴۲۹ خاموش برای SSR) | `base.py` بخش‌های Cache/ADR-0041 | بالا | F4-005, F4-064 |
| G14 | عدم‌پاریته نسخه‌ای: پرامپت «Next.js 16» می‌گوید؛ `package.json` نود ۲۲ و Next 16.4.3 فعلی و `.nvmrc` برابر `v22` — هنگام آرشیو پوشهٔ فرانت، CI با `frontend-*` اسکریپت‌ها و داک‌ها (`.github/workflows/ci.yml`, `deploy_frontend.sh`, `Makefile`, `.lighthouserc.json`) گره خورده است و همه باید هم‌زمان به بیلد Vite منتقل شوند | بخش ۵ و ۷ | بالا | F4-001, F4-060..F4-063 |

---

## ۲. بخش الف — جدول کامل endpointها با وضعیت نمایش

**راهنمای وضعیت:**
`✅ کامل` = در فرانت متصل و دادهٔ بک‌اند را به کاربر نشان می‌دهد ·
`◐ ناقص` = نیمه‌متصل (داده می‌آید ولی فیلدها/رفتار کامل مصرف نمی‌شود) ·
`○ پنهان` = کدش هست و کار می‌کند ولی هیچ مسیر هدایت‌شده برای کاربر وجود ندارد ·
`∅ استفاده نمی‌شود` = هیچ مصرفی در فرانت ندارد ·
`— ops` = مخصوص پایش/ادمین/ابزار، مصرف UI ندارد.

**قواعد مشترک همهٔ endpointهای محتوایی عمومی:** پارامتر صفحه‌بندی `page`, `page_size` (سقف ۱۰۰، پیش‌فرض ۲۰، پوشش `count/total_pages/current_page/next/previous/results`)؛ فیلتر چون `DjangoFilterBackend`+`SearchFilter`+`OrderingFilter` روی همه فعال است؛ زبان خروجی از `Accept-Language` (ModelTranslation `_fa/_en` با fallback به `fa`)؛ `public_id` (UUID) تنها شناسهٔ عمومی است؛ `id` عددی هرگز افشا نمی‌شود؛ همهٔ لیست‌ها فقط `status=published` (برای مدل‌های `PublishableModel`) و `is_active=True` و `deleted_at IS NULL` برمی‌گردانند.

### الف-۱) endpointهای دامنه‌ای و SEO/auth (۴۸ ردیف)

| # | متد و مسیر | View → Serializer → مدل | Permission | Throttle | کش (بک‌اند) | مصرف در فرانت‌اند | وضعیت | تسک فاز ۴ |
|---|---|---|---|---|---|---|---|---|
| 1 | `GET /api/v1/health/` | `HealthCheckView` → — → `core_*` probe | AllowAny | ندارد | — | هیچ‌جا (فقط داک/CI) | — ops | F4-060 |
| 2 | `GET /api/v1/health/proxy/` | `ProxyDiagnosticView` → — → — | IsAdminUser | anon پیش‌فرض | — | هیچ‌جا | — ops | F4-060 |
| 3 | `GET /api/v1/search/?q=&locale=&limit=` | `GlobalSearchView` → dataclass → `SearchIndexEntry` (FTS5/FULLTEXT) | AllowAny | anon پیش‌فرض (100/h) | — | صفحهٔ `/search` (SSR با IP واقعی) + ⌘K پالت (client) | ✅ کامل | F4-044 |
| 4 | `GET /api/v1/seo/settings/` | `SEOSettingsView` → `SEOSettingsSerializer` → `SiteSettings`(+Media) | AllowAny | anon پیش‌فرض | LocMem `seo:settings:v1`, TTL 900 | همهٔ metadataها و layout ریشه (server-side) | ◐ ناقص (۵ فیلد از payload بی‌کاربرد) | F4-010, F4-013 |
| 5 | `GET /api/v1/seo/sitemap/` | `SEOSitemapView` → `SitemapEntrySerializer` → Service/Project/Course/BlogPost | AllowAny | anon پیش‌فرض | LocMem `seo:sitemap:entries:v1`, TTL 900 | `app/sitemap.ts` (revalidate 900) | ✅ کامل | F4-016 |
| 6 | `GET /api/v1/seo/redirects/` | `SEORedirectsView` → `RedirectEntrySerializer` → `Redirect` | AllowAny | anon پیش‌فرض | — (فرانت کش درون‌حافظه‌ای 60s) | `proxy.ts` از طریق `redirect-cache.ts` | ◐ ناقص (هدف معماری: میدلور جنگو) | F4-014 |
| 7 | `GET /api/v1/seo/faq/?path=` | `SEOFAQView` → `FAQItemSerializer` → `FAQItem` (+ModelTranslation) | AllowAny | anon پیش‌فرض | LocMem (از طریق `build_faq_payload` با کش SEO مشترک) | صفحهٔ خانه (`/`)، جزئیات خدمت، صفحهٔ تماس | ◐ ناقص (فقط ۳ صفحه مصرف می‌کنند) | F4-012 |
| 8 | `GET /api/v1/schema/` | `SpectacularAPIView` → OpenAPI | AllowAny (پیش‌فرض spectacular) | anon پیش‌فرض | — | هیچ‌جا | — ops (تولید OpenAPI) | F4-061 |
| 9 | `GET /api/v1/schema/swagger-ui/` | `SpectacularSwaggerView` | AllowAny | anon پیش‌فرض | — | هیچ‌جا | — ops | F4-061 |
| 10 | `GET /api/v1/schema/redoc/` | `SpectacularRedocView` | AllowAny | anon پیش‌فرض | — | هیچ‌جا | — ops | F4-061 |
| 11 | `GET /api/v1/site-content/translations/?locale=` | `FrontendCopyTranslationsView` → — → `Translation` (`namespace=site.copy`, `is_html=False`) | AllowAny | anon پیش‌فرض | — (فرانت revalidate 60 + تگ) | `src/i18n/request.ts` (getMessages — merge روی JSON باندل) | ✅ کامل | F4-003 |
| 12 | `GET /api/v1/auth/csrf/` | `CsrfTokenView` (`ensure_csrf_cookie`) → — → — | AllowAny | anon پیش‌فرض | — | `client.ts::ensureCsrfCookie` قبل از هر POST | ✅ کامل | F4-020 |
| 13 | `POST /api/v1/auth/register/` | `RegisterView` → `RegisterSerializer`/`MeSerializer` → `User`,`Profile` | AllowAny | `AuthRateThrottle` 10/h | — | `/profile` (فرم ثبت‌نام) | ✅ کامل | F4-021 |
| 14 | `POST /api/v1/auth/login/` | `LoginView` → `LoginSerializer`/`MeSerializer` → `User` | AllowAny | `AuthRateThrottle` 10/h + `LoginLockout` (۵ تلاش/۹۰۰ثانیه → ۴۲۹ + `Retry-After`) | — | `/profile` (فرم ورود) | ✅ کامل | F4-021 |
| 15 | `POST /api/v1/auth/logout/` | `LogoutView` → — → — | IsAuthenticated | user پیش‌فرض | — | `/profile` | ✅ کامل | F4-021 |
| 16 | `GET /api/v1/auth/me/` | `MeView.get` → `MeSerializer` → `User`,`Profile` | IsAuthenticated | user پیش‌فرض | — | profile-view, enroll-button, comment-form | ✅ کامل | F4-021 |
| 17 | `PATCH /api/v1/auth/me/` | `MeView.patch` → `MeUpdateSerializer` → `User`,`Profile` | IsAuthenticated | user پیش‌فرض | — | ∅ (`updateMe` در `client.ts` تعریف شده ولی **هیچ مصرف‌کننده‌ای ندارد**) | ∅ استفاده نمی‌شود | F4-021 |
| 18 | `GET /api/v1/auth/favorites/` | `FavoriteListView` → `FavoriteSerializer` → `Favorite`,`ContentType`,`User` | IsAuthenticated | user پیش‌فرض | — | `/profile` (فقط نمایش لیست) | ◐ ناقص (بدون حذف) | F4-022 |
| 19 | `POST /api/v1/auth/favorites/add/` | `FavoriteCreateView` → `FavoriteCreateSerializer`/`FavoriteSerializer` → `Favorite` | IsAuthenticated | user پیش‌فرض | — | ∅ (هیچ دکمه‌ای در هیچ صفحه‌ای صدایش نمی‌زند) | ∅ استفاده نمی‌شود | F4-022 |
| 20 | `DELETE /api/v1/auth/favorites/<int:pk>/` | `FavoriteDeleteView` → — → `Favorite` | IsAuthenticated | user پیش‌فرض | — | ∅ | ∅ استفاده نمی‌شود | F4-022 |
| 21 | `GET /api/v1/taxonomy/categories/?scope=` | `CategoryViewSet` → `CategorySerializer` → `Category` (ModelTranslation) | AllowAny | anon پیش‌فرض | — | ∅ (نه در این صفحات، نه در فیلترها) | ∅ استفاده نمی‌شود | F4-034 |
| 22 | `GET /api/v1/taxonomy/categories/<slug>/` | `CategoryViewSet` (lookup=slug) | AllowAny | anon پیش‌فرض | — | ∅ | ∅ استفاده نمی‌شود | F4-034 |
| 23 | `GET /api/v1/taxonomy/tags/?search=` | `TagViewSet` → `TagSerializer` → `Tag` | AllowAny | anon پیش‌فرض | — | ∅ | ∅ استفاده نمی‌شود | F4-034 |
| 24 | `GET /api/v1/taxonomy/tags/<slug>/` | `TagViewSet` | AllowAny | anon پیش‌فرض | — | ∅ | ∅ استفاده نمی‌شود | F4-034 |
| 25 | `GET /api/v1/company/team/` | `TeamMemberViewSet` → `TeamMemberSerializer` → `TeamMember`,`Media` | AllowAny | anon پیش‌فرض | — | `/about` | ✅ کامل | F4-042 |
| 26 | `GET /api/v1/company/team/<public_id>/` | `TeamMemberViewSet` (lookup=public_id) | AllowAny | anon پیش‌فرض | — | ∅ | ∅ استفاده نمی‌شود | F4-042 |
| 27 | `GET /api/v1/company/testimonials/?featured=&ordering=` | `TestimonialViewSet` → `TestimonialSerializer` → `Testimonial`,`Project`,`Media` | AllowAny | anon پیش‌فرض | — | `/about` (بدون پارامتر `featured`) | ◐ ناقص (پارامتر featured استفاده نمی‌شود؛ صفحهٔ اصلی testimonial ندارد) | F4-042, F4-031 |
| 28 | `GET /api/v1/company/testimonials/<pk>/` | `TestimonialViewSet` (lookup=pk) | AllowAny | anon پیش‌فرض | — | ∅ | ∅ استفاده نمی‌شود | F4-042 |
| 29 | `GET /api/v1/services/?categories__slug=&tags__slug=&is_featured=&search=&ordering=&page_size=` | `ServiceViewSet` (list) → `ServiceListSerializer` → `Service`,`Category`,`Tag` | AllowAny | anon پیش‌فرض | — | خانه، `/services`، static-params | ◐ ناقص (فیلتر تگ/دسته/جست‌وجو استفاده نمی‌شود) | F4-033 |
| 30 | `GET /api/v1/services/<slug>/` | `ServiceViewSet` (retrieve) → `ServiceDetailSerializer` → `Service`,+`description_html` | AllowAny | anon پیش‌فرض | — | `/services/[slug]` | ✅ کامل | F4-034 |
| 31 | `GET /api/v1/projects/?categories__slug=&tags__slug=&is_product=&is_featured=&year=&ordering=` | `ProjectViewSet` (list) → `ProjectListSerializer` → `Project`,`CaseStudy`,`Media` | AllowAny | anon پیش‌فرض | — | خانه (×۲: `is_product=true` و همه)، `/products`، `/projects`، static-params | ◐ ناقص (فقط `is_product` و `ordering` استفاده می‌شود) | F4-036 |
| 32 | `GET /api/v1/projects/<slug>/` | `ProjectViewSet` (retrieve) → `ProjectDetailSerializer` → `Project`,`CaseStudy`,`Media`(gallery) | AllowAny | anon پیش‌فرض | — | `/projects/[slug]` | ✅ کامل | F4-037 |
| 33 | `GET /api/v1/academy/?level=&categories__slug=&tags__slug=&is_featured=` | `CourseViewSet` (list) → `CourseListSerializer` → `Course`,`Lesson`,`Instructor` | AllowAny | anon پیش‌فرض | — | خانه، `/academy`، static-params | ◐ ناقص (فیلتر `level` استفاده نمی‌شود) | F4-039 |
| 34 | `GET /api/v1/academy/<slug>/` | `CourseViewSet` (retrieve) → `CourseDetailSerializer` → `Course`,`Lesson`,`Instructor`,`Category`,`Tag` | AllowAny | anon پیش‌فرض | — | `/academy/[slug]` | ✅ کامل | F4-040 |
| 35 | `GET /api/v1/academy/rss/?language=` | `LatestCoursesFeed` (Django Feed) → `Course` | AllowAny | anon پیش‌فرض | — | بازنشر در `/academy/rss` (revalidate 900 ولی FEED_REVALIDATE=60) | ◐ ناقص (عدم‌سازگاری عدد کش) | F4-018 |
| 36 | `GET /api/v1/academy/enrollments/` | `EnrollmentListView` → `EnrollmentSerializer` → `Enrollment`,`Course` | IsAuthenticated | user پیش‌فرض | — | profile-view، enroll-button | ✅ کامل | F4-040 |
| 37 | `POST /api/v1/academy/enrollments/add/` | `EnrollmentCreateView` → `EnrollmentCreateSerializer` → `Enrollment` | IsAuthenticated | user پیش‌فرض | — | enroll-button | ✅ کامل | F4-040 |
| 38 | `GET /api/v1/blog/?categories__slug=&tags__slug=&search=&ordering=` | `BlogPostViewSet` (list) → `BlogPostListSerializer` → `BlogPost`,`Category`,`User` | AllowAny | anon پیش‌فرض | — | خانه، `/blog`، static-params | ◐ ناقص (فیلتر دسته/تگ استفاده نمی‌شود) | F4-042 |
| 39 | `GET /api/v1/blog/<slug>/` | `BlogPostViewSet` (retrieve; `view_count += 1`) → `BlogPostDetailSerializer` → `BlogPost`,`Comment`(تأیید‌شده),`AIContentArtifact`(ai_summary) | AllowAny | anon پیش‌فرض | — | `/blog/[slug]` | ◐ ناقص (`view_count` خوانده می‌شود ولی نمایش نمی‌یابد) | F4-043 |
| 40 | `GET /api/v1/blog/rss/?language=` | `LatestBlogPostsFeed` | AllowAny | anon پیش‌فرض | — | بازنشر در `/blog/rss` | ◐ ناقص (همان عدم‌سازگاری کش) | F4-017 |
| 41 | `POST /api/v1/blog/<slug>/comments/` | `BlogPostViewSet.add_comment` (`@action`) → `CommentCreateSerializer` → `Comment` (همیشه `pending`) | IsAuthenticated | user پیش‌فرض | — | comment-form (زیر هر پست) | ✅ کامل | F4-043 |
| 42 | `POST /api/v1/leads/contact/` | `ContactCreateView` (`csrf_protect`) → `ContactCreateSerializer` → `Contact`,`Lead`(auto),`CatalogOption`(project_type/budget_range/timeline) | AllowAny | `ContactFormRateThrottle` 5/h | — | `/contact` (ContactForm) | ✅ کامل | F4-030 |
| 43 | `POST /api/v1/leads/newsletter/` | `NewsletterSubscribeView` (`csrf_protect`) → `NewsletterCreateSerializer` (idempotent `update_or_create`) → `Newsletter` | AllowAny | `NewsletterRateThrottle` 3/day | — | `/contact` (NewsletterForm) | ✅ کامل | F4-030 |
| 44 | `GET /api/v1/ai/catalogs/?keys=a,b` | `CatalogListView` → `CatalogSerializer` → `Catalog`,`CatalogOption` | AllowAny | anon پیش‌فرض | — | `/contact`, `/advisor`, `/estimate`, `/advisor/results/[token]` | ✅ کامل (فقط برای کلیدهای لازم صدا زده می‌شود) | F4-050 |
| 45 | `POST /api/v1/ai/advisor/` | `AdvisorCreateView` (`csrf_protect`, `X-Robots-Tag: noindex,nofollow`) → `AdvisorRequestSerializer` → `AIRequest`,`AISuggestion`,`AIConcept` (+ Guardrail + EstimationRule) | AllowAny | `AIEngineRateThrottle` 20/h | — | `/advisor` — **صفحه در هیچ‌جای ناوبری نیست** | ○ پنهان | F4-050, F4-051 |
| 46 | `GET /api/v1/ai/results/<token>/` | `SharedSuggestionView` (`X-Robots-Tag: noindex,nofollow`, `Cache-Control: no-store`) → `AISuggestionPublicSerializer` → `AISuggestion`,`AIConcept` | AllowAny | anon پیش‌فرض | `Cache-Control: no-store` | `/advisor/results/[token]` — **پنهان** | ○ پنهان | F4-050, F4-051 |
| 47 | `POST /api/v1/ai/estimates/` | `ProjectEstimateView` (`csrf_protect`) → `EstimatorRequestSerializer` (AdvisorRequest + `delivery_scope`) → `EstimationRule`,`AIRequest` (بدون LLM) | AllowAny | `AIEngineRateThrottle` 20/h | — | `/estimate` — **پنهان** | ○ پنهان | F4-052 |
| 48 | `POST /api/v1/ai/leads/` | `AdvisorLeadCreateView` (`csrf_protect`) → `AdvisorLeadRequestSerializer` → `Contact`,`Lead` → `notify_new_contact` (Kavenegar/email) | AllowAny | `ContactFormRateThrottle` 5/h | — | `AdvisorLeadForm` روی هر کارت مفهوم در `/advisor/results/[token]` | ◐ ناقص (فقط از مسیر پنهان قابل دسترسی) | F4-050, F4-051 |

### الف-۲) زیرساخت، ادمین و مسیرهای فرانت‌ساید (۱۴ ردیف)

| # | متد و مسیر | لایه | توضیح | وضعیت | تسک فاز ۴ |
|---|---|---|---|---|---|
| 49 | `GET /admin/` (+ `*/change/`,`*/changelist/`,…) | Django Admin (36 ثبت) | ورود Staff + Jazzmin امروز — بازسازی به Custom Admin در فاز ۲ | — ops (فاز ۲) | — (فاز ۲) |
| 50 | `GET /admin/2fa/` , `/setup/` , `/verify/` , `/recovery/` | `apps/accounts/twofa_views.py` + `templates/admin/twofa/*` | ۲FA TOTP staff-only؛ `OTPMiddleware` + `AdminTwoFactorMiddleware` | — ops (فاز ۲) | — (فاز ۲) |
| 51 | `POST /i18n/setlang/` | `django.conf.urls.i18n` | سوییچ زبان ادمین (Jazzmin language_chooser) | — ops (فاز ۲) | — (فاز ۲) |
| 52 | `GET /blog/rss` و `/en/blog/rss` | Route Handler فرانت (بازنشر `/api/v1/blog/rss/`) | `revalidate=900` ولی `FEED_REVALIDATE_SECONDS=60` | ◐ ناقص | F4-017 |
| 53 | `GET /academy/rss` و `/en/academy/rss` | Route Handler فرانت (بازنشر) | همان ناهماهنگی کش | ◐ ناقص | F4-018 |
| 54 | `POST /api/revalidate` | Route Handler فرانت (وب‌هوک `FRONTEND_REVALIDATE_URL`, `Bearer FRONTEND_REVALIDATE_SECRET`, تگ‌های مجاز `cache-tags.ts`) | با حذف Node حذف می‌شود؛ کش جنگو داخلی جایگزین است | ○ حذف‌شده در هدف | F4-006 |
| 55 | `* /api/*` (مسیر catch-all) | Route Handler `app/api/[...path]/route.ts` — پراکسی با عبور IP واقعی و کوکی سشن | حذف در معماری هدف (Django مستقیم `/api/` را سرو می‌کند) | ○ حذف‌شده در هدف | F4-005 |
| 56 | `GET /media/*` | Route Handler `app/media/[...path]/route.ts` — سرو فایل از `MEDIA_ROOT` روی دیسک یا fallback به بک‌اند | در معماری هدف Django/Apache مستقیماً MEDIA_URL را سرو می‌کند | ○ حذف‌شده در هدف | F4-005 |
| 57 | `GET /sitemap.xml` | `app/sitemap.ts` (MetadataRoute, revalidate 900) | مصرف `/seo/sitemap/` | ✅ کامل → باید به Django منتقل شود | F4-016 |
| 58 | `GET /robots.txt` | `app/robots.ts` (revalidate 900) | مصرف `/seo/settings/` + `SYSTEM_NOINDEX_PATHS` فرانت | ✅ کامل → انتقال به Django | F4-015 |
| 59 | `GET /[locale]/opengraph-image` (×۲: fa/en) | `next/og` (satori) ۱۲۰۰×۶۳۰، فونت Vazirmatn woff | جایگزین: `OpenGraphImageView` با Pillow — ADR-0031 | ✅ کامل → انتقال به Django | F4-011 |
| 60 | `GET /[locale]/products/pentestor` → ۳۰۰/۳۰۸ | `next.config.ts` redirects (308) | در هدف: جدول `Redirect` ادمین (301) یا htaccess | ◐ ناقص | F4-014, F4-038 |
| 61 | `GET /products/crm` | صفحهٔ ComingSoon (مستقل از دیتابیس؛ `/projects/crm` پاسخ ۴۰۴ می‌دهد) | وضعیت ثابت «به‌زودی» عمداً حفظ می‌شود | ✅ کامل (بدون داده) | F4-038 |
| 62 | فایل‌های استاتیک `/_next/*` | سرو مستقیم Node | حذف؛ دارایی‌ها با WhiteNoise از `STATIC_URL=/static/` و build به `backend/static/frontend/` منتقل می‌شوند | ○ حذف‌شده در هدف | F4-001, F4-004 |

**جمع:** الف-۱ (۴۸ ردیف) + الف-۲ (۱۴ ردیف) = **۶۲ سطر** — پوشش کامل ۱۱ اپ + ادمین + فرانت‌ساید.

---

## ۳. بخش الف (ادامه) — نگاشت صفحه→API→پارامتر→نمایش و یافته‌های تفصیلی

### ۳.۱ ماتریس صفحه → داده → نمایش (هر ۲۲ مسیر)

| مسیر (fa · /en) | APIها و پارامترهای واقعی | پارامترهای مصرف‌نشدهٔ موجود | حالت نمایش | تسک فاز ۴ |
|---|---|---|---|---|
| `/` | `GET /seo/faq/?path=/` (JSON-LD FAQPage) · `getServices(page_size=100&ordering=order)` · `getProjects(is_product=true&page_size=100&ordering=order)` · `getProjects(page_size=100&ordering=-year)` · `getBlogPosts(page_size=100&ordering=-published_at)` · `getCourses(page_size=100&ordering=order)` | فیلترهای categories/tags روی هر ۵ مورد | کامل (سکشن‌های home) | F4-031 |
| `/services` | `getServices(locale)` — بدون فیلتر | `categories__slug`, `tags__slug`, `is_featured`, `search` | لیست کامل (grid) — بدون فیلتر UI | F4-033 |
| `/services/[slug]` | `getService(slug)` · `getFaqForPath('/services/'+slug)` · `serviceJsonLd` · `breadcrumbJsonLd` | — | کامل | F4-034 |
| `/projects` | `getProjects(locale)` — بدون فیلتر | `categories__slug`, `tags__slug`, `year`, `is_featured` | لیست کامل — بدون فیلتر UI | F4-036 |
| `/projects/[slug]` | `getProject(slug)` · `articleJsonLd` (به‌جای Product) · `breadcrumbJsonLd` · `gallery_urls` · `case_study.*` (۷ بخش + metrics) | `service_slug` | کامل | F4-037 |
| `/products` | `getProjects('is_product=true')` | — | کامل (grid) | F4-038 |
| `/products/pentestor` | — (redirect 308 → `/projects/pentestor`) | — | redirect دائم | F4-038 |
| `/products/crm` | — (ComingSoon) | — | ثابت | F4-038 |
| `/academy` | `getCourses(locale)` | `level`, `categories__slug`, `tags__slug`, `is_featured` | لیست کامل + لینک RSS | F4-039 |
| `/academy/[slug]` | `getCourse(slug)` · `courseJsonLd` · `breadcrumbJsonLd` · EnrollButton | — | کامل + ثبت‌نام | F4-040 |
| `/academy/rss` | بازنشر `/api/v1/academy/rss/?language=` | — | XML | F4-018 |
| `/blog` | `getBlogPosts(locale)` + لینک RSS | `categories__slug`, `tags__slug`, `search`, `ordering` (غیر از پیش‌فرض) | لیست کامل | F4-042 |
| `/blog/[slug]` | `getBlogPost(slug)` (`view_count += 1`) · `articleJsonLd` · `toc` · `comments`(approved) · `related_posts` · `ai_summary` · CommentForm | `view_count` (fetch شد ولی چاپ نمی‌شود) | کامل — به‌جز شمارهٔ بازدید | F4-043 |
| `/blog/rss` | بازنشر `/api/v1/blog/rss/?language=` | — | XML | F4-017 |
| `/about` | `getTeamMembers()` · `getTestimonials(locale)` (بدون `featured=true`) | param `featured` | کامل | F4-042 |
| `/contact` | `getCatalogs(['project_type','budget_range','timeline'])` · `getFaqForPath('/contact')` + `faqJsonLd` · submit `leads/contact/` · NewsletterForm | — | کامل | F4-030 |
| `/advisor` | `getCatalogs(['job_role','business_size','city_scale','budget_range','team_size','goal'])` · `createAdvisorSuggestion` | — | کامل ولی **پنهان از ناوبری** | F4-050, F4-051 |
| `/advisor/results/[token]` | `getSharedAISuggestion(token, IP واقعی)` · `getCatalogs(['project_type','budget_range','timeline'])` · `AdvisorLeadForm` → `POST /ai/leads/` · `ShareResultButton` | — | کامل ولی **پنهان** | F4-050, F4-051 |
| `/estimate` | `getCatalogs([... ۶ کلید + 'delivery_scope'])` · `estimateProject` → `POST /ai/estimates/` | — | کامل ولی **پنهان** | F4-052 |
| `/profile` | `getMe` · `getFavorites` · `getEnrollments` · login/register/logout · `updateMe`(بی‌مصرف) · `addFavorite/removeFavorite`(بی‌مصرف) | `avatar_url`, `is_phone_verified`, `locale_preference` (fetch‌شده) | ناقص (بدون ویرایش پروفایل و بدون دکمه‌های علاقه‌مندی) | F4-021, F4-022 |
| `/search` | SSR `searchSite(q, locale, IP)` (limit پیش‌فرض ۲۰، سقف ۵۰) + SearchBox client | `limit` | کامل | F4-044 |
| `/design-system` | — (کامپوننت‌های داخلی) | — | داخلی/ابزاری — باید noindex بماند | F4-045 |

### ۳.۲ شواهد «AI پنهان از کاربر» (G1)

جست‌وجوی تمام فرانت نشان می‌دهد `/advisor` و `/estimate` فقط در این نقاط ظاهر می‌شوند:

- `messages/fa.json` و `en.json` → کلیدهای `nav.advisor`, `nav.estimate`, `ui.nav.palette[]` (دو عضو آخر)؛
- `src/components/ui-port/command-palette.tsx` → از طریق `palette.raw("palette")` — یعنی فقط در ⌘K؛
- `advisor/page.tsx` ↔ `estimate/page.tsx` → لینک متقاطع «تخمین پروژه»؛
- `src/lib/seo/site.ts` → `SYSTEM_NOINDEX_PATHS` شامل `/advisor/results`؛
- `app/robots.ts` → `Disallow: /advisor/results/*`.

**نیست در:** `navbar.tsx` (Desktop و Mobile drawer و تمام stateها)، `footer.tsx`، `hero.tsx`،
`home.tsx` و تمام `ui-port/*-section.tsx`، `contact-section.tsx`، `page-frame.tsx`.

نتیجه: کاربر عادی از وجود «مشاور ایده‌پرداز» و «تخمین‌گر پروژه» بی‌خبر است؛ از دید محصول این
دو ابزار باید حداقل (۱) لینک ناوبری/فوتر/صفحهٔ اصلی (طبق قانون «ظاهر موجود تغییر نکند» فقط به‌صورت
بخش/لینک **جدید** و با تأیید مالک) و (۲) ایندکس محتوایی مناسب دریافت کنند.

### ۳.۳ endpointهای کاملاً متصل ولی مصرف ناقص (خلاصهٔ G4–G6)

| دادهٔ fetch‌شده | در کجا fetch می‌شود | در کجا نمایش می‌یابد |
|---|---|---|
| `service.icon` (نام آیکون lucide) | `ServiceListSerializer` → کارت خانه/فهرست خدمات | **هیچ‌کجا** |
| `BlogPost.view_count` | `/blog/[slug]` SSR | **هیچ‌کجا** |
| `CourseListItem.instructor_name` | لیست آکادمی/خانه | **هیچ‌کجا** (نام مدرس فقط در جزئیات دوره) |
| `TeamMember.social_links` | `/about` | **هیچ‌کجا** |
| `ProjectDetail.service_slug` | `/projects/[slug]` | **هیچ‌کجا** (لینک به خدمت حذف‌شده) |
| `ProjectListItem.case_study.technology_stack` | خانه (mapProjects/mapProducts)، محصولات | خانه: در بخش پروژه‌ها/محصولات به‌صورت تگ — ✅ |
| `Comment.status/parent` | جزئیات پست | فقط لیست تخت approved؛ فیلد `status` پذیرفته ولی نمایش داده نمی‌شود؛ پاسخ‌های تو در تو (`parent`) اصلاً UI ندارند |
| `Enrollment.progress_percent`, `status` | profile | درصد نمایش؛ `status` (active/completed/cancelled) و `completed_at` نمایش نمی‌یابد |
| `Favorite.created_at`, `content_type_label`, `object_id` | profile | فقط `target_title` نمایش |
| `Me.is_phone_verified/phone/locale_preference/avatar_url/bio/job_title/company_name/role` | profile | فقط `first_name/last_name/email` برای welcome؛ هیچ‌کدام از فیلدهای پروفایل ویرایش/نمایش نمی‌یابد |
| `seo.default_locale/sitemap_sections/generated_at/two_factor_required/search_console_help` | تمام metadataها | **هیچ‌کجا** (۵ فیلد) |
| `SeoSettings.locales[].label` | layout | **هیچ‌کجا** (برچسب زبان از JSON باندل می‌آید) |

### ۳.۴ endpointهای کاملاً بی‌مصرف (∅)

`PATCH /auth/me/` · `POST /auth/favorites/add/` · `DELETE /auth/favorites/<pk>/` ·
`GET /taxonomy/categories/` (هر دو شکل) · `GET /taxonomy/tags/` (هر دو شکل) ·
`GET /company/team/<public_id>/` · `GET /company/testimonials/<pk>/` ·
پارامتر `featured=` روی testimonials · تمام فیلترهای `search=` و `ordering=` به‌جز مواردی که در
بخش ب لیست شده‌اند.

### ۳.۵ فیلترهای taxonomy و `search` استفاده‌نشده (خلاصه — جزئیات در بخش ۴)

| اپ | filterset_fields/search_fields اعلام‌شده | استفاده‌شده توسط فرانت |
|---|---|---|
| services | `categories__slug`, `tags__slug`, `is_featured` + search(`title/summary` دوزبانه) | **هیچ‌کدام** |
| portfolio | `categories__slug`, `tags__slug`, `is_product`, `is_featured`, `year` + search | فقط `is_product=true` |
| academy | `level`, `categories__slug`, `tags__slug`, `is_featured` + search | **هیچ‌کدام** |
| blog | `categories__slug`, `tags__slug` + search(`title/excerpt/content`) | **هیچ‌کدام** |
| taxonomy | `GET /taxonomy/categories/?scope=` + search(`name`) , `GET /taxonomy/tags/?search=` | **هیچ endpointای** |
| کمکی | `?ordering=published_at|order|year` (همه) · `?page_size=100` (خانه و static-params) | ✅ استفاده می‌شود |
| testimonials | `?featured=true` | **استفاده نمی‌شود** |

---

## ۴. بخش ب — کاتالوگ‌های ai_engine و گزینه‌های استفاده‌نشده

### ۴.۱ موجودی ۱۱ کاتالوگ عمومی (`is_public=True`)، ۶۱ گزینه

منبع: `apps/ai_engine/catalog/defaults.py::CATALOGS` (11 کاتالوگ) + seed migration
`0002_seed_initial_catalogs.py` + `EstimationRule` (4 قاعدهٔ پیش‌فرض روی `delivery_scope`) +
`GuardrailRule` (4 قانون) + `PromptTemplate` (advisor/blog_summary × fa/en).

| کاتالوگ | گزینه‌ها (key — fa) | نقش در API | مصرف فرانت |
|---|---|---|---|
| `project_type` | website, mobile_app, security, crm, consulting, other | ورودی `ContactCreateSerializer` + `AILeadContactSerializer` (Contact فرم و لید مشاور) | ContactForm · AdvisorLeadForm |
| `budget_range` | under_50m, 50_150m, 150_500m, over_500m, not_sure | Contact + Advisor + Estimate + Lead | ContactForm · CreativeAdvisorForm · ProjectEstimatorForm · AdvisorLeadForm |
| `timeline` | immediate, within_1_month, within_3_months, flexible | Contact + Lead | ContactForm · AdvisorLeadForm |
| `job_role` | owner, executive, operations, sales_marketing, finance_admin, it_engineering, customer_support, human_resources, other | Advisor + Estimate | CreativeAdvisorForm · ProjectEstimatorForm |
| `business_size` | solo, 2_10, 11_50, 51_250, 251_plus | Advisor + Estimate | ✅ هر دو فرم |
| `city_scale` | metropolitan, small_city | Advisor + Estimate | ✅ هر دو فرم |
| `team_size` | solo, 2_5, 6_20, 21_plus | Advisor + Estimate | ✅ هر دو فرم |
| `goal` | automate_processes, improve_customer_support, increase_sales, improve_analytics, digitize_services, adopt_ai, improve_security, integrate_systems, reduce_costs (حداکثر ۵ انتخاب، بدون تکراری) | Advisor + Estimate | ✅ هر دو فرم (چک‌باکس) |
| `delivery_scope` | prototype(2 روز), mvp(5), integrated_mvp(10), multi_module_platform(15) — seed `EstimationRule` | **فقط Estimate** (ورودی) + `AIConcept.delivery_scope` (خروجی) | ProjectEstimatorForm · کارت مفهوم (نمایش برچسب) |
| `solution_area` | web_platform, mobile_app, workflow_automation, ai_assistant, data_analytics, cybersecurity, customer_crm, saas_product, other | **فقط خروجی** `AIConcept.solution_area` (در input انسان هرگز نمی‌نشیند) | نمایش برچسب روی کارت مفهوم — `/ai/catalogs/?keys=solution_area` **هرگز صدا زده نمی‌شود** |
| `complexity` | simple, standard, complex | **فقط خروجی** `AIConcept.complexity` | نمایش برچسب — هرگز fetch نمی‌شود |

### ۴.۲ خلاصهٔ گزینه/کاتالوگ استفاده‌نشده

**کاتالوگ‌هایی که فرانت هیچ‌گاه `keys=` آن‌ها را fetch نمی‌کند ولی دادهٔ آن‌ها در payload مفاهیم جاساز است:**
`solution_area`، `complexity` — طبق طراحی (زبان خروجی فقط از سمت سرور) درست است، ولی در قرارداد
بازنویسی باید صریح شود که فرانت **نباید** آن‌ها را از endpoint عمومی جدا fetch کند.

**گزینه‌هایی که هیچ‌کدام از مسیرهای کاربر آن‌ها را تولید/ارسال نمی‌کند (گزینهٔ مرده از دید محصول):**
هیچ‌کدام — همهٔ ۶۱ گزینه حداقل در یک مسیر فرم در دسترس‌اند (به جدول ۴.۱ مراجعه کنید).

**گپ واقعی از دید عملیات:**

| مورد | وضعیت | پیامد |
|---|---|---|
| `EstimationRule` برای `delivery_scope` در DB خالی باشد | `/ai/estimates/` با `minimum_working_days=null` پاسخ می‌دهد؛ فرانت پیام `estimateUnavailable` نشان می‌دهد | الزام به seed در محیط مقصد (seed از migration `0002` انجام می‌شود؛ در صورت flush دستی DB باید تکرار شود) |
| `PromptTemplate`/`GuardrailRule` (advisor) غایب باشند | پایپ‌لاین advisor خطای `provider_unavailable`/`generation_failed` برمی‌گرداند؛ endpoint با `AIRequestError` پاسخ 5xx می‌دهد | فرانت فرم مشاور را باید با حالت «سرویس در دسترس نیست» مدیریت کند — امروز `CreativeAdvisorForm` پیام `requestError` را نشان می‌دهد؛ باید در بازنویسی حفظ شود |
| `EstimationRule.note_fa/note_en` | هیچ endpoint عمومی‌ای این یادداشت را برنمی‌گرداند (فقط ادمین می‌بیند) | بدون گپ UI |
| `AIContentArtifact` (ai_summary) | وضعیت `draft/approved/rejected`؛ فقط `approved` و `is_stale=False` با تطبیق `source_hash` نمایش می‌یابد | الزام به تأیید ادمین پس از هر ویرایش مقاله — در بازنویسی بدون تغییر |

### ۴.۳ فیلترهای taxonomy/جست‌وجوی declaration شده ولی بی‌مصرف (نهایی)

`services/categories__slug` · `services/tags__slug` · `services/is_featured` ·
`projects/categories__slug` · `projects/tags__slug` · `projects/year` · `projects/is_featured` ·
`academy/level` · `academy/categories__slug` · `academy/tags__slug` · `academy/is_featured` ·
`blog/categories__slug` · `blog/tags__slug` · پارامتر `search` روی هر ۴ ViewSet ·
`taxonomy/categories/?scope=` · `taxonomy/tags/?search=` · `company/testimonials/?featured=` ·
`ordering` روی همه (به‌جز مقادیر استفاده‌شده: `order`, `-year`, `-published_at`) ·
`page_size` (استفاده‌شده با مقدار ۱۰۰).

---

## ۵. بخش ج — سئو/مدیا/احراز هویت؛ چه چیزی جاافتاده یا خارج از قرارداد هدف است

### ۵.۱ سئو

| # | مورد | وضعیت امروز | وضعیت مطلوب (معماری هدف) | تسک |
|---|---|---|---|---|
| S1 | JSON-LD «Organization/WebSite» روی همهٔ صفحات (`siteJsonLd`) | ✅ کامل (از `getSeoSettingsOrDefaults`) | Django (build_seo_settings_payload موجود) — حفظ همان ۶ اسکیما: Organization, WebSite, BreadcrumbList, Article, Course, FAQPage | F4-010, F4-013 |
| S2 | BreadcrumbList | ✅ روی خدمت/پروژه/پست/دوره | Django — همان مسیرها | F4-013 |
| S3 | Article (پروژه؟ نه — پروژه `articleJsonLd` دارد؛ محصول در سایت امروز بدون Product schema است) | ◐ (پروژه‌ها Article می‌گیرند؛ پیشنهاد: `Product`+`Offer` فقط در صورت فروش واقعی — تصمیم مالک) | Django | F4-013, F4-037 |
| S4 | Course | ✅ `courseJsonLd` | Django — حفظ | F4-013 |
| S5 | FAQPage | ✅ خانه/خدمت/تماس فقط | گسترش اختیاری به پروژه/دوره/پست (فقط اگر ادمین FAQItem ثبت کند) — امروز کد فرانت آن را نمی‌خواند | F4-012 |
| S6 | Service | ✅ `serviceJsonLd` | Django — حفظ | F4-013 |
| S7 | `sitemap.xml` پویا با alternates hreflang ×۲ (fa/en) + lastmod + priority | ✅ Next (`sitemap.ts`) | **Django باید مستقیم سرو کند** (sitemap index با ۵ بخش `pages,services,projects,blog,academy` از `build_sitemap_entries`) | F4-016 |
| S8 | `robots.txt` با Disallow از `SEO_NOINDEX_PATHS` + `SYSTEM_NOINDEX_PATHS` فرانت + `/advisor/results/*` | ✅ Next (`robots.ts`) | Django — همان منطق (`is_safe_redirect_target`، merge دو منبع) | F4-015 |
| S9 | ریدایرکت ۳۰۱/۳۰۲/۴۱۰ از ادمین (جدول `Redirect` + `RedirectFallbackMiddleware` + hit_count) | ◐ فرانت (`proxy.ts` + `redirect-cache.ts` درون‌حافظه‌ای 60s/backoff 30s/SWR 10m) | میدلور جنگو مستقیم؛ حذف `FRONTEND_REVALIDATE_URL`/`redirect-cache` | F4-014 |
| S10 | OpenGraphImage ۱۲۰۰×۶۳۰ per-locale با Vazirmatn | ✅ (`next/og` satori؛ با محدودیت wOF2→woff) | **Pillow `OpenGraphImageView`** (تازهٔ ADR-0031) با `STATIC brand/emmett-wordmark.png` و Cache | F4-011 |
| S11 | متا noindex برای `/profile`, `/search`, `/advisor`, `/estimate`, `/advisor/results/*` | ◐ صفحه‌ها (`metadata.robots` + `X-Robots-Tag` API) ولی `X-Robots-Tag` در سطح Django برای صفحات SPA هدف باید اضافه شود | Django middleware/header برای مسیرهای اپ | F4-010, F4-050 |
| S12 | RSS blog/academy با زبان (`?language=`، لینک مطلق از `PUBLIC_SITE_URL`، atom:self) | ◐ (بازنشر Node؛ کش 60 vs 900 ناسازگار) | Django مستقیم روی `/blog/rss` و `/academy/rss` (حذف Route Handler) | F4-017, F4-018 |
| S13 | `hreflang`/canonical/alternates از `buildPageMetadata` | ✅ | Django (همان `absoluteUrl`/`languageAlternates`) | F4-010, F4-013 |
| S14 | تأیید Search Console (`google-site-verification`) | ✅ از `seo.settings` | حفظ با `SiteSettings.search_console_verification` | F4-010 |
| S15 | X-Robots-Tag روی پاسخ‌های API: `no-store` + `noindex` برای AI | ✅ بک‌اند ست می‌کند (`AdvisorCreateView`, `SharedSuggestionView`) ولی **`ProjectEstimateView` فقط `no-store` دارد و `noindex` ندارد** | اصلاح جزئی در بک‌اند فاز ۳/۴ (خارج از دامنهٔ فاز ۱؛ فقط گزارش) | F4-013 |
| S16 | `Cache-Control` لیست‌ها/جزئیات در بک‌اند | ∅ ست نمی‌شود؛ فرانت امروز `revalidate=60` می‌چسباند؛ Django در هدف باید `s-maxage` مناسب برای صفحه‌های عمومی بدهد یا WhiteNoise فایل را سرو کند | F4-004 |

### ۵.۲ مدیا

| # | مورد | وضعیت امروز | گپ | تسک |
|---|---|---|---|---|
| M1 | URL رسانه از `core.Media.file.url` → `/media/...`؛ بک‌اند در DEBUG=False مسیر media را **سرو نمی‌کند**؛ فرانت با Route Handler فایل را از `MEDIA_ROOT` می‌خواند یا به بک‌اند fallback می‌کند | ◐ | طبق معماری هدف، Apache/Passenger مستقیم `/media/` را سرو می‌کند (بدون پروسهٔ Node) — باید در runbook دیپلوی قید شود؛ `Media.file.url` همان `/media/...` می‌ماند | F4-005, F4-060 |
| M2 | بهینه‌سازی تصویر (AVIF/WebP، srcset، sizes، lazy-loading) | ✅ `next/image` در ۱۴ فایل | جایگزین تصویری سبک (مثلاً `<img loading="lazy" decoding="async" sizes>` یا تصویر پیش‌محاسبه‌شده) — بدون `next/image` در React؛ کیفیت Lighthouse ≥95 باید با اندازهٔ واقعی حفظ شود | F4-004 |
| M3 | `og_default_image` ادمین (1200×630) | ✅ استفاده در `buildPageMetadata` fallback | حفظ در Django OG | F4-011 |
| M4 | `Media.alt_text/caption` دوزبانه | اجازها ترجمه می‌شوند (`translation.py` core) ولی فرانت **همیشه `alt=""`** جز در برخی تصاویر (project/cover/team) پاس می‌کند | الزام: در بازنویسی از `alt_text` واقعی استفاده شود (اکنون با `Image alt=""` → امتیاز a11y از دست رفته است) | F4-032, F4-037, F4-042 |
| M5 | `default_og_image` نسبی/مطلق | `toAbsoluteMediaUrl` هندل می‌کند | حفظ | F4-013 |
| M6 | محدودیت حجم/امضای فایل (`MEDIA_MAX_IMAGE_SIZE_MB=5`, document=10, extension whitelist, `validate_media_file_signature`) | ✅ بک‌اند | بدون تغییر — ادمین فاز ۲ باید هنگام آپلود پیام خطای فارسی نشان دهد | F4-060 |
| M7 | URLهای مطلق رسانه در JSON-LD/OG | `absolute_localized_url` در بک‌اند | حفظ | F4-013 |
| M8 | remotePatterns/next `/_next/image` hot-link | حذف می‌شود؛ هر تصویری از `MEDIA_URL` همان‌دامنه است | F4-005 |

### ۵.۳ احراز هویت و امنیت

| # | مورد | وضعیت امروز | گپ / اقدام | تسک |
|---|---|---|---|---|
| A1 | Session cookie + `csrftoken`؛ `ensure_csrf_cookie` روی `GET /auth/csrf/`؛ `X-CSRFToken` در فرانت؛ `credentials: include` | ✅ | در React+fetch کلاً یکسان — فقط نصب `Accept-Language` و مسیر `/api/v1` مستقیم (بدون پراکسی) کافی است | F4-020 |
| A2 | ثبت‌نام/ورود با `email` (نه username)؛ `public_id` UUID؛ پسورد ≥ ۱۰ کاراکتر + validators جنگو | ✅ | بدون تغییر | F4-021 |
| A3 | `LoginLockout` (۵ تلاش / ۹۰۰ ثانیه → قفل ۹۰۰ ثانیه، پاسخ ۴۲۹ + `Retry-After` + پیام فارسی) برای `/auth/login/` و فرم ادمین | ✅ | پاسخ ۴۲۹ را در فرم ورود فرانت نمایش دهید (امروز فرم فقط `detail` را نشان می‌دهد — برای 429 پیام جنرال `error` می‌آید؛ باید تفکیک شود) | F4-021 |
| A4 | Throttleها: `auth 10/h`, `contact_form 5/h`, `ai_engine 20/h`, `newsletter 3/day`, anon 100/h, user 1000/h | ✅ | بدون تغییر؛ پیام خطای ۴۲۹ در فرم‌ها (امروز فرم‌ها فقط `detail` را چاپ می‌کنند — محدودیت واقعی حفظ می‌شود) | F4-021, F4-030, F4-050 |
| A5 | ۲FA TOTP فقط برای ادمین (`/admin/2fa/*`، `django-otp`)؛ اجبار staff با `ADMIN_2FA_REQUIRED` | ✅ (فاز ۲ بازسازی می‌کند) | بدون تغییر در منطق؛ پوستهٔ HTML کاستوم در فاز ۲ بازنویسی می‌شود | — (فاز ۲) |
| A6 | `INTERNAL_API_TOKEN` و `FRONTEND_REVALIDATE_*` پل‌های Node↔Django | ◐ ضروری امروز | در معماری هدف حذف می‌شوند (همه‌چیز در یک Passenger) — بعد از اتمام فاز ۴ حذف و `scripts/check_secrets.py` سبز نگه داشته می‌شود | F4-006, F4-064 |
| A7 | کوکی‌های سشن در چند دامنه (subpath `/backend`) — `FORCE_SCRIPT_NAME` | ◐ (cPanel subpath) | در هدف تک‌دامنهٔ ریشه است؛ `Django FORCE_SCRIPT_NAME` خالی — باید در `.env` تولیدی و مستندات دیپلوی شفاف شود | F4-060 |
| A8 | XSS: Markdown → `nh3` (بک‌اند) + `sanitize-rich-html` (فرانت با `sanitize-html`) دو لایه | ✅ | در React هم همان sanitize باقی بماند؛ **هرگز** `dangerouslySetInnerHTML` بدون sanitize | F4-004, F4-034 |
| A9 | کامنت مهمان ممنوع (IsAuthenticated)؛ تمام کامنت‌ها `pending` تا تأیید ادمین | ✅ | حفظ؛ متن فارسی «در انتظار تأیید» کافی است | F4-043 |
| A10 | CSRF روی فرم‌های عمومی (contact/advisor/estimate/comment/enrollment) — `csrf_protect` | ✅ | حفظ — در React هم `ensureCsrfCookie` قبل از POST | F4-020, F4-030, F4-050 |
| A11 | CSP فرانت: امروز `script-src 'self' 'unsafe-inline'` (تعمدی، بدون nonce — ADR-0042/0041)؛ در هدف، CSP سطح Django (`build_csp_policy`) کفایت می‌کند؛ هدرهای `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` در دو لایه تکراری‌اند ولی بی‌خطر | ◐ | یک سیاست واحد در Django (`django-csp` یا همان SecurityHeadersMiddleware) — حذف نسخهٔ فرانت | F4-004, F4-010 |
| A12 | نرخ/قفل کامنت و enrollment برای مهمان: `enroll`/`comment` فقط با session کار می‌کنند | ✅ | حفظ | F4-040, F4-043 |
| A13 | `AuditLog` (حذف نرم/بازیابی/ورود/ریجستر/تغییر وضعیت لید/۲FA) | ✅ بک‌اند | فقط ادمین — فاز ۲ | — (فاز ۲) |

---

## ۶. به‌روزرسانی `docs/cms-content-inventory.md` → نسخهٔ ۲ (خلاصهٔ تغییرات)

فایل مستقل [`docs/cms-content-inventory.md`](../cms-content-inventory.md) به v2 ارتقا یافت.
تغییرات اصلی:

1. وضعیت سند از «Baseline inventory» به «**v2 — قرارداد مهاجرت (۲۰۲۶-۱۱-۰۶)**» تغییر کرد و
   به این سند ارجاع داده شد.
2. بخش ۲ (محتوای دیتابیسی) با **ستون‌های جدید «مصرف واقعی در فرانت امروز» و «تسک فاز ۴»**
   برای هر ۱۰ نوع محتوا تکمیل شد (Services/Projects/Blog/Academy/Company/FAQ/Settings/Media/Leads/AI).
3. بخش ۳ (محتوای تعبیه‌شده در فرانت) با یافته‌های تأییدشدهٔ این ممیزی (hero، محصولات نمونه،
   slotهای `ui.*`، `home-data.ts`) و با تسک متناظر به‌روز شد.
4. بخش ۸ تازه: **«شکاف‌های نمایش»** — فهرستی از فیلدها/endpointهای موجود-ولی-بی‌مصرف
   (G4–G7, بخش ۳.۳ و ۳.۴ بالا) تا مالک محتوا و فاز ۴ آن‌ها را اعمال کنند.
5. بخش ۹ تازه: **«پذیرش نهایی محتوا»** — چک‌لیست قبل از انتشار تولیدی (تأیید ادمین روی
   ai_summary، مقداردهی EstimationRule، ترجمه‌های site.copy، alt_text تصاویر).
6. هیچ بند قراردادی v1 حذف نشد؛ فقط راستی‌آزمایی فنی افزوده شد (سند v1 «فعال بودن» گمانه‌ها را
   با اندازه‌گیری جایگزین کرد).

---

## ۷. نگاشت سطر→تسک فاز ۴ (رجیستری تسک‌های فاز ۴ + ماتریس ردیابی)

### ۷.۱ رجیستری تسک‌های فاز ۴ (فرانت Vite+React+۱۹ Router 6+TS strict+Tailwind موجود)

> شماره‌گذاری `F4-0xx`؛ «دامنه» یعنی فقط همین تسک را تغییر می‌دهد. هر تسک با معیار پذیرش
> خودش و با حفظ پیکسل‌به‌پیکسل ظاهر (قانون ۳ پرامپت) تعریف می‌شود. ADR لازم برای هر تصمیم
> جدید طبق قانون ۷ — شماره‌های بعدی `0043+` در `docs/adr/` ثبت می‌شوند.

**زیرساخت و بیلد (F4-001…F4-006)**

| تسک | عنوان | وابستگی |
|---|---|---|
| F4-001 | اسکافولد Vite 5 + React 18 + React Router 6 (`createBrowserRouter`) + TS strict در `frontend/` (پوشهٔ Next در `frontend/` آرشیو به شاخهٔ `archive/nextjs` یا پوشهٔ `frontend-nextjs/` طبق تصمیم ADR آتی)، اسکریپت‌های CI/Doc/Makefile به Vite سوییچ می‌شوند | — |
| F4-002 | پورت سیستم توکن: `globals.css`/`ui-theme.css` (Emerald/Obsidian) + فونت‌های self-hosted (وزیرمتن/Inter/JetBrains Mono) + Tailwind config فعلی — بدون هیچ تغییر رنگ/فاصلهٔ بصری (hardcoded-colors ratchet حفظ می‌شود) | F4-001 |
| F4-003 | جایگزینی next-intl با `react-i18next` (fa پیش‌فرض RTL، en → `/en/*` LTR) + `frontend/messages/fa|en.json` بدون تغییر + overlay جدولی `site.copy` از `/api/v1/site-content/translations/?locale=` (حفظ `mergeDatabaseMessages` و رفتار fallback) | F4-001 |
| F4-004 | لایهٔ سرو: خروجی `vite build` → `backend/static/frontend/`؛ `WhiteNoise` فقط فایل‌های fingerprinted همان پوشه را سرو می‌کند؛ SPA fallback برای مسیرهای غیر `/api|/static|/media|/admin` به `index.html` (دراستخوان HTML پوسته با متای اولیهٔ قابل‌جایگزینی در زمان درخواست؟ — تصمیم در ADR) + preload فونت‌ها + حذف کامل هر Node از پروداکشن | F4-002 |
| F4-005 | حذف لایهٔ پروسی Node: `/api/[...path]`, `/media/[...path]`, ISR/revalidate webhook, `redirect-cache.ts`, `next.config.ts` (redirects/headers/images) — سرو مستقیم `/api/v1`, `/media`, `/static` توسط Django/Apache؛ ریدایرکت RSS و `/products/pentestor` به Django (htaccess یا view) منتقل می‌شوند | F4-004 |
| F4-006 | حذف `INTERNAL_API_TOKEN`/`FRONTEND_REVALIDATE_URL`/`FRONTEND_REVALIDATE_SECRET` از تنظیمات و `.env.example` + سبز نگه‌داشتن `scripts/check_secrets.py` + به‌روزرسانی `.github/workflows/ci.yml` و `deploy_frontend.sh` به بیلد Vite | F4-001 |

**سئو در Django (F4-010…F4-018)**

| تسک | عنوان |
|---|---|
| F4-010 | لایهٔ متای HTML پوسته در Django: title/description/canonical/hreflang/OG/Twitter از `build_seo_settings_payload` + `SEOMetaModel` هر مدل + `default_locale`؛ `X-Robots-Tag: noindex,nofollow` برای `/advisor,/advisor/results/*,/estimate,/profile,/search` + `Cache-Control: no-store` برای AI |
| F4-011 | `OpenGraphImageView` (۱۲۰۰×۶۳۰، Pillow، فونت Vazirmatn self-hosted) per-locale با کش `Cache-Control: public,max-age=…` + تست byte-size/MIME |
| F4-012 | مصرف `SEOFAQView` در Django برای تولید `<script type="application/ld+json">` FAQPage وقتی `FAQItem` برای مسیر وجود دارد (همان ۳ مسیر فعلی + قابل‌تعمیم به ۴ مسیر دیگر در صورت خواست مالک) |
| F4-013 | پیاده‌سازی ۶ اسکیمای JSON-LD در قالب/پاسخ Django: Organization, WebSite, BreadcrumbList, Article, Course, FAQPage (سرویس `serviceJsonLd` معادل در Django) — parity تست با خروجی امروز فرانت |
| F4-014 | ریدایرکت ۳۰۱/۳۰۲/۴۱۰ از جدول `Redirect` با `RedirectFallbackMiddleware` برای مسیرهای ۴۰۴ + `hit_count` + `SEO_REDIRECTS_CACHE_SECONDS=300`؛ حذف کامل `proxy.ts`؛ پاریته رفتار با پیاده‌سازی فعلی (410 → صفحهٔ گن با `X-Robots-Tag: noindex`) |
| F4-015 | `robots.txt` مستقیم از Django: `SEO_NOINDEX_PATHS` + `SYSTEM_NOINDEX_PATHS` + `/advisor/results/*` برای هر دو زبان + `Sitemap:` absolute |
| F4-016 | `sitemap.xml` (یا index با ۵ بخش) مستقیم از Django با `SEO_SITEMAP_CACHE_SECONDS=900` + hreflang/priority/changefreq طبق `build_sitemap_entries` |
| F4-017 | `GET /blog/rss` → فید Django مستقیم (`LatestBlogPostsFeed`) با `?language=fa|en`، لینک absolute `PUBLIC_SITE_URL`، `application/rss+xml`؛ حذف Route Handler و ناهماهنگی 60/900 |
| F4-018 | همانند F4-017 برای `/academy/rss` |

**احراز هویت و حساب کاربری (F4-020…F4-022)**

| تسک | عنوان |
|---|---|
| F4-020 | کلاینت API در React: `credentials: 'include'`, `ensureCsrfCookie` (GET `/auth/csrf/` یک‌بار)، هدر `X-CSRFToken` + `Accept-Language` از state زبان؛ یک `clientFetch` سراسری با تایپ کامل و مدیریت ۴۰۱/۴۲۹/۵۰۰ |
| F4-021 | صفحه/مودال `/profile`: ورود/ثبت‌نام/خروج (پیام ۴۲۹ با شمارش معکوس از `Retry-After`) + **فرم ویرایش پروفایل** (`PATCH /auth/me/` با first/last/phone/bio/locale_preference/job_title/company_name) + نمایش وضعیت ایمیل/تلفن |
| F4-022 | دکمه‌های «علاقه‌مندی» روی کارت‌های محتوا (service/project/course/blog) با `POST /auth/favorites/add/`/`DELETE /auth/favorites/<pk>/` از همان `public_id`های صفحه + لیست علاقه‌مندی‌ها در پروفایل با حذف + شمارنده |
| F4-023 | مدیریت خطای اعتبار/زمان: توست‌کردن پیام `detail` فارسی از بک‌اند برای همهٔ فرم‌ها (contact/newsletter/advisor/estimate/lead/comment/enroll/login) به‌جای fallback جنرال |
| F4-024 | ثبت‌نام: هدر `Retry-After` و ریسپانس ۴۲۹؛ و بازیابی تلاش پس از قفل (پیام «چند دقیقه دیگر») |

**محتوا و صفحات (F4-030…F4-045)**

| تسک | عنوان |
|---|---|
| F4-030 | `/contact`: ContactForm (پراپ Catalogs از `/ai/catalogs/?keys=project_type,budget_range,timeline`) + NewsletterForm + بلوک FAQ از بک‌اند — با پیام‌های throttle 5/h و 3/day قابل‌فهم |
| F4-031 | صفحهٔ خانه: همان سکشن‌های امروز (جنگو هیچ بخشی را رندر نمی‌کند؛ خروجی **دادهٔ** API با همان `home-data.ts` mapping و همان `map*` functionهای typed) — فقط جایگزینی ماژول‌های data-fetching؛ CTA جدید مشاور/تخمین طبق F4-051 (با تأیید مالک برای تغییر ظاهر) |
| F4-032 | تصاویر: `<img loading="lazy" decoding="async">` + `sizes` + AVIF/WebP توسط Apache (mod_mime/directives در `backend/deploy/public_html.htaccess.example`) یا پیش‌محاسبهٔ تصاویر موجود — **بدون** next/image |
| F4-033 | `/services`: همان grid؛ افزودن فیلتر اختیاری (؟) — امروز فیلتر در شبکه نیست؛ اگر مالک خواست ← select دسته/تگ + جست‌وجو (پارامترهای آمادهٔ بک‌اند) |
| F4-034 | `/services/[slug]`: Breadcrumb + JSON-LD (Service, BreadcrumbList, FAQ) + Markdown sanitize شده؛ alt واقعی از `Media.alt_text` |
| F4-035 | `/products` و `/products/crm` (ComingSoon) + `/products/pentestor` → ریدایرکت 301 به `/projects/pentestor` (Django) |
| F4-036 | `/projects`: grid + فیلتر اختیاری (صنعت=categories__slug, تکنولوژی=tags__slug, سال=year) در صورت تأیید مالک؛ حفظ نشان `is_product` |
| F4-037 | `/projects/[slug]`: هر ۷ بخش case-study از `case_study.*_html` + `technology_stack` + `metrics` + gallery + لینک خدمت منبع (`service_slug` — امروز بی‌استفاده؛ امروز باید لینک شود یا حذف فیلد از serializer) + article JSON-LD |
| F4-038 | محصولات: همان grid با `is_product=true`؛ `/products/crm` همان ComingSoon (تغییر نمی‌کند) |
| F4-039 | `/academy`: grid + فیلتر اختیاری level؛ لینک RSS |
| F4-040 | `/academy/[slug]`: CourseDetail + لیست Lessons (preview) + EnrollButton (کنترل 401 → prompt ورود) + courseJsonLd؛ Enrollment status/progress در پروفایل |
| F4-041 | کامنت‌ها: تو در تو (parent) یا لیست تخت با badge وضعیت؟ — تصمیم مالک؛ حداقل پاریتهٔ امروز + نمایش `status` در پیام موفقیت («در انتظار تأیید») |
| F4-042 | `/about`: تیم + نظرها (testimonials) با `featured=true` اختیاری؟ امروز همه را نشان می‌دهد؛ افزودن alt واقعی عکس‌ها از `Media.alt_text`؛ `social_links` نمایش یا حذف فیلد |
| F4-043 | `/blog/[slug]`: کامل + `view_count` نمایش (badge «N بازدید») یا حذف فیلد از serializer؛ ai_summary دست‌نخورده (شرط approved + source_hash)؛ TOC از `extract_toc` |
| F4-044 | `/search`: فرم + نتایج (url_path) + شمارنده؛ ⌘K پالت با همان `globalSearch` کلاینتی (مستقل از router) + حالت‌های خطا/خالی؛ `SYSTEM_NOINDEX_PATHS` ← noindex |
| F4-045 | `/design-system`: پورت همان صفحه (داخلی) + `noindex` + فقط dev-flag در هدف (یا حذف از بیلد تولید؟ تصمیم مالک) |

**AI نمایان (F4-050…F4-052)**

| تسک | عنوان |
|---|---|
| F4-050 | `/advisor`, `/advisor/results/[token]`, `/ai/catalogs` مصرف‌کننده‌ها — انتقال کامل با همان رفتار (noindex, share_token، copy link، AdvisorLeadForm، rate-limit صفحه) به React؛ مسیر صحیح `POST /api/v1/ai/leads/` |
| F4-051 | **نمایان‌سازی**: حداقل یک نقطهٔ ورود نمایان در ناوبری اصلی (desktop+mobile) یا بخش CTA در صفحهٔ خانه/فوتر برای «مشاور ایده‌پرداز» (با حفظ قانون عدم تغییر ظاهر موجود → به‌صورت الحاقی، با تأیید مالک)؛ حفظ پالت ⌘K |
| F4-052 | `/estimate` + همان رفتار؛ لینک متقابل `/advisor` ↔ `/estimate` |

**کیفیت، تست، دیپلوی (F4-060…F4-066)**

| تسک | عنوان |
|---|---|
| F4-060 | `DEPLOYMENT.md`/runbook جدید: Passenger WSGI فقط، `collectstatic`، Apache `/media/` + `/static/`، `.htaccess` نهایی، health-check پس از دیپلوی؛ `scripts/deploy_backend.sh` بدون مرحلهٔ Node |
| F4-061 | CI: `.github/workflows/ci.yml` — حذف جاب‌های Node (`frontend-quality`, `frontend-test-build`, e2e/LHCI) یا جایگزینی با بیلد Vite + تست؛ `backend-quality` دست‌نخورده؛ `security-scan` سبز |
| F4-062 | Playwright e2e (۳۲ spec) معادل‌سازی با React (مسیرها، RTL، شبکه، AI forms، profile-auth) + `b` — `make e2e-and-lighthouse` سبز با LHCI ≥ 95 روی ۴ محور |
| F4-063 | پاریتهٔ پیکسل: تأیید مالک/قبولی تست `hardcoded-colors` + `ui-tokens` + اسکرین‌شات‌های مقایسه‌ای قبل/بعد (همان `design-system.spec.ts`) |
| F4-064 | حذف `.env`های Node-ish؛ `PUBLIC_SITE_URL` یکتای دامنه؛ `.env.example` به‌روز؛ `check_secrets` سبز؛ ADR-0043+ برای تصمیمات (serving WhiteNoise، CSP واحد، ریدایرکت‌ها) |
| F4-065 | mypy strict backend بدون خطا (`make mypy`)؛ ruff؛ spectacular `--validate --fail-on-warn`؛ eslint/tsc strict فرانت بدون خطا (`npm run typecheck && npm run build`) |
| F4-066 | به‌روزرسانی `ARCHITECTURE.md`, `README.md`, `CHANGELOG.md` (بدون هیچ اشاره به ابزار هوش مصنوعی), `docs/adr/0043+.md` و `docs/adr/README.md`؛ `PRODUCTION` checklist |

### ۷.۲ ماتریس ردیابی: هر ردیف بخش ۲/۳/۴/۵ ← تسک فاز ۴

| ردیف | تسک فاز ۴ |
|---|---|
| الف-۱ ردیف‌های 1–2 (health) | F4-060 |
| الف-۱ ردیف 3 (search) | F4-044 |
| الف-۱ ردیف 4 (seo/settings) | F4-010, F4-013 |
| الف-۱ ردیف 5 (seo/sitemap) | F4-016 |
| الف-۱ ردیف 6 (seo/redirects) | F4-014 |
| الف-۱ ردیف 7 (seo/faq) | F4-012, F4-034 |
| الف-۱ ردیف‌های 8–10 (schema) | F4-061 |
| الف-۱ ردیف 11 (site-content) | F4-003 |
| الف-۱ ردیف 12 (csrf) | F4-020 |
| الف-۱ ردیف‌های 13–16 (register/login/logout/me) | F4-021 |
| الف-۱ ردیف 17 (PATCH me) | F4-021 |
| الف-۱ ردیف‌های 18–20 (favorites) | F4-022 |
| الف-۱ ردیف‌های 21–24 (taxonomy) | F4-033, F4-036, F4-039, F4-042 |
| الف-۱ ردیف‌های 25–28 (team/testimonials) | F4-042, F4-031 |
| الف-۱ ردیف‌های 29–30 (services) | F4-033, F4-034 |
| الف-۱ ردیف‌های 31–32 (projects) | F4-036, F4-037 |
| الف-۱ ردیف‌های 33–37 (academy+enrollments) | F4-039, F4-040 |
| الف-۱ ردیف‌های 38–41 (blog+rss+comments) | F4-042, F4-043, F4-017 |
| الف-۱ ردیف 42–43 (leads/newsletter) | F4-030 |
| الف-۱ ردیف‌های 44–48 (ai/*) | F4-050, F4-051, F4-052, F4-051 |
| الف-۲ ردیف‌های 49–51 (admin/2fa/i18n) | — (فاز ۲) |
| الف-۲ ردیف‌های 52–53 (RSS فرانت) | F4-017, F4-018 |
| الف-۲ ردیف‌های 54–56, 62 (proxy/media/revalidate/_next) | F4-005, F4-006 |
| الف-۲ ردیف‌های 57–58 (sitemap/robots) | F4-015, F4-016 |
| الف-۲ ردیف 59 (og-image) | F4-011 |
| الف-۲ ردیف‌های 60–61 (products/crm, pentestor) | F4-035, F4-038 |
| بخش ۳.۲ (نمایان‌سازی AI) | F4-050, F4-051, F4-052 |
| بخش ۳.۳ (فیلدهای بی‌مصرف) | F4-031..F4-044 (هر صفحه) + F4-065 (حذف فیلدهای مرده از serializers در صورت تصمیم مالک) |
| بخش ۳.۴ (endpointهای ∅) | F4-021, F4-022, F4-034, F4-036, F4-039, F4-042 |
| بخش ۳.۵ (فیلترهای بی‌مصرف) | F4-033, F4-036, F4-039, F4-042 |
| بخش ۴ (کاتالوگ‌ها) | F4-050, F4-052, F4-030 |
| بخش ۵.۱ S1–S16 | F4-010..F4-018 |
| بخش ۵.۲ M1–M8 | F4-004, F4-005, F4-032, F4-037 |
| بخش ۵.۳ A1–A13 | F4-020..F4-024, F4-060, F4-064 |
| G13 (حذف پل‌های Node) | F4-006, F4-064 |
| G14 (CI/داک‌های frontend-*) | F4-001, F4-061, F4-066 |

**پوشش: تمام ۶۲ ردیف بخش ۲ و تمام یافته‌های بخش‌های ۳–۵ به تسک فاز ۴ نگاشت شده‌اند.**
تنها ردیف‌های غیرنگاشت‌شده فاز ۲ (ادمین) هستند که طبق پرامپت فاز بعدی‌اند.

---

## ۸. معیار پذیرش و دروازهٔ ورود به فاز ۲

- [x] تمام ۱۱ اپ اسکن و همهٔ managerهای اصلی (`models/serializers/views(/viewsets)/urls/admin/translation`) خوانده شد.
- [x] جدول ۶۲ سطری بخش ۲ شامل method/serializer/model/permission/throttle/cache/مصرف فرانت است.
- [x] بخش ۳ نگاشت کامل ۲۲ مسیر، شواهد پنهان‌بودن AI، فیلدهای بی‌مصرف.
- [x] بخش ۴ موجودی کامل ۱۱ کاتالوگ (۶۱ گزینه) و فیلترهای taxonomy استفاده‌نشده.
- [x] بخش ۵ شکاف‌های سئو/مدیا/احراز هویت.
- [x] بخش ۷ رجیستری تسک‌های فاز ۴ (F4-001…F4-066) + ماتریس ردیابی — هر ردیف نگاشت شد.
- [x] `docs/cms-content-inventory.md` به v2 ارتقا یافت.
- [ ] **تأیید مالک محصول روی این سند (و روی v2 فایل اینتventory) — تا پیش از آن وارد فاز ۲/۳/۴ نمی‌شویم.**

---

## پی‌نوشت روش (قابل بازتولید)

```bash
# بک‌اند — آمار مدل‌ها و ثبت‌ها
cd backend && grep -c "^class " apps/*/models.py
grep -h "@admin.register" apps/*/admin.py | wc -l
# endpointها
grep -h "path(" apps/*/urls.py config/urls.py apps/ai_engine/*/urls.py
# فرانت — مسیرها
cd ../frontend && find src/app -name "page.tsx" -o -name "route.ts" | sort
# مصرف‌کننده‌های API در فرانت
grep -rn "getServices\|getProjects\|getBlogPosts\|getCourses\|getCatalogs" src --include=*.tsx | wc -l
```

**نکات ایجاد اختلاف با پرامپت (شفاف‌سازی):** نام endpoint «`/ai/advisor/lead`» در پرامپت اشتباه است
(واقعی: `/api/v1/ai/leads/`)؛ «۷۰ مدل» واقعی ۳۵ مدل concrete است؛ «۲۱ روت» واقعی ۲۲ مسیر است.
هیچ‌کدام از این اصلاح‌ها تصمیمی نیست — فقط واقعیت مخزن ثبت شد.
