#!/usr/bin/env node
/**
 * خلاصهٔ خوانا برای گیت Lighthouse — «چرا قرمز شد؟» را در خودِ صفحهٔ اجرا می‌نویسد.
 *
 * چرا این فایل وجود دارد؟
 * ------------------------
 * گیت Lighthouse فقط روی `main` (و اجرای دستی) فعال است، پس روی PR هیچ‌وقت
 * دیده نمی‌شود. در اجرای
 * https://github.com/EmmettSS/EmmettWebSite/actions/runs/41399449660 (کامیت 9a61437)
 * این گام شکست خورد، اما هیچ‌جا — نه در گام، نه در خلاصه، نه در annotation —
 * نوشته نشد **کدام URL و کدام سنجه** شکسته است. تنها راه، دانلود آرتیفکت
 * چندمگابایتی `lighthouse-reports` بود. نتیجه: یک گیت قرمز و کور.
 *
 * این اسکریپت از **خروجی واقعی LHCI** می‌خواند:
 *   - `.lighthouseci/lhr-<timestamp>.json`   → گزارش کامل هر اجرا (finalUrl، categories، audits)
 *   - `.lighthouseci/assertion-results.json` → بودجه‌های سنجیده‌شده (LP/ASSERT step)
 *
 * و دو چیز را چاپ می‌کند:
 *   ۱) جدول امتیاز چهار محور برای هر URL، با علامت‌گذاری موارد زیر آستانه؛
 *   ۲) برای هر محور شکست‌خورده، **فهرست سنجه‌هایی که آن را پایین کشیدند**
 *      (با وزن و امتیاز) — دقیقاً همان چیزی که تا امروز پیدا نمی‌شد.
 *
 * قواعد طراحی:
 *   ۱. **هرگز نباید خودش CI را بشکند**: هر خطا → پیام کوتاه و exit 0. یک گام
 *      تشخیصی که خودش بشکند، بدتر از نبودنش است.
 *   ۲. خروجی Markdown است تا در `$GITHUB_STEP_SUMMARY` رندر شود و روی stdout
 *      هم برود (لاگ گام + ترمینال محلی).
 *   ۳. بدون وابستگی بیرونی (فقط `node:fs`/`node:path`).
 *
 * استفاده:
 *   node .github/ci/lighthouse-summary.mjs [مسیر-دایرکتوری]                  # Markdown
 *   node .github/ci/lighthouse-summary.mjs [مسیر] --annotations              # workflow commands
 *
 * حالت `--annotations` برای یک دلیل خاص ساخته شده: خلاصهٔ گام (`$GITHUB_STEP_SUMMARY`)
 * فقط در **صفحهٔ وب** اجرا دیده می‌شود و از API قابل خواندن نیست. annotation
 * از مسیر `GET /repos/{owner}/{repo}/check-runs/{id}/annotations` خوانده
 * می‌شود، یعنی هم انسان و هم عامل خودکار می‌توانند بفهمند کدام URL و کدام
 * سنجه شکسته است.
 */

import fs from "node:fs";
import path from "node:path";

/** آستانهٔ بودجه — باید با `.lighthouserc.json` یکی بماند. */
const THRESHOLD = 0.95;

const CATEGORIES = [
  ["performance", "Performance"],
  ["accessibility", "Accessibility"],
  ["best-practices", "Best Practices"],
  ["seo", "SEO"],
];

/** نام کوتاه و پایدار برای URL: مسیر بدون دامنه، «/» برای ریشه. */
function shortUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
    return `${pathname}${url.search}`;
  } catch {
    return String(rawUrl);
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** همهٔ گزارش‌های ذخیره‌شده توسط LHCI (`lhr-<timestamp>.json`). */
function loadLhrs(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const lhrs = [];
  for (const name of entries) {
    if (!/^lhr-.*\.json$/.test(name)) continue;
    const lhr = readJson(path.join(dir, name));
    if (lhr && typeof lhr === "object") lhrs.push(lhr);
  }
  return lhrs;
}

/**
 * سنجه‌هایی که یک محور را پایین کشیدند.
 *
 * منطق: LHCI هر URL را `numberOfRuns` بار می‌سنجد و بدترین اجرا را ملاک
 * می‌گذارد؛ برای همین به‌جای یک گزارش، همهٔ اجراهای آن URL را می‌بینیم و
 * سنجه‌هایی را برمی‌گردانیم که در **دست‌کم یک اجرا** امتیاز < ۱ دارند.
 *
 * وزن‌ها از `categories[cat].auditRefs[].weight` می‌آید، نه از حدس.
 */
function draggingAudits(lhrs, categoryId) {
  const byAudit = new Map();

  for (const lhr of lhrs) {
    const refs = lhr?.categories?.[categoryId]?.auditRefs ?? [];
    for (const ref of refs) {
      const weight = typeof ref.weight === "number" ? ref.weight : 0;
      if (weight <= 0) continue; // سنجه‌های اطلاعاتی (weight=0) روی امتیاز اثر ندارند
      const audit = lhr?.audits?.[ref.id];
      const score = audit?.score;
      if (typeof score !== "number" || score >= 1) continue;

      const previous = byAudit.get(ref.id);
      if (!previous || score < previous.score) {
        byAudit.set(ref.id, {
          id: ref.id,
          title: audit?.title ?? ref.id,
          score,
          weight,
          displayValue: audit?.displayValue ?? "",
        });
      }
    }
  }

  return [...byAudit.values()].sort((a, b) => b.weight - a.weight || a.score - b.score);
}

/** تحلیل مشترک هر دو حالت: امتیاز هر URL و مقصرهای هر محور شکست‌خورده. */
function analyse(dir) {
  const lhrs = loadLhrs(dir);
  const assertions = readJson(path.join(dir, "assertion-results.json"));
  const failedAssertions = (Array.isArray(assertions) ? assertions : []).filter(
    (item) => item && item.passed === false && (item.level ?? "error") === "error",
  );

  if (lhrs.length === 0) {
    return {
      empty: true,
      message: [
        "### Lighthouse CI",
        "",
        "هیچ گزارش `lhr-*.json` در `.lighthouseci/` پیدا نشد.",
        failedAssertions.length > 0
          ? `با این حال ${failedAssertions.length} assertion شکست خورده ثبت شده است (اندازه‌گیری نیمه‌کاره متوقف شده؟).`
          : "گام اندازه‌گیری احتمالاً پیش از تولید گزارش متوقف شده است؛ لاگ گام «Lighthouse CI» را ببینید.",
        "",
      ].join("\n"),
      failedAssertions,
      perUrl: new Map(),
      failingCategories: new Set(),
      culprits: new Map(),
    };
  }

  // LHCI برای هر URL چند اجرا دارد؛ برای جدول، بدترین امتیاز هر محور را
  // نشان می‌دهیم چون بودجه روی همان سخت‌گیرانه‌ترین اجرا اعمال می‌شود.
  const perUrl = new Map();
  for (const lhr of lhrs) {
    const url = lhr.finalUrl ?? lhr.finalDisplayedUrl ?? lhr.requestedUrl ?? "unknown";
    const scores = {};
    for (const [key] of CATEGORIES) {
      const value = lhr?.categories?.[key]?.score;
      if (typeof value !== "number") continue;
      scores[key] = typeof scores[key] === "number" ? Math.min(scores[key], value) : value;
    }
    // ادغام اجراهای یک URL: بدترین امتیاز هر محور، چون بودجه روی سخت‌گیرانه‌ترین
    // اجرا اعمال می‌شود و گزارش LHCI هم همین را ملاک می‌گذارد.
    const previous = perUrl.get(url)?.scores ?? {};
    const merged = {};
    for (const [key] of CATEGORIES) {
      const before = previous[key];
      const now = scores[key];
      if (typeof before === "number" && typeof now === "number") merged[key] = Math.min(before, now);
      else merged[key] = typeof before === "number" ? before : now;
    }
    perUrl.set(url, { url, scores: merged });
  }

  const failingCategories = new Set();
  const lines = [];
  lines.push("### Lighthouse CI");
  lines.push("");
  lines.push(`بودجه: هر چهار محور ≥ ${THRESHOLD.toFixed(2)} (preset دسکتاپ، ۲ اجرا برای هر URL).`);
  lines.push("");
  lines.push("| URL | Performance | Accessibility | Best Practices | SEO |");
  lines.push("|---|---|---|---|---|");

  for (const entry of [...perUrl.values()].sort((a, b) => a.url.localeCompare(b.url))) {
    const cells = CATEGORIES.map(([key]) => {
      const value = entry.scores[key];
      if (typeof value !== "number") return "—";
      if (value < THRESHOLD) {
        failingCategories.add(key);
        return `**${value.toFixed(2)}** ⚠️`;
      }
      return value.toFixed(2);
    });
    lines.push(`| \`${shortUrl(entry.url)}\` | ${cells.join(" | ")} |`);
  }

  // ---- برای هر محور شکست‌خورده: چه چیزی آن را پایین کشید؟
  for (const [key, label] of CATEGORIES) {
    if (!failingCategories.has(key)) continue;
    const culprits = draggingAudits(lhrs, key);

    lines.push("");
    lines.push(`#### ${label} — سنجه‌های زیر آستانه`);
    if (culprits.length === 0) {
      lines.push("");
      lines.push(
        "هیچ سنجهٔ وزن‌داری زیر ۱ نبود؛ یعنی شکست از ترکیب چند سنجهٔ جزئی است. گزارش کامل `.lighthouseci/lhr-*.html` را ببینید.",
      );
      continue;
    }
    lines.push("");
    lines.push("| سنجه | weight | score | مقدار گزارش‌شده |");
    lines.push("|---|---|---|---|");
    for (const item of culprits.slice(0, 8)) {
      const value = item.displayValue ? `\`${item.displayValue}\`` : "—";
      lines.push(`| \`${item.id}\` — ${item.title} | ${item.weight} | ${item.score.toFixed(2)} | ${value} |`);
    }
  }

  if (failedAssertions.length > 0) {
    lines.push("");
    lines.push(`#### بودجه‌های شکسته (${failedAssertions.length})`);
    lines.push("");
    lines.push("| URL | سنجه | انتظار | واقعیت |");
    lines.push("|---|---|---|---|");
    for (const item of failedAssertions) {
      const url = typeof item.url === "string" ? `\`${shortUrl(item.url)}\`` : "—";
      const audit = item.auditProperty ?? item.auditId ?? "—";
      const expected = item.expected !== undefined ? String(item.expected) : "—";
      const actual = typeof item.actual === "number" && Number.isFinite(item.actual) ? item.actual.toFixed(2) : "—";
      lines.push(`| ${url} | \`${audit}\` | ${expected} | ${actual} |`);
    }
  } else if (failingCategories.size === 0) {
    lines.push("");
    lines.push("✅ همهٔ URLها در هر چهار محور بالای آستانه‌اند.");
  }

  lines.push("");
  lines.push(
    "اگر شکست تکرارشدنی است: `npx @lhci/cli@0.15.1 autorun --collect.staticDistDir=<…>` یا آرتیفکت `lighthouse-reports` را ببینید.",
  );

  const culprits = new Map();
  for (const key of failingCategories) culprits.set(key, draggingAudits(lhrs, key));

  return { empty: false, message: `${lines.join("\n")}\n`, failedAssertions, perUrl, failingCategories, culprits };
}

/**
 * تبدیل تحلیل به workflow command تا به‌صورت annotation روی check run بنشیند.
 * قالب: `::error title=<کوتاه>::<متن تک‌خطی>`
 * قواعد GitHub: عنوان ≤ ۶۴۰ کاراکتر، متن تک‌خطی (کاراکتر \n باید escape شود).
 */
function buildAnnotations(analysis) {
  const escape = (value) => String(value).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  const out = [];

  if (analysis.empty) {
    out.push(`::error title=LHCI::${escape("گزارش Lighthouse تولید نشد؛ گام اندازه‌گیری پیش از گزارش متوقف شده است.")}`);
    return out;
  }

  for (const entry of analysis.perUrl.values()) {
    const broken = [...analysis.failingCategories].filter((key) => {
      const value = entry.scores?.[key];
      return typeof value === "number" && value < THRESHOLD;
    });
    if (broken.length === 0) continue;

    const detail = broken
      .map((key) => {
        const score = entry.scores[key].toFixed(2);
        const top = (analysis.culprits.get(key) ?? [])
          .slice(0, 3)
          .map((item) => `${item.id}(w=${item.weight},s=${item.score.toFixed(2)}${item.displayValue ? `,${item.displayValue}` : ""})`)
          .join(" ");
        return `${key}=${score}${top ? ` ← ${top}` : ""}`;
      })
      .join(" | ");

    out.push(`::error title=${escape(`Lighthouse ${shortUrl(entry.url)}`)}::${escape(detail)}`);
  }

  return out;
}

try {
  const args = process.argv.slice(2);
  const annotate = args.includes("--annotations");
  const dir = args.find((arg) => !arg.startsWith("--")) ?? ".lighthouseci";

  const analysis = analyse(dir);
  process.stdout.write(annotate ? `${buildAnnotations(analysis).join("\n")}\n` : analysis.message);
} catch (error) {
  // خلاصه هرگز نباید خودش باعث شکست اجرا شود.
  process.stdout.write(
    "### Lighthouse CI\n\nساخت خلاصه با خطا روبه‌رو شد؛ برای جزئیات آرتیفکت `lighthouse-reports` را ببینید.\n",
  );
  console.error("lighthouse-summary failed:", error instanceof Error ? error.message : error);
}
process.exit(0);
