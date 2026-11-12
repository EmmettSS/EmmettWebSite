# فاز ۰ — نتایج اجرا، نقص‌ها و Scope فاز بعد

## ۱. نتایج واقعی اجرا

| گیت | نتیجه | جزئیات |
|---|---|---|
| pytest + coverage | PASSED | 560 passed؛ coverage≈94٪؛آستانهٔ 85٪ |
| ruff / ruff-format / black | PASSED | 258/257 فایل بررسی شد |
| mypy strict | PASSED | 252 source file |
| Django check / migration drift | PASSED | 0 issue؛ No changes detected |
| i18n check | PASSED | پیام‌های کد در .po و فارسی کامل |
| OpenAPI validate | PASSED | fail-on-warn بدون خطا |
| ESLint / TypeScript | PASSED | 0 خطا |
| Vitest | PASSED | 33 فایل / 155 تست |
| Vitest coverage gate | PASSED | statements 95.75، branches 80.59، functions 94.32، lines 97.08 |
| next build | PASSED | با backend زنده و token داخلی |
| verify:rendering | PASSED | 61 prerender؛ ISR 60s؛ 56 HTML بدون h1 نامرئی |
| Playwright E2E | PASSED | 60/60 در 1.4m |
| Lighthouse CI | PASSED | 6 URL × 2 run؛ assert نهایی PASSED |
| secret scan | PASSED | 586 فایل tracked |
| Bandit gate `-ll` | PASSED | 0 Medium/High؛ 6 Low اطلاعاتی |
| npm audit gate high | PASSED | 0 high/critical؛ 8 moderate از زنجیرهٔ typescript-eslint/minimatch |
| Django deploy checks | PASSED | 0 issue با env production-like |
| preflight cPanel محلی | FAILED | 6✓/4⚠/6✗ فقط به‌دلیل artefactهای مخصوص هاست |
| MySQL 8 | NOT EXECUTED | سرویس در سندباکس موجود نیست |
| cPanel/Passenger واقعی | BLOCKED | دسترسی هاست موجود نیست |
| production deploy | NOT EXECUTED | اجازه داده نشده |

یادداشت Lighthouse: یک run خام صفحهٔ اصلی performance=0.93 داشت، اما assertion رسمی LHCI روی مجموعهٔ اجراها PASSED شد. این نوسان باید در فاز عملکرد با تکرار بیشتر پایش شود؛ نتیجهٔ گیت رسمی PASSED است.

## ۲. کارایی محلی

`measure-perf.mjs` روی سرور production محلی:

| مسیر | TTFB p95 ترتیبی | TTFB p95 هم‌زمان |
|---|---|---|
| `/services` | 16.9ms | 70.2ms |
| `/blog` | 17.5ms | 119.7ms |
| `/projects` | 36.7ms | 216.3ms |

HTML فشرده حدود 13.5KB و JS اولیه حدود 265–275KB gzip در 17–18 فایل بود. این اعداد محلی‌اند و جایگزین اندازه‌گیری هاست مقصد نیستند.

## ۳. اسکرین‌شات‌ها

پوشهٔ `docs/audit/assets/2026-11-12/` شامل ۲۰ تصویر است:

- صفحهٔ اصلی فارسی در ۳۲۰/۳۹۰/۷۶۸/۱۰۲۴/۱۴۴۰/۱۹۲۰؛ همگی بدون سرریز افقی.
- advisor، estimate، contact، profile در ۱۴۴۰.
- login ادمین و داشبورد/لیست/فرم/import/2FA در فارسی و یک داشبورد انگلیسی.
- داشبورد موبایل ۳۹۰.

اسکرین‌شات‌های ادمین نقص‌های ADM-01 تا ADM-06 را مستند می‌کنند. صفحهٔ اصلی عمومی در شش عرض هدف سرریز نداشت.

## ۴. رجیستری نقص/بدهی

| شناسه | عنوان | اولویت | فاز پیشنهادی |
|---|---|---|---|
| ADM-01 | redirect پس از login ادمین به 404 | بالا | ۱ |
| ADM-02 | سرریز افقی شدید ادمین | بالا | ۱ |
| ADM-03 | بیرون‌زدگی برند sidebar | متوسط | ۱ |
| ADM-04 | رندر/کنتراست ناپایدار login ادمین | متوسط | ۱ |
| ADM-05 | برچسب‌های untranslated ادمین | کم | ۱ |
| ADM-06 | footer نسخهٔ Jazzmin | کم | ۱ |
| PAR-01 | ویرایش پروفایل BACKEND_ONLY | متوسط | ۲ |
| PAR-02 | علاقه‌مندی‌ها BACKEND_ONLY | متوسط | ۲ |
| PAR-03 | خبرنامه بدون confirm/unsubscribe | متوسط/بالا | ۲ |
| PAR-04 | پیشرفت دوره بدون عملیات کاربر | متوسط | ۲ |
| PAR-05 | بازیابی/تغییر رمز کاربر غایب | متوسط | ۲ |
| SEC-01 | SVG upload sanitize نشده | بالا | ۲/۳ |
| AI-01 | provider واقعی advisor/summary تأیید نشده | BLOCKED | ۲ |
| OPS-01 | MySQL/cPanel واقعی تأیید نشده | BLOCKED | ۴ |
| DEP-01 | 8 moderate npm audit بدون fix غیرشکننده | متوسط | ۳ |

## ۵. Scope پیشنهادی فاز ۱ — Admin بومی Emmett

فاز ۱ باید فقط پس از تصویب این scope شروع شود:

1. طراحی ADR جایگزین ADR-0027/0028 برای Admin بومی.
2. ساخت قالب‌های بومی base/index/login/2FA/import/export با توکن‌های Emmett.
3. حذف تدریجی Jazzmin/AdminLTE/Bootstrap و staticهای وابسته.
4. حفظ تمام admin registryها، mixinها، permissionها، import-export و audit.
5. اصلاح ADM-01 تا ADM-06 در همان بازطراحی.
6. افزودن تست مرورگری ادمین در شش عرض هدف و دو جهت.
7. اجرای کامل گیت‌ها و ثبت checkpoint پس از verification.

معیار خروج فاز ۱: هیچ ارجاع runtime به Jazzmin نماند؛ همهٔ تست‌های قبلیِ معادل‌سازی‌شده و تست‌های بصری جدید PASSED باشند؛ 2FA و import/export و publish workflow بدون رگرسیون کار کنند.

## ۶. آمادگی دیپلوی

خط مبنا از نظر گیت‌های محلی PASSED است، اما آمادهٔ دیپلوی production نیست تا وقتی MySQL 8، cPanel/Passenger واقعی، providerهای خارجی و preflight هاست تأیید نشوند. هیچ دیپلوی یا ری‌استارت production در این فاز انجام نشد.

## ۷. پیگیری و بستن معیارهای Admin بومی

یافته‌های جدول‌های این سند، snapshot پیش از مهاجرت‌اند و به‌عنوان سابقه دست‌نخورده
می‌مانند. نتیجهٔ جایگزینی Jazzmin، اصلاح ADM-01 تا ADM-06، شواهد responsive/CSP،
خلاصهٔ تمام گیت‌ها و محدودیت‌های باقی‌مانده در
[`08-native-admin-verification.fa.md`](./08-native-admin-verification.fa.md)
ثبت شده است. محدودیت deploy واقعی (MySQL 8 و cPanel/Passenger) همچنان برقرار است.
