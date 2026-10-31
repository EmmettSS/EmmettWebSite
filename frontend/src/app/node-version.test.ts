import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * نگهبانِ یکتاییِ نسخهٔ Node.
 *
 * چرا این تست لازم است: افزودنِ `engines` و `.nvmrc` نسخهٔ Node را در **سه** جا
 * نوشت — `NODE_VERSION` در `.github/workflows/ci.yml`، `engines.node` در
 * `package.json` و `.nvmrc` در ریشهٔ ریپو. سه کپی از یک عدد دقیقاً همان الگویی است
 * که در بستهٔ ۷ باعث کهنه‌شدنِ سه فهرستِ موازیِ ADR شد (۳۶، ۳۵ و ۲۱ سطر در برابرِ
 * واقعیتِ ۴۰). چون نمی‌توان این سه را به یک منبع کاهش داد — هر سه را ابزارِ
 * متفاوتی می‌خواند (`setup-node`، npm و nvm) — جفت‌بند می‌زنیم تا واگرایی قرمز شود.
 *
 * مقدار باید **دقیق** باشد (`22.22.3`)، نه `^22` و نه `22.x`: کلِ هدف این است که
 * رشتهٔ محلی و رشتهٔ CI یکی باشد، و `setup-node` هم دقیقاً همین رشته را می‌گیرد.
 *
 * عمداً `engine-strict=true` در `.npmrc` گذاشته نشد: با آن، `npm ci` روی Nodeِ
 * ناهمسان **شکستِ سخت** می‌خورد و یک اختلافِ patch-version روی ماشینِ
 * مشارکت‌کننده کار را می‌خواباند. `engines` بدونِ آن هشدار می‌دهد و گیتِ واقعی را
 * خودِ CI می‌زند.
 */

// همان الگوی `hardcoded-colors.test.ts`: `import.meta.dirname` نه `__dirname`،
// چون این پروژه ESM است و vitest فایل‌های تست را به‌صورت ماژول بارگذاری می‌کند.
const frontendRoot = resolve(import.meta.dirname, "../..");
const repoRoot = resolve(frontendRoot, "..");

/** نسخهٔ پین‌شده در CI؛ منبعِ حقیقتِ عملی، چون گیت واقعی همان‌جا اجرا می‌شود. */
function nodeVersionFromCi(): string {
  const yml = readFileSync(join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");
  const match = /NODE_VERSION:\s*"([^"]+)"/.exec(yml);
  if (!match?.[1]) {
    throw new Error("NODE_VERSION در .github/workflows/ci.yml پیدا نشد");
  }
  return match[1];
}

/** «دقیق» یعنی `X.Y.Z` بدونِ `^`، `~`، `>=` یا `x` — وگرنه هدفِ یکی‌بودن نقض است. */
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;

describe("یکتاییِ نسخهٔ Node در سه منبع", () => {
  const ciVersion = nodeVersionFromCi();
  const engines = JSON.parse(readFileSync(join(frontendRoot, "package.json"), "utf8")).engines as
    { node?: string } | undefined;
  const nvmrc = readFileSync(join(repoRoot, ".nvmrc"), "utf8").trim();

  it("خودِ CI یک نسخهٔ دقیق پین کرده است", () => {
    // لنگرِ مقایسهٔ دو تستِ بعدی؛ اگر این سست شود بقیهٔ مقایسه‌ها بی‌معنا می‌شوند.
    expect(ciVersion).toMatch(EXACT_VERSION);
  });

  it("package.json کلید engines.node را با مقدارِ دقیق دارد", () => {
    expect(engines?.node, "engines.node در frontend/package.json تعریف نشده است").toBeDefined();
    expect(engines?.node).toMatch(EXACT_VERSION);
  });

  it(".nvmrc در ریشهٔ ریپو فقط یک نسخهٔ دقیق دارد", () => {
    expect(nvmrc).toMatch(EXACT_VERSION);
  });

  it("هر سه منبع رشتهٔ یکسانی دارند", () => {
    // اگر قرمز شد، نسخهٔ Node را در هر سه جا **با هم** عوض کنید:
    //   .github/workflows/ci.yml (NODE_VERSION) · frontend/package.json (engines.node) · .nvmrc
    expect(engines?.node, "engines.node با NODE_VERSIONِ CI یکی نیست").toBe(ciVersion);
    expect(nvmrc, ".nvmrc با NODE_VERSIONِ CI یکی نیست").toBe(ciVersion);
  });
});
