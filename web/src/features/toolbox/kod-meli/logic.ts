/**
 * F-02 — Iranian national ID / legal-entity ID validator.
 *
 * Hard guardrails (see feature card F-02):
 *  - Local checksum only. This module never performs network I/O, and the
 *    API that wraps it never calls a third-party lookup service.
 *  - The raw value is never logged or persisted; only aggregate counters are kept.
 *  - Personal national ID (10 digits) uses the normative mod-11 algorithm.
 *  - Legal entity ID (11 digits) uses the publicly documented registry checksum
 *    (weights 11..2, remainder 10 folded to 0). It is a structural check that can
 *    never confirm that the entity exists — the UI says so explicitly.
 */
import { toLatinDigits } from "@/lib/jalali";

export type IdKind = "person" | "company" | "unknown";

export type ChecksumStep = {
  labelFa: string;
  labelEn: string;
  detail: string;
};

export type ValidationResult = {
  input: string;
  normalized: string;
  kind: IdKind;
  valid: boolean;
  digits: number;
  reasonFa: string;
  reasonEn: string;
  steps: ChecksumStep[];
  expectedCheckDigit: number | null;
  actualCheckDigit: number | null;
};

/** Synthetic, structurally valid example (never a real person's code). */
export const DEFAULT_SAMPLE = "2715830491";

export const PERSON_LENGTH = 10;
export const COMPANY_LENGTH = 11;

/** Strips spaces, dashes and Persian/Arabic digits; returns Latin digits only. */
export function normalizeId(input: string): string {
  return toLatinDigits(String(input ?? ""))
    .replace(/[\s\u200c\u200f\u200e\-–—_.]/g, "")
    .trim();
}

export function detectKind(value: string): IdKind {
  if (/^\d{10}$/.test(value)) return "person";
  if (/^\d{11}$/.test(value)) return "company";
  return "unknown";
}

function allSameDigits(value: string): boolean {
  return /^(\d)\1*$/.test(value);
}

const PERSON_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const COMPANY_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

export function personCheckDigit(nineDigits: string): { sum: number; remainder: number; checkDigit: number } {
  const digits = nineDigits.split("").map(Number);
  const sum = digits.reduce((total, digit, index) => total + digit * PERSON_WEIGHTS[index], 0);
  const remainder = sum % 11;
  return { sum, remainder, checkDigit: remainder < 2 ? remainder : 11 - remainder };
}

export function companyCheckDigit(tenDigits: string): { sum: number; remainder: number; checkDigit: number } {
  const digits = tenDigits.split("").map(Number);
  const sum = digits.reduce((total, digit, index) => total + digit * COMPANY_WEIGHTS[index], 0);
  const remainder = sum % 11;
  return { sum, remainder, checkDigit: remainder === 10 ? 0 : remainder };
}

function personSteps(value: string, sum: number, remainder: number, expected: number): ChecksumStep[] {
  const terms = value
    .slice(0, 9)
    .split("")
    .map((digit, index) => `${digit}×${PERSON_WEIGHTS[index]}`)
    .join(" + ");
  return [
    { labelFa: "۱. نرمال‌سازی ورودی", labelEn: "1. Normalise input", detail: `ارقام فارسی/عربی و فاصله‌ها حذف شد → ${value}` },
    { labelFa: "۲. طول و ساختار", labelEn: "2. Shape", detail: `۱۰ رقم، بدون ارقام یکسان` },
    { labelFa: "۳. ضرب وزنی", labelEn: "3. Weighted sum", detail: `${terms} = ${sum}` },
    { labelFa: "۴. باقیمانده بر ۱۱", labelEn: "4. Modulo 11", detail: `${sum} mod 11 = ${remainder}` },
    {
      labelFa: "۵. رقم کنترل مورد انتظار",
      labelEn: "5. Expected check digit",
      detail: remainder < 2 ? `باقیمانده < ۲ → رقم کنترل = ${expected}` : `باقیمانده ≥ ۲ → ۱۱ − ${remainder} = ${expected}`,
    },
    { labelFa: "۶. مقایسه با رقم آخر", labelEn: "6. Compare", detail: `${expected} ? ${value[9]}` },
  ];
}

function companySteps(value: string, sum: number, remainder: number, expected: number): ChecksumStep[] {
  const terms = value
    .slice(0, 10)
    .split("")
    .map((digit, index) => `${digit}×${COMPANY_WEIGHTS[index]}`)
    .join(" + ");
  return [
    { labelFa: "۱. نرمال‌سازی ورودی", labelEn: "1. Normalise input", detail: `ارقام فارسی/عربی و فاصله‌ها حذف شد → ${value}` },
    { labelFa: "۲. طول و ساختار", labelEn: "2. Shape", detail: "۱۱ رقم شناسهٔ ملی شخص حقوقی" },
    { labelFa: "۳. ضرب وزنی", labelEn: "3. Weighted sum", detail: `${terms} = ${sum}` },
    { labelFa: "۴. باقیمانده بر ۱۱", labelEn: "4. Modulo 11", detail: `${sum} mod 11 = ${remainder}${remainder === 10 ? " → ۰" : ""}` },
    { labelFa: "۵. رقم کنترل مورد انتظار", labelEn: "5. Expected check digit", detail: `رقم کنترل = ${expected}` },
    { labelFa: "۶. مقایسه با رقم آخر", labelEn: "6. Compare", detail: `${expected} ? ${value[10]}` },
  ];
}

const REASONS = {
  ok: {
    person: { fa: "ساختار کد ملی معتبر است. (این فقط یک بررسی ریاضی است، نه تأیید هویت.)", en: "Structurally valid personal national ID. This is a math check, not identity verification." },
    company: { fa: "ساختار شناسهٔ ملی معتبر است. (این بررسی فقط الگوریتمی است و وجود شرکت را تأیید نمی‌کند.)", en: "Structurally valid legal-entity ID. The check is algorithmic only and does not confirm the entity exists." },
  },
  length: { fa: "طول ورودی باید ۱۰ رقم (کد ملی شخص) یا ۱۱ رقم (شناسهٔ ملی شرکت) باشد.", en: "Input must be 10 digits (personal) or 11 digits (legal entity)." },
  characters: { fa: "ورودی فقط می‌تواند رقم باشد.", en: "Only digits are allowed." },
  repeated: { fa: "کدهایی مثل ۱۱۱۱۱۱۱۱۱۱ از نظر ساختاری رد می‌شوند (الگوی تکراری جعلی).", en: "Repeated patterns such as 1111111111 are rejected." },
  checksum: { fa: "رقم کنترل با محاسبهٔ الگوریتم هم‌خوانی ندارد؛ کد احتمالاً اشتباه تایپ شده است.", en: "The check digit does not match the algorithm; the code is likely mistyped." },
};

export function validateNationalId(input: string): ValidationResult {
  const normalized = normalizeId(input);
  const kind = detectKind(normalized);
  const base: ValidationResult = {
    input: String(input ?? ""),
    normalized,
    kind,
    valid: false,
    digits: normalized.length,
    reasonFa: "",
    reasonEn: "",
    steps: [],
    expectedCheckDigit: null,
    actualCheckDigit: null,
  };

  if (!normalized) return { ...base, reasonFa: REASONS.length.fa, reasonEn: REASONS.length.en };
  if (!/^\d+$/.test(normalized)) return { ...base, reasonFa: REASONS.characters.fa, reasonEn: REASONS.characters.en };
  if (kind === "unknown") return { ...base, reasonFa: REASONS.length.fa, reasonEn: REASONS.length.en };
  if (allSameDigits(normalized)) {
    const expected = kind === "person" ? personCheckDigit(normalized.slice(0, 9)).checkDigit : companyCheckDigit(normalized.slice(0, 10)).checkDigit;
    const steps = kind === "person" ? personSteps(normalized, 0, 0, expected) : companySteps(normalized, 0, 0, expected);
    return { ...base, reasonFa: REASONS.repeated.fa, reasonEn: REASONS.repeated.en, steps };
  }

  const computed = kind === "person" ? personCheckDigit(normalized.slice(0, 9)) : companyCheckDigit(normalized.slice(0, 10));
  const actual = Number(normalized[kind === "person" ? 9 : 10]);
  const steps = kind === "person" ? personSteps(normalized, computed.sum, computed.remainder, computed.checkDigit) : companySteps(normalized, computed.sum, computed.remainder, computed.checkDigit);
  const valid = computed.checkDigit === actual;
  return {
    ...base,
    valid,
    steps,
    expectedCheckDigit: computed.checkDigit,
    actualCheckDigit: actual,
    reasonFa: valid ? REASONS.ok[kind].fa : REASONS.checksum.fa,
    reasonEn: valid ? REASONS.ok[kind].en : REASONS.checksum.en,
  };
}

/** Aggregated counters only — never the raw value (hard guardrail F-02). */
export type AggregatedStats = { total: number; valid: number; invalid: number; person: number; company: number };
export function emptyStats(): AggregatedStats {
  return { total: 0, valid: 0, invalid: 0, person: 0, company: 0 };
}
export function accumulate(stats: AggregatedStats, result: ValidationResult): AggregatedStats {
  return {
    total: stats.total + 1,
    valid: stats.valid + (result.valid ? 1 : 0),
    invalid: stats.invalid + (result.valid ? 0 : 1),
    person: stats.person + (result.kind === "person" ? 1 : 0),
    company: stats.company + (result.kind === "company" ? 1 : 0),
  };
}
