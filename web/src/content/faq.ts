/**
 * Assistant FAQ — the only place where the assistant is allowed to get "business" answers from.
 *
 * Rules:
 *  - every claim must be checkable inside this repository or on a page of this site;
 *  - anything that needs a business decision carries an explicit `[INPUT]` marker: the assistant
 *    repeats that marker instead of inventing a number, a client or a promise.
 */
export type FaqEntry = {
  id: string;
  question: { fa: string; en: string };
  answer: { fa: string; en: string };
  /** Where a reader can verify the answer on this site. */
  url: { fa: string; en: string };
  tags: string[];
};

export const faq: FaqEntry[] = [
  {
    id: "stack",
    question: { fa: "روی چه پشته‌ای کار می‌کنید؟", en: "What stack do you work on?" },
    answer: {
      fa: "بک‌اند جنگو و DRF است، فرانت‌اند React و TypeScript با Vite، و میزبانی روی cPanel با MariaDB. همین سایت هم با همین پشته اجرا می‌شود؛ جزئیات معماری در بخش دربارهٔ ما آمده است.",
      en: "The backend is Django with DRF, the frontend is React and TypeScript on Vite, and hosting is cPanel with MariaDB. This very site runs on that stack; the architecture notes live on the About page.",
    },
    url: { fa: "/about", en: "/about" },
    tags: ["stack", "architecture", "پشته", "معماری"],
  },
  {
    id: "tools-live",
    question: { fa: "چه ابزارهایی روی سایت زنده است؟", en: "Which tools are live on the site?" },
    answer: {
      fa: "پنج ابزار زنده است: محاسبات تاریخ شمسی، اعتبارسنج کد ملی و شناسهٔ ملی، فرمت‌کنندهٔ تومان و حروف‌نویسی چک، نرمال‌ساز متن فارسی و دیباگر JWT. هر پنج ابزار منطق واقعی دارند و بدون ثبت‌نام کار می‌کنند.",
      en: "Five tools are live: the Jalali date calculator, the national-ID validator, the toman formatter with cheque wording, the Persian text normaliser and the JWT debugger. All five run real logic and need no sign-up.",
    },
    url: { fa: "/tools", en: "/tools" },
    tags: ["tools", "ابزار", "جعبه‌ابزار"],
  },
  {
    id: "data-in-tools",
    question: { fa: "داده‌های من در ابزارها کجا می‌رود؟", en: "Where does my data go in the tools?" },
    answer: {
      fa: "منطق اصلی ابزارها سمت مرورگر اجرا می‌شود. اعتبارسنج کد ملی و دیباگر JWT هیچ درخواستی به سرور نمی‌فرستند و ورودی شما را ذخیره نمی‌کنند. اگر لینک اشتراک بسازید، فقط خلاصهٔ نتیجه ذخیره می‌شود و آن صفحه noindex است.",
      en: "Tool logic runs in the browser. The national-ID validator and the JWT debugger send no request to the server and store no input. If you create a share link, only the result summary is stored and that page is noindex.",
    },
    url: { fa: "/tools", en: "/tools" },
    tags: ["privacy", "حریم خصوصی", "داده"],
  },
  {
    id: "pentestor",
    question: { fa: "PenTestor چطور کار می‌کند؟", en: "How does PenTestor work?" },
    answer: {
      fa: "چک‌آپ امنیتی دامنه روی همین سایت passive است: فقط رکوردهای عمومی DNS و یک درخواست HTTPS به خود دامنه. گزارش کامل و تست نفوذ واقعی در محصول PenTestor انجام می‌شود.",
      en: "The domain check-up on this site is passive: public DNS records plus a single HTTPS request to the domain itself. The full report and real penetration testing happen in the PenTestor product.",
    },
    url: { fa: "/products/pentestor", en: "/products/pentestor" },
    tags: ["pentestor", "security", "امنیت", "اسکن"],
  },
  {
    id: "passive-scope",
    question: { fa: "چک‌آپ امنیتی چه چیزهایی را بررسی می‌کند؟", en: "What does the security check-up look at?" },
    answer: {
      fa: "شش بخش: هدرهای امنیتی HTTP، TLS و گواهی، رکوردهای DNS (SPF، DMARC، DKIM، CAA، DNSSEC)، کوکی‌ها، قرارگیری محتوا و نشت اطلاعات. هیچ پورت‌اسکن، payload یا brute-force انجام نمی‌شود.",
      en: "Six sections: HTTP security headers, TLS and the certificate, DNS records (SPF, DMARC, DKIM, CAA, DNSSEC), cookies, content placement and information leaks. No port scan, payload or brute force is ever run.",
    },
    url: { fa: "/tools/check-security", en: "/tools/check-security" },
    tags: ["scanner", "security", "اسکن", "امنیت"],
  },
  {
    id: "assistant-how",
    question: { fa: "دستیار امت چطور جواب می‌دهد؟", en: "How does the Emmett assistant answer?" },
    answer: {
      fa: "دستیار فقط از روی مطالب خود امت جواب می‌دهد و هر پاسخ را با ارجاع به منبع نشان می‌دهد. اگر پاسخ در مطالب نباشد، می‌گوید «این را در مطالب ما پیدا نکردم» و از دانش عمومی جواب نمی‌سازد.",
      en: "The assistant answers only from Emmett's own material and shows a source for every answer. When the material has no answer it says so instead of inventing one from general knowledge.",
    },
    url: { fa: "/assistant", en: "/assistant" },
    tags: ["assistant", "ai", "دستیار", "رگ"],
  },
  {
    id: "jalali-accuracy",
    question: { fa: "دقت محاسبات تاریخ شمسی چطور تضمین می‌شود؟", en: "How is the Jalali date accuracy guaranteed?" },
    answer: {
      fa: "تبدیل‌ها با الگوریتم ریاضی انجام می‌شود و در هر بیلد با cal بر مبنای ICU برای هزاران تاریخ مقایسه می‌شود؛ اختلافی که پیدا شود بیلد را متوقف می‌کند.",
      en: "Conversions use an arithmetic algorithm and every build compares thousands of dates against the ICU-based cal; any mismatch fails the build.",
    },
    url: { fa: "/tools/tarikh-shamsi", en: "/tools/jalali-date" },
    tags: ["jalali", "date", "تاریخ", "دقت"],
  },
  {
    id: "contact",
    question: { fa: "چطور با شما تماس بگیرم؟", en: "How do I contact you?" },
    answer: {
      fa: "از صفحهٔ تماس پیام بگذارید. [INPUT B5] نشانی ایمیل و شناسهٔ تلگرام نهایی هنوز ثبت نشده و پس از تأیید مالک سایت جایگزین می‌شود.",
      en: "Leave a message on the contact page. [INPUT B5] The final email address and Telegram handle are not registered yet and will be replaced once the site owner confirms them.",
    },
    url: { fa: "/contact", en: "/contact" },
    tags: ["contact", "تماس"],
  },
  {
    id: "pricing",
    question: { fa: "هزینهٔ پروژه‌ها چطور محاسبه می‌شود؟", en: "How is project pricing calculated?" },
    answer: {
      fa: "[INPUT B5] بازهٔ قیمت و مدل همکاری هنوز تأیید نشده است. برای شروع، مسئله را در صفحهٔ تماس توضیح دهید تا دامنهٔ کار مشخص شود.",
      en: "[INPUT B5] The pricing range and engagement model are not confirmed yet. Start by describing the problem on the contact page so the scope can be defined.",
    },
    url: { fa: "/contact", en: "/contact" },
    tags: ["pricing", "قیمت", "هزینه"],
  },
  {
    id: "case-studies",
    question: { fa: "کیس‌استادی امنیتی دارید؟", en: "Do you have a security case study?" },
    answer: {
      fa: "[INPUT B12] هیچ کیس‌استادی با اعداد و رضایت مشتری هنوز منتشر نشده است. تا آن زمان به‌جای ادعای بی‌سند، مسیر فنی و مستندات همین سایت قابل بررسی است.",
      en: "[INPUT B12] No case study with numbers and client permission has been published yet. Until then the technical path and documentation on this site are verifiable instead of unsupported claims.",
    },
    url: { fa: "/projects", en: "/projects" },
    tags: ["case-study", "کیس‌استادی", "نمونه‌کار"],
  },
];
