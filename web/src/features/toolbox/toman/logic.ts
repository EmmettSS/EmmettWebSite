/**
 * F-03 — Toman formatter, cheque words and invoice calculator.
 *
 * Hard guardrails (feature card F-03):
 *  - Integers only. No `float`, no `Number.EPSILON` games: every amount is a BigInt.
 *  - Decimal input is rejected with an explicit Persian message (documented behaviour).
 *  - Round-trip property: `wordsToToman(tomanToWords(n)) === n` for every integer n.
 */
import { toPersianDigits } from "@/lib/jalali";

export const MAX_TOMAN = 1_000_000_000_000_000n; // 10^15
export const THOUSAND_SEPARATOR = "٬";

const ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const HUNDREDS = ["", "یکصد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const SCALES = ["", "هزار", "میلیون", "میلیارد", "تریلیون", "کوآدریلیون"];

export type AmountParseResult =
  | { ok: true; toman: bigint }
  | { ok: false; code: "empty" | "characters" | "decimal" | "negative" | "too-large"; messageFa: string; messageEn: string };

const PARSE_ERRORS = {
  empty: { messageFa: "مبلغی وارد نشده است.", messageEn: "No amount was entered." },
  characters: { messageFa: "مبلغ باید فقط رقم باشد (ارقام فارسی، عربی یا لاتین).", messageEn: "The amount must contain digits only." },
  decimal: { messageFa: "مبلغ اعشاری پشتیبانی نمی‌شود. لطفاً عدد صحیح تومان وارد کنید (مثلاً ۱۲۵۰۰۰۰).", messageEn: "Decimal amounts are not supported. Enter a whole toman amount." },
  negative: { messageFa: "مبلغ منفی معنا ندارد؛ لطفاً عدد نامنفی وارد کنید.", messageEn: "Negative amounts are not accepted." },
  tooLarge: { messageFa: "حداکثر مبلغ پشتیبانی‌شده ۱۰^۱۵ تومان است.", messageEn: "The supported maximum is 10^15 toman." },
};

/** Parses user input into an integer toman amount. Rejects decimals instead of rounding. */
export function parseAmount(input: string): AmountParseResult {
  const raw = String(input ?? "").trim();
  if (!raw) return { ok: false, code: "empty", ...PARSE_ERRORS.empty };
  const latin = raw
    .replace(/[۰-۹]/g, (char) => String(char.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (char) => String(char.charCodeAt(0) - 0x0660))
    .replace(/[٬,،\s_]/g, "")
    .replace(/(تومان|ریال|تومن|toman|rial|irt|irr)$/i, "")
    .trim();
  const withoutSign = latin.replace(/^[-+]/, "");
  if (!/^\d*[.,]?\d*$/.test(withoutSign) || withoutSign === "" || withoutSign === ".") {
    return { ok: false, code: "characters", ...PARSE_ERRORS.characters };
  }
  if (/[.,]/.test(withoutSign)) return { ok: false, code: "decimal", ...PARSE_ERRORS.decimal };
  if (latin.startsWith("-")) return { ok: false, code: "negative", ...PARSE_ERRORS.negative };
  if (withoutSign.length > 17) return { ok: false, code: "too-large", ...PARSE_ERRORS.tooLarge };
  const value = BigInt(withoutSign);
  if (value > MAX_TOMAN) return { ok: false, code: "too-large", ...PARSE_ERRORS.tooLarge };
  return { ok: true, toman: value };
}

export function groupLatin(value: bigint): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEPARATOR);
  return negative ? `−${grouped}` : grouped;
}

export function formatTomanFa(value: bigint): string {
  return `${toPersianDigits(groupLatin(value))} تومان`;
}

export function formatRialFa(value: bigint): string {
  return `${toPersianDigits(groupLatin(value * 10n))} ریال`;
}

export function tomanToRial(value: bigint): bigint {
  return value * 10n;
}

export function rialToToman(value: bigint): { toman: bigint; rounded: boolean } {
  const rounded = value % 10n !== 0n;
  return { toman: value / 10n, rounded };
}

function underThousand(n: number): string {
  const parts: string[] = [];
  let rest = n;
  if (rest >= 100) {
    parts.push(HUNDREDS[Math.floor(rest / 100)]);
    rest %= 100;
  }
  if (rest >= 20) {
    parts.push(TENS[Math.floor(rest / 10)]);
    rest %= 10;
    if (rest) parts.push(ONES[rest]);
  } else if (rest >= 10) {
    parts.push(TEENS[rest - 10]);
  } else if (rest > 0) {
    parts.push(ONES[rest]);
  }
  return parts.join(" و ");
}

/** Spells an amount in Persian words without a currency suffix. */
export function tomanToWordsPlain(value: bigint): string {
  if (value < 0n) return `منفی ${tomanToWordsPlain(-value)}`;
  if (value === 0n) return "صفر";
  let rest = value;
  const groups: string[] = [];
  let scaleIndex = 0;
  while (rest > 0n) {
    const group = Number(rest % 1000n);
    if (group) groups.unshift([underThousand(group), SCALES[scaleIndex]].filter(Boolean).join(" "));
    rest /= 1000n;
    scaleIndex += 1;
  }
  return groups.join(" و ");
}

export function tomanToWords(value: bigint): string {
  return `${tomanToWordsPlain(value)} تومان`;
}

const WORD_VALUES: Record<string, number> = {
  صفر: 0, یک: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, هفت: 7, هشت: 8, نه: 9,
  ده: 10, یازده: 11, دوازده: 12, سیزده: 13, چهارده: 14, پانزده: 15, شانزده: 16, هفده: 17, هجده: 18, نوزده: 19,
  بیست: 20, سی: 30, چهل: 40, پنجاه: 50, شصت: 60, هفتاد: 70, هشتاد: 80, نود: 90,
};
const HUNDRED_VALUES: Record<string, number> = { یکصد: 100, دویست: 200, سیصد: 300, چهارصد: 400, پانصد: 500, ششصد: 600, هفتصد: 700, هشتصد: 800, نهصد: 900 };
const SCALE_VALUES: Record<string, bigint> = { هزار: 1000n, میلیون: 1_000_000n, میلیارد: 1_000_000_000n, تریلیون: 1_000_000_000_000n, کوآدریلیون: 1_000_000_000_000_000n };

/** Parses Persian number words back to an integer — used by the round-trip property test. */
export function wordsToToman(text: string): bigint {
  const clean = String(text ?? "")
    .replace(/[۰-۹]/g, (char) => String(char.charCodeAt(0) - 0x06f0))
    .replace(/تومان|ریال/g, " ")
    .replace(/(^|\s)و(\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) throw new Error("empty words");
  if (clean.startsWith("منفی")) return -wordsToToman(clean.replace("منفی", ""));
  if (clean === "صفر") return 0n;

  const tokens = clean.split(" ").filter(Boolean);
  let total = 0n;
  let group = 0n;
  for (const token of tokens) {
    if (token in HUNDRED_VALUES) group += BigInt(HUNDRED_VALUES[token]);
    else if (token in WORD_VALUES) group += BigInt(WORD_VALUES[token]);
    else if (token in SCALE_VALUES) {
      group = group === 0n ? SCALE_VALUES[token] : group * SCALE_VALUES[token];
      total += group;
      group = 0n;
    } else {
      throw new Error(`unknown number word: ${token}`);
    }
  }
  return total + group;
}

export function formalInvoiceLine(value: bigint): string {
  return `مبلغ ${formatTomanFa(value)} (${tomanToWords(value)})`;
}

export type InvoiceBreakdown = {
  subtotal: bigint;
  discount: bigint;
  taxable: bigint;
  vatRate: number;
  vat: bigint;
  total: bigint;
  totalFa: string;
  vatFa: string;
};

/** Integer-only invoice math: VAT is a percentage of the discounted subtotal, rounded half-up. */
export function invoiceBreakdown(subtotal: bigint, discount: bigint, vatRatePercent: number): InvoiceBreakdown {
  if (subtotal < 0n || discount < 0n) throw new Error("مبالغ منفی پذیرفته نمی‌شوند.");
  if (discount > subtotal) throw new Error("تخفیف بیشتر از مبلغ فاکتور است.");
  if (!Number.isInteger(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100) throw new Error("نرخ مالیات باید عددی صحیح بین ۰ تا ۱۰۰ باشد.");
  const taxable = subtotal - discount;
  const vat = (taxable * BigInt(vatRatePercent) + 50n) / 100n; // half-up, integer-only
  const total = taxable + vat;
  return { subtotal, discount, taxable, vatRate: vatRatePercent, vat, total, totalFa: formatTomanFa(total), vatFa: formatTomanFa(vat) };
}

/* ------------------------------------------------------------------ *
 * F-03 shareable URL state
 * ------------------------------------------------------------------ */

export type TomanState = { amount: string; vat: string; discount: string; digits: "fa" | "en" };
export function parseTomanState(params: URLSearchParams): TomanState {
  return {
    amount: params.get("v") ?? "1250000",
    vat: params.get("vat") ?? "10",
    discount: params.get("off") ?? "0",
    digits: params.get("digits") === "en" ? "en" : "fa",
  };
}
export function tomanShareParams(state: TomanState): URLSearchParams {
  return new URLSearchParams({ v: state.amount, vat: state.vat, off: state.discount, digits: state.digits });
}
