import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { EXCEPTIONS, RATCHET } from "./hardcoded-colors.baseline";

/**
 * گارد رگرسیون توکن‌های طراحی (ADR-0039).
 *
 * این تست **استاندارد توکن** را قابل اجرا می‌کند: رنگ باید از توکن بیاید، نه
 * از لیترال خام. چون مهاجرت همهٔ لیترال‌های موجود یک‌باره ممکن نیست، شمار
 * فعلی هر فایل در `hardcoded-colors.baseline.ts` قفل شده و فقط مجاز است کم
 * شود — یک جفت‌بند (ratchet) که جلوی بدتر شدن تدریجی را می‌گیرد.
 *
 * افزون بر آن، یکپارچگی **سیم‌کشی** توکن‌ها بررسی می‌شود: هر `var()` در
 * `@theme inline` باید مقصدی در `:root` داشته باشد (یا fallback بدهد). این
 * دقیقاً همان نقصی است که باعث شد ده توکن پالت زمردی سال‌ها تعریف‌شده ولی
 * بی‌استفاده بمانند و کد به هگز خام پناه ببرد.
 */

const frontendRoot = resolve(import.meta.dirname, "../..");
const srcDir = join(frontendRoot, "src");

/** هگز سه تا هشت رقمی؛ روی کد فعلی ریپو صفر مثبت کاذب دارد. */
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/g;
const RGBA_COLOR = /rgba\(/g;
/**
 * فرم عددیِ رنگ: `0xRRGGBB` یا `0xRRGGBBAA`. کتابخانه‌های WebGL مثل Three.js
 * رنگ را **عدد** می‌گیرند نه رشتهٔ CSS، پس این فرم با هیچ‌کدام از دو الگوی بالا
 * دیده نمی‌شد؛ نقطهٔ کوری که در بستهٔ ۶ گزارش شد و باعث می‌شد افزودن رنگ خام
 * به `neural-network-3d.tsx` هیچ تستی را قرمز نکند.
 *
 * حدِ `{6,8}` عمداً تنگ است: `0xRRGGBB` و `0xRRGGBBAA` دو عرضِ واقعیِ رنگ‌اند،
 * در حالی که `0xff` یا `0x100` به‌مراتب بیشتر احتمال دارد بیت‌ماسک باشند تا
 * رنگ. `\b` پایانی هم از تطبیقِ جزئی با اعداد بلندتر جلوگیری می‌کند، پس یک
 * BigInt مثل `0x1fae6effffff` رنگ شمرده نمی‌شود. هر دو رفتار با آزمون قفل
 * شده‌اند. روی کد فعلی ریپو (۹۶ فایل) صفر مثبت کاذب دارد: تنها ۶ رخداد، همه
 * در یک فایل و همه رنگِ واقعی.
 */
const HEX_NUMBER_COLOR = /0[xX][0-9a-fA-F]{6,8}\b/g;
/** خطوط کامنت: `//`، بدنهٔ کامنت بلوکی (`*`) و آغازگر آن. */
const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/;

function collectSourceFiles(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(absolute, found);
      continue;
    }
    // فایل‌های تست شمرده نمی‌شوند: گاهی عمداً مقدار یک توکن را در assertion
    // می‌آورند (مثل `ui-tokens.test.ts`) و آن لیترال «رنگ خام در کد» نیست.
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes(".test.")) continue;
    found.push(absolute);
  }
  return found;
}

interface RawColorCounts {
  /** مجموع هر سه فرم — همان عددی که فهرست پایه قفل می‌کند. */
  total: number;
  /** فقط فرم `0x…`؛ برای پایشِ زنده‌بودنِ الگوی سوم و صفرِ مثبتِ کاذب. */
  hexNumber: number;
}

/** حذف خطوط کامنت؛ همان چیزی که این گارد «کد» می‌نامد. */
function stripCommentLines(source: string): string {
  return source
    .split("\n")
    .filter((line) => !COMMENT_LINE.test(line))
    .join("\n");
}

/**
 * شمار لیترال رنگ خام در یک پاره‌کد. سه الگو متقابلاً انحصاری‌اند — `#…` با
 * `#` شروع می‌شود، `rgba(` یک فراخوانی است و `0x…` با `0x` — پس هیچ لیترالی
 * دو بار شمرده نمی‌شود و جمع‌شان درست است.
 */
function countRawColorsInCode(code: string): RawColorCounts {
  const hexNumber = (code.match(HEX_NUMBER_COLOR) ?? []).length;
  return {
    total: (code.match(HEX_COLOR) ?? []).length + (code.match(RGBA_COLOR) ?? []).length + hexNumber,
    hexNumber,
  };
}

function countRawColors(absolutePath: string): RawColorCounts {
  return countRawColorsInCode(stripCommentLines(readFileSync(absolutePath, "utf8")));
}

const counts = new Map<string, number>();
const hexNumberCounts = new Map<string, number>();
for (const file of collectSourceFiles(srcDir)) {
  const relativePath = relative(frontendRoot, file).split("\\").join("/");
  const { total, hexNumber } = countRawColors(file);
  if (total > 0) counts.set(relativePath, total);
  if (hexNumber > 0) hexNumberCounts.set(relativePath, hexNumber);
}

const ratchetEntries = Object.entries(RATCHET) as [string, number][];
const exceptionEntries = Object.entries(EXCEPTIONS) as [string, string][];
const scannedTotal = [...counts.values()].reduce((sum, count) => sum + count, 0);
const baselineTotal = ratchetEntries.reduce((sum, [, count]) => sum + count, 0);

const globalsCss = readFileSync(join(srcDir, "app/globals.css"), "utf8");

function cssBlock(header: string): string {
  const start = globalsCss.indexOf(header);
  expect(start, `بلوک «${header}» در globals.css پیدا نشد`).toBeGreaterThan(-1);
  // `noUncheckedIndexedAccess` فعال است، پس مقدار پیش‌فرض لازم است.
  const [block = ""] = globalsCss.slice(start).split("\n}");
  return block;
}

const rootBlock = cssBlock(":root {");
const themeBlock = cssBlock("@theme inline {");
const rootTokenNames = new Set(
  [...rootBlock.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((match) => match[1] ?? ""),
);

describe("گارد رنگ خام (ADR-0039)", () => {
  it("هیچ فایل تازه‌ای رنگ خام اضافه نکرده است", () => {
    const known = new Set([...ratchetEntries.map(([f]) => f), ...exceptionEntries.map(([f]) => f)]);
    const unknown = [...counts.keys()].filter((file) => !known.has(file));
    expect(
      unknown,
      "این فایل‌ها رنگ خام دارند ولی نه در فهرست پایه‌اند نه در استثنائات. " +
        "رنگ را به توکن تبدیل کنید؛ اگر واقعاً اجتناب‌ناپذیر است، با دلیل مکتوب " +
        "به EXCEPTIONS اضافه‌شان کنید.",
    ).toEqual([]);
  });

  it("شمار رنگ خام هیچ فایلی از فهرست پایه بیشتر نشده است", () => {
    const regressions = ratchetEntries
      .filter(([file, allowed]) => (counts.get(file) ?? 0) > allowed)
      .map(([file, allowed]) => `${file}: ${counts.get(file)} لیترال، سقف مجاز ${allowed}`);
    expect(
      regressions,
      "رگرسیون: رنگ خام افزوده شده است. از توکن‌های globals.css استفاده کنید " +
        "(مثلاً text-primary یا bg-emerald-deep) و در صورت نبودِ توکن معادل، " +
        "نخست توکن را در :root و @theme inline تعریف کنید.",
    ).toEqual([]);
  });

  it("بهبودها در فهرست پایه قفل شده‌اند (جفت‌بند دوطرفه)", () => {
    const improvements = ratchetEntries
      .filter(([file, allowed]) => (counts.get(file) ?? 0) < allowed)
      .map(([file, allowed]) => `${file}: اکنون ${counts.get(file)}، در فهرست پایه ${allowed}`);
    expect(
      improvements,
      "لیترال‌ها کم شده‌اند ولی فهرست پایه به‌روز نشده است. عدد را در " +
        "hardcoded-colors.baseline.ts پایین بیاورید تا بهبود قفل شود.",
    ).toEqual([]);
  });

  it("هیچ مدخل کهنه‌ای در فهرست پایه نمانده است", () => {
    const stale = ratchetEntries.filter(([file]) => !counts.has(file)).map(([file]) => file);
    expect(
      stale,
      "این فایل‌ها دیگر رنگ خام ندارند (یا حذف/تغییرمسیر داده‌اند)؛ مدخل‌شان را " +
        "از RATCHET حذف کنید.",
    ).toEqual([]);
  });

  it("هر استثنا دلیل مکتوب دارد و هنوز لیترال واقعی دارد", () => {
    const withoutReason = exceptionEntries.filter(([, reason]) => reason.trim().length < 20);
    const stale = exceptionEntries.filter(([file]) => !counts.has(file));
    expect(
      withoutReason.map(([file]) => file),
      "استثنا باید دلیل مکتوب داشته باشد.",
    ).toEqual([]);
    expect(
      stale.map(([file]) => file),
      "این استثناها دیگر لیترالی ندارند یا فایلشان وجود ندارد؛ از EXCEPTIONS حذفشان کنید.",
    ).toEqual([]);
  });

  it("مجموع رنگ خام از سقف فهرست پایه فراتر نرفته است", () => {
    expect(scannedTotal).toBe(
      baselineTotal + exceptionEntries.reduce((s, [f]) => s + (counts.get(f) ?? 0), 0),
    );
    // سقف سخت: با هر مهاجرت یا حذفِ فایلِ دارای لیترال باید پایین بیاید.
    // ۳۶۵ → ۳۶۰ در بستهٔ ۴ (حذف `components/organisms/hero.tsx` با ۵ لیترال).
    // ۳۶۰ → ۱۷۷ در بستهٔ ۶، در ۳۰ کامیت: ۱۷۸ لیترال به توکن مهاجرت کرد
    // (۱۵۴ کلاسِ Tailwind + ۲۴ سبکِ درون‌خطی/attributeِ SVG) و ۵ لیترالِ
    // `src/app/not-found.tsx` به EXCEPTIONS منتقل شد چون آن فایل بیرونِ
    // `[locale]/layout.tsx` رندر می‌شود و ساختاراً به توکن دسترسی ندارد.
    // سه فایل (`layout.tsx`، `status-shell.tsx`، `search/page.tsx`) کاملاً پاک
    // شدند و مدخلشان حذف شد؛ ۲۰ فایل → ۱۶ فایل.
    // باقی‌ماندهٔ ۱۷۷ = ۱۵۱ لیترال بدونِ توکنِ هم‌مقدار + ۲۶ لیترالِ دارای
    // توکن که مهاجرتشان یا از نظر معنایی نادرست است یا از نظر ایستا قابل
    // اثبات نیست؛ تفکیکِ دقیقِ دلیل‌ها در CHANGELOG بستهٔ ۶ آمده است.
    //
    // توجه به دامِ محاسباتی: این سقف **فقط** مجموعِ RATCHET است. افزودنِ یک
    // فایل به EXCEPTIONS مقدار `scannedTotal` را بالا می‌برد ولی این عدد را
    // تکان نمی‌دهد، چون استثنا «بدهیِ مهاجرت‌پذیر» نیست که باید کم شود. پس
    // گسترشِ الگوی شمارش (افزودنِ فرم `0x…`) سقف را ۱۷۷ → ۱۸۳ نبرد؛ تنها
    // `scannedTotal` را ۱۹۸ → ۲۰۴ برد و ضابطهٔ بالا شد ۲۰۴ = ۱۷۷ + ۲۷.
    // اتصال محتوای واقعی CMS و حذف داده‌های نمایشی، ۱۹ لیترال را از چهار بخش Home کم کرد.
    // جفت‌بندِ فایل‌های مربوط در hardcoded-colors.baseline.ts هم‌زمان قفل شده است.
    expect(baselineTotal).toBe(158);
  });
});

describe("الگوهای شمارش رنگ خام (ADR-0039)", () => {
  // سه آزمونِ زیر خودِ **آشکارساز** را قفل می‌کنند، نه یک فایلِ خاص را. بدون
  // این‌ها، حذف یا خنثی‌شدنِ الگوی سوم هیچ تستی را قرمز نمی‌کرد و نقطهٔ کور
  // بی‌صدا برمی‌گشت.

  it("فرم عددیِ WebGL رنگ خام شمرده می‌شود", () => {
    for (const code of [
      "color: 0x1fae6e,",
      "renderer.setClearColor(0x000000, 0);",
      "new THREE.Color(0x4d9be8)",
      "material.color = 0X7DDBB4;",
      "with alpha: 0x1fae6eff,",
    ]) {
      expect(countRawColorsInCode(code).total, code).toBe(1);
    }
  });

  it("عددِ ساده و هشِ بلند با رنگ اشتباه گرفته نمی‌شوند", () => {
    // خطرِ واقعیِ افزودنِ الگوی `0x`: فایلِ Three.js پر از عددِ اعشاری و
    // صحیح است. این‌ها همه باید صفر بمانند.
    for (const code of [
      "size: 0.055,",
      "opacity: 0.85,",
      "camera.position.set(0, 0, 8);",
      "const count = 420;",
      "if (dist < 1.15) {",
      "(e.clientX / window.innerWidth - 0.5) * 2",
      "0xff",
      "0x100",
      "const big = 0x1fae6effffffn;",
    ]) {
      expect(countRawColorsInCode(code).total, code).toBe(0);
    }
  });

  it("الگوی `0x` در کدِ فعلیِ ریپو صفرِ مثبتِ کاذب ندارد", () => {
    // اگر روزی الگو جای دیگری هم چیزی بگیرد، این فهرست بزرگ‌تر می‌شود و
    // بازبین باید تک‌تکِ موردهای تازه را رنگِ واقعی بداند یا الگو را تنگ کند.
    expect([...hexNumberCounts.keys()].sort()).toEqual([
      "src/components/ui-port/neural-network-3d.tsx",
    ]);
    expect(
      hexNumberCounts.get("src/components/ui-port/neural-network-3d.tsx"),
      "اگر این عدد صفر شد، الگوی سوم حذف یا خنثی شده است؛ اگر بیشتر شد، رنگ " +
        "خامِ تازه به این فایل اضافه شده و باید دلیلش در EXCEPTIONS به‌روز شود.",
    ).toBe(6);
  });
});

describe("یکپارچگی سیم‌کشی توکن‌ها (ADR-0039)", () => {
  it("هر var() در @theme inline مقصدی در :root دارد یا fallback می‌دهد", () => {
    const dangling: string[] = [];
    for (const match of themeBlock.matchAll(/var\((--[a-z0-9-]+)([^)]*)\)/g)) {
      const [, name = "", rest = ""] = match;
      // `--font-active-sans` عمداً مقصد ایستا ندارد: در layout بر پایهٔ زبان
      // ست می‌شود و در خودِ var() fallback دارد.
      if (!rootTokenNames.has(name) && !rest.trim().startsWith(",")) dangling.push(name);
    }
    expect(
      dangling,
      "این توکن‌ها در @theme inline به متغیری ارجاع می‌دهند که در :root تعریف " +
        "نشده و fallback هم ندارند؛ utility مربوطه به مقدار نامعتبر می‌رسد.",
    ).toEqual([]);
  });

  it("توکن‌های رنگِ نگاشت‌شده، همه در :root تعریف شده‌اند", () => {
    const colorMappings = [...themeBlock.matchAll(/^\s*(--color-[a-z0-9-]+):/gm)]
      .map((match) => match[1] ?? "")
      .filter((token) => token.length > 0);
    expect(colorMappings.length).toBeGreaterThan(0);
    const unmapped = colorMappings.filter((token) => {
      const source = token.replace(/^--color-/, "--");
      return !rootTokenNames.has(source) && !themeBlock.includes(`${token}: var(${source})`);
    });
    expect(unmapped, "نگاشت --color-* باید به توکن موجود در :root اشاره کند.").toEqual([]);
  });

  it("توکن‌های بستهٔ ۲ هم تعریف و هم نگاشت شده‌اند", () => {
    const required = [
      "emerald-deep",
      "deep-green-black",
      "blue-deep",
      "teal-deep",
      "amber-deep",
      "violet-deep",
      "muted-on-dark",
      "muted-on-light",
    ];
    const missingInRoot = required.filter((name) => !rootTokenNames.has(`--${name}`));
    const missingInTheme = required.filter(
      (name) => !themeBlock.includes(`--color-${name}: var(--${name})`),
    );
    expect(missingInRoot, "توکن در :root تعریف نشده است.").toEqual([]);
    expect(
      missingInTheme,
      "توکن در :root هست ولی در @theme inline نگاشت نشده، پس هیچ utility " +
        "معادلی ندارد و کد دوباره به لیترال خام برمی‌گردد.",
    ).toEqual([]);
  });

  it("دو توکن متن ملایم با --muted-foreground اشتباه گرفته نمی‌شوند", () => {
    // آلفای این سه مقدار متفاوت است؛ یکی‌کردنشان کنتراست متن را جابه‌جا می‌کند.
    const valueOf = (name: string): string => {
      const match = rootBlock.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, "m"));
      expect(match, `${name} در :root پیدا نشد`).not.toBeNull();
      return (match?.[1] ?? "").replace(/\s+/g, "").toLowerCase();
    };
    const mutedForeground = valueOf("--muted-foreground");
    const onDark = valueOf("--muted-on-dark");
    const onLight = valueOf("--muted-on-light");
    expect(
      new Set([mutedForeground, onDark, onLight]).size,
      "این سه مقدار باید متمایز بمانند.",
    ).toBe(3);
    expect(onDark).toBe("rgba(243,250,246,0.58)");
    expect(onLight).toBe("rgba(16,42,32,0.68)");
  });
});
