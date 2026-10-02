# گزارش فاز ۲ — پوستهٔ محصول + جعبه‌ابزار

**تاریخ:** ۱۴۰۵/۰۷/۱۰ (2026-10-02) · **وضعیت:** کامل و سبز (با دو مورد CI-only)

## چه ساخته شد

| فیچر | خروجی زنده | تست |
|---|---|---|
| F-07 بخش ۱ | `web/src/features/registry.ts` + `features/shell/Palette.tsx` (⌘K/Ctrl+K، گروه‌ها: صفحات/ابزارها/تیم/کیس‌استادی‌ها/دستورات، راهنمای `?`) | e2e `tests/e2e/tools.spec.ts` + axe |
| F-01 | `/fa/tools/tarikh-shamsi/` — سه تب تبدیل/محاسبات/انبوه، روز کاری با تقویم نسخه‌دار، CSV | ۱۲ تست منطق + `jalali:check` (۴۷۴۸ تاریخ با ICU) |
| F-02 | `/fa/tools/kod-meli/` — checksum محلی، جدول گام‌به‌گام، بدون هیچ lookup | ۹ تست + تست امنیتی «بدون شبکه» |
| F-03 | `/fa/tools/toman/` — BigInt خالص، حروف‌نویسی چک، فاکتور/مالیات، ریال | ۱۰ تست (شامل property رفت‌وبرگشت) |
| F-04 | `/fa/tools/matn-farsi/` — diff زندهٔ متن‌محور، ZWNJ محافظه‌کار با فهرست استثنا | ۸ تست + تست عدم `dangerouslySetInnerHTML` |
| F-05 | `/fa/tools/jwt/` — decode مرورگری، هشدارهای CWE، بدون لاگ/ذخیره | ۸ تست + تست عدم لاگ توکن |
| F-07 بخش ۲ | `features/shell/TerminalDock.tsx` + `terminal/commands.ts` (allow-list؛ `scan`/`ask`/`bio` پیام فاز بعد) | تست `eval("alert(1)")` → «دستور ناشناخته» با spy روی `eval` |

## گیت‌های خروج (§۱۰ پرامپت فاز ۲)

- [x] هر شش فیچر زنده‌اند — هیچ mock/demo در مسیر اصلی نیست (منطق واقعی + API واقعی)
- [x] تست‌های پذیرش کارت‌ها سبز: **۶۵ تست Vitest** + **۱۷ تست API** (۳۴ کل API)
- [x] `⌘K` صفحات، ابزارها، تیم، کیس‌استادی‌ها و دستورات را پوشش می‌دهد (تیم/کیس از API واقعی؛ خالی تا ورود B6/B12)
- [x] ترمینال JSON واقعی از API برمی‌گرداند (`tools/team/projects/status/normalize/jalali`) — تست API روی همان endpointها
- [x] تست امنیتی `eval("alert(1)")` → «دستور ناشناخته»، بدون اجرا (spy اثبات می‌کند `eval` صدا زده نشد)
- [x] هر پنج ابزار در `low-power` کامل کار می‌کنند (`low-power.test.ts` با `hardwareConcurrency=2`)
- [x] هر پنج ابزار HTML قابل crawl با **مثال محاسبه‌شدهٔ واقعی** دارند (Static Bridge: ۱۸ صفحه)
- [x] URL-state و لینک اشتراکی دائمی؛ صفحهٔ نتیجه/اشتراک `noindex`
- [x] چهار تست امنیتی اجباری سبز (XSS diff، عدم lookup F-02، عدم اجرای دستور، عدم لاگ توکن)
- [x] `content:check` دوزبانه سبز (شامل meta ابزارها و toolsCopy)
- [x] بودجهٔ bundle: initial **۱۲۲.۹ KB** gzip (≤۲۰۰)، هر روت ابزار ~۱۵۱ KB (≤۳۵۰)
- [x] `docs/FEATURES.md` وضعیت هر شش فیچر را دارد

## محدودیت‌های صادقانه

- **e2e/axe در CI اجرا می‌شوند، نه در این sandbox**: نصب Chromium در محیط توسعه ممکن نشد (نه از apt و نه از CDN). اسپک‌ها نوشته شده‌اند و در CI با Playwright اجرا می‌شوند.
- **تعطیلات مذهبی (قمری) seed نشده‌اند**؛ فقط تعطیلات ثابت شمسی (`solar-fixed-1404.1`). به‌عنوان B13 در OPEN-ITEMS ثبت شد و API همان کمبود را در پاسخ خود اعلام می‌کند.
- گروه تیم/کیس‌استادی‌ها در palette تا ورود محتوای واقعی خالی است (B6/B12) — هیچ ردیف ساختگی ساخته نشد.
- لینک اشتراک در نبود API به‌صورت «در دسترس نیست» نمایش داده می‌شود، نه خطای خام.

## شواهد

- `pnpm --filter @emmett/web test` → 65 passed · `npx tsc --noEmit` → clean
- `pnpm --filter @emmett/web jalali:check` → 4748 dates vs ICU OK
- `pnpm --filter @emmett/web tool:contract` → 5 live tools with resolvable evidence
- `pnpm --filter @emmett/web budget` → 122.9 KB initial / ≤152.8 KB per tool route
- `pnpm --filter @emmett/web seo:render && seo:check` → 18 pages, all computed examples present
- `api: pytest -q` → 34 passed, 1 skipped · `ruff` clean · `makemigrations --check` clean · spectacular `--validate --fail-on-warn` clean
