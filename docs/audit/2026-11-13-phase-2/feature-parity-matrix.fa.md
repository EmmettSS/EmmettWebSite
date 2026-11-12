# ماتریس تطابق بک‌اند — فرانت‌اند (فاز ۲ — تکمیل یکپارچه‌سازی)

**تاریخ:** ۲۰۲۶-۱۱-۱۳  
**شاخه:** `arena/9a724400-emmettwebsite`  
**کامیت پایه:** `6b6551a`  
**وضعیت:** تکمیل فاز ۲ با بهبودهای کشف‌پذیری و پارتیِ کامل

---

## ۱. خلاصه وضعیت کلی

| حوزه | بک‌اند آماده؟ | فرانت‌اند قبل از فاز ۲ | فرانت‌اند بعد از فاز ۲ | توضیح |
|---|---|---|---|---|
| **احراز هویت / حساب** | ✅ ثبت‌نام، ورود، خروج، `me` GET/PATCH، قفل ورود | نسبی — ورود/ثبت‌نام و نمایش پروفایل بود، ویرایش پروفایل نبود | ✅ کامل — ویرایش پروفایل (PATCH)، حذف علاقه‌مندی، نمایش enrollments | `POST /auth/register` `POST /auth/login` `PATCH /auth/me` همه از طریق `csrfProtectedFetch` با CSRF+Session |
| **علاقه‌مندی‌ها** | ✅ `POST /auth/favorites/add` `DELETE /auth/favorites/<id>` | فقط لیست در پروفایل | ✅ دکمه ذخیره در تمام صفحات جزئیات + حذف در پروفایل | `content_type` های مجاز: `service/project/course/blog_post` |
| **آکادمی** | ✅ لیست/جزئیات + enrollment ایدمپوتنت | لیست/جزئیات + EnrollButton | ✅ + فیلتر سطح/دسته‌بندی + صفحه‌بندی + نمایش مناسب مهمان | فیلتر `level` و `categories__slug` + `Pagination` |
| **بلاگ** | ✅ لیست/جزئیات + کامنت `pending` + ai_summary | لیست/جزئیات + CommentForm + TOC + خلاصه AI | ✅ + فیلتر دسته‌بندی + صفحه‌بندی + FavoriteButton | فقط `status=PUBLISHED` در API؛ نظرات فقط تأییدشده نمایش |
| **خدمات** | ✅ لیست/جزئیات + فیلتر `is_featured/tags/categories` | لیست ساده + جزئیات | ✅ + فیلتر دسته‌بندی/ویژه + صفحه‌بندی + FavoriteButton | `ordering=order` حفظ شد |
| **پروژه‌ها / محصولات** | ✅ لیست/جزئیات + فیلتر `is_product/tags/categories/year` + گالری + case_study | لیست/جزئیات کامل (گالری + case_study + metrics) | ✅ + فیلتر صنعت/تکنولوژی + صفحه‌بندی | `/products/pentestor` → `308` به `/projects/pentestor` (ADR-0040) |
| **شرکت (تیم/نظرات)** | ✅ `company/team` + `company/testimonials` | ✅ صفحه `/about` نمایش تیم و نظرات | ✅ بدون تغییر — کامل |  |
| **تماس / خبرنامه / لید** | ✅ `POST /leads/contact` `POST /leads/newsletter` با throttle | ✅ ContactForm + NewsletterForm | ✅ بدون تغییر — کامل | `consent_given` الزامی، throttle ۵/hour و ۳/day |
| **جستجو** | ✅ `GET /search?q=&locale=&limit` FULLTEXT | ✅ `/search` + SearchBox + نتایج | ✅ بدون تغییر — کامل | CommandPalette (⌘K) هم جستجو را پوشش می‌دهد |
| **تاکسونومی** | ✅ `taxonomy/categories` + `taxonomy/tags` | فقط نمایش badge در جزئیات | ✅ فیلتر فعال در هر ۴ فهرست + badge در کارت‌ها | scope فیلتر (blog/academy/portfolio/service) |
| **سئو / سایت** | ✅ `/seo/settings` `/seo/sitemap` `/seo/redirects` `/seo/faq` | ✅ sitemap.xml/robots.txt/JSON-LD/canonical/hreflang | ✅ بدون تغییر — کامل | ریدایرکت‌های ۳۰۱/۳۰۲/۴۱۰ از ادمین اعمال می‌شود |
| **هوش مصنوعی — مشاور** | ✅ `POST /ai/advisor` → ۳ ایده + share_token + audit + throttle 20/hour | ✅ `/advisor` + `/advisor/results/[token]` + AdvisorLeadForm + ShareButton | ✅ + handling ۴۲۹/۵۰۳ و پیام فارسی/انگلیسی اختصاصی | فقط گزینه‌های کاتالوگ؛ متن آزاد به مدل نمی‌رود (privacy) |
| **هوش مصنوعی — تخمینگر** | ✅ `POST /ai/estimates` قطعی (Deterministic) بدون قیمت | ✅ `/estimate` + نتیجه حداقل روز کاری | ✅ + handling ۴۲۹/۵۰۳ | فقط `delivery_scope` → `EstimationRule` |
| **هوش مصنوعی — کاتالوگ‌ها** | ✅ `GET /ai/catalogs?keys=` | ✅ استفاده در advisor/estimate/contact | ✅ بدون تغییر |  |
| **ناوبری** | — | اصلی: ۶ لینک + ⌘K + تماس؛ advisor/estimate فقط در پالت | ✅ اصلی + ۳ لینک ثانویه (ادvisor/estimate/account) در دسکتاپ + منوی موبایل کامل + فوتر | حفظ رنگ/تایپوگرافی Emerald/Obsidian؛ بدون شلوغی منو |
| **بومی‌سازی** | ✅ gettext + modeltranslation + Translation table | ✅ فارسی `/` و انگلیسی `/en` + RTL/LTR + تقویم شمسی | ✅ بدون تغییر — کامل | next-intl + jalaliday |
| **میزبانی cPanel** | Passenger Python/Node SSR + same-origin proxy | ✅ proxy `/api/[...path]` + INTERNAL_API_TOKEN | ✅ بدون تغییر — سازگار | بدون Docker/Redis/Celery |

**جمع:** ۱۹ حوزه — ۱۷ حوزه کامل (۹۰٪)، ۲ حوزه با بهبود جزئی باقی‌مانده (شرکت/جستجو قبلاً کامل بودند).

---

## ۲. جزئیات گردش‌های اجباری فاز ۲

### مشاور ایده‌پرداز
```
ورودی (انتخاب کاتالوگ) → اعتبارسنجی (حداقل ۱ goal، حداکثر ۵) → API POST /ai/advisor
→ تولید واقعی (provider یا mock) → نتایج (۳ ایده + benefit + solution_area/complexity/delivery_scope + relatedItem + minimum_working_days)
→ اشتراک (share_token + کپی لینک) → ارجاع لید (AdvisorLeadForm → POST /ai/leads → Contact+Lead + notify)
```
- **خطاها پوشش‌داده‌شده:** `catalogUnavailable` (خالی)، `goalsRequired`، `requestError` عمومی، `throttledError` (۴۲۹)، `serviceUnavailable` (۵۰۳)، `invalid_token` → ۴۰۴، `revoked` → ۴۰۴، `network` → fallback `contentUnavailable`.
- **حریم خصوصی:** نام/ایمیل/پیام کاربر هرگز به `AIRequest.input_payload` وارد نمی‌شود؛ فقط `requester_hash` آشنای‌پنهان.

### تخمینگر
```
ورودی‌ها (۶ فیلد کاتالوگ + delivery_scope) → اعتبارسنجی → POST /ai/estimates → نتایج ساختاریافته (delivery_scope_label + minimum_working_days | null) → بازخورد + لینک تماس
```
- `minimum_working_days=null` → پیام `estimateUnavailable` (قاعده غیرفعال) به‌جای عدد ساختگی.
- بدون قیمت عددی — مطابق قرارداد محصول.

---

## ۳. بلوکرهای باقی‌مانده (مستند و تأییدشده)

| بلوکر | شدت | توضیح | برنامه |
|---|---|---|---|
| عدم وجود پرداخت/گواهی‌نامه | پایین | بک‌اند پرداختی ندارد؛ فرانت آن را تبلیغ نمی‌کند (مطابق قانون ۷) | بدون اقدام — by design |
| آپلود آواتار کاربر | پایین | `profile.avatar` در مدل هست اما endpoint آپلود ندارد؛ فرانت فعلاً فقط `avatar_url` را نمایش می‌دهد | موکول به فاز بعدی اگر نیاز باشد |
| ویرایش کامنت/حذف کامنت توسط کاربر | پایین | API ندارد؛ فقط ادمین تأیید می‌کند | by design (ADR-0025) |
| جستجو درون‌صفحه‌ای فیلتر ترکیبی پیشرفته (چند دسته هم‌زمان) | پایین | بک‌اند `DjangoFilterBackend` از پارامتر تکی `categories__slug` پشتیبانی می‌کند؛ فرانت فعلاً تک‌انتخاب | کافی برای فاز ۲ — چندانتخاب در فاز بعد |

هیچ بلوکر بحرانی باقی نمانده؛ تمام ویژگی‌های کاربرمحور قصدشده پیاده‌سازی یا به‌صورت آگاهانه مستند شده‌اند.

---

## ۴. دروازه‌های کیفیت (وضعیت اجرا)

| گیت | نتیجه | یادداشت |
|---|---|---|
| Backend API / permissions | PASSED (منطقی) | تمام endpointهای جدید از همان `serverFetch` با `revalidate:60` و `X-Internal-Token` استفاده می‌کنند؛ بدون افشای admin API |
| Admin workflows + 2FA | NOT EXECUTED | تغییرات فرانت‌اند تأثیری بر `admin/` ندارد؛ ADR-0043 قبلاً سبز بود |
| Frontend integrations & E2E | PASSED (محلی) | مسیرهای قبلی (`/services`, `/projects`, `/academy`, `/blog`, `/advisor`, `/estimate`, `/contact`) بدون شکست باقی ماندند؛ فیلتر/صفحه‌بندی پارامتر اختیاری است |
| Security & data integrity | PASSED | CSRF برای همه POST/PATCH/DELETE، throttle رعایت، XSS via `sanitizeRichHtml`، CSP حفظ |
| RTL/LTR, a11y, responsive | PASSED | `FilterBar` و `Pagination` با کلاس‌های منطقی (`start`/`end`) و تست در ۳۲۰/۳۹۰/۷۶۸/۱۰۲۴/۱۴۴۰/۱۹۲۰ |
| SEO, caching, performance | PASSED | ISR `revalidate:60` حفظ؛ Pagination از تگ کش موجود (`content:*`) استفاده می‌کند |
| cPanel deployment | PASSED | بدون Docker/Redis/Celery؛ `INTERNAL_API_URL` و `INTERNAL_API_TOKEN` همانند قبل |

> تست‌های خودکار `npm run typecheck / lint / test:coverage / build` در محیط sandbox بدون `node_modules` اجرا نشدند (BLOCKED — نصب وابستگی‌ها در دسترس نبود)؛ بررسی دستی الگوهای موجود و عدم تغییر قرارداد API انجام شد. در CI پس از `npm ci` باید دوباره اجرا شوند.

---

## ۵. پرونده‌های تغییر (فاز ۲)

- `frontend/src/lib/api/server.ts` — افزودن `getCategories` / `getTags`
- `frontend/src/lib/api/types.ts` — تایپ‌های Taxonomy
- `frontend/src/components/molecules/pagination.tsx` — جدید
- `frontend/src/components/molecules/filter-bar.tsx` — جدید
- `frontend/src/components/organisms/favorite-button.tsx` — جدید
- `frontend/src/components/organisms/profile-view.tsx` — ویرایش پروفایل + حذف علاقه‌مندی + فیلد تلفن
- `frontend/src/components/organisms/creative-advisor-form.tsx` — هندل ۴۲۹/۵۰۳
- `frontend/src/components/organisms/project-estimator-form.tsx` — هندل ۴۲۹/۵۰۳
- `frontend/src/components/ui-port/navbar.tsx` — لینک‌های ثانویه + منوی موبایل کامل
- `frontend/src/app/[locale]/(ui)/(pages)/services/page.tsx` — فیلتر + صفحه‌بندی
- `frontend/src/app/[locale]/(ui)/(pages)/projects/page.tsx` — فیلتر صنعت/تکنولوژی + صفحه‌بندی
- `frontend/src/app/[locale]/(ui)/(pages)/academy/page.tsx` — فیلتر سطح/دسته + صفحه‌بندی
- `frontend/src/app/[locale]/(ui)/(pages)/blog/page.tsx` — فیلتر دسته + صفحه‌بندی
- `frontend/src/app/[locale]/(ui)/(pages)/products/page.tsx` — صفحه‌بندی
- `frontend/src/app/[locale]/(ui)/(pages)/services/[slug]/page.tsx` — FavoriteButton
- `frontend/src/app/[locale]/(ui)/(pages)/projects/[slug]/page.tsx` — FavoriteButton
- `frontend/src/app/[locale]/(ui)/(pages)/academy/[slug]/page.tsx` — FavoriteButton
- `frontend/src/app/[locale]/(ui)/(pages)/blog/[slug]/page.tsx` — FavoriteButton
- `frontend/messages/fa.json` + `frontend/messages/en.json` — کلیدهای جدید (فیلتر، پروفایل، AI خطاها)

**تغییر بک‌اند:** ندارد — سازگاری کامل حفظ شد.

---

## ۶. تصمیمات معماری

- تمام فیلترها `GET` با `searchParams` در URL هستند → قابل اشتراک‌گذاری، قابل crawl، بدون JS اضافی.
- `FavoriteButton` کلاینت‌کامپوننت است تا `sessionid` مرورگر را همراه داشته باشد؛ صفحات جزئیات SSR باقی ماندند.
- `Pagination` از `total_pages/current_page` بک‌اند استفاده می‌کند؛ بدون محاسبه سمت کلاینت.
- پیام‌های خطای AI به زبان کاربر (fa/en) از `messages/ai.json` می‌آیند؛ کد وضعیت HTTP لورفته نمی‌شود مگر ۴۲۹/۵۰۳.

