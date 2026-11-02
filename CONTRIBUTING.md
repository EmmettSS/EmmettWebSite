# راهنمای مشارکت در پروژهٔ امیت (Contributing Guide — FA / EN)

> **تقارنِ دو زبان:** بخشِ فارسی ۶ زیربخش دارد و بخشِ انگلیسی ۶ زیربخش؛ محتوا
> **آینهٔ کاربردی** است نه ترجمهٔ سطر‌به‌سطر. نگاشت: فارسی ۱ = انگلیسی 1 (چرخهٔ
> کاری)، فارسی ۲ = انگلیسی 6 (بیست قانون، بازسازی‌شده از مأخذ)، فارسی ۳ = انگلیسی 2 (ابزارهای
> لینت/فرمت + Pre-commit)، فارسی ۴ = انگلیسی 3 (‏Conventional Commits)،
> فارسی ۵ = انگلیسی 4 (استاندارد توکن)، فارسی ۶ = انگلیسی 5 (چک‌لیست PR).
> تنها تفاوتِ باقی‌مانده: فهرستِ کاملِ دستوراتِ بررسیِ محلی در فارسی در بندِ ۶.۱
> `TECHNICAL_DOCUMENTATION.fa.md` است و در انگلیسی هم در بندِ 6.1 همان سند؛
> بخشِ انگلیسیِ این فایل خلاصه‌اش را درون‌خطی تکرار می‌کند. هیچ محتوایی تک‌زبانه نمانده است.
>
> **Parity:** both halves have six subsections and are a *functional* mirror, not a
> line-by-line translation. Mapping: Persian 1 = English 1 (workflow), Persian 2 =
> English 6 (the 20 rules, reconstructed from citations), Persian 3 = English 2 (lint/format tooling plus
> pre-commit), Persian 4 = English 3 (Conventional Commits), Persian 5 =
> English 4 (design tokens), Persian 6 = English 5 (PR checklist). The one
> remaining difference: the full local-verification command list lives in section
> 6.1 of `TECHNICAL_DOCUMENTATION.{fa,en}.md` for both languages, and the English
> half of this file additionally repeats it inline. No content is single-language.

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
4. **Implementation & Test:** پیاده‌سازی تایپ‌سیف همراه با تست‌های واحد، یکپارچه و در صورت نیاز E2E. گیت پوشش **حداقل ۸۵٪** است، اما توجه کنید که این گیت **کل مخزن را نمی‌سنجد**: در فرانت‌اند فقط `src/lib` و `src/components/{ui,molecules,organisms,seo}` (۳۲ فایل از ۹۳) و در بک‌اند فقط `apps/` اندازه‌گیری می‌شوند. دامنهٔ واقعی، اعداد تفکیکی و استثنائات در [بند ۶.۴ مستندات فنی](docs/TECHNICAL_DOCUMENTATION.fa.md) آمده است. **کد تازه باید در هر مسیری که هست تست داشته باشد، حتی اگر آن مسیر فعلاً سنجیده نشود** — به‌ویژه `src/app/**`، `src/components/ui-port/**`، `src/i18n/**` و `src/proxy.ts`.
5. **Review & Document:** هر Pull Request باید به‌گونه‌ای کوچک، تمیز و مستند باشد که توسط **۳ بازبین (Reviewer)** به‌راحتی قابل بررسی باشد و تغییرات در `CHANGELOG.md` و مستندات فنی ثبت گردد.

### ۲. بیست قانون سخت‌گیرانه (Hard Rules)

> **ماهیتِ این جدول، صریح:** این یک **بازسازی از روی ارجاع‌ها** است، نه متنِ رسمیِ
> پروژه. هیچ سندِ شماره‌گذاری‌شدهٔ کاملی از این ۲۰ قانون در ریپو وجود نداشت؛ ممیزیِ
> بستهٔ ۷ روی هر ۵۸ فایلِ Markdown نشان داد ۱۹ قانون از ۲۰ به‌صورت پراکنده در ADRها
> با شماره ارجاع شده‌اند. پس هر سطرِ زیر **مأخذِ خودش را دارد**: یا نقلِ مستقیمِ متنِ
> قانون از یک ADR است، یا توضیحی که همان ADR درونِ پرانتز/دونقطه آورده، یا خلاصهٔ
> پیشینِ همین سند. جایی که چند ADR توضیحِ **متفاوت** داده‌اند، هر دو آورده شده و
> یکی انتخاب نشده — چون انتخابِ یکی یعنی جعلِ دیگری.

**سطحِ اطمینان:** 🟢 نقلِ مستقیمِ متنِ قانون · 🔵 توضیحِ صریحِ ADR · 🟡 فقط خلاصهٔ
پیشینِ همین سند · 🔴 واگرا (چند توضیحِ ناسازگار) · ⚫ نامعلوم (صفر ارجاع).

| # | موضوعِ قانون | مأخذ | اطمینان |
|---|---|---|---|
| ۱ | **نامعلوم** | — | ⚫ در هیچ‌یک از ۵۸ فایلِ Markdown ریپو **صفر** ارجاع به «قانون ۱» وجود دارد. متنش فقط نزدِ مالکِ محصول است؛ تا زمانی که او متن را ندهد این سطر عمداً خالی می‌ماند و چیزی جایش ساخته نمی‌شود |
| ۲ | **سؤال پیش از شروع:** هر ابهامِ معماری/پوشه/داده پیش از نوشتنِ کد از مالک پرسیده شود | `ADR-0016` — «طبق قانون ۲ (سؤال قبل از شروع) سه ابهام معماری/پوشه/داده از مالک محصول پرسیده شد»؛ هم‌چنین `ADR-0017` و `ADR-0021` | 🔵 |
| ۳ | **ADR برای هر تصمیمِ معماری:** هیچ تصمیمِ معماری بدونِ ADR پذیرفته نمی‌شود | خلاصهٔ پیشینِ همین سند؛ هیچ ADR‌ای به «قانون ۳» ارجاع نداده | 🟡 |
| ۴ | **سه توضیحِ متفاوت — هیچ‌کدام رد نشد** | `ADR-0002`: «قانون ۴: هر PR قابل تأیید توسط سه نفر» · `ADR-0025`: «قانون ۴ («کیفیت > سرعت»)» · `ADR-0031`: «مدیر محتوا باید بدون تغییر کد بتواند این‌ها را ویرایش کند (قانون ۴ در عمل)» | 🔴 دو تای اول سازگارند (مرورپذیری/کیفیت)؛ سومی ایدهٔ جداگانه‌ای است (عملیاتی‌بودن/بی‌نیازی از کد). این قانون در عمل **شُل** ارجاع داده شده و متنِ واحدی ندارد |
| ۵ | **امنیتِ رازها:** هرگز کلید، توکن یا رمز عبور در کد نوشته نشود؛ فقط `.env` و `django-environ` | `ADR-0033` — «همهٔ رازها فقط در `.env` و از طریق `django-environ` خوانده می‌شوند (قانون ۵)»؛ `ADR-0009`؛ اجرا با `scripts/check_secrets.py` | 🔵 |
| ۶ | **وابستگی‌ها:** هیچ پکیجِ جدیدی بدونِ توجیهِ فنیِ مکتوب در ADR اضافه نشود | `ADR-0005`، `ADR-0010` و `ADR-0011` — «بدون وابستگی غیرضروری» · `ADR-0019` — «هر وابستگی جدید باید توجیه شود» · `ADR-0021` · `ADR-0027` | 🔵 |
| ۷ | **Type Safety:** پایتون با `mypy --strict` و فرانت‌اند با `tsc --noEmit` (`strict: true`) بدونِ حتی یک خطا | `ADR-0010` — «قانون ۷ (type-safety)» · `ADR-0014` — «type hints پروژه (که به‌خاطر قانون ۷ از قبل اجباری هستند)» · `ADR-0015` — «mypy strict» | 🔵 |
| ۸ | **OpenAPI خودکار:** هر تغییرِ API با `@extend_schema` مستند شود و از `spectacular --validate --fail-on-warn` عبور کند | `ADR-0014` — «قانون ۸ («OpenAPI خودکار»)» · `ADR-0001` | 🔵 |
| ۹ | **هیچ رشتهٔ hard-code در کد نباشد:** «تمام متن‌های UI در فایل‌های ترجمه (gettext) باشند؛ هیچ رشته hard-code شده نداشته باشیم» | `ADR-0003` — **نقلِ مستقیمِ متنِ قانون**؛ هم‌چنین `ADR-0001` و `ADR-0030` | 🟢 |
| ۱۰ | **تاریخ و عددِ بومی:** «تاریخ‌ها: در فارسی شمسی (jdatetime)، در انگلیسی میلادی. اعداد: فارسی در FA، لاتین در EN.» | `ADR-0004` — **نقلِ مستقیمِ متنِ قانون**؛ هم‌چنین `ADR-0018` و `ADR-0019` | 🟢 |
| ۱۱ | **RTL در سطحِ کامپوننت، نه CSS hack:** هرگز RTL سراسری/جهانی نوشته نشود | `ADR-0027` — «قانون ۱۱ — RTL در سطح کامپوننت، نه CSS hack» | 🔵 |
| ۱۲ | **تمام فیچرهای AI فقط از `apps.ai_engine`** | `ADR-0009` و `ADR-0002` — «تمام فیچرهای AI فقط از طریق اپ `ai_engine`» | 🔵 |
| ۱۳ | **ورودیِ کاربر به موتور AI فقط از فهرست‌های بستهٔ Enum/Choice — هرگز free-text** | `ADR-0009` | 🔵 |
| ۱۴ | **هر فیچرِ AI باید «Guardrail فرهنگی ایرانی» داشته باشد** | `ADR-0009` | 🔵 |
| ۱۵ | **بهینگیِ کوئری و کارایی:** ‏`select_related` / `prefetch_related` و سقفِ شمارِ کوئری | `ADR-0003` — «بهینگی کوئری» · `ADR-0005` — «کارایی» | 🔵 |
| ۱۶ | **امنیت و Audit Log:** سانیتایزکردنِ ورودی (ضدِ XSS)، ثبتِ رخدادهای حساس | `ADR-0005` — «امنیت» · `ADR-0013` — «امنیت/Audit Log» · `ADR-0022` — الزامِ `nh3` برای Markdown | 🔵 |
| ۱۷ | **SEO — فهرستِ صریح:** ‏`sitemap`، `robots`، `hreflang`، `JSON-LD`، `OG/Twitter`، `canonical`، متای پویا و `RSS` | `ADR-0031` — «قانون ۱۷ پروژه (SEO) فهرستی صریح دارد: …» | 🔵 |
| ۱۸ | **خودمیزبانیِ دارایی‌ها و ممنوعیتِ CDN** — الزامِ هاستِ اشتراکیِ ایرانی و حریمِ خصوصیِ کاربر | `ADR-0027` — «خودمیزبانی فونت و ممنوعیت CDN الزام محصول برای هاست اشتراکی ایرانی و حریم خصوصی کاربران است (قانون ۶ و ۱۸)». **توجه:** خلاصهٔ پیشینِ همین سند این قانون را «دسترس‌پذیری» می‌خواند؛ مأخذِ ADR چیزِ دیگری می‌گوید و آن مقدم است | 🔵 |
| ۱۹ | **هدفِ کارایی: ‏Lighthouse ≥ ۹۵ در هر چهار محور — و آستانه هرگز پایین آورده نمی‌شود** | `ADR-0032` — «قانون ۱۹ پروژه هدف Lighthouse ≥ 95 را تعیین کرده است» · `ADR-0038` — «طبق قانون ۱۹ آستانه پایین آورده نمی‌شود؛ راه‌حل، افزودن تست است» · `ADR-0018` — «الزامات Lighthouse/CLS» | 🔵 |
| ۲۰ | **ثبت در `CHANGELOG.md`:** هر تغییرِ مهم باید در CHANGELOG ثبت شود | `ADR-0010` — «و در `CHANGELOG.md` ثبت شود (قانون ۲۰)» | 🔵 |

**جمع‌بندیِ قابلِ اتکا:** از ۲۰ قانون — **۲** قانون نقلِ مستقیمِ متن دارند (۹ و ۱۰)،
‏**۱۵** قانون توضیحِ صریحِ ADR دارند (۲، ۵، ۶، ۷، ۸، ۱۱ تا ۲۰)، **۱** قانون فقط
خلاصهٔ پیشینِ همین سند است (۳)، **۱** قانون واگراست (۴) و **۱** قانون کاملاً
نامعلوم است (۱). جمع: ۲ + ۱۵ + ۱ + ۱ + ۱ = ۲۰.

**دو کاری که عمداً انجام نشد:** متنِ «قانون ۱» ساخته نشد، و برای «قانون ۴» یکی از
سه توضیح انتخاب نشد. هر دو نیازمندِ ورودیِ مالکِ محصول‌اند؛ ساختنشان یعنی جعلِ
سیاستِ پروژه، که از خالی‌ماندنِ سطر بدتر است.

### ۳. راه‌اندازی هوک‌های Pre-commit و ابزارهای کیفیت

ابزارهایی که این هوک‌ها اجرا می‌کنند — بک‌اند: **Ruff** (`ruff check .`،
`ruff format --check .`)، **Black** (`black --check .`)، **Mypy** (`mypy apps config`)
و **Bandit** (`bandit -c pyproject.toml -r apps config -ll`)؛ فرانت‌اند: **Prettier**
(`npm run format:check`)، **ESLint** (`npm run lint`) و **TypeScript**
(`npm run typecheck`). فهرستِ کاملِ دستوراتِ بررسیِ محلی در بندِ **۶.۱**
`docs/TECHNICAL_DOCUMENTATION.fa.md` است.

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

### ۵. استاندارد توکن‌های طراحی (Design Tokens)

رنگ در کد فرانت‌اند **باید** از توکن بیاید، نه از لیترال خام.

- **ممنوع:** هگز، `rgba()` یا رنگِ عددیِ `0x…` داخل `className` (مثل `text-[#1FAE6E]`)، داخل `style={{}}`، یا به‌عنوانِ ورودیِ رنگِ یک کتابخانه (مثل مادّهٔ Three.js).
- **الزامی:** utility مبتنی بر توکن (`text-primary`، `bg-emerald-deep`) یا `var(--token)`.
- **توکن معادل وجود ندارد؟** نخست توکن را در `frontend/src/app/globals.css` بسازید: مقدار را در `:root` تعریف کنید **و** آن را در `@theme inline` به `--color-<name>` نگاشت کنید. بدون نگاشت، هیچ utility تولید نمی‌شود و نفر بعدی دوباره به لیترال خام برمی‌گردد.
- **مقدار توکن موجود را برای جور شدن با کد تازه تغییر ندهید؛** توکن تازه بسازید. تغییر مقدار یک توکن، ظاهر همهٔ مصرف‌کنندگانش را عوض می‌کند.

این قاعده توسط `frontend/src/app/hardcoded-colors.test.ts` **اجرا** می‌شود: شمار لیترال‌های رنگ هر فایل در `frontend/src/app/hardcoded-colors.baseline.ts` قفل شده و فقط مجاز است **کم** شود (یک جفت‌بند دوطرفه). افزودن لیترال تازه، یا کم‌کردن لیترال بدون پایین‌آوردن عدد در فهرست پایه، تست را قرمز می‌کند. گارد سه فرم را می‌شمارد: هگز (`#…`)، `rgba(`، و عددِ هگز (`0x…`، فرمی که Three.js/WebGL برای رنگ به کار می‌برد).

**چهار فایل استثنا دلیل مکتوب دارند** و دو دسته‌اند:

- سه تای آن‌ها **آبشارِ CSS در دسترس ندارند**: `global-error.tsx`، `src/app/not-found.tsx` (هر دو بیرونِ `[locale]/layout.tsx` رندر می‌شوند، تنها جایی که `globals.css` را import می‌کند) و ماژولِ مشترکِ `src/lib/brand-colors.ts` (منبعِ یکتای پالتِ زمردی برای تصویر Open Graph در satori و سند HTML مستقلِ `410 Gone` در `redirects.ts`).
- چهارمی (`neural-network-3d.tsx`) آبشار دارد ولی **ورودیِ رنگش عدد است**: رنگ را به Three.js/WebGL می‌دهد، جایی که `var()` به‌جای خودِ مقدار کار نمی‌کند.

افزودن استثنای تازه به دلیل فنی مکتوب و تأیید بازبین نیاز دارد. دو قاعده‌ای که هنگامِ تصمیم بینِ `RATCHET` و `EXCEPTIONS` لازم است:

- **سقفِ سختِ گارد فقط مجموعِ `RATCHET` است.** استثنا مقدار `scannedTotal` را بالا می‌برد ولی سقف را تکان نمی‌دهد، چون ضابطه `scannedTotal == baselineTotal + مجموعِ لیترالِ استثناها` است. معیارِ انتخاب: لیترال **بدهیِ مهاجرت‌پذیر** است (‏`RATCHET`، باید کم شود) یا **اجتناب‌ناپذیر** (`EXCEPTIONS`، قفل می‌ماند)؟ گذاشتنِ لیترالِ اجتناب‌ناپذیر در `RATCHET` سقف را بی‌دلیل بالا می‌برد و بدهیِ دروغینی می‌سازد که هرگز صفر نمی‌شود.
- **در متنِ دلیلِ استثنا مقدارِ رنگ ننویسید.** ‏`hardcoded-colors.baseline.ts` خودش زیر `src/` است و برخلافِ فایلِ تست کنار گذاشته نمی‌شود، پس توسط خودِ گارد شمارش می‌شود؛ آوردنِ مقدارِ رنگ در رشتهٔ دلیل، همان فایل را «فایلِ نامعلومِ دارای رنگ خام» می‌کند و گارد را قرمز می‌کند. رنگ را با **نقش** توصیف کنید نه با مقدار.

مستند تصمیم: `docs/adr/0039-design-token-standard-and-hardcoded-color-ratchet.md`. صفحهٔ `/design-system` مقدار زندهٔ هر توکن را در زمان اجرا از CSSOM می‌خواند و نشان می‌دهد، پس توکنِ تعریف‌نشده یا نگاشت‌نشده روی همان صفحه دیده می‌شود.

### ۶. چک‌لیست پیش از ارسال Pull Request

- [ ] `backend/.venv/bin/pre-commit run --all-files` بدون خطا اجرا شده است.
- [ ] تست‌های بک‌اند سبز هستند. **دستور باید با لایهٔ تنظیماتِ CI اجرا شود** (از پوشهٔ `backend/`):

      ```bash
      PYTHONPATH=../.github/ci DJANGO_SETTINGS_MODULE=ci_test_settings coverage run -m pytest -q && coverage report --fail-under=85
      ```

      لایهٔ تنظیماتِ CI (‏`.github/ci/ci_test_settings.py`، موضوع `ADR-0038`) کلید
      `staticfiles` را برای سرعت تست به `StaticFilesStorage` ساده تغییر می‌دهد. در تنظیمات پایه
      نیز از بستهٔ آمادگی نهایی دیپلوی (بستهٔ ۸)، `NonStrictCompressedManifestStaticFilesStorage`
      جایگزین `CompressedManifestStaticFilesStorage` خام شده است تا فراخوانی‌های پوشه‌محور قالب
      Jazzmin (`{% static "vendor/bootswatch" %}`) هم در پروداکشن واقعی و هم در اجرای مستقیم
      `pytest` بدون `ValueError: Missing staticfiles manifest entry` و با حفظ کامل فایل‌های هش‌شده کار کند.
- [ ] تست‌های فرانت‌اند (`npm run test:coverage`) و `npm run build` سبز هستند. توجه: گیت ۸۵٪ فقط `src/lib` و `src/components/{ui,molecules,organisms,seo}` را می‌سنجد و `src/app/**`، `ui-port/**`، `src/i18n/**` و `src/proxy.ts` خارج از آن‌اند (بند ۶.۴ مستندات فنی) — با این حال کد تازه در هر مسیری که باشد باید تست داشته باشد.
- [ ] رنگ‌ها از توکن می‌آیند: `hardcoded-colors.test.ts` سبز است و شمار لیترال‌های رنگ هیچ فایلی افزایش نیافته.
- [ ] در صورت تغییر ترجمه، `python scripts/i18n.py check` سبز است و کلیدهای `messages/fa.json` و `messages/en.json` متقارن‌اند.
- [ ] مستندات به‌روزرسانی شده‌اند: `docs/TECHNICAL_DOCUMENTATION.{fa,en}.md` و `CHANGELOG.md`. **اگر ADR تازه‌ای نوشته‌اید، `docs/adr/README.md` (فهرستِ معتبر) و جدولِ خلاصهٔ ADRها در هر دو نسخهٔ `TECHNICAL_DOCUMENTATION` را هم اضافه کنید** — سه فهرستِ موازیِ ADR پیش‌تر کهنه مانده بودند و علتش همین بود.

---

## English Section

### 1. Mandatory Engineering Workflow

Every change must follow:
`Discovery → Questions → Plan → ADR → Implementation → Test → Review → Document`

- Document architectural decisions in `docs/adr/00XX-*.md`.
- Never commit secrets or `.env` files (`python3 scripts/check_secrets.py`).
- Maintain strict type safety (`mypy apps config` with `--strict` on backend; `npm run typecheck` on frontend).
- Keep test coverage `>= 85%` in both backend (`pytest` + `coverage`) and frontend (`vitest` + `@vitest/coverage-v8`). Note that this gate is **scoped, not repository-wide**: on the frontend it measures only `src/lib` and `src/components/{ui,molecules,organisms,seo}` (32 of 93 source files), and on the backend only `apps/`. New code must be tested regardless of whether its directory is currently measured — especially `src/app/**`, `src/components/ui-port/**`, `src/i18n/**` and `src/proxy.ts`. See §6.3 of `docs/TECHNICAL_DOCUMENTATION.en.md` for the actual scope, the per-directory figures and the compensating E2E controls.

### 2. Code Formatting & Linting

- **Backend (`backend/`):** Formatted and linted with **Ruff** (`ruff check .`, `ruff format --check .`), **Black** (`black --check .`), **Mypy** (`mypy apps config`), and **Bandit** (`bandit -c pyproject.toml -r apps config -ll`).
- **Frontend (`frontend/`):** Formatted and linted with **Prettier** (`npm run format:check`), **ESLint** (`npm run lint`), and **TypeScript** (`npm run typecheck`).

### 3. Conventional Commits Format

Commit messages are validated automatically by `scripts/check_commit_msg.py`:

```text
<type>(<optional-scope>): <description>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `security`.

### 4. Design Token Standard

Colors in frontend code **must** come from design tokens, never from raw literals.

- **Forbidden:** hex, `rgba()` or a numeric `0x…` color inside `className` (e.g. `text-[#1FAE6E]`), inside `style={{}}`, or as a library's color input (e.g. a Three.js material).
- **Required:** token-based utilities (`text-primary`, `bg-emerald-deep`) or `var(--token)`.
- **No matching token?** Create one in `frontend/src/app/globals.css` first: declare the value in `:root` **and** map it in `@theme inline` as `--color-<name>`. Without the mapping no utility is generated, and the next contributor falls back to a raw literal.
- **Never edit an existing token's value** to fit new code; add a new token instead. Changing a token value restyles every consumer of it.

Enforced by `frontend/src/app/hardcoded-colors.test.ts`: the raw-color count of every file is locked in `frontend/src/app/hardcoded-colors.baseline.ts` and may only go **down** (a two-way ratchet). Adding a literal — or removing one without lowering the recorded number — fails the test. The guard counts three forms: hex (`#…`), `rgba(`, and numeric hex (`0x…`, the form Three.js/WebGL takes colors in).

**Four files are documented exceptions**, in two groups:

- Three of them **have no CSS cascade available**: `global-error.tsx`, `src/app/not-found.tsx` (both render outside `[locale]/layout.tsx`, the only place that imports `globals.css`), and shared `src/lib/brand-colors.ts` (the single source of truth for the emerald brand palette consumed by the satori Open Graph image and the standalone `410 Gone` HTML document in `redirects.ts`).
- The fourth (`neural-network-3d.tsx`) does have a cascade but its **color input is a number**: it feeds Three.js/WebGL, where `var()` cannot stand in for the value itself.

A new exception requires a written technical reason and reviewer approval. Two rules matter when choosing between `RATCHET` and `EXCEPTIONS`:

- **The hard ceiling sums `RATCHET` only.** An exception raises `scannedTotal` but never moves the ceiling, because the invariant is `scannedTotal == baselineTotal + sum(exception literals)`. The test to apply: is the literal **migratable debt** (`RATCHET`, must go down) or **unavoidable** (`EXCEPTIONS`, stays locked)? Filing an unavoidable literal under `RATCHET` inflates the ceiling for no reason and invents a debt that can never reach zero.
- **Never put a color value in an exception's reason text.** `hardcoded-colors.baseline.ts` is itself under `src/` and, unlike the test file, is not excluded — so the guard scans it. A color literal in a reason string turns that very file into an "unknown file with raw colors" and fails the guard. Describe colors by **role**, not by value.

Decision record: `docs/adr/0039-design-token-standard-and-hardcoded-color-ratchet.md`. The `/design-system` page reads every token's live value from the CSSOM at runtime and displays it, so an undefined or unmapped token is visible on that page.
### 5. Pre-Pull-Request Checklist

- [ ] `backend/.venv/bin/pre-commit run --all-files` passes with no errors.
- [ ] Backend tests are green. **They must be run through the CI settings shim** (from `backend/`):

      ```bash
      PYTHONPATH=../.github/ci DJANGO_SETTINGS_MODULE=ci_test_settings coverage run -m pytest -q && coverage report --fail-under=85
      ```

      The CI settings shim (`.github/ci/ci_test_settings.py`, `ADR-0038`) switches
      `staticfiles` to plain `StaticFilesStorage` for fast CI execution. Since Package 8
      (Pre-Launch Deployment Readiness), base settings also configure
      `NonStrictCompressedManifestStaticFilesStorage` so Jazzmin's directory-level
      `{% static "vendor/bootswatch" %}` lookup succeeds cleanly both in production after
      `collectstatic` and under direct `pytest` runs while keeping full asset hashing intact.
- [ ] Frontend tests (`npm run test:coverage`) and `npm run build` are green. Note the 85% gate measures only `src/lib` and `src/components/{ui,molecules,organisms,seo}`, not `src/app/**` or the `ui-port` shell.
- [ ] Colors come from tokens: `hardcoded-colors.test.ts` is green and no file's raw-color count has increased.
- [ ] If translations changed, `python scripts/i18n.py check` is green and the `messages/fa.json` and `messages/en.json` key trees are symmetric.
- [ ] Documentation is updated: `docs/TECHNICAL_DOCUMENTATION.{fa,en}.md` and `CHANGELOG.md`. **If you wrote a new ADR, also add it to `docs/adr/README.md` (the authoritative index) and to the ADR summary table in both `TECHNICAL_DOCUMENTATION` files** — three parallel ADR lists went stale previously for exactly this reason.

### 6. The 20 Hard Rules (reconstructed)

> **What this table is, explicitly:** a **reconstruction from citations**, not the
> project's normative text. No complete numbered list of these 20 rules existed
> anywhere in the repository; a Package 7 audit of all 58 markdown files found that
> 19 of the 20 are cited by number across the ADRs. So every row below **carries its
> own source**: either a direct quotation of the rule's text from an ADR, the gloss
> that ADR gave in parentheses or after a colon, or this document's previous summary.
> Where several ADRs gloss a rule **differently**, all of them are shown and none is
> preferred — choosing one would mean falsifying the others.

**Confidence:** 🟢 direct quotation of the rule's text · 🔵 explicit ADR gloss ·
🟡 only this document's previous summary · 🔴 divergent (incompatible glosses) ·
⚫ unknown (zero citations).

| # | Subject | Source | Confidence |
|---|---|---|---|
| 1 | **Unknown** | — | ⚫ **Zero** citations of "rule 1" in any of the repository's 58 markdown files. Its text exists only with the product owner; until they supply it this row stays deliberately empty and nothing is invented for it |
| 2 | **Ask before starting:** every architecture/folder/data ambiguity must be raised with the owner before code is written | `ADR-0016` — "طبق قانون ۲ (سؤال قبل از شروع)"; also `ADR-0017`, `ADR-0021` | 🔵 |
| 3 | **An ADR for every architectural decision:** no architectural decision is accepted without one | This document's previous summary; no ADR cites "rule 3" | 🟡 |
| 4 | **Three different glosses — none discarded** | `ADR-0002`: "every PR reviewable by three people" · `ADR-0025`: "quality > speed" · `ADR-0031`: "the content manager must be able to edit these without changing code (rule 4 in practice)" | 🔴 The first two are compatible (reviewability/quality); the third is a separate idea (operability/no-code). The rule was cited loosely and has no single text |
| 5 | **Secret hygiene:** never write a key, token or password in code; only `.env` and `django-environ` | `ADR-0033` — "all secrets are read only from `.env` via `django-environ` (rule 5)"; `ADR-0009`; enforced by `scripts/check_secrets.py` | 🔵 |
| 6 | **Dependencies:** no new package without written technical justification in an ADR | `ADR-0005`, `ADR-0010`, `ADR-0011` — "no unnecessary dependency" · `ADR-0019` — "every new dependency must be justified" · `ADR-0021` · `ADR-0027` | 🔵 |
| 7 | **Type safety:** Python through `mypy --strict`, frontend through `tsc --noEmit` (`strict: true`), with not a single error | `ADR-0010` — "rule 7 (type-safety)" · `ADR-0014` — "the project's type hints (already mandatory because of rule 7)" · `ADR-0015` — "mypy strict" | 🔵 |
| 8 | **Automatic OpenAPI:** every API change documented with `@extend_schema` and passing `spectacular --validate --fail-on-warn` | `ADR-0014` — "rule 8 («automatic OpenAPI»)" · `ADR-0001` | 🔵 |
| 9 | **No hard-coded strings in code:** "all UI strings live in translation files (gettext); we must have no hard-coded string" | `ADR-0003` — **direct quotation of the rule's text**; also `ADR-0001`, `ADR-0030` | 🟢 |
| 10 | **Localized dates and numerals:** "dates: Jalali in Persian (`jdatetime`), Gregorian in English. Numerals: Persian in FA, Latin in EN." | `ADR-0004` — **direct quotation of the rule's text**; also `ADR-0018`, `ADR-0019` | 🟢 |
| 11 | **RTL at component level, not a CSS hack:** never write global/site-wide RTL rules | `ADR-0027` — "rule 11 — RTL at component level, not a CSS hack" | 🔵 |
| 12 | **All AI features go only through `apps.ai_engine`** | `ADR-0009` and `ADR-0002` | 🔵 |
| 13 | **User input reaching the AI engine only from closed Enum/Choice lists — never free text** | `ADR-0009` | 🔵 |
| 14 | **Every AI feature must have an Iranian cultural Guardrail** | `ADR-0009` | 🔵 |
| 15 | **Query efficiency and performance:** `select_related` / `prefetch_related` and per-endpoint query-count ceilings | `ADR-0003` — "query efficiency" · `ADR-0005` — "performance" | 🔵 |
| 16 | **Security and audit log:** sanitise input (anti-XSS) and record sensitive events | `ADR-0005` — "security" · `ADR-0013` — "security/audit log" · `ADR-0022` — mandates `nh3` for Markdown | 🔵 |
| 17 | **SEO — explicit list:** `sitemap`, `robots`, `hreflang`, `JSON-LD`, `OG/Twitter`, `canonical`, dynamic meta and `RSS` | `ADR-0031` — "the project's rule 17 (SEO) has an explicit list: …" | 🔵 |
| 18 | **Self-hosted assets and no CDN** — a requirement of Iranian shared hosting and of user privacy | `ADR-0027` — "self-hosting fonts and forbidding CDNs is a product requirement for Iranian shared hosting and user privacy (rules 6 and 18)". **Note:** this document's previous summary called rule 18 "accessibility"; the ADR source says otherwise and takes precedence | 🔵 |
| 19 | **Performance target: Lighthouse ≥ 95 on all four axes — and a threshold is never lowered** | `ADR-0032` — "the project's rule 19 set the Lighthouse ≥ 95 target" · `ADR-0038` — "per rule 19 the threshold is not lowered; the fix is to add tests" · `ADR-0018` — "Lighthouse/CLS requirements" | 🔵 |
| 20 | **Record in `CHANGELOG.md`:** every significant change must be logged there | `ADR-0010` — "and recorded in `CHANGELOG.md` (rule 20)" | 🔵 |

**Reliable summary:** of the 20 rules, **2** have their text quoted directly
(9 and 10), **15** have an explicit ADR gloss, **1** rests only on this document's
previous summary (3), **1** is divergent (4) and **1** is entirely unknown (1).

**Two things deliberately not done:** no text was invented for rule 1, and none of
rule 4's three glosses was preferred over the others. Both need product-owner
input; inventing either would mean fabricating project policy, which is worse than
leaving the row empty.
