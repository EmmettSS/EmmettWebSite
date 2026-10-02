import type { ToolMeta } from "../types";

export const meta: ToolMeta = {
  id: "toman",
  slug: { fa: "toman", en: "toman" },
  title: { fa: "فرمت‌کنندهٔ تومان و حروف‌نویسی چک", en: "Toman formatter and cheque wording" },
  subtitle: {
    fa: "تومان، ریال، حروف‌نویسی چک، شکل رسمی فاکتور و ماشین‌حساب مالیات — همه با عدد صحیح.",
    en: "Toman, rial, cheque wording, the formal invoice line and a VAT calculator — all integer math.",
  },
  description: {
    fa: "هیچ‌جای این ابزار از عدد اعشاری استفاده نمی‌شود؛ همهٔ مبالغ BigInt هستند. همین باعث می‌شود مبلغ ۱۰^۱۵ تومان هم بدون خطای گردکردن محاسبه شود و تست رفت‌وبرگشت (عدد ↔ حروف) تضمین شود.",
    en: "Nothing here uses floating point: every amount is a BigInt. That is how a 10^15 toman amount survives intact and how the number ↔ words round-trip can be proven by tests.",
  },
  capability: "frontend",
  version: "1.0.0",
  updatedFa: "۱۴۰۵/۰۷/۱۰",
  keywords: { fa: ["تومان", "ریال", "حروف‌نویسی چک", "فاکتور", "مالیات بر ارزش افزوده"], en: ["toman", "rial", "cheque words", "invoice", "vat"] },
  evidence: { fa: "شاهد زنده: چهار خروجی همین صفحه", en: "Live artifact: the four outputs on this page" },
  howItWorks: {
    fa: [
      "ورودی پس از نرمال‌سازی ارقام (فارسی/عربی/لاتین) به BigInt تبدیل می‌شود. اگر ورودی ممیز داشته باشد، باز می‌گردد با پیام روشن؛ گردکردن پنهانی انجام نمی‌شود چون روی چک و فاکتور هزینهٔ حقوقی دارد.",
      "حروف‌نویسی از گروه‌های سه‌رقمی ساخته می‌شود (هزار، میلیون، میلیارد، تریلیون) و برای صفر «صفر تومان» برمی‌گرداند. تابع معکوس همان الگوریتم را می‌خواند، پس تست property-based می‌تواند صدها عدد تصادفی را رفت‌وبرگشت کند.",
      "مالیات بر ارزش افزوده با ریاضی صحیح و گردکردن نیم‌به‌بالا در پایان محاسبه می‌شود؛ درصد و تخفیف همیشه ورودی صریح کاربر هستند.",
    ],
    en: [
      "Input is normalised (Persian/Arabic/Latin digits) and converted to BigInt. Decimal input is rejected with a clear message instead of being rounded silently, because rounding on a cheque or invoice has real consequences.",
      "Words are built from three-digit groups (thousand, million, billion, trillion) and zero spells as «صفر تومان». The inverse function reads the same grammar, so a property test can round-trip hundreds of random amounts.",
      "VAT is computed with integer math and half-up rounding at the end; rate and discount are always explicit user inputs.",
    ],
  },
  howToSteps: {
    fa: [
      { name: "مبلغ را وارد کنید", text: "عدد صحیح تومان را با ارقام فارسی یا لاتین و جداکنندهٔ هزارگان وارد کنید." },
      { name: "چهار خروجی را ببینید", text: "تومان، ریال، حروف‌نویسی چک و شکل رسمی فاکتور همزمان ساخته می‌شوند." },
      { name: "فاکتور را کامل کنید", text: "در بخش فاکتور، تخفیف و درصد مالیات را وارد کنید تا جمع کل محاسبه شود." },
    ],
    en: [
      { name: "Enter the amount", text: "Type an integer toman amount with Persian or Latin digits and optional separators." },
      { name: "Read four outputs", text: "Toman, rial, cheque wording and the formal invoice line appear at once." },
      { name: "Finish the invoice", text: "Add discount and VAT rate to get the final total." },
    ],
  },
  codeSamples: [
    {
      label: "TypeScript — بدون اعشار",
      language: "ts",
      code: `export function groupLatin(value: bigint): string {
  const digits = (value < 0n ? -value : value).toString();
  return digits.replace(/\\B(?=(\\d{3})+(?!\\d))/g, "٬");
}

export function tomanToRial(value: bigint): bigint {
  return value * 10n; // 10 ریال = ۱ تومان، بدون شناوری
}`,
    },
    {
      label: "Python — همان قواعد",
      language: "python",
      code: `def toman_to_rial(value: int) -> int:
    return value * 10

def group_latin(value: int) -> str:
    return f"{value:,}".replace(",", "٬")`,
    },
  ],
  limitations: {
    fa: ["حداکثر مبلغ ۱۰^۱۵ تومان است؛ بیشتر از آن پیام روشن می‌گیرید.", "ورودی اعشاری پذیرفته نمی‌شود (به‌جای گردکردن پنهانی).", "نرخ مالیات بین ۰ تا ۱۰۰ درصد و عدد صحیح است."],
    en: ["Maximum amount is 10^15 toman; beyond that you get a clear message.", "Decimal input is rejected rather than silently rounded.", "VAT rate is an integer between 0 and 100."],
  },
  offlineCapable: true,
  noindexResults: true,
};
