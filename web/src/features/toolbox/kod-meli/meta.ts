import type { ToolMeta } from "../types";

export const meta: ToolMeta = {
  id: "kod-meli",
  slug: { fa: "kod-meli", en: "national-id" },
  title: { fa: "اعتبارسنج کد ملی و شناسهٔ ملی", en: "National ID validator" },
  subtitle: {
    fa: "بررسی ساختاری کد ملی ۱۰ رقمی و شناسهٔ ملی ۱۱ رقمی شرکت‌ها، با نمایش گام‌به‌گام الگوریتم.",
    en: "Structural validation for 10-digit personal codes and 11-digit legal-entity IDs, with the full algorithm shown step by step.",
  },
  description: {
    fa: "همه‌چیز در مرورگر شما محاسبه می‌شود: هیچ درخواستی به ثبت احوال یا هیچ سرویس ثالثی زده نمی‌شود و مقدار ورودی هرگز ذخیره یا لاگ نمی‌شود. خروجی فقط می‌گوید ساختار رقم درست است یا نه — نه اینکه آن کد وجود دارد.",
    en: "Everything is computed in your browser: no request to the civil registry or any third party is made, and the value is never stored or logged. The output only says whether the digit structure is valid — not that the code exists.",
  },
  capability: "security",
  version: "1.0.0",
  updatedFa: "۱۴۰۵/۰۷/۱۰",
  keywords: { fa: ["کد ملی", "شناسه ملی", "اعتبارسنجی", "checksum", "رقم کنترل"], en: ["national id", "code melli", "validator", "checksum", "legal id"] },
  evidence: { fa: "شاهد زنده: اعتبارسنجی همین صفحه", en: "Live artifact: the validation on this page" },
  howItWorks: {
    fa: [
      "کد ملی ۱۰ رقمی: ۹ رقم اول از چپ به راست در ضرایب ۱۰ تا ۲ ضرب می‌شوند، مجموع بر ۱۱ تقسیم می‌شود؛ اگر باقیمانده کمتر از ۲ باشد خودش رقم کنترل است و در غیر این صورت ۱۱ منهای باقیمانده. سپس با رقم آخر مقایسه می‌شود.",
      "کدهای ۱۱ رقمی شناسهٔ ملی اشخاص حقوقی الگوریتم جداگانه دارند: وزن‌های ۱۱ تا ۲ روی ۱۰ رقم چپ و باقیماندهٔ ۱۱ (باقیماندهٔ ۱۰ به صفر تبدیل می‌شود). این یک بررسی ساختاری است و وجود شرکت را تأیید نمی‌کند.",
      "سه اشتباه رایج پیاده‌سازی‌ها: اول، رد نکردن کدهای با ارقام یکسان («۱۱۱۱۱۱۱۱۱۱» از فیلتر سادهٔ checksum رد می‌شود ولی معتبر نیست). دوم، صفرِ ابتدایی را با Number حذف کردن. سوم، به‌کار بردن الگوریتم کد ملی ده‌رقمی برای شناسهٔ یازده‌رقمی شرکت‌ها.",
    ],
    en: [
      "Personal code: multiply the first nine digits, left to right, by weights 10 down to 2, take the sum modulo 11 — if the remainder is below 2 it is the check digit, otherwise it is 11 minus the remainder — and compare it with the last digit.",
      "The 11-digit legal-entity ID uses its own checksum: weights 11 down to 2 over the ten left digits, modulo 11, with a remainder of 10 folded to 0. It is a structural check that cannot confirm the entity exists.",
      "The three common implementation bugs: not rejecting repeated digits (1111111111 passes a naive checksum), dropping a leading zero through Number(), and applying the 10-digit algorithm to an 11-digit entity ID.",
    ],
  },
  howToSteps: {
    fa: [
      { name: "کد را وارد کنید", text: "کد ملی ۱۰ رقمی یا شناسهٔ ملی ۱۱ رقمی را با ارقام فارسی یا لاتین وارد کنید." },
      { name: "نتیجه را ببینید", text: "نوع کد و معتبر بودن ساختاری آن فوراً مشخص می‌شود." },
      { name: "گام‌ها را بررسی کنید", text: "جدول گام‌به‌گام نشان می‌دهد رقم کنترل چگونه محاسبه شده است." },
    ],
    en: [
      { name: "Enter the code", text: "Type a 10-digit personal code or an 11-digit legal-entity ID using Persian or Latin digits." },
      { name: "Read the verdict", text: "The detected kind and the structural result appear immediately." },
      { name: "Inspect the steps", text: "The step table shows exactly how the check digit was computed." },
    ],
  },
  codeSamples: [
    {
      label: "TypeScript — کد ملی شخص",
      language: "ts",
      code: `const WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];

export function personCheckDigit(nineDigits: string): number {
  const sum = [...nineDigits].reduce((total, digit, i) => total + Number(digit) * WEIGHTS[i], 0);
  const remainder = sum % 11;
  return remainder < 2 ? remainder : 11 - remainder;
}`,
    },
    {
      label: "Python — همان تابع",
      language: "python",
      code: `WEIGHTS = (10, 9, 8, 7, 6, 5, 4, 3, 2)

def person_check_digit(nine_digits: str) -> int:
    remainder = sum(int(d) * w for d, w in zip(nine_digits, WEIGHTS)) % 11
    return remainder if remainder < 2 else 11 - remainder`,
    },
  ],
  disclaimers: {
    fa: [
      "این ابزار هیچ استعلام هویتی انجام نمی‌دهد و هیچ اطلاعات شخصی برنمی‌گرداند؛ فقط ساختار ریاضی رقم‌ها بررسی می‌شود.",
      "معتبر بودن ساختاری به معنای وجود کد در پایگاه ثبت احوال یا ثبت شرکت‌ها نیست.",
      "مقدار ورودی شما نه در سرور ذخیره می‌شود و نه در لاگ‌ها ثبت می‌شود؛ فقط شمارندهٔ تجمیعی استفاده.",
    ],
    en: [
      "This tool performs no identity lookup and returns no personal data; it only checks the mathematical structure.",
      "A structurally valid code does not prove that it exists in any civil-registry or companies-registry database.",
      "Your input is neither stored on the server nor written to logs; only aggregate usage counters are kept.",
    ],
  },
  limitations: {
    fa: ["الگوریتم شناسهٔ ملی اشخاص حقوقی بر پایهٔ مستندات عمومی است و تأیید نهایی آن نیازمند سیستم ثبت شرکت‌ها است."],
    en: ["The legal-entity checksum follows public documentation; final confirmation requires the companies registry itself."],
  },
  offlineCapable: true,
  noindexResults: true,
};
