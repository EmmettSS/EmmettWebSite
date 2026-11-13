# گزارش جامع تضمین کیفیت، ممیزی پیش‌پرواز پروداکشن و شواهد پذیرش — فاز ۴

- **تاریخ اجرا:** `2026-11-13`
- **پشتهٔ آزموده‌شده در سندباکس:** Python `3.11.2` (Django `5.2.17`, DRF `3.18.2`) + Node.js `v22.22.3` (Next.js `16.4.3`) + Chromium Headless (Playwright & Lighthouse CI)

---

## ۱. جدول دستورات و نتایج آزمون‌های خودکار و یکپارچه

| ردیف | لایه | دستور دقیق اجراشده | وضعیت | خلاصهٔ خروجی واقعی |
|---|---|---|---|---|
| ۱ | Backend Lint | `ruff check . && ruff format --check . && black --check .` | `PASSED` | ۲۵۸ فایل بررسی‌شده؛ صفر خطای سبک یا قالب‌بندی |
| ۲ | Backend Types | `mypy apps config` | `PASSED` | `Success: no issues found in 252 source files` |
| ۳ | Django System Check | `python manage.py check` | `PASSED` | `System check identified no issues (0 silenced).` |
| ۴ | Migration Consistency | `python manage.py makemigrations --check --dry-run` | `PASSED` | `No changes detected` (صفر migration جدید یا ناسازگار) |
| ۵ | Gettext i18n | `python scripts/i18n.py check` | `PASSED` | کاتالوگ‌های `.po` و `.mo` کامل و همگام |
| ۶ | OpenAPI Schema | `python manage.py spectacular --validate --fail-on-warn --file /tmp/openapi.yml` | `PASSED` | اسکیمای OpenAPI 3 معتبر با صفر اخطار |
| ۷ | Backend Unit & Integration | `PYTHONPATH=../.github/ci:. DJANGO_SETTINGS_MODULE=ci_test_settings coverage run -m pytest --create-db -q && coverage report --fail-under=85` | `PASSED` | `579 passed`؛ پوشش کل `94%` (`6101` دستور، آستانهٔ مجاز `85%`) |
| ۸ | Production Deploy Check | `DJANGO_SETTINGS_MODULE=config.settings.production ... python manage.py check --deploy --fail-level WARNING` | `PASSED` | `System check identified no issues (0 silenced).` |
| ۹ | Production Staticfiles | `DJANGO_SETTINGS_MODULE=config.settings.production ... python manage.py collectstatic --noinput --clear` | `PASSED` | ۱۸۹ فایل کپی و ۵۱۷ خروجی فشرده/مانیفست WhiteNoise ساخته شد |
| ۱۰ | SAST & Secret Scan | `python3 scripts/check_secrets.py && bandit -ll -q -r apps config` | `PASSED` | ۶۳۰ فایل اسکن‌شده بدون راز؛ صفر یافتهٔ Medium/High در Bandit |
| ۱۱ | Dependency Security | `pip-audit -r backend/requirements.txt` و `npm audit --audit-level=high` | `PASSED` | `pip-audit`: `No known vulnerabilities found`؛ `npm audit`: صفر آسیب‌پذیری high/critical (۸ مورد moderate صرفاً در زنجیرهٔ dev-only ابزار ESLint/TypeScript) |
| ۱۲ | Frontend Static Gates | `npm run format:check && npm run lint && npm run typecheck` | `PASSED` | Prettier، ESLint و `tsc --noEmit` بدون هیچ خطا |
| ۱۳ | Frontend Unit & Coverage | `npm run test:coverage` | `PASSED` | ۳۶ فایل / ۱۶۴ آزمون پاس؛ پوشش `96.99%` عبارات، `81.64%` شاخه‌ها، `98.14%` توابع، `97.90%` خطوط |
| ۱۴ | Frontend Production Build | `npm run build && npm run verify:rendering` | `PASSED` | ۶۴/۶۴ صفحهٔ استاتیک، ۶۱ مسیر پیش‌رندر، حداقل ISR ۶۰ ثانیه، صفر `<h1>` نامرئی در ۵۶ صفحهٔ پخته‌شده |
| ۱۵ | Playwright E2E (Public + Auth + AI + SEO) | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e` | `PASSED` | ۶۱ آزمون مرورگری عمومی، احراز هویت، علاقه‌مندی، کاتالوگ، مشاور و سئو پاس شد |
| ۱۶ | Playwright E2E (Native Admin RTL/LTR) | `DJANGO_ADMIN_BASE_URL=http://127.0.0.1:8000 DEMO_ADMIN_PASSWORD=... npx playwright test e2e/admin-responsive.spec.ts` | `PASSED` | ۱۲/۱۲ آزمون پنل ادمین در عرض‌های `320, 390, 768, 1024, 1440, 1920` برای `fa` و `en` پاس شد |
| ۱۷ | Lighthouse CI | `lhci collect --config=.lighthouserc.json && lhci assert --config=.lighthouserc.json` | `PASSED` | ۱۲ اجرای واقعی روی ۶ مسیر با عبور کامل از آستانهٔ سخت `0.95` در هر ۴ محور |
| ۱۸ | Deploy Script Gates | `bash -n scripts/*.sh` + شبیه‌سازی گیت‌های توکن و سلامت در `deploy_backend.sh`, `deploy_frontend.sh`, `preflight_cpanel.sh` | `PASSED` | تمام اسکریپت‌ها بدون خطای نحوی؛ توقف ایمن در نبود توکن یا سلامت بک‌اند تأیید شد |
| ۱۹ | MySQL 8 Runtime Smoke | اجرای مهاجرت و جست‌وجوی FULLTEXT روی سرور واقعی MySQL 8 | `BLOCKED` | باینری/سرویس MySQL در سندباکس موجود نیست |
| ۲۰ | Live LLM Provider Smoke | فراخوانی زنده به سرویس‌دهندهٔ خارجی OpenAI-compatible با کلید پروداکشن | `BLOCKED` | کلید مجاز پروداکشن در محیط تست موجود نیست |

---

## ۲. خلاصهٔ نتایج Lighthouse CI (۱۲ اجرا روی بیلد پروداکشن)

| مسیر آزموده‌شده | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| `/` (خانه — فارسی RTL) | `96` / `96` | `100` / `100` | `96` / `96` | `100` / `100` |
| `/en` (خانه — انگلیسی LTR) | `97` / `96` | `100` / `100` | `100` / `100` | `100` / `100` |
| `/services` | `99` / `98` | `100` / `100` | `96` / `96` | `100` / `100` |
| `/blog` | `99` / `99` | `100` / `100` | `96` / `96` | `100` / `100` |
| `/projects/pentestor` | `98` / `98` | `100` / `100` | `96` / `96` | `100` / `100` |
| `/products/crm` | `99` / `99` | `100` / `100` | `96` / `96` | `100` / `100` |

---

## ۳. شواهد پذیرش پنل مدیریت بومی، هوش مصنوعی کنترل‌شده و پیش‌پرواز دیتابیس

1. **پنل مدیریت چندنقشی و 2FA روی دیتابیس مجزای آزمایشی:**
   - **ابرادمین (`superuser`):** دسترسی کامل به داشبورد، انتشار/آرشیو گروهی، حذف نرم و بازگردانی (`?record_state=deleted` -> `restore_selected`) با ثبت در `AuditLog` (`services.Service.restored`)، خروجی CSV دوزبانه با فراردهی فرمول، اکشن `create_missing_locale` در `Translation` و اکشن `revoke_shares` در `AISuggestion` (`ai_engine.shares_revoked`).
   - **ویرایشگر محدود (`view_service` + `change_service`):** پاسخ `200` روی `/admin/services/service/` و پاسخ `403` قطعی روی `/admin/services/service/add/`، `/admin/accounts/user/` و `/admin/ai_engine/prompttemplate/`.
   - **مشاهده‌گر فقط‌خواندنی (`view_service`):** پاسخ `200` روی مشاهدهٔ لیست و پاسخ `403` روی درخواست `POST` تغییر رکورد.
   - **کاربر عادی غیرکارمند (`is_staff=False`):** ریدایرکت `302` به `/admin/login/` بدون دسترسی به هیچ سطحی از پنل.
   - **اجبار احراز هویت دو مرحله‌ای (`ADMIN_2FA_REQUIRED=True`):** ریدایرکت تمام مسیرهای پنل به `/admin/2fa/` پیش از تأیید دستگاه `TOTPDevice` و باز شدن دسترسی `200` بلافاصله پس از تأیید توکن OTP در نشست.

2. **تفکیک شفاف آزمون هوش مصنوعی کنترل‌شده از سرویس‌دهندهٔ واقعی:**
   - در سطح API و مرورگر واقعی Chromium (با سرویس‌دهندهٔ HTTP محلی کنترل‌شده منطبق با پروتکل `/v1/chat/completions` روی پورت موقت آزمایشی و پاک‌سازی کامل پس از آزمون):
     - ارسال ورودی خارج از کاتالوگ بسته با کد `400` رد شد.
     - تولید ایده در `/advisor` با پاسخ `201`، هدایت به `/advisor/results/{share_token}`، نمایش کارت ایده با حداقل روز کاری (بدون قیمت عددی) و لینک خدمت مرتبط (`/services/web-development`) تأیید شد.
     - باز کردن لینک اشتراک در مرورگر ناشناس (`200`)، ثبت فرم سرنخ (`POST /api/v1/ai/leads/` -> `201` و ایجاد رکورد `Lead`) و سپس لغو اشتراک از پنل مدیریت (`revoke_shares`) و دریافت پاسخ `404` در مرورگر ناشناس تأیید شد.
     - خطای سرویس‌دهنده با کد `503` و ثبت `AIRequest(status="failed")`، و محدودیت نرخ `AIEngineRateThrottle` با کد `429` تأیید شد.
   - در پیکربندی پیش‌فرض مخزن، `AI_ENABLED=False` است و هیچ شبیه‌ساز یا دادهٔ ساختگی به‌عنوان سرویس هوش مصنوعی پروداکشن فعال نیست. آزمون با سرویس‌دهندهٔ خارجی واقعی نیازمند تأمین کلید مجاز در محیط مقصد است (`BLOCKED`).

3. **بازبینی پیش‌پرواز استقرار cPanel و Passenger:**
   - سازگاری کامل با Python `3.11`، نسخهٔ قفل‌شدهٔ Node `22.22.3` در `.nvmrc`، درایور خالص پایتون `PyMySQL==1.2.3` (بدون نیاز به کامپایلر C روی هاست اشتراکی)، نقطهٔ اتصال Passenger در `/backend` (`FORCE_SCRIPT_NAME` آزموده‌شده در `test_admin_redirect_includes_passenger_mount_prefix`)، سرور سفارشی `frontend/deploy/server.js.example`، پراکسی هم‌مبدأ `/api/[...path]` و `/media/[...path]` با ارسال `X-Forwarded-Proto: https`، سرو فایل‌های استاتیک ادمین از طریق WhiteNoise با مانیفست فشرده، نشست‌های مبتنی بر دیتابیس، کش حافظهٔ محلی هر پردازه با باطل‌سازی آنی تگ‌های Next.js از طریق `/api/revalidate` و دستورات مدیریتی آمادهٔ Cron (`backup_db`, `purge_ai_audit`, `generate_blog_summaries`, `clearsessions`).
