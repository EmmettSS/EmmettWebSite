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
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const MANIFEST = join(ROOT, ".next", "prerender-manifest.json");
const APP_HTML_DIR = join(ROOT, ".next", "server", "app");

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

// ---------------------------------------------------------------------------
// دروازهٔ «H1 دیده می‌شود» (ADR-0042)
// ---------------------------------------------------------------------------
// رگرسیون واقعی: hero از `motion/react` استفاده می‌کرد و Next مقدار
// `initial={{ opacity: 0 }}` را داخل HTML پخته‌شده می‌نوشت:
//     <h1 style="opacity:0;transform:translateY(20px)">…</h1>
// یعنی بزرگ‌ترین متن صفحه تا پایان hydration نامرئی بود. اندازه‌گیری CI روی
// `/en`: Performance ۰٫۹۳ (بودجه ۰٫۹۵)، LCP ۱٫۴s در حالی که FCP ۰٫۶s بود.
//
// این بررسی همان فایل‌هایی را می‌خواند که **واقعاً به مرورگر می‌رسند**؛ اگر
// روزی کسی دوباره محتوای اصلی را با انیمیشن JS پنهان کند، بیلد و استقرار
// متوقف می‌شوند.

const H1_PATTERN = /<h1\b[^>]*>/i;
const HIDDEN_PATTERN = /opacity\s*:\s*0(?![\d.])|visibility\s*:\s*hidden|display\s*:\s*none/i;

function collectHtmlFiles(dir) {
  const found = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...collectHtmlFiles(full));
    else if (entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}

const htmlFiles = collectHtmlFiles(APP_HTML_DIR);
if (htmlFiles.length === 0) {
  fail(
    "هیچ HTML پخته‌شده‌ای در ‎.next/server/app پیدا نشد؛ بدون آن بررسی «H1 دیده می‌شود» معنا ندارد.",
  );
}

const hiddenHeadings = [];
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const match = H1_PATTERN.exec(html);
  if (!match) continue;
  if (HIDDEN_PATTERN.test(match[0])) {
    hiddenHeadings.push({ file: relative(APP_HTML_DIR, file), tag: match[0] });
  }
}

if (hiddenHeadings.length > 0) {
  console.error("✗ این صفحه‌ها با <h1> نامرئی در بیلد ساخته شده‌اند:");
  for (const item of hiddenHeadings) {
    console.error(`   - ${item.file}`);
    console.error(`     ${item.tag.slice(0, 160)}`);
  }
  console.error(
    "\nعلت رایج: انیمیشن ورودی با `motion`/`initial={{ opacity: 0 }}` روی عنصر اصلی\n" +
      "صفحه. مقدار اولیه در HTML پخته می‌شود و LCP تا پایان hydration عقب می‌افتد.\n" +
      "راه‌حل: انیمیشن را با کلاس‌های CSS در globals.css بنویسید و برای عنصر اصلی\n" +
      "فقط `transform` بگذارید (نه opacity). ر.ک. ADR-0042.\n",
  );
  process.exit(1);
}

// برای مسیرهای عمومی، وجود h1 اجباری است (سئو + ساختار صفحه).
const missingH1 = [];
for (const route of REQUIRED_PRERENDERED) {
  const file = join(APP_HTML_DIR, `${route.replace(/^\//, "")}.html`);
  let html;
  try {
    html = readFileSync(file, "utf8");
  } catch {
    continue; // نبودِ فایل در بررسی pre-render بالا دیده می‌شود
  }
  if (!H1_PATTERN.test(html)) missingH1.push(route);
}

if (missingH1.length > 0) {
  fail(`این مسیرها هیچ <h1> ندارند: ${missingH1.join(", ")}`);
}

console.log(`✓ هیچ <h1> نامرئی در ${htmlFiles.length} صفحهٔ پخته‌شده نیست.`);

console.log(`✓ ${REQUIRED_PRERENDERED.length} مسیر عمومی در بیلد pre-render شدند.`);
console.log(
  `  ISR (کمترین revalidate): ${
    Math.min(...revalidations.filter((value) => typeof value === "number")) || "—"
  } ثانیه`,
);
console.log(`  صفحه‌های جزئیات pre-render شده: ${detailRoutes.length}`);
console.log(`  مجموع مسیرهای pre-render شده: ${prerendered.size}`);
