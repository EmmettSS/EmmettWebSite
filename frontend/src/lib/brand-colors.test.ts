import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BRAND_ACCENT,
  BRAND_GRADIENT_BASE,
  BRAND_GRADIENT_CSS,
  BRAND_GRADIENT_DEEP,
  BRAND_GRADIENT_RAISED,
  BRAND_INK,
  BRAND_LINK,
} from "./brand-colors";

/**
 * سه خاصیتی که پالتِ محیط‌های بی‌آبشار باید داشته باشد و هیچ‌کدام با چشم
 * قابلِ راستی‌آزمایی نیستند:
 *
 * ۱. **کنتراستِ WCAG.** این رنگ‌ها روی کارتِ Open Graph (۱۲۰۰×۶۳۰، در
 *    تلگرام/واتس‌اپ/لینکدین دیده می‌شود) و روی صفحهٔ `410 Gone` می‌نشینند؛
 *    هیچ‌کدام آبشار CSS ندارند، پس هیچ ابزارِ خودکاری در مرورگر کنتراستشان
 *    را نمی‌سنجد. نسبت‌ها اینجا محاسبه و قفل می‌شوند.
 *
 * ۲. **هم‌ارزی با توکن‌های `:root`.** کلِ توجیهِ این ماژول این است که هیچ
 *    رنگِ تازه‌ای اختراع نشده و هر مقدار از `globals.css` آمده. این ادعا
 *    باید ماشینی سنجیده شود، وگرنه اولین ویرایشِ پالت در `globals.css`
 *    این دو را از هم جدا می‌کند و کسی نمی‌فهمد.
 *
 * ۳. **گرادیان از روی همان ثابت‌ها ساخته می‌شود**، نه از یک رشتهٔ مستقلِ
 *    هگز‌دار — وگرنه «منبعِ یکتا» بودنِ ماژول دروغ است.
 */

const frontendRoot = resolve(import.meta.dirname, "../..");

/** روشناییِ نسبی طبق WCAG 2.x (sRGB → linear → luminance). */
function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => Number.parseInt(raw.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels;
  const linearize = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** نسبتِ کنتراست WCAG؛ همیشه ≥ ۱. */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** هر سه پلهٔ گرادیان، چون متن و لینک ممکن است روی هرکدام بنشینند. */
const BACKGROUNDS = [BRAND_GRADIENT_DEEP, BRAND_GRADIENT_BASE, BRAND_GRADIENT_RAISED] as const;

const AA = 4.5;
const AAA = 7;

describe("پالتِ برند برای محیط‌های بی‌آبشار", () => {
  it("متنِ اصلی روی هر سه پلهٔ گرادیان AAA است", () => {
    for (const bg of BACKGROUNDS) {
      expect(contrastRatio(bg, BRAND_INK), `متن روی ${bg}`).toBeGreaterThanOrEqual(AAA);
    }
  });

  it("رنگِ لینک روی هر سه پلهٔ گرادیان AAA است", () => {
    // لینک‌های صفحهٔ `410` متنِ ریز‌اند؛ AA برایشان کافی نیست.
    // `BRAND_LINK` عمداً `--accent` است نه `--primary`: نسبتِ `--primary`
    // روی `--background` برابر ۶٫۰۰ است (فقط AA) در حالی که `--accent`
    // ۸٫۰۷ می‌دهد. اگر روزی این دو جابه‌جا شدند، همین تست می‌شکند.
    for (const bg of BACKGROUNDS) {
      expect(contrastRatio(bg, BRAND_LINK), `لینک روی ${bg}`).toBeGreaterThanOrEqual(AAA);
    }
  });

  it("لهجهٔ برند دستِ‌کم AA است (برای شکل‌ها، نه متنِ ریز)", () => {
    for (const bg of BACKGROUNDS) {
      expect(contrastRatio(bg, BRAND_ACCENT), `لهجه روی ${bg}`).toBeGreaterThanOrEqual(AA);
    }
    // لهجه از لینک کم‌کنتراست‌تر است؛ همین ترتیب باید برقرار بماند تا کسی
    // اشتباهاً `BRAND_ACCENT` را برای متنِ لینک به کار نبرد.
    expect(contrastRatio(BRAND_GRADIENT_BASE, BRAND_ACCENT)).toBeLessThan(
      contrastRatio(BRAND_GRADIENT_BASE, BRAND_LINK),
    );
  });

  it("هیچ رنگی در پالت تکراری نیست", () => {
    const all = [...BACKGROUNDS, BRAND_INK, BRAND_ACCENT, BRAND_LINK];
    expect(new Set(all.map((c) => c.toLowerCase())).size).toBe(all.length);
  });
});

describe("هم‌ارزی با توکن‌های `:root` در globals.css", () => {
  const css = readFileSync(join(frontendRoot, "src/app/globals.css"), "utf8");
  const rootBlock = css.split(":root {")[1]?.split("\n}")[0] ?? "";

  function tokenValue(name: string): string {
    const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(rootBlock);
    expect(match?.[1], `توکن --${name} در بلوک :root پیدا نشد`).toBeDefined();
    return (match?.[1] ?? "").toLowerCase();
  }

  // هر سطر: ثابتِ ماژول ↔ توکنی که از آن گرفته شده.
  // اگر این تست قرمز شد یعنی یا globals.css عوض شده یا اینجا؛ در هر دو حال
  // باید آگاهانه همگام شوند، نه بی‌صدا.
  const MAPPING: ReadonlyArray<readonly [string, string]> = [
    [BRAND_GRADIENT_DEEP, "deep-green-black"],
    [BRAND_GRADIENT_BASE, "background"],
    [BRAND_GRADIENT_RAISED, "card"],
    [BRAND_INK, "foreground"],
    [BRAND_ACCENT, "primary"],
    [BRAND_LINK, "accent"],
  ];

  it.each(MAPPING)("%s برابرِ توکنِ --%s است", (value, token) => {
    expect(value.toLowerCase()).toBe(tokenValue(token));
  });
});

describe("گرادیان از روی همان ثابت‌ها ساخته می‌شود", () => {
  it("هر سه پله را به همان ترتیب و با همان درصدها دارد", () => {
    expect(BRAND_GRADIENT_CSS).toBe(
      `linear-gradient(135deg, ${BRAND_GRADIENT_DEEP} 0%, ${BRAND_GRADIENT_BASE} 60%, ` +
        `${BRAND_GRADIENT_RAISED} 100%)`,
    );
  });

  it("هیچ هگزِ مستقلی در رشتهٔ گرادیان نیست", () => {
    // اگر کسی گرادیان را دستی بازنویسی کند و هگز تازه‌ای بنویسد، «منبعِ یکتا»
    // بودنِ ماژول می‌شکند و گاردِ رنگ هم یک لیترالِ اضافه می‌بیند.
    const hexes = BRAND_GRADIENT_CSS.match(/#[0-9a-fA-F]{6}/g) ?? [];
    expect(hexes).toHaveLength(3);
    expect(hexes.map((h) => h.toLowerCase())).toEqual(
      [BRAND_GRADIENT_DEEP, BRAND_GRADIENT_BASE, BRAND_GRADIENT_RAISED].map((h) => h.toLowerCase()),
    );
  });

  it("روشناییِ سه پله یکنواخت صعودی است", () => {
    // ساختارِ سه‌پله عمداً حفظ شد: گرادیانِ قبلیِ سرمه‌ای دامنهٔ روشناییِ
    // ۵٫۷ برابر داشت و نسخهٔ دوپلهٔ پالتِ مصوب فقط ۱٫۷ برابر، که کارت را
    // تخت می‌کرد. پلهٔ سوم از `--deep-green-black` گرفته شد تا دامنه به
    // ۳٫۴ برسد. این تست همان عمق را قفل می‌کند.
    const [deep = 0, base = 0, raised = 0] = BACKGROUNDS.map(relativeLuminance);
    expect(deep).toBeLessThan(base);
    expect(base).toBeLessThan(raised);
    const span = raised / deep;
    expect(span, "دامنهٔ روشناییِ گرادیان").toBeGreaterThan(3);
    expect(span, "دامنهٔ روشناییِ گرادیان").toBeLessThan(5);
  });
});
