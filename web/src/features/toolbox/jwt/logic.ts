/**
 * F-05 — JWT debugger with security analysis.
 *
 * Hard guardrails (feature card F-05):
 *  - This module never performs network I/O and never writes to storage; decoding happens
 *    entirely in the visitor's browser. Tokens are never sent to our servers.
 *  - Decoding is not verification. The result type makes that distinction structural:
 *    the only honest output is `verified: false` unless a future implementation adds
 *    verification with an algorithm allow-list.
 *  - Every warning carries a CWE reference and a one-line Persian explanation.
 */
import { formatJalaliLong, gregorianToJalali } from "@/lib/jalali";

export type JwtSeverity = "critical" | "warning" | "notice";

export type JwtWarning = {
  id: string;
  severity: JwtSeverity;
  titleFa: string;
  titleEn: string;
  detailFa: string;
  detailEn: string;
  cwe: string;
};

export type JwtTiming = { raw: number; iso: string; jalali: string; relativeFa: string };

export type JwtAnalysis = {
  ok: true;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signaturePresent: boolean;
  verified: false;
  warnings: JwtWarning[];
  timing: { exp?: JwtTiming; iat?: JwtTiming; nbf?: JwtTiming };
  summaryFa: string;
} | {
  ok: false;
  code: "empty" | "shape" | "base64" | "json" | "utf8";
  messageFa: string;
  messageEn: string;
};

const DEPRECATED_ALGS = new Set(["HS1", "RS1", "HS256/1", "MD5", "none-rsa"]);

export function base64UrlDecode(input: string): { ok: true; text: string } | { ok: false; code: "base64" | "utf8" } {
  if (!/^[A-Za-z0-9_-]*$/.test(input)) return { ok: false, code: "base64" };
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  try {
    if (typeof atob === "function") {
      const binary = atob(withPadding);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return { ok: true, text };
    }
    const buffer = Buffer.from(withPadding, "base64");
    return { ok: true, text: buffer.toString("utf8") };
  } catch (error) {
    return { ok: false, code: error instanceof TypeError ? "utf8" : "base64" };
  }
}

function parsePart(part: string): { ok: true; value: Record<string, unknown> } | { ok: false; code: "base64" | "json" | "utf8" } {
  const decoded = base64UrlDecode(part);
  if (!decoded.ok) return decoded;
  try {
    const value = JSON.parse(decoded.text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, code: "json" };
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, code: "json" };
  }
}

const MESSAGES = {
  empty: { messageFa: "توکنی وارد نشده است.", messageEn: "No token was provided." },
  shape: { messageFa: "ساختار توکن درست نیست؛ JWT باید دو نقطه (سه بخش) داشته باشد.", messageEn: "Malformed token: a JWT needs two dots (three parts)." },
  base64: { messageFa: "بخش‌های توکن base64url معتبر نیستند.", messageEn: "The token parts are not valid base64url." },
  utf8: { messageFa: "بخش‌های توکن UTF-8 معتبر نیستند (احتمالاً توکن رمزنگاری‌شده است).", messageEn: "Token parts are not valid UTF-8 (the token may be encrypted)." },
  json: { messageFa: "Header یا Payload یک شیء JSON معتبر نیست.", messageEn: "Header or payload is not a valid JSON object." },
};

export function decodeJwt(token: string, now: Date = new Date()): JwtAnalysis {
  const raw = String(token ?? "").trim().replace(/^Bearer\s+/i, "");
  if (!raw) return { ok: false, code: "empty", ...MESSAGES.empty };
  const parts = raw.split(".");
  if (parts.length !== 3 && parts.length !== 2) return { ok: false, code: "shape", ...MESSAGES.shape };
  const header = parsePart(parts[0]);
  if (!header.ok) return { ok: false, code: header.code, ...MESSAGES[header.code] };
  const payloadPart = parts.length === 3 ? parts[1] : "";
  const payload = payloadPart ? parsePart(payloadPart) : { ok: true as const, value: {} as Record<string, unknown> };
  if (!payload.ok) return { ok: false, code: payload.code, ...MESSAGES[payload.code] };

  const warnings: JwtWarning[] = [];
  const alg = typeof header.value.alg === "string" ? header.value.alg : "";
  const kid = typeof header.value.kid === "string" ? header.value.kid : "";
  const payloadValue = payload.value;

  if (!alg) {
    warnings.push({
      id: "alg-missing",
      severity: "critical",
      titleFa: "هدر الگوریتم ندارد",
      titleEn: "Missing algorithm header",
      detailFa: "توکن الگوریتم امضا را اعلام نکرده است؛ سرورهای نادرست ممکن است آن را بدون بررسی بپذیرند.",
      detailEn: "The token does not declare a signature algorithm; naïve servers may accept it without verification.",
      cwe: "CWE-347",
    });
  } else if (alg.toLowerCase() === "none") {
    warnings.push({
      id: "alg-none",
      severity: "critical",
      titleFa: "الگوریتم none — امضا ندارد",
      titleEn: "alg: none — unsecured token",
      detailFa: "توکن بدون امضا صادر شده است. هر کسی می‌تواند محتوای آن را تغییر دهد؛ هیچ سروری نباید آن را بپذیرد.",
      detailEn: "The token is unsigned, so anyone can rewrite its claims. No server should accept it.",
      cwe: "CWE-347",
    });
  } else if (alg.toUpperCase().startsWith("HS")) {
    warnings.push({
      id: "alg-hs",
      severity: "warning",
      titleFa: "الگوریتم متقارن (HMAC) — خطر confusion",
      titleEn: "Symmetric algorithm (HMAC) — confusion risk",
      detailFa: "اگر سرور کلید عمومی RS256 را به‌عنوان کلید مخفی HMAC استفاده کند، مهاجم می‌تواند با آن کلید عمومی، توکن جعل کند. الگوریتم را همیشه از allowlist سرور انتخاب کنید، نه از هدر توکن.",
      detailEn: "If a server feeds an RSA public key into HMAC, an attacker can forge tokens with that public key. Always pick the algorithm from a server-side allow-list, never from the token header.",
      cwe: "CWE-347",
    });
  }
  if (DEPRECATED_ALGS.has(alg) || /^(HS|RS)1$/.test(alg) || /MD5/i.test(alg)) {
    warnings.push({
      id: "alg-deprecated",
      severity: "warning",
      titleFa: "الگوریتم منسوخ",
      titleEn: "Deprecated algorithm",
      detailFa: "SHA-1 و MD5 برای امضای توکن امن نیستند؛ به RS256/ES256 یا HS256 با کلید بلند مهاجرت کنید.",
      detailEn: "SHA-1 and MD5 are unsafe for token signatures; migrate to RS256/ES256 or HS256 with a long secret.",
      cwe: "CWE-327",
    });
  }
  if (kid && /(^\/|\.\.\/|https?:\/\/|^file:)/i.test(kid)) {
    warnings.push({
      id: "kid-path",
      severity: "critical",
      titleFa: "kid شامل مسیر یا URL است",
      titleEn: "kid contains a path or URL",
      detailFa: "اگر سرور مقدار kid را مستقیم برای خواندن فایل یا درخواست شبکه استفاده کند، مسیر می‌تواند برای path traversal یا SSRF سوءاستفاده شود.",
      detailEn: "If the server resolves kid directly to a file or a URL, it enables path traversal or SSRF.",
      cwe: "CWE-22 / CWE-918",
    });
  }
  for (const field of ["jku", "x5u", "jwk"]) {
    if (field in header.value) {
      warnings.push({
        id: `header-${field}`,
        severity: "critical",
        titleFa: `هدر ${field} در توکن`,
        titleEn: `${field} header present`,
        detailFa: `اگر سرور کلید را از این آدرس/مقدار داخل توکن بردارد، مهاجم کلید خودش را تزریق می‌کند (key injection/SSRF). این هدرها باید فقط از منبع پیکربندی‌شده خوانده شوند.`,
        detailEn: "If the server takes the key from the token itself, an attacker supplies their own key (key injection / SSRF).",
        cwe: "CWE-918",
      });
    }
  }

  const exp = numberClaim(payloadValue.exp);
  const iat = numberClaim(payloadValue.iat);
  const nbf = numberClaim(payloadValue.nbf);
  const timingOut: NonNullable<Extract<JwtAnalysis, { ok: true }>["timing"]> = {};
  if (exp !== null) timingOut.exp = describeTime(exp, now);
  if (iat !== null) timingOut.iat = describeTime(iat, now);
  if (nbf !== null) timingOut.nbf = describeTime(nbf, now);

  if (exp !== null && exp * 1000 < now.getTime()) {
    warnings.push({
      id: "expired",
      severity: "warning",
      titleFa: "توکن منقضی شده است",
      titleEn: "Token is expired",
      detailFa: `زمان انقضا گذشته است (${describeTime(exp, now).jalali}). اگر سرور همچنان آن را می‌پذیرد، بررسی exp را جدی نمی‌گیرد.`,
      detailEn: "The expiry time has passed; a server still accepting it is not enforcing exp.",
      cwe: "CWE-613",
    });
  }
  if (exp !== null && iat !== null && exp - iat > 24 * 3600) {
    warnings.push({
      id: "long-lifetime",
      severity: "notice",
      titleFa: "عمر توکن بیش از ۲۴ ساعت است",
      titleEn: "Token lifetime exceeds 24 hours",
      detailFa: "توکن‌های دسترسی طولانی‌عمر، پنجرهٔ سوءاستفاده را بزرگ می‌کنند. الگوی رایج: access token کوتاه (۱۵ دقیقه) + refresh token.",
      detailEn: "Long-lived access tokens widen the abuse window. The common pattern is a short access token plus a refresh token.",
      cwe: "CWE-613",
    });
  }
  if (!("iss" in payloadValue) || !("aud" in payloadValue)) {
    warnings.push({
      id: "missing-iss-aud",
      severity: "notice",
      titleFa: "iss یا aud ندارد",
      titleEn: "Missing iss/aud",
      detailFa: "بدون صادرکننده و مخاطب مشخص، یک توکن صادرشده برای سرویس دیگر می‌تواند علیه این سرویس استفاده شود (token confusion).",
      detailEn: "Without issuer and audience, a token minted for another service may be replayed here (token confusion).",
      cwe: "CWE-287",
    });
  }

  const critical = warnings.filter((warning) => warning.severity === "critical").length;
  const summaryFa = critical
    ? `${critical} هشدار بحرانی پیدا شد. این توکن فقط decode شده است و اعتبار آن تأیید نشده.`
    : "توکن decode شد. decode ≠ معتبر؛ امضا بررسی نشده است.";

  return { ok: true, header: header.value, payload: payloadValue, signaturePresent: parts.length === 3 && Boolean(parts[2]) && alg.toLowerCase() !== "none", verified: false, warnings, timing: timingOut, summaryFa };
}

function numberClaim(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

export function describeTime(seconds: number, now: Date): JwtTiming {
  const date = new Date(seconds * 1000);
  const deltaMs = date.getTime() - now.getTime();
  const absMinutes = Math.round(Math.abs(deltaMs) / 60000);
  const relativeFa = relativeText(absMinutes, deltaMs >= 0);
  const jalali = gregorianToJalali({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
  return {
    raw: seconds,
    iso: date.toISOString(),
    jalali: formatJalaliLong(jalali, "fa"),
    relativeFa,
  };
}

function relativeText(minutes: number, future: boolean): string {
  const unit = minutes < 60 ? `${minutes} دقیقه` : minutes < 60 * 24 ? `${Math.round(minutes / 60)} ساعت` : `${Math.round(minutes / (60 * 24))} روز`;
  return future ? `${unit} دیگر` : `${unit} پیش`;
}

export const SEVERITY_LABELS: Record<JwtSeverity, { fa: string; en: string; color: string }> = {
  critical: { fa: "بحرانی", en: "Critical", color: "var(--color-capability-security)" },
  warning: { fa: "هشدار", en: "Warning", color: "#e0a44d" },
  notice: { fa: "توجه", en: "Notice", color: "#8296aa" },
};

export function parseJwtState(params: URLSearchParams): { token: string } {
  // Tokens are intentionally NOT stored in the URL: a shared link must never leak a token.
  return { token: params.get("sample") ?? "" };
}
