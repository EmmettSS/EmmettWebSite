# ADR-0038: بازسازی پایپ‌لاین CI در ریشهٔ ریپو — مسیرهای تخت، لایهٔ تنظیمات تست CI و گیت‌های راستی‌آزمایی‌شده

**وضعیت:** پذیرفته‌شده — دستور صریح مالک محصول برای اجرای بستهٔ ۱ از برنامهٔ هفت‌بستهٔ بازسازی (2026-10-19)<br>
**تاریخ:** 2026-10-19<br>
**دامنه:** `.github/workflows/ci.yml` (ریشهٔ ریپو) و `.github/ci/ci_test_settings.py` — هیچ فایل `backend/` یا `frontend/` تغییر نکرده است<br>
**مرتبط با:** ADR-0032 (بودجهٔ کارایی)، ADR-0034 (دروازه‌های کیفیت و CI/CD)، ADR-0036 (آمادگی استقرار)، ADR-0037 (فاز ۸ پورت UI، E2E و Lighthouse)<br>
**تصمیم‌گیرندگان:** مالک محصول + ایجنت ارشد توسعه

---

## ۱. زمینه

ADR-0034 شش جاب CI را تعریف کرد و CHANGELOG/ARCHITECTURE.md/TECHNICAL_DOCUMENTATION
هر سه وعده دادند که این پایپ‌لاین در `.github/workflows/ci.yml` اجرا می‌شود.
ADR-0037 بند ۳-۱ هم کشف کرد که workflow در مسیر تو‌در‌تو
`EmmettWebSite/.github/workflows/ci.yml` قرار داشته و GitHub Actions فقط
`.github/workflows/` **ریشهٔ ریپو** را می‌شناسد.

بررسی این بسته سه واقعیت را قطعی کرد:

1. **هیچ فایل `.github/` در این ریپو ردیابی نمی‌شد.** از ۵۳۴ فایل ردیابی‌شده،
   صفر فایل زیر `.github/` بود. یعنی پایپ‌لاینی که مستندات آن را «سبز کامل»
   توصیف می‌کردند، در این ریپو **هرگز وجود نداشته و هرگز اجرا نشده است**.
2. **ساختار این ریپو تخت است** (`backend/` و `frontend/` مستقیماً زیر ریشه)،
   در حالی که ADR-0037 همهٔ مسیرهای جاب‌ها را با پیشوند `EmmettWebSite/…`
   توصیف می‌کند. کپی‌کردن آن مسیرها workflow را بی‌اثر می‌کرد.
3. **مشکل staticfiles manifest که ADR-0037 بند ۳-۵ یافته بود، حل‌نشده مانده
   بود.** بدون رفع آن، ۳۵ تست ادمین/قالب با
   `ValueError: Missing staticfiles manifest entry for 'vendor/bootswatch'`
   قرمز می‌شوند و هر پایپ‌لاینی از همان first run شکست می‌خورد.

---

## ۲. گزینه‌ها

| # | موضوع | گزینه‌ها | انتخاب و دلیل |
|---|-------|----------|----------------|
| ۱ | مکان workflow | (الف) زیرپوشهٔ پروژه (ب) `.github/workflows/` ریشه | **(ب)** — تنها مسیری که GitHub Actions می‌خواند (بند ۳-۱ ADR-0037). |
| ۲ | پیشوند مسیرها | (الف) `EmmettWebSite/…` طبق ADR-0037 (ب) مسیرهای تخت | **(ب)** — ساختار واقعی این ریپو تخت است؛ پیشوند موجب «فایل پیدا نشد» در همهٔ جاب‌ها می‌شد. |
| ۳ | رفع خطای manifest | (الف) ویرایش `STORAGES` در `config/settings/base.py` (ب) `collectstatic` قبل از تست در CI (پ) لایهٔ تنظیمات مخصوص CI بیرون از `backend/` | **(پ)** — (الف) رفتار production را برای راحتی تست تغییر می‌داد؛ (ب) empirically کافی نیست (مانیفست پوشهٔ `vendor/bootswatch` را ثبت نمی‌کند). (پ) هیچ فایل محصول را دست نمی‌زند. |
| ۴ | تفکیک `test_backup_db.py` | (الف) پروسهٔ جدا + `coverage run -p` + `combine` (ب) کل سوئیت در یک پروسه + رفع نشت در مبدأ | **(ب)** — نشت `ENGINE` **واقعی بود** (بند ۴-۳)، اما راه‌حل درست جداکردن پروسه نیست بلکه بازگرداندن مقدار در همان تست است. با `monkeypatch.setitem` نشت از میان رفت و سوئیت کامل در یک پروسه ۴۹۶ تست سبز می‌دهد — حتی وقتی `mysqldump` روی ماشین نصب باشد. گزینهٔ (الف) نشانه را پنهان می‌کرد، نه علت را. |
| ۵ | ساختار E2E و Lighthouse | (الف) دو جاب جدا (ب) یک جاب با گام‌های مشروط `if:` | **(ب)** — دستور مالک محصول: E2E روی هر PR، Lighthouse فقط `main` و اجرای دستی. دو جاب یعنی پرداخت `npm ci` + `next build` دوبار (≈۲ دقیقه و ۵۲۸ پکیج اضافه). یک جاب با `if:` همان سیاست را با یک بیلد پیاده می‌کند. |
| ۶ | گیت `npm audit` | (الف) `--audit-level=high` شامل dev (ب) `--omit=dev` به‌عنوان گیت + گزارش غیرمسدودکنندهٔ audit کامل | **(ب)** — زنجیرهٔ `braces → micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next` فقط dev است و `braces` **هیچ نسخهٔ وصله‌شده‌ای ندارد** (GHSA-vfj7-8cjw-p6xm، `first_patched_version: null`)؛ پس (الف) هرگز سبز نمی‌شد. `npm audit fix --force` هم مخرب است (npm می‌گوید `eslint-config-next@14.2.35` نصب می‌کند — دو نسخهٔ اصلی عقب‌تر). ARCHITECTURE.md هم از قبل `--omit=dev` را نوشته بود. |
| ۷ | ترتیب جاب‌ها | (الف) زنجیرهٔ `needs` (ب) شش جاب کاملاً موازی | **(ب)** — سریع‌ترین سیگنال روی هر PR؛ هر جاب محیط خودش را مستقل می‌سازد و هیچ‌کدام خروجی جاب دیگر را مصرف نمی‌کند. |
| ۸ | `manage.py check --deploy` | (الف) اجرای ساده (هشدارها فقط در لاگ) (ب) `--fail-level WARNING` | **(ب)** — با env کامل و `mkdir -p "$BACKUP_DIR"` خروجی «no issues (0 silenced)» اندازه‌گیری شد، پس گیت سخت‌گیرانه بدون ریسک قرمزشدن ممکن است. این همان چیزی است که docstring تست استقرار هم وعده می‌دهد («عبور بدون هشدار»). |

---

## ۳. تصمیم

### ۳-۱. یک workflow، شش جاب، در ریشهٔ ریپو

`.github/workflows/ci.yml` با همان شش شناسه‌ای که مستندات قول داده‌اند
(`backend-quality`, `backend-test`, `frontend-quality`, `frontend-test-build`,
`security-scan`, `e2e-and-lighthouse`)، با مسیرهای تخت. تریگرها:
`push` به `main`، هر `pull_request`، و `workflow_dispatch` (الزام بند ۳-۱
ADR-0037). `permissions: contents: read` (کمینه‌سازی توکن) و
`concurrency` با لغو اجرای قبلی **فقط** روی PR.

### ۳-۲. لایهٔ تنظیمات تست CI: `.github/ci/ci_test_settings.py`

یک فایل پایتون بیرون از `backend/` که `config.settings.dev` را وارد می‌کند و
**فقط** کلید `staticfiles` را از
`whitenoise.storage.CompressedManifestStaticFilesStorage` به
`django.contrib.staticfiles.storage.StaticFilesStorage` تغییر می‌دهد. کلید
`default` عمداً دست‌نخورده می‌ماند چون storage آپلودهای کاربری (`core.Media`)
است و تغییرش رفتار تست‌های آپلود را جعلی می‌کرد.

جاب `backend-test` آن را با `PYTHONPATH=${{ github.workspace }}/.github/ci`
و `DJANGO_SETTINGS_MODULE=ci_test_settings` بارگذاری می‌کند (متغیر محیطی بر
`DJANGO_SETTINGS_MODULE` در `pytest.ini` اولویت دارد).

**اندازه‌گیری اثر:** `apps/core/tests/test_admin_theme.py` بدون این لایه
`2 failed, 11 passed` و با آن `13 passed`. کل سوئیت بدون آن ۳۵ شکست دارد و با
آن **۴۹۶ سبز**.

این فایل هیچ هوکی را برنمی‌انگیزد: همهٔ هوک‌های بک‌اند در
`.pre-commit-config.yaml` با `files: ^backend/.*\.py$` محدود شده‌اند، و
جاب‌های کیفیت بک‌اند از داخل `backend/` اجرا می‌شوند. با این حال با کانفیگ
خود پروژه بررسی شد: `ruff check` → «All checks passed»،
`ruff format --check` → «already formatted»، `black --check` → بدون تغییر.

### ۳-۳. یک پروسه، بدون تفکیک

`coverage run -m pytest --create-db -q` روی کل سوئیت. پرچم `--create-db` صریح
است تا `--reuse-db` (که در `pytest.ini` هست) نتواند پایگاه‌دادهٔ مانده از یک
اجرای قبلی را reuse کند. تنظیمات coverage از `backend/pyproject.toml` خوانده
می‌شود (`source = ["apps"]`، `omit = migrations,tests`، `fail_under = 85`) و
دوباره در CLI تعریف نمی‌شود.

### ۳-۴. `security-scan` به یک گیت واقعی تبدیل شد

مقادیر env این مرحله ساختگی و مخصوص همان اجرا هستند (قانون ۵: راز واقعی در
ریپو نمی‌آید) و طوری انتخاب شده‌اند که همهٔ چک‌های deploy پروژه راضی شوند:
`SECRET_KEY` با ۵۰+ کاراکتر و آنتروپی کافی (برای `emmett_admin.W013`)،
`ADMIN_2FA_REQUIRED=True` (`W009`)، `PUBLIC_SITE_URL` غیرپیش‌فرض (`W007`)،
`DJANGO_CSP_ENABLED=True` (`W008`) و `BACKUP_DIR` که پیش از اجرا با
`mkdir -p` ساخته می‌شود (`W011`/`W012`). `W010` (کد تأیید Search Console)
به‌طور طراحی‌شده در نبود DB در دسترس سکوت می‌کند.

گام `npm audit --omit=dev --audit-level=high` گیت است؛ گام گزارشِ audit کامل
با `continue-on-error: true` اجرا می‌شود و خروجی‌اش در Job Summary می‌نشیند تا
موضوع dev-only پنهان نماند. وقتی `braces` نسخهٔ وصله‌شده گرفت، گیت را می‌توان
به audit کامل ارتقا داد.

### ۳-۵. E2E روی هر PR، Lighthouse فقط روی `main`

یک جاب: SQLite + `migrate` + `seed_demo_data`، بالا آوردن جنگو با
`runserver 127.0.0.1:8000 --noreload`، گیت آمادگی با
`curl /api/v1/health/`، سپس `npm run build` و `next start` با گیت آمادگی روی
`http://127.0.0.1:3000/`. چون `playwright.config.ts` از قبل
`reuseExistingServer: true` دارد، Playwright از همان سرورِ بالا استفاده می‌کند
و **بیلد دوم نمی‌زند**.

`DJANGO_DEV_ALLOW_ANY_HOST` عمداً تنظیم نشده: `host` در
`SKIP_REQUEST_HEADERS` پراکسی `/api/[...path]` است، پس جنگو همیشه
`127.0.0.1:8000` را می‌بیند و پیش‌فرض `ALLOWED_HOSTS` در DEBUG کافی است.

Lighthouse با `if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'`
اجرا می‌شود و از همان Chromium نصب‌شدهٔ Playwright استفاده می‌کند
(`CHROME_PATH` از `chromium.executablePath()`) تا مرورگر دوبار دانلود نشود.
`.lighthouserc.json` ریشه بدون تغییر می‌ماند: ۶ URL، preset دسکتاپ، ۲ اجرا،
گیت `error` روی ۰٫۹۵ در هر چهار محور، خروجی روی فایل‌سیستم.

### ۳-۶. نسخه‌های سنجاق‌شده

| مورد | مقدار | دلیل |
|---|---|---|
| Node.js | `22.22.3` | `jsdom@30.1.2` در `engines` خود `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` می‌خواهد؛ `frontend/package.json` نه `engines` دارد نه `.nvmrc`، پس کف نسخه باید در CI صریح باشد. |
| Python | `3.11` | هم‌تراز با محیط توسعه (3.11.2) و `target-version = "py311"` در ruff/black. |
| `@lhci/cli` | `0.15.1` | در `package.json` نیست؛ آخرین نسخهٔ پایدار (2025-06-25) با bin `lhci`. |
| اکشن‌ها | `checkout@v7`, `setup-python@v7`, `setup-node@v7`, `upload-artifact@v7`, `cache@v6` | وجود هر تگ و **همهٔ ورودی‌های `with:` استفاده‌شده** در برابر `action.yml` واقعی همان تگ از GitHub API اعتبارسنجی شد. |
| مرورگرها | کش در `~/.cache/ms-playwright` | مسیر پیش‌فرض Playwright؛ کلید به `hashFiles('frontend/package-lock.json')` گره خورده تا با ارتقای Playwright کش بی‌اعتبار شود. |

### ۳-۷. خروجی‌های قابل‌بازخوانی

هفت artifact: `openapi-schema`، `backend-coverage` (Cobertura XML)،
`frontend-coverage` (`coverage-summary.json`)، `playwright-report`،
`playwright-test-results` (trace/screenshot هنگام شکست)، `lighthouse-reports`
و `e2e-server-logs`. این همان چیزی است که `frontend/e2e/README.md` و بند ۳-۴
ADR-0037 وعده داده‌اند («خروجی روی فایل‌سیستم + آرتیفکت GitHub؛ هیچ گزارشی
عمومی منتشر نمی‌شود»). به‌علاوه Job Summary برای پوشش بک‌اند، پوشش
فرانت‌اند، نتیجهٔ `npm audit` شامل dev و فهرست گزارش‌های Lighthouse.

`backend/coverage.xml` و `.lighthouseci/` به `.gitignore` ریشه اضافه شدند؛
خروجی‌های Playwright/Vitest از قبل در `frontend/.gitignore` بودند.

---

## ۴. راستی‌آزمایی

هر دستوری که در workflow نوشته شده، پیش از نوشتن YAML روی همین ریپو اجرا شد.
نتایج اندازه‌گیری‌شده:

| جاب | دستور | نتیجهٔ اندازه‌گیری‌شده |
|---|---|---|
| backend-quality | `ruff check .` / `ruff format --check .` / `black --check .` | سبز (۲۴۸ / ۲۴۷ فایل، صفر ایراد) |
| backend-quality | `mypy apps config` | سبز (۲۴۲ فایل، صفر خطا) |
| backend-quality | `manage.py check` / `makemigrations --check --dry-run` | سبز، بدون drift مهاجرت |
| backend-quality | `scripts/i18n.py check` | سبز |
| backend-quality | `spectacular --validate --fail-on-warn` | سبز |
| backend-test | `coverage run -m pytest --create-db -q` | **۴۹۶ passed در ۱۴۸s** |
| backend-test | `coverage report --fail-under=85` | **TOTAL ۵۶۰۷ گزاره / ۳۲۵ خط‌نخورده = ۹۴٪** |
| backend-test | `coverage xml -o coverage.xml` | نوشته شد (۲۲۶٬۸۹۱ بایت) |
| frontend-quality | `format:check` / `lint` / `typecheck` | هر سه سبز |
| frontend-test-build | `npm run test:coverage` | statements ۹۷٫۹ / branches ۷۸٫۸۳ / functions ۹۷٫۳۵ / lines ۹۸٫۴۳ در برابر آستانه‌های ۸۵/۷۸/۸۵/۸۵ |
| frontend-test-build | `npm run build` | سبز در ۲۶٫۶s، **بدون نیاز به بک‌اند زنده** |
| security-scan | `python3 scripts/check_secrets.py` | سبز (۵۳۴ فایل) |
| security-scan | `bandit -c pyproject.toml -r apps config -ll` | سبز؛ ۱۰٬۷۰۴ خط کد، ۶ یافتهٔ Low (با `-ll` فیلتر)، صفر Medium+ |
| security-scan | `manage.py check --deploy --fail-level WARNING` | «System check identified no issues (0 silenced)» |
| security-scan | `npm audit --omit=dev --audit-level=high` | **۰ آسیب‌پذیری، exit 0** |
| security-scan | `npm audit --audit-level=high` (گزارش) | exit 1 — فقط زنجیرهٔ dev-only `braces` |
| e2e | `migrate --noinput` + `seed_demo_data` | سبز |
| e2e | `runserver` + گیت `curl /api/v1/health/` | `200 {"status":"ok","checks":{"database":true,"cache":true}}` |
| e2e | `next start` + گیت `curl /` | «✓ Ready in 136ms» |
| e2e | ۶ URL هدف Lighthouse | همه ۲۰۰ با `title`، `meta description`، **دقیقاً یک** `h1`، `lang`، `canonical`، `robots: index, follow` و `viewport` |
| e2e | زنجیرهٔ SSR→API | ۱۶۴ پاسخ ۲۰۰ روی ۲۴ مسیر API؛ هر ۴ عنوان زندهٔ خدمات در HTML رندرشده حاضر بود |
| e2e | `sitemap.xml` / `robots.txt` | ۲۰۰ — ۴۴ آدرس / ۶۳۰ بایت |
| e2e | هدرهای `proxy.ts` | `content-security-policy` با nonce و `Link` با hreflang هر دو حاضر |
| e2e | `npx playwright test --list` | **۵۳ تست در ۸ فایل** (کانفیگ و specها سالم parse می‌شوند) |

اعتبارسنجی خودِ workflow هم با یک اعتبارسنج ساختاری انجام شد: parse شدن
YAML، تطابق دقیق شش شناسهٔ جاب با مستندات، توازن `${{ }}`، مجاز بودن کلیدهای
جاب/step، وجود `working-directory`ها، و وجود تک‌تک ورودی‌های `with:` در
`action.yml` واقعیِ همان تگ.

### ۴-۱. آنچه محلی قابل راستی‌آزمایی نبود — و بعداً در خود CI اثبات شد

در محیط بررسی هیچ مرورگری وجود ندارد و CDN دانلود Playwright
(`cdn.playwright.dev`/`playwright.azureedge.net`) بیرون از فهرست میزبان‌های
مجاز است؛ تلاش برای `npx playwright install chromium` با
«Failed to download Chrome for Testing 153.0.8010.12 (playwright chromium
v1243)» شکست خورد. پس سه مورد زیر در زمان نگارش این ADR فقط از نظر **منطق و
ورودی** بررسی شده بودند. همهٔ سه سپس در اجرای واقعی روی GitHub Actions اثبات
شدند (اجرای `39214219423`، هر شش جاب سبز):

| مورد | نتیجهٔ واقعی روی رانر |
|---|---|
| `npx playwright install --with-deps chromium` | ✅ موفق (گام ۸) |
| `npx playwright test` (۵۳ تست) | ✅ موفق در ۲m۵۱s (گام ۱۳) |
| `@lhci/cli@0.15.1 autorun` با گیت ۰٫۹۵ | ✅ موفق (گام ۱۶) — هر چهار محور روی هر ۶ URL |

برای اجرای مسیر Lighthouse، شرط `if:` در یک کامیت **موقت** به `pull_request`
هم گسترده شد (چون `workflow_dispatch` با توکن موجود HTTP 403 می‌داد)، نتیجه
سنجیده شد و سپس در کامیت بعدی دقیقاً بازگردانده شد. سیاست نهایی همان است که
مالک محصول تعیین کرد: E2E روی هر PR، Lighthouse فقط `main` و اجرای دستی.

### ۴-۲. باگی که فقط همان اجرای Lighthouse آن را لو داد

گام `Lighthouse CI` سبز شد ولی **هیچ آرتیفکت `lighthouse-reports` ساخته نشد**.
علت: `actions/upload-artifact` ورودی `include-hidden-files` دارد که
**پیش‌فرضش `false`** است (از `action.yml` همان تگ v7 خوانده و تأیید شد)، و
پوشهٔ خروجیِ `.lighthouserc.json` نامش `.lighthouseci` است — با نقطه شروع
می‌شود. پس همهٔ فایل‌ها فیلتر شدند و `if-no-files-found: ignore` آن را به یک
گام سبزِ توخالی تبدیل کرد.

این بی‌صدا وعدهٔ صریح ADR-0037 بند ۳-۴ و `frontend/e2e/README.md` را نقض
می‌کرد («گزارش Lighthouse به‌صورت آرتیفکت GitHub نگه داشته می‌شود»). اصلاح:
`include-hidden-files: true` و تغییر `if-no-files-found` به `error` تا پوشهٔ
خالی هرگز بی‌صدا رد نشود؛ خودِ گام هم به همان شرط اجرای Lighthouse گره خورد
تا PRهایی که Lighthouse را skip می‌کنند دچار نویز نشوند. پس از اصلاح،
آرتیفکت `lighthouse-reports` با **۵٬۸۶۳٬۳۴۷ بایت** تولید شد.

درس: «گام سبز» با «گامی که کارش را انجام داد» یکی نیست. هر آرتیفکتی که وعده
داده می‌شود باید پس از اجرا **شمارش** شود، نه اینکه فقط کد خروج صفر باشد.

### ۴-۳. آنچه اولین اجرای واقعی CI نشان داد

این workflow روی PR #1 اجرا شد. چهار جاب از همان اجرای اول سبز بودند
(`backend-quality`، `frontend-quality`، `frontend-test-build`، `security-scan`)
و دو جاب قرمز. چون لاگ اجرا بیرون از GitHub خواندنی نیست، دو گام
«annotation روی شکست» اضافه شد تا خلاصهٔ شکست‌ها روی خود PR بنشیند؛ تشخیص
زیر از همان کانال به دست آمد.

**الف) `backend-test` — یک تست قرمز.**

```
FAILED apps/core/tests/test_deployment_readiness.py::test_restore_backup_script_list_and_json_roundtrip
  RuntimeError: mysqldump با کد 2 شکست خورد:
  b"mysqldump: Got error: 2003: Can't connect to MySQL server on '127.0.0.1:3306' (111)"
```

علت ریشه‌ای: `apps/core/tests/test_backup_db.py:203` کلید تودرتوی
`DATABASES["default"]["ENGINE"]` را مستقیماً مقداردهی می‌کرد. fixture
`settings` جهش در سطح تودرتو را برنمی‌گرداند — همان هشدارِ مستندِ خودِ
fixture `file_database` دربارهٔ `NAME`. نتیجه: `ENGINE=mysql` به تست‌های بعدی
نشت می‌کرد (ترتیب الفبایی: `test_backup_db` پیش از `test_deployment_readiness`)
و `backup_db` سراغ `mysqldump` می‌رفت.

چرا محلی دیده نشد: روی رانر GitHub **`mysqldump` از پیش نصب است** و به سروری
که وجود ندارد وصل می‌شود ⇒ `RuntimeError`. روی ماشین بررسی `mysqldump` نصب
نیست ⇒ `backup_db` به `dumpdata` برمی‌گشت و تست سبز می‌شد. یعنی نتیجهٔ تست به
حضور یک باینری سیستمی وابسته بود.

رفع: جایگزینی انتساب مستقیم با
`monkeypatch.setitem(settings.DATABASES["default"], "ENGINE", ...)` که pytest
خودکار بازمی‌گرداند. راستی‌آزمایی: یک `mysqldump` جعلی (خروجی ۲ با همان
پیام) روی `PATH` گذاشته شد تا شرایط رانر بازتولید شود — پیش از اصلاح همان
`RuntimeError` دقیقاً تکرار شد، پس از اصلاح **۴۹۶ تست سبز با پوشش ۹۴٪**.

**ب) `e2e-and-lighthouse` — ۹ تست از ۵۳ قرمز.**

زیرساخت کامل بالا آمده بود (نصب Chromium، جنگو، `seed_demo_data`، بیلد و
سرور Next)؛ شکست‌ها همه در دسترسی به داده/نوشتن بودند:
`contact.spec.ts` (۲)، `profile-auth.spec.ts` (۱)، `public-pages.spec.ts` (۳،
همه مربوط به آکادمی/بلاگ)، `search.spec.ts` (۱) و `ui-port.spec.ts` (۲،
هر دو مربوط به جست‌وجوی API پالت ⌘K).

دو علت مستقل:

1. **خالی‌شدن سطل throttle.** `AnonRateThrottle` در
   `DEFAULT_THROTTLE_CLASSES` سراسری است و `THROTTLE_RATE_ANON` پیش‌فرض
   `100/hour`. چون `NUM_PROXIES` تنظیم نشده، شناسهٔ throttle همان
   `REMOTE_ADDR` است و همهٔ فراخوانی‌های SSR و پراکسی `/api/[...path]` از
   `127.0.0.1` در **یک سطل مشترک** می‌نشینند. اندازه‌گیری: ۹۹ پاسخ ۲۰۰ و از
   درخواست شمارهٔ **۱۰۰** به بعد ۴۲۹ با `Retry-After ≈ 3599s`؛ پس از آن
   `/api/v1/academy/`، `/api/v1/blog/`، `/api/v1/search/` و
   `/api/v1/seo/settings/` همه ۴۲۹. با نرخ‌های بالای CI همان آزمایش
   **۴۰۰ درخواست پشت‌سرهم → ۴۰۰ پاسخ ۲۰۰** شد و
   `/api/v1/search/?q=Django` دقیقاً «ساخت API با جنگو» را برگرداند — همان
   نتیجه‌ای که `ui-port.spec.ts:108` انتظار دارد.

2. **رد شدن Origin توسط CSRF.** پراکسی `/api/[...path]` فقط `host`،
   `connection` و `content-length` را حذف می‌کند، پس `Origin` مرورگر عیناً به
   جنگو می‌رسد: `http://127.0.0.1:3000` در برابر `get_host()` =
   `127.0.0.1:8000`. در `CsrfViewMiddleware._origin_verified` این دو برابر
   نمی‌شوند و با `CSRF_TRUSTED_ORIGINS=[]` درخواست POST احراز هویت‌شده
   (ثبت‌نام دوره، نظر، خروج) با ۴۰۳ «Origin checking failed» رد می‌شود.
   production این را با مقدار پیش‌فرضِ ساخته‌شده از `PUBLIC_SITE_URL` حل
   می‌کند؛ جاب E2E هم اکنون همان را صریح تنظیم می‌کند.

**درس روشی:** دو استدلال پیشین این بسته با شواهد قوی‌تر اصلاح شدند. اول،
«سوئیت کامل در یک پروسه سبز است پس نشتی وجود ندارد» — نشت وجود داشت و فقط به
خاطر نبودِ `mysqldump` پنهان بود. دوم، «چون `host` حذف می‌شود هیچ متغیر
میزبانی لازم نیست» — برای `ALLOWED_HOSTS` درست است اما برای بررسی `Origin`
نه. در هر دو مورد، **سوئیت pytest نمی‌توانست این‌ها را ببیند** چون
`conftest.py` با fixture خودکار کش را بین تست‌ها پاک می‌کند و کلاینت تست
جنگو میان‌مبدایی واقعی نمی‌سازد.

### ۴-۴. تاریخچهٔ اجراهای واقعی روی GitHub Actions

| اجرا | محتوا | نتیجه |
|---|---|---|
| `39209063577` | اولین اجرای واقعی پایپ‌لاین | ۴ سبز / ۲ قرمز (`backend-test`، `e2e-and-lighthouse`) |
| `39210291265` | پس از رفع CSRF و افزودن گام‌های annotation | ۴ سبز / ۲ قرمز — اما این‌بار **علت** هر دو شکست روی خود PR خوانا شد |
| `39212553132` | پس از رفع نشت `ENGINE` و تنظیم نرخ‌های throttle | **۶ سبز** (Lighthouse طبق سیاست روی PR skip) |
| `39213426605` | با گسترش موقت شرط Lighthouse برای راستی‌آزمایی | ۶ سبز؛ گیت ۰٫۹۵ روی هر ۶ URL پاس شد ولی آرتیفکت گزارش‌ها **خالی** بود |
| `39214219423` | پس از `include-hidden-files: true` | **۶ سبز + هر ۶ آرتیفکت** (`lighthouse-reports` = ۵٬۸۶۳٬۳۴۷ بایت) |
| `39214941987` | پس از بازگرداندن شرط موقت | **۶ سبز در ۸۰ ثانیه**؛ Lighthouse درست skip شد |

کاهش زمان از ~۵ دقیقه به ۸۰ ثانیه در آخرین اجرا، اثر مستقیم کش‌های
`actions/cache` (مرورگرهای Playwright) و کش داخلی `setup-python`/`setup-node`
است — یعنی طراحی کش‌ها هم در عمل اثبات شد.

### ۴-۵. ریسک شناخته‌شدهٔ آستانهٔ branches فرانت‌اند

حاشیهٔ `branches` در پوشش فرانت‌اند فقط **+۰٫۸۳٪** است (۷۸٫۸۳ در برابر ۷۸).
یک شاخهٔ تست‌نشددهٔ تازه در `src/lib/**` یا
`src/components/{ui,molecules,organisms,seo}/**` می‌تواند گیت را قرمز کند.
طبق قانون ۱۹ **آستانه پایین آورده نمی‌شود**؛ راه‌حل، افزودن تست است. این
ریسک در بستهٔ ۵ (صداقت پوشش) با ورود `ui-port/**` به `coverage.include`
دوباره بررسی می‌شود.

---

## ۵. عمداً خارج از این بسته

موارد زیر حین این بسته پیدا شدند و **دست‌نخورده** ماندند تا دامنهٔ بستهٔ ۱
محدود بماند:

- **⚠ ریسک production: سطل مشترک throttle روی `127.0.0.1`.** این مورد با
  اندازه‌گیری قطعی شد و چون رفعش تغییر تنظیمات جنگو است، طبق قاعدهٔ دامنه
  نیازمند تأیید جداگانهٔ مالک محصول است. زنجیرهٔ واقعیت:
  `DEFAULT_THROTTLE_CLASSES` شامل `AnonRateThrottle` سراسری است،
  `THROTTLE_RATE_ANON` پیش‌فرض `100/hour` است، DRF `NUM_PROXIES` تنظیم نشده
  پس شناسهٔ throttle `REMOTE_ADDR` است، و طبق توپولوژی تک‌دامنهٔ ADR-0035
  (`DEPLOYMENT.md:182`) همهٔ فراخوانی‌های Next به جنگو از
  `INTERNAL_API_URL=http://127.0.0.1:8000` می‌آیند. نتیجه: **تمام SSR و تمام
  پراکسی `/api/[...path]` همهٔ کاربران در یک سطل ۱۰۰/ساعت می‌نشیند.**
  اندازه‌گیری محلی: از درخواست شمارهٔ ۱۰۰ به بعد، ۴۲۹ با
  `Retry-After ≈ 3599s`. کش `next: { revalidate: 60 }` در
  `src/lib/api/server.ts:34` این را نرم‌تر می‌کند ولی از بین نمی‌برد
  (فراخوانی‌های `cache: "no-store"` و مسیر پراکسیِ سمت مرورگر کش نمی‌شوند).
  گزینه‌های ممکن برای تصمیم بعدی: تنظیم `NUM_PROXIES` در DRF، معاف‌کردن
  اینترفیس داخلی، عبور دادن IP واقعی کاربر از پراکسی، یا بالا بردن
  `THROTTLE_RATE_ANON` در `.env` پروداکشن. هیچ‌کدام در این بسته انجام نشد.
- **دریفت مستندات CI:** ADR-0034 بند ۵-۹ `npm audit --audit-level=high` و
  `bandit -r apps config -ll` (بدون `-c`) را نوشته، ADR-0037 مسیرها را با
  پیشوند `EmmettWebSite/…` و ADR-0034/CHANGELOG شمار تست E2E را «۵۰ تست در
  ۸ فایل» اعلام کرده‌اند در حالی که شمار واقعی **۵۳ تست در ۸ فایل** است
  (`e2e/README.md` عدد «۱۸+ در ۵ فایل» را دارد). ⇒ بستهٔ ۷.
- **ایندکس ADR در `ARCHITECTURE.md` ناقص است:** از ADR-0033 مستقیماً به
  ADR-0037 می‌پرد و ردیف ADR-0034/0035/0036 را ندارد. در این بسته فقط ردیف
  ADR-0038 اضافه شد. ⇒ بستهٔ ۷.
- **`frontend/e2e/README.md` از نگهداری video در آرتیفکت می‌گوید** در حالی که
  `playwright.config.ts` صریحاً `video: "off"` دارد (با دلیل مستند). ⇒ بستهٔ ۷.
- افزودن `engines` به `frontend/package.json` یا ساخت `.nvmrc`؛ کف نسخه فعلاً
  در خود workflow سنجاق و مستند شد.
- ارتقای گیت `npm audit` به audit کامل پس از انتشار نسخهٔ وصله‌شدهٔ `braces`.
- افزودن MySQL به‌عنوان service container برای تست روی موتور واقعی
  production؛ سوئیت فعلی روی SQLite اجرا می‌شود (همان که `pytest.ini` و
  `config.settings.dev` تعریف کرده‌اند).

---

## ۶. پیامدها

- **مثبت:** برای نخستین بار در این ریپو یک پایپ‌لاین CI واقعی وجود دارد که
  هر شش گیت ADR-0034 را با مسیرهای درست اجرا می‌کند؛ هر دستورِ آن پیش از
  نوشتن، محلی اندازه‌گیری شده و نتایج در بند ۴ ثبت شده است.
- **مثبت:** مشکل ۳۵ تست قرمز از لایهٔ CI حل شد؛ هیچ فایل محصول (`backend/`)
  تغییر نکرد، پس رفتار production دست‌نخورده ماند.
- **مثبت:** `manage.py check --deploy` از «اجرای تشریفاتی» به گیت صفر-هشدار
  ارتقا یافت و `npm audit` شامل dev از یک گیت هرگز-سبز-نشدنی به یک گزارش
  شفاف تبدیل شد.
- **منفی/ریسک:** جاب `e2e-and-lighthouse` سنگین‌ترین جاب است (نصب مرورگر،
  بیلد، دو سرور، ۵۳ تست با `retries: 2`)؛ `timeout-minutes: 45` و کش مرورگرها
  برای کنترل آن گذاشته شد. امتیاز Lighthouse به منابع runner حساس است و به
  همین دلیل روی PR گیت نیست — اگرچه در اجرای راستی‌آزمایی (`39213426605`)
  گیت ۰٫۹۵ روی همان رانر پاس شد، این پاس‌شدن یک نمونه است نه تضمین، و نوسان
  منابع اشتراکی می‌تواند اجرای `main` را قرمز کند. در آن صورت راه‌حل اصلاح
  کد است نه کاهش آستانه (قانون ۱۹).
- **منفی/ریسک:** نرخ‌های throttle در جاب E2E بالا برده شده‌اند، پس آن جاب
  رفتار واقعی محدودسازی نرخ را **نمی‌سنجد**. پوشش آن رفتار در
  `apps/core/tests/test_throttling.py` است که در `backend-test` اجرا می‌شود.
- **قید:** هیچ‌کس حق ندارد برای سبزکردن CI آستانه‌ای را پایین بیاورد
  (قانون ۱۹). اگر `.github/ci/ci_test_settings.py` روزی کلیدی غیر از
  `staticfiles` را تغییر داد، این ADR باطل است و باید ADR تازه نوشته شود.
- **قید:** افزودن صفحهٔ عمومی تازه یعنی افزودنش به فهرست URLهای
  `.lighthouserc.json` (بند ۵ ADR-0037) — وگرنه بودجهٔ کارایی آن صفحه هرگز
  سنجیده نمی‌شود.
