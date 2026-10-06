# راهنمای مشارکت در پروژهٔ امیت (Contributing Guide — FA / EN)

از مشارکت شما در توسعهٔ پلتفرم وب‌سایت گروه توسعه نرم‌افزار **امیت (Emmett)** استقبال می‌کنیم. این سند قواعد مهندسی، چرخهٔ کاری اجباری، استاندارد پیام‌های کامیت و گیت‌های کیفیت را به دو زبان **فارسی** و **انگلیسی** شرح می‌دهد.

---

## بخش فارسی (Persian)

### ۱. چرخهٔ کاری اجباری (Workflow)

هر تغییر یا قابلیت جدید در این مخزن باید دقیقاً از چرخهٔ زیر پیروی کند:

```
Discovery → Questions → Plan → ADR → Implementation → Test → Review → Document
```

1. **Discovery:** مطالعهٔ کامل کدهای مرتبط، تاریخچهٔ کامیت‌ها و اسناد `docs/adr/` پیش از نوشتن کد.
2. **Questions:** رفع هرگونه ابهام پیش از پیاده‌سازی.
3. **Plan & ADR:** ثبت هر تصمیم معماری جدید در قالب یک فایل شماره‌گذاری‌شده در `docs/adr/00XX-*.md` (شامل بخش‌های `Context`, `Options`, `Decision`, `Rationale`, `Consequences`).
4. **Implementation & Test:** پیاده‌سازی تایپ‌سیف همراه با تست‌های واحد، یکپارچه و در صورت نیاز E2E با پوشش **حداقل ۸۵٪**.
5. **Review & Document:** هر Pull Request باید به‌گونه‌ای کوچک، تمیز و مستند باشد که توسط **۳ بازبین (Reviewer)** به‌راحتی قابل بررسی باشد و تغییرات در `CHANGELOG.md` و مستندات فنی ثبت گردد.

### ۲. خلاصهٔ ۲۰ قانون سخت‌گیرانه (Hard Rules)

- **قانون ۳ (ADR):** هیچ تصمیم معماری بدون ADR پذیرفته نمی‌شود.
- **قانون ۵ (امنیت رازها):** هرگز کلید، توکن یا رمز عبور در کد ننویسید؛ فقط از `.env` و `django-environ` استفاده کنید (`scripts/check_secrets.py`).
- **قانون ۶ (وابستگی‌ها):** هیچ پکیج جدیدی بدون توجیه فنی مکتوب در ADR اضافه نشود.
- **قانون ۷ (Type Safety):** کد پایتون باید از `mypy --strict` و کد فرانت‌اند از `tsc --noEmit` (`strict: true`) بدون حتی یک خطا عبور کند.
- **قانون ۸ (OpenAPI):** هر تغییر در API باید با `@extend_schema` مستند شده و از `manage.py spectacular --validate --fail-on-warn` عبور کند.
- **قانون ۹ تا ۱۱ (i18n و RTL):** هیچ رشتهٔ متنی در کد هاردکد نشود؛ تاریخ‌ها در فارسی شمسی و اعداد فارسی باشند؛ RTL/LTR در سطح کامپوننت مدیریت شود.
- **قانون ۱۲ تا ۱۴ (موتور AI):** تمام قابلیت‌های هوش مصنوعی منحصراً از `apps.ai_engine` با ورودی‌های بستهٔ کاتالوگ (Enum) و با اعمال Guardrail فرهنگی ایرانی عبور کنند.
- **قانون ۱۵ تا ۱۹ (کارایی، امنیت، سئو و دسترس‌پذیری):** کوئری‌ها بهینه (`select_related` / `prefetch_related`)، استاندارد WCAG AA رعایت‌شده و امتیاز Lighthouse CI در هر ۴ محور `≥ 95` باشد.

### ۳. راه‌اندازی هوک‌های Pre-commit

پیش از اولین کامیت، هوک‌های Pre-commit را نصب کنید:

```bash
backend/.venv/bin/pre-commit install
backend/.venv/bin/pre-commit install --hook-type commit-msg
backend/.venv/bin/pre-commit run --all-files
```

### ۴. استاندارد پیام کامیت (Conventional Commits)

تمام کامیت‌ها باید از الگوی **Conventional Commits** پیروی کنند (توسط هوک `commit-msg` و `scripts/check_commit_msg.py` بررسی می‌شود):

```text
<type>(<scope>): <short imperative summary>
```

- **انواع مجاز (`type`):**
  - `feat`: افزودن قابلیت جدید (مثلاً `feat(ai): add deterministic project estimator endpoint`)
  - `fix`: رفع باگ (مثلاً `fix(admin): resolve related presence filter model lookup`)
  - `security`: سخت‌سازی امنیتی (مثلاً `security(auth): enforce TOTP 2FA and login lockout`)
  - `perf`: بهبود کارایی و کاهش کوئری (مثلاً `perf(blog): add select_related on post detail queryset`)
  - `docs`: ایجاد یا به‌روزرسانی مستندات و ADRها
  - `test`: افزودن یا تکمیل تست‌های واحد، یکپارچه و E2E
  - `ci`: تغییرات پایپ‌لاین GitHub Actions یا Pre-commit
  - `refactor`, `style`, `build`, `chore`, `revert`

### ۵. چک‌لیست پیش از ارسال Pull Request

- [ ] `backend/.venv/bin/pre-commit run --all-files` بدون خطا اجرا شده است.
- [ ] تست‌های بک‌اند (`coverage run -m pytest && coverage report --fail-under=85`) سبز هستند.
- [ ] تست‌های فرانت‌اند (`npm run test:coverage`) با پوشش بالای ۸۵٪ و `npm run build` سبز هستند.
- [ ] در صورت تغییر ترجمه، `python scripts/i18n.py check` سبز است و کلیدهای `messages/fa.json` و `messages/en.json` متقارن‌اند.
- [ ] مستندات (`docs/TECHNICAL_DOCUMENTATION.{fa,en}.md` و `CHANGELOG.md`) به‌روزرسانی شده‌اند.

---

## English Section

### 1. Mandatory Engineering Workflow

Every change must follow:
`Discovery → Questions → Plan → ADR → Implementation → Test → Review → Document`

- Document architectural decisions in `docs/adr/00XX-*.md`.
- Never commit secrets or `.env` files (`python3 scripts/check_secrets.py`).
- Maintain strict type safety (`mypy apps config` with `--strict` on backend; `npm run typecheck` on frontend).
- Keep test coverage `>= 85%` in both backend (`pytest` + `coverage`) and frontend (`vitest` + `@vitest/coverage-v8`).

### 2. Code Formatting & Linting

- **Backend (`backend/`):** Formatted and linted with **Ruff** (`ruff check .`, `ruff format --check .`), **Black** (`black --check .`), **Mypy** (`mypy apps config`), and **Bandit** (`bandit -c pyproject.toml -r apps config -ll`).
- **Frontend (`frontend/`):** Formatted and linted with **Prettier** (`npm run format:check`), **ESLint** (`npm run lint`), and **TypeScript** (`npm run typecheck`).

### 3. Conventional Commits Format

Commit messages are validated automatically by `scripts/check_commit_msg.py`:

```text
<type>(<optional-scope>): <description>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `security`.
