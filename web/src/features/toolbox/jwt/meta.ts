import type { ToolMeta } from "../types";

export const meta: ToolMeta = {
  id: "jwt",
  slug: { fa: "jwt", en: "jwt" },
  title: { fa: "JWT Debugger با تحلیل امنیتی", en: "JWT debugger with security analysis" },
  subtitle: {
    fa: "decode کاملاً در مرورگر، نمایش تاریخ شمسی انقضا و هشدارهای امنیتی با ارجاع CWE.",
    en: "Browser-only decoding, Jalali expiry dates and security warnings with CWE references.",
  },
  description: {
    fa: "توکن هرگز به سرور ما فرستاده نمی‌شود و هیچ‌جا لاگ نمی‌شود. تحلیل، هدرها را از دید مهاجم می‌خواند: alg:none، confusion بین RS256 و HS256، kid مسیر‌دار، هدرهای jku/jwk و عمر طولانی — هر کدام با توضیح فارسی و شمارهٔ CWE.",
    en: "The token is never uploaded and never logged. The analysis reads headers the way an attacker would: alg:none, RS256→HS256 confusion, path-style kid, jku/jwk headers and long lifetimes — each with a Persian explanation and a CWE reference.",
  },
  capability: "security",
  version: "1.0.0",
  updatedFa: "۱۴۰۵/۰۷/۱۰",
  keywords: { fa: ["جی‌دبلیوتی", "توکن", "امضای دیجیتال", "alg none", "CWE", "احراز هویت"], en: ["jwt", "token", "signature", "alg none", "cwe", "auth"] },
  evidence: { fa: "شاهد زنده: تحلیل امنیتی همین صفحه", en: "Live artifact: the security analysis on this page" },
  howItWorks: {
    fa: [
      "توکن به سه بخش با base64url تقسیم می‌شود. decode با TextDecoder و حالت fatal انجام می‌شود تا توکن‌های رمزنگاری‌شده یا خراب به‌جای crash، پیام روشن بگیرند.",
      "هدر و payload به‌صورت شیء JSON خوانده می‌شوند و سپس یک موتور قاعدهٔ هشدار روی آن‌ها اجرا می‌شود؛ هر هشدار شدت، توضیح فارسی و ارجاع CWE دارد.",
      "این ابزار تأیید امضا انجام نمی‌دهد. «decode شد» به معنای «معتبر است» نیست و در خروجی هم همین‌طور نوشته می‌شود؛ برای همین هیچ لینک اشتراکی هم ساخته نمی‌شود.",
    ],
    en: [
      "The token is split into three base64url parts and decoded with a fatal TextDecoder, so encrypted or corrupt tokens produce a clear message instead of a crash.",
      "Header and payload are parsed as JSON and passed through a warning rule engine; every warning carries a severity, a Persian explanation and a CWE reference.",
      "The tool does not verify signatures. “Decoded” never means “valid”, the output says so explicitly, and for that reason no share link is created at all.",
    ],
  },
  codeSamples: [
    {
      label: "TypeScript — decode مقاوم",
      language: "ts",
      code: `export function base64UrlDecode(input: string) {
  if (!/^[A-Za-z0-9_-]*$/.test(input)) return { ok: false, code: "base64" as const };
  const bytes = Uint8Array.from(atob(input.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
}`,
    },
    {
      label: "Python — همان قاعدهٔ هشدار",
      language: "python",
      code: `def analyze_header(header: dict) -> list[dict]:
    warnings = []
    if str(header.get("alg", "")).lower() == "none":
        warnings.append({"id": "alg-none", "severity": "critical", "cwe": "CWE-347"})
    if isinstance(header.get("kid"), str) and "://" in header["kid"]:
        warnings.append({"id": "kid-path", "severity": "critical", "cwe": "CWE-22 / CWE-918"})
    return warnings`,
    },
  ],
  disclaimers: {
    fa: [
      "این ابزار فقط decode و تحلیل می‌کند؛ امضا را تأیید نمی‌کند. decode ≠ معتبر.",
      "توکن شما هیچ‌گاه از مرورگر خارج نمی‌شود: نه به سرور ما، نه به سرویس ثالث.",
      "برای همین، لینک اشتراک نتیجه ساخته نمی‌شود — اشتراک‌گذاری توکن یک ریسک امنیتی است.",
    ],
    en: [
      "This tool only decodes and analyses; it never verifies the signature. Decoded ≠ valid.",
      "Your token never leaves the browser: not to our servers, not to any third party.",
      "No share link is created on purpose — sharing a token is a security risk.",
    ],
  },
  limitations: {
    fa: ["تأیید امضا (verify) عمداً پیاده‌سازی نشده است.", "توکن‌های رمزنگاری‌شده (JWE) قابل decode نیستند و پیام روشن می‌گیرید."],
    en: ["Signature verification is intentionally not implemented.", "Encrypted tokens (JWE) cannot be decoded; you get a clear message instead."],
  },
  offlineCapable: true,
  noindexResults: true,
};
