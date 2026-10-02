import type { ToolMeta } from "../types";

export const meta: ToolMeta = {
  id: "matn-farsi",
  slug: { fa: "matn-farsi", en: "persian-text" },
  title: { fa: "نرمال‌ساز متن فارسی", en: "Persian text normaliser" },
  subtitle: {
    fa: "ی و ک عربی، ارقام، اعراب، نیم‌فاصلهٔ محافظه‌کار، فاصله‌ها و نقل‌قول — با diff زنده و شمارش تغییرات هر قاعده.",
    en: "Arabic yeh/kaf, digits, diacritics, conservative ZWNJ, spacing and quotes — with a live diff and per-rule change counts.",
  },
  description: {
    fa: "قواعد جداگانه و قابل خاموش‌کردن‌اند و نیم‌فاصله عمداً محافظه‌کار است: فهرست استثناها («میز»، «دفتر»، «دختر») تضمین می‌کند قاعده‌ای که متن را خراب می‌کند اجرا نشود. هر قاعده idempotent است؛ اجرای دوباره خروجی را تغییر نمی‌دهد.",
    en: "Rules are independent and switchable, and the ZWNJ pass is deliberately conservative: an exception list (میز، دفتر، دختر) keeps word-breaking rules from firing. Every rule is idempotent — running it twice changes nothing.",
  },
  capability: "frontend",
  version: "1.0.0",
  updatedFa: "۱۴۰۵/۰۷/۱۰",
  keywords: { fa: ["نرمال‌سازی متن", "نیم‌فاصله", "ی عربی", "ک عربی", "اعراب", "ویرایش متن فارسی"], en: ["text normalisation", "zwnj", "persian text", "diacritics", "clean text", "persian text editor"] },
  evidence: { fa: "شاهد زنده: diff همین صفحه", en: "Live artifact: the diff on this page" },
  howItWorks: {
    fa: [
      "هر قاعده یک تابع خالص روی رشته است که تعداد تغییر و نمونه‌ها را برمی‌گرداند؛ به همین دلیل می‌توان هر قاعده را جدا روشن/خاموش کرد و شمارش دقیق گرفت.",
      "نیم‌فاصله فقط در سه جای امن اضافه می‌شود: پس از «می/نمی» روی فعل (با فهرست استثنای اسم‌ها)، پیش از «ها/های/تر/ترین» (با فهرست واژه‌هایی مثل «دختر» و «دفتر») و اصلاح نیم‌فاصله‌های دوتایی.",
      "diff متن را به توکن‌های واژه/فاصله تقسیم می‌کند و با یک الگوریتم سادهٔ بازهم‌تراز‌سازی، بخش‌های تغییر‌کرده را مشخص می‌کند. خروجی فقط متن ساده است؛ رندر با text node انجام می‌شود، پس <script> هرگز به DOM تبدیل نمی‌شود.",
    ],
    en: [
      "Each rule is a pure string function returning a change count and samples, which is what makes independent switches and accurate counters possible.",
      "ZWNJ is inserted in only three safe places: after the verb prefixes می/نمی (with a noun exception list), before ها/های/تر/ترین (with exceptions such as دختر and دفتر), and to fix doubled ZWNJ.",
      "The diff tokenises text into words/whitespace and resynchronises with a small look-ahead to mark changed runs. Output is plain text segments rendered as text nodes, so <script> can never become DOM.",
    ],
  },
  howToSteps: {
    fa: [
      { name: "متن را بچسبانید", text: "متن فارسی را در کادر بگذارید؛ diff بلافاصله به‌روز می‌شود." },
      { name: "قواعد را انتخاب کنید", text: "هر قاعده را می‌توانید جدا خاموش کنید و شمارش تغییرات همان قاعده را ببینید." },
      { name: "خروجی را بردارید", text: "متن نرمال‌شده را کپی کنید یا پیاده‌سازی JS/Python را از بخش کد بردارید." },
    ],
    en: [
      { name: "Paste the text", text: "Drop Persian text into the box; the diff updates immediately." },
      { name: "Choose rules", text: "Switch rules on or off individually and read each rule's change count." },
      { name: "Take the output", text: "Copy the normalised text or grab the JS/Python implementation from the code section." },
    ],
  },
  codeSamples: [
    {
      label: "TypeScript — قاعدهٔ ی و ک",
      language: "ts",
      code: `const replacements: [RegExp, string][] = [
  [/[\\u064a\\u0649]/g, "ی"],  // ي عربی → ی
  [/\\u0643/g, "ک"],           // ك عربی → ک
  [/[\\u0660-\\u0669]/g, (d) => PersianDigits[d]],
];

export function normalizeRules(text: string) {
  return replacements.reduce((acc, [pattern, replacer]) => acc.replace(pattern, replacer), text);
}`,
    },
    {
      label: "Python — همان قاعده‌ها",
      language: "python",
      code: `import re

RULES = [
    (re.compile(r"[\\u064a\\u0649]"), "ی"),
    (re.compile("\\u0643"), "ک"),
    (re.compile(r"[\\u0660-\\u0669]"), lambda m: chr(0x06F0 + ord(m.group()) - 0x0660)),
]

def normalize(text: str) -> str:
    for pattern, replacer in RULES:
        text = pattern.sub(replacer, text)
    return text`,
    },
  ],
  limitations: {
    fa: ["حداکثر ۵۰٬۰۰۰ کاراکتر در هر بار پردازش می‌شود.", "نیم‌فاصله محافظه‌کار است؛ ممکن است برخی ترکیب‌های کم‌کاربرد اصلاح نشوند.", "متن ورودی هرگز به سرور فرستاده نمی‌شود."],
    en: ["Up to 50,000 characters are processed per run.", "ZWNJ handling is conservative by design; rare combinations may stay untouched.", "Input text is never uploaded to the server."],
  },
  offlineCapable: true,
  noindexResults: true,
};
