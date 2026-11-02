#!/usr/bin/env node
/**
 * دروازهٔ «صفحات محتوایی واقعاً pre-render می‌شوند» (ADR-0041).
 *
 * چرا این اسکریپت وجود دارد؟
 * رگرسیونِ اصلی این پروژه یک خط کد بود: `await connection()` در
 * `src/app/[locale]/layout.tsx`. آن یک خط همهٔ ۲۵ مسیر را به `ƒ Dynamic`
 * تبدیل کرد، بدون آنکه هیچ تستی بشکند و بدون آنکه هیچ سندی دروغ بگوید —
 * چون هیچ‌جا **ادعای رندر استاتیک/ISR** به یک آزمون قابل‌اجرا گره نخورده بود.
 *
 * این اسکریپت پس از `npm run build` اجرا می‌شود و از روی
 * `‎.next/prerender-manifest.json` (خروجی رسمی Next) بررسی می‌کند که هر مسیر
 * عمومیِ فهرست زیر واقعاً در بیلد pre-render شده باشد. اگر روزی کسی دوباره
 * `headers()/cookies()/connection()/searchParams` را به layout یا صفحهٔ عمومی
 * اضافه کند، CI همین‌جا قرمز می‌شود.
 *
 * اجرا: npm run verify:rendering   (نیازمند `npm run build` قبلی)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const MANIFEST = join(ROOT, ".next", "prerender-manifest.json");

/** مسیرهایی که باید HTML آن‌ها در بیلد ساخته شود (نه در هر درخواست). */
const REQUIRED_PRERENDERED = [
  "/fa",
  "/en",
  "/fa/services",
  "/en/services",
  "/fa/projects",
  "/en/projects",
  "/fa/blog",
  "/en/blog",
  "/fa/academy",
  "/en/academy",
  "/fa/about",
  "/en/about",
  "/fa/contact",
  "/en/contact",
];

/**
 * مسیرهایی که عمداً داینامیک‌اند: جست‌وجو پارامتر و هدر درخواست می‌خواند.
 * توجه: `/profile` عمداً **استاتیک** است — پوستهٔ صفحه ثابت و دادهٔ کاربر در
 * مرورگر با `/api/v1/auth/me/` گرفته می‌شود؛ استاتیک‌بودنش یعنی پوسته از کش
 * سرو می‌شود و اطلاعات کاربر هرگز در HTML کش‌شده نمی‌نشیند.
 */
const INTENTIONALLY_DYNAMIC = ["/fa/search", "/en/search"];

/**
 * صفحه‌های جزئیات (`/{locale}/{section}/{slug}`) هم باید pre-render شوند
 * (ADR-0041 بند ۲-۷). آستانه عمداً «تعداد» است نه فهرست ثابت، چون slugها از
 * دیتابیس می‌آیند؛ اما صفر بودنش یعنی `generateStaticParams` حذف شده یا بک‌اند
 * در زمان بیلد بالا نبوده — که در هر دو حالت باید دیده شود.
 */
const MIN_DETAIL_ROUTES = 20;
const DETAIL_ROUTE_PATTERN = /^\/(fa|en)\/(blog|services|projects|academy)\/[^/]+$/;

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {
  fail(
    "‎.next/prerender-manifest.json پیدا نشد. اول `npm run build` را اجرا کنید (این بررسی بعد از بیلد معنا دارد).",
  );
}

const prerendered = new Set(Object.keys(manifest.routes ?? {}));
const missing = REQUIRED_PRERENDERED.filter((route) => !prerendered.has(route));

if (missing.length > 0) {
  console.error("✗ این مسیرهای عمومی pre-render نشده‌اند:");
  for (const route of missing) console.error(`   - ${route}`);
  console.error(
    "\nعلت‌های رایج: استفادهٔ ناخواسته از headers()/cookies()/connection()/searchParams\n" +
      "در layout یا صفحه، یا `export const dynamic = \"force-dynamic\"`.\n" +
      "ر.ک. ADR-0041 (docs/adr/0041-…).\n",
  );
  process.exit(1);
}

const unexpectedDynamic = INTENTIONALLY_DYNAMIC.filter((route) => prerendered.has(route));
if (unexpectedDynamic.length > 0) {
  console.warn(
    `⚠ این مسیرها به‌طور غیرمنتظره pre-render شده‌اند (بازبینی کنید که دادهٔ کاربر کش نشود): ${unexpectedDynamic.join(", ")}`,
  );
}

const detailRoutes = [...prerendered].filter((route) => DETAIL_ROUTE_PATTERN.test(route));
if (detailRoutes.length < MIN_DETAIL_ROUTES) {
  console.warn(
    `⚠ فقط ${detailRoutes.length} صفحهٔ جزئیات pre-render شده (انتظار: ≥ ${MIN_DETAIL_ROUTES}).\n` +
      "  علت‌های رایج: حذف `generateStaticParams`، یا بالا نبودن بک‌اند در زمان بیلد\n" +
      "  (در حالت دوم صفحه در نخستین درخواست رندر می‌شود و کند است، اما 404 نمی‌دهد).",
  );
}

const revalidations = REQUIRED_PRERENDERED.map(
  (route) => manifest.routes?.[route]?.initialRevalidateSeconds ?? null,
);

console.log(`✓ ${REQUIRED_PRERENDERED.length} مسیر عمومی در بیلد pre-render شدند.`);
console.log(
  `  ISR (کمترین revalidate): ${
    Math.min(...revalidations.filter((value) => typeof value === "number")) || "—"
  } ثانیه`,
);
console.log(`  صفحه‌های جزئیات pre-render شده: ${detailRoutes.length}`);
console.log(`  مجموع مسیرهای pre-render شده: ${prerendered.size}`);
