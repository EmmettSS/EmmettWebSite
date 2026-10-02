import { toPersianDigits } from "./jalali";

const ones = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const teens = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const hundreds = ["", "یکصد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const scales = ["", "هزار", "میلیون", "میلیارد", "تریلیون"];
function underThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) { parts.push(hundreds[Math.floor(n / 100)]); n %= 100; }
  if (n >= 20) { parts.push(tens[Math.floor(n / 10)]); n %= 10; if (n) parts.push(ones[n]); }
  else if (n >= 10) parts.push(teens[n - 10]);
  else if (n) parts.push(ones[n]);
  return parts.join(" و ");
}
export function tomanToWords(input: number | bigint): string {
  let n = BigInt(input);
  if (n < 0n) return `منفی ${tomanToWords(-n)}`;
  if (n === 0n) return "صفر تومان";
  const groups: string[] = []; let index = 0;
  while (n > 0n) {
    const group = Number(n % 1000n);
    if (group) groups.unshift([underThousand(group), scales[index]].filter(Boolean).join(" "));
    n /= 1000n; index++;
  }
  return `${groups.join(" و ")} تومان`;
}
export function formatToman(amount: number | bigint, locale: "fa" | "en" = "fa"): string {
  const formatted = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: 0 }).format(amount);
  return locale === "fa" ? `${formatted} تومان` : `${formatted} toman`;
}
export function tomanToRial(amount: number | bigint): bigint { return BigInt(amount) * 10n; }
export function formatTomanPlain(amount: number | bigint): string { return toPersianDigits(new Intl.NumberFormat("en-US").format(amount)); }
