# ADR-0034: دروازه‌های کیفیت کد، Pre-commit، پوشش تست ≥ ۸۵٪ و پایپ‌لاین GitHub Actions

**وضعیت:** پذیرفته‌شده — واگذاری مالک محصول در 2026-10-06 (فاز ۸: Quality & Docs)<br>
**تاریخ:** 2026-10-06<br>
**دامنه:** فاز ۸ (کیفیت، تست، فرمت، Pre-commit و CI/CD)<br>
**مرتبط با:** ADR-0010, 0015, 0023, 0030, 0032, 0033<br>
**تصمیم‌گیرندگان:** مالک محصول + ایجنت ارشد توسعه

---

## ۱. زمینه

تا پایان فاز ۷، بررسی‌های کیفیت کد (`pytest`, `ruff`, `mypy`, `eslint`, `tsc`, `vitest`, `next build`, `i18n.py check`) به‌صورت دستی پیش از هر Pull Request اجرا می‌شدند. در فاز ۸ («Quality & Docs»)، الزامات زیر باید به‌صورت خودکار، بازتولیدپذیر و غیرقابل‌دورزدن قفل شوند:

1. پوشش تست (Unit + Integration) با آستانهٔ اجباری **≥ 85%** در بک‌اند و فرانت‌اند؛
2. تکمیل سناریوهای E2E (Playwright) برای قابلیت‌های فازهای ۵ تا ۷ (مشاور هوشمند، تخمین‌گر، فیدهای RSS، `sitemap.xml` و `robots.txt`)؛
3. یکپارچه‌سازی فرمت و لینت: **Ruff + Black + mypy strict** در بک‌اند و **ESLint + Prettier + TypeScript strict** در فرانت‌اند (به‌همراه فرمت کردن ۱۷ فایل قدیمی باقی‌مانده از فازهای قبلی)؛
4. راه‌اندازی **Pre-commit hooks** شامل بررسی فرمت، لینت، تایپ‌چک، عدم وجود راز (Secret) و اعتبارسنجی پیام کامیت بر اساس **Conventional Commits**؛
5. پایپ‌لاین **GitHub Actions** شامل: `lint`، `test`، `build`، `security scan` و `Lighthouse CI` (هدف ≥ 95).

## ۲. گزینه‌ها

| محور | گزینه A | گزینه B | گزینه C (انتخاب‌شده) |
|---|---|---|---|
| فرمت پایتون | فقط `ruff format` | فقط `black` | **هر دو هم‌تراز (`ruff format` + `black` با `line-length = 110` و `py311`)** تا هم سرعت Ruff حفظ شود و هم الزام صریح Black در CI/Pre-commit برآورده گردد |
| فرمت فرانت‌اند | فقط ESLint | Biome | **ESLint 9 + Prettier 3** با اسکریپت‌های `format` و `format:check` |
| پوشش تست فرانت | بدون ابزار پوشش | `@vitest/coverage-istanbul` | **`@vitest/coverage-v8`** (بومی موتور V8 نود، سریع و بدون تحریف خطوط TypeScript) با آستانهٔ قفل‌شدهٔ `≥ 85%` |
| اسکن امنیتی CI | فقط دستی | سرویس‌های تجاری خارجی | **`bandit` (تحلیل استاتیک امنیتی پایتون) + `manage.py check --deploy` + `npm audit --audit-level=high` + اسکنر راز داخلی** |
| Pre-commit | هوک‌های وابسته به اینترنت در زمان کامیت | بدون هوک محلی | **`.pre-commit-config.yaml` با هوک‌های `local` مبتنی بر محیط پروژه + اسکریپت بررسی راز و Conventional Commits (`commit-msg`)** |

## ۳. تصمیم

### الف) یکپارچه‌سازی Ruff + Black + mypy strict در بک‌اند
- در `backend/pyproject.toml`، تنظیمات `[tool.black]` دقیقاً هم‌تراز با `[tool.ruff]` (`line-length = 110`, `target-version = ["py311"]`, `exclude = /(migrations|\.venv)/`) تعریف می‌شود.
- پکیج‌های توسعه‌ای `black`، `bandit` و `pre-commit` صرفاً به `backend/requirements-dev.txt` اضافه می‌شوند (بدون هیچ تغییری در `requirements.txt` پروداکشن روی cPanel — قانون ۶).
- تمام فایل‌های پایتون (شامل ۱۷ فایل قدیمی فازهای ۲ تا ۴) فرمت می‌شوند تا هم `ruff format --check .` و هم `black --check .` بدون حتی یک هشدار سبز باشند.

### ب) یکپارچه‌سازی ESLint + Prettier + Vitest Coverage در فرانت‌اند
- پکیج‌های توسعه‌ای `prettier`، `@vitest/coverage-v8` و `@lhci/cli` در `devDependencies` فایل `frontend/package.json` ثبت می‌شوند.
- آسیب‌پذیری ترانزیتیو `braces`/`micromatch` در درخت وابستگی `eslint-config-next` از طریق بخش `overrides` در `frontend/package.json` پچ می‌شود تا `npm audit` دقیقاً **۰ آسیب‌پذیری** گزارش دهد.
- فایل‌های `.prettierrc.json` و `.prettierignore` در `frontend/` قرار می‌گیرند و تمام کدهای `src/` و `e2e/` فرمت می‌شوند.

### ج) دروازهٔ پوشش تست (Coverage ≥ 85%)
- **بک‌اند:** در `[tool.coverage.report]` داخل `backend/pyproject.toml` مقدار `fail_under = 85` تنظیم می‌شود. تست‌های واحد و یکپارچه برای فرمان‌های مدیریتی (`seed_demo_data`, `generate_blog_summaries`, `seed_ai_engine`) و شاخه‌های ادمین/AI اضافه می‌شوند تا پوشش کل بالای ۹۴٪ و پوشش تک‌تک ماژول‌ها بالای ۸۵٪ باشد.
- **فرانت‌اند:** در `frontend/vitest.config.mts` بخش `coverage` با provider `v8` و آستانه‌های `statements: 85, branches: 80, functions: 85, lines: 85` روی لایهٔ منطق، سئو، کلاینت‌های API و کامپوننت‌های UI/Molecules/Organisms قفل می‌شود.

### د) Pre-commit Hooks و Conventional Commits
- فایل `.pre-commit-config.yaml` در ریشهٔ ریپو تعریف می‌شود و شامل هوک‌های زیر است:
  1. `check-secrets` (`scripts/check_secrets.py`): اسکن تمام فایل‌های استیج‌شده برای جلوگیری از ورود کلیدهای API، توکن‌ها، کلیدهای خصوصی و فایل‌های `.env` (قانون ۵)؛
  2. `conventional-commits` (`scripts/check_commit_msg.py` در استیج `commit-msg`): الزام فرمت `<type>(<scope>): <subject>` با انواع مجاز `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `security`؛
  3. `backend-ruff-check`, `backend-format-check` (`ruff format --check` + `black --check`), `backend-mypy` (`mypy apps config`), `backend-i18n-check` (`python scripts/i18n.py check`)؛
  4. `frontend-prettier-check`, `frontend-eslint`, `frontend-typecheck`.

### ه) پایپ‌لاین GitHub Actions (`.github/workflows/ci.yml`) و Lighthouse CI (`.lighthouserc.json`)
پایپ‌لاین CI در ۶ جاب مستقل و موازی/مرحله‌ای تعریف می‌شود:
1. **`backend-quality`**: اجرای `ruff check`, `ruff format --check`, `black --check`, `mypy apps config`, `manage.py check`, `makemigrations --check --dry-run`, `scripts/i18n.py check` و اعتبارسنجی اسکیمای OpenAPI (`spectacular --fail-on-warn`).
2. **`backend-test`**: اجرای `coverage run -m pytest` و `coverage report --fail-under=85`.
3. **`frontend-quality`**: اجرای `npm run format:check`, `npm run lint` و `npx tsc --noEmit`.
4. **`frontend-test-build`**: اجرای `npm run test:coverage` (با گیت ۸۵٪) و `npm run build`.
5. **`security-scan`**: اجرای `python scripts/check_secrets.py`, `bandit -r apps config -ll`, `python manage.py check --deploy --settings=config.settings.production` و `npm audit --audit-level=high`.
6. **`e2e-and-lighthouse`**: بالا آوردن بک‌اند Django (SQLite + `migrate` + `seed_demo_data`)، بیلد و اجرای سرور Next.js، نصب Chromium و اجرای کامل `npx playwright test` و سپس اجرای `@lhci/cli autorun` با فایل `.lighthouserc.json` (حداقل امتیاز `0.95` در هر ۴ شاخص Performance, Accessibility, Best Practices, SEO برای `/` و `/en`).

## ۴. پیامدها

- **مثبت:** هیچ کدی بدون عبور از تایپ‌چک strict، فرمت استاندارد، اسکن امنیتی، بررسی ترجمه، اعتبارسنجی OpenAPI و پوشش تست ≥ ۸۵٪ وارد شاخهٔ اصلی نمی‌شود.
- **مثبت:** سازگاری ۱۰۰٪ بین `ruff format` و `black` باعث می‌شود توسعه‌دهندگان از هر دو ابزار بدون تداخل diff استفاده کنند.
- **قید:** هر وابستگی جدید در آینده باید در `npm audit` و `bandit` بدون خطا عبور کند.
