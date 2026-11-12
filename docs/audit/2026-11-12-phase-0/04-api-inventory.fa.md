# فاز ۰ — فهرست API و قراردادها

پیشوند اصلی: `/api/v1/`
پیش‌فرض DRF: SessionAuthentication + `IsAuthenticated`؛ endpointهای عمومی صریحاً `AllowAny` دارند.
پراکسی مرورگر: `/api/*` هم‌مبدأ؛ هدر `X-Internal-Token` فقط برای server-to-server و bypass throttle پیش‌فرض.

## ۱. Endpointها

| مسیر | روش | دسترسی | مصرف‌کننده | یادداشت |
|---|---|---|---|---|
| `/health/` | GET | AllowAny، بدون throttle | deploy/monitor | DB/cache؛ نسخه افشا نمی‌کند |
| `/health/proxy/` | GET | IsAdminUser | تشخیص هاست | XFF/NUM_PROXIES/ident |
| `/search/` | GET | AllowAny | search/⌘K | q/locale/limit≤50 |
| `/seo/settings/` | GET | AllowAny | metadata/JSON-LD | cache 900s |
| `/seo/sitemap/` | GET | AllowAny | sitemap.xml | results+sections |
| `/seo/redirects/` | GET | AllowAny | proxy/redirect-cache | cache 300s |
| `/seo/faq/` | GET | AllowAny | FAQ JSON-LD | path/locale |
| `/schema/`, `/schema/swagger-ui/`, `/schema/redoc/` | GET | عمومی/مطابق تنظیمات | مستندات | OpenAPI validate PASSED |
| `/auth/csrf/` | GET | AllowAny | client.ts | ensure_csrf_cookie |
| `/auth/register/` | POST | AllowAny + AuthRate | profile | 201 + login |
| `/auth/login/` | POST | AllowAny + AuthRate | profile | lockout/Retry-After |
| `/auth/logout/` | POST | IsAuthenticated | profile | 204 |
| `/auth/me/` | GET/PATCH | IsAuthenticated | profile/client | PATCH بی‌مصرف در UI |
| `/auth/favorites/` | GET | IsAuthenticated | client بی‌مصرف | فهرست کاربر |
| `/auth/favorites/add/` | POST | IsAuthenticated | client بی‌مصرف | content_type محدود |
| `/auth/favorites/{pk}/` | DELETE | IsAuthenticated | client بی‌مصرف | مالکیت اجباری |
| `/taxonomy/categories/`, `/taxonomy/tags/` | GET | AllowAny | مصرف مستقیم UI ندارد | scope/search |
| `/company/team/` | GET | AllowAny | about/home | lookup public_id |
| `/company/testimonials/` | GET | AllowAny | home/about | featured |
| `/services/`, `/services/{slug}/` | GET | AllowAny | services | published |
| `/projects/`, `/projects/{slug}/` | GET | AllowAny | projects/products | is_product/is_featured/year/categories/tags |
| `/academy/`, `/academy/{slug}/` | GET | AllowAny | academy | level/categories/tags |
| `/academy/enrollments/` | GET/POST | IsAuthenticated | profile/enroll | POST course_slug |
| `/academy/rss/` یا route فرانت | GET | AllowAny | RSS | RSS 2.0 |
| `/blog/`, `/blog/{slug}/` | GET | AllowAny | blog | view_count اتمیک |
| `/blog/{slug}/comments/` | POST | IsAuthenticated | comment-form | pending |
| `/blog/rss/` یا route فرانت | GET | AllowAny | RSS | RSS 2.0 |
| `/leads/contact/` | POST | AllowAny + ContactRate | contact-form | consent/honeypot/throttle |
| `/leads/newsletter/` | POST | AllowAny + NewsletterRate | newsletter-form | confirm/unsubscribe ندارد |
| `/ai/catalogs/` | GET | AllowAny | advisor/estimate | keys/locale |
| `/ai/advisor/` | POST | AllowAny + AIRate | advisor-form | provider لازم |
| `/ai/results/{token}/` | GET | AllowAny | results page | hash lookup، revoke، no-store |
| `/ai/estimates/` | POST | AllowAny + AIRate | estimator-form | deterministic |
| `/ai/leads/` | POST | AllowAny + ContactRate | advisor lead | Contact+Lead اتمیک |

مسیرهای خارج از `/api/v1/`:

| مسیر | نقش |
|---|---|
| `/admin/` | Django Admin فعلی |
| `/admin/2fa/*` | راه‌اندازی/تأیید/بازیابی 2FA |
| `/site-content/translations/` | خروجی `site.copy` برای next-intl |
| `/i18n/` | مسیرهای زبان جنگو |
| `/api/revalidate` (Next) | webhook داخلی فرانت |
| `/media/*` (Next) | پراکسی media هم‌مبدأ |

## ۲. نرخ‌های پیش‌فرض

| scope | پیش‌فرض |
|---|---|
| anon | 100/hour |
| user | 1000/hour |
| contact | 5/hour |
| ai | 20/hour |
| auth | 10/hour |
| newsletter | 3/day |

در تست یکپارچهٔ محلی نرخ‌ها عمداً بالا برده شدند تا سطل مشترک loopback باعث شکست کاذب نشود. این تغییر فقط env محلی بود و تنظیمات محصول را تغییر نداد.

## ۳. سازگاری و قرارداد

- lookup محتوای عمومی عموماً slug است؛ `TeamMember` از `public_id` و `Testimonial` از pk استفاده می‌کند.
- پاسخ‌های لیست صفحه‌بندی‌شده‌اند؛ جزئیات SEO/meta/canonical دارند.
- خطاهای عمومی نباید جزئیات provider/stack trace افشا کنند.
- endpointهای خصوصی باید مالکیت/نقش را در queryset اعمال کنند، نه فقط در UI.
- تغییر URL یا شکل پاسخ فقط با حفظ سازگاری یا versioning مجاز است.

## ۴. مصرف‌کننده‌های یتیم

`updateMe`, `getFavorites`, `addFavorite`, `removeFavorite` در `client.ts` وجود دارند ولی در صفحه/کامپوننت مصرف نمی‌شوند. این‌ها باید در فاز بعد یا به UI متصل شوند یا با تصمیم صریح به‌عنوان قرارداد پشتیبانی‌شده/حذف‌شده تعیین تکلیف شوند؛ حذف خاموش API مجاز نیست.
