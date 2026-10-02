/**
 * Bilingual legal + disclosure pages (Phase 5 §7).
 *
 * These texts describe what this codebase actually does — cookieless analytics that ships
 * disabled, browser-local tool computation, the passive-only scanner, seven-day scan retention.
 * They are written to be true today; where a lawyer's review is still required it is marked
 * inline ([INPUT B9] / [INPUT B15]) instead of being presented as approved.
 */
export type LegalKey = "privacy" | "terms" | "security";

export type LegalDoc = {
  title: string;
  accent: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
  pending?: { marker: string; note: string };
};

export const legalCopy: Record<"fa" | "en", Record<LegalKey, LegalDoc>> = {
  fa: {
    privacy: {
      title: "سیاست",
      accent: "حریم خصوصی.",
      intro: "این متن دقیقاً همان چیزی است که کد این سایت انجام می‌دهد؛ نه بیشتر.",
      sections: [
        {
          heading: "چه چیزی جمع می‌شود",
          body: [
            "ابزارهای این سایت ورودی شما را به سرور ما نمی‌فرستند؛ محاسبات در مرورگر خودتان انجام می‌شود.",
            "دستیار فقط متن پرسش را برای پاسخ‌دهی دریافت می‌کند و آن را در پایگاه داده نگه نمی‌دارد؛ کش پاسخ با هش پرسش نرمال‌شده ذخیره می‌شود، نه با متن خام.",
            "چک‌آپ امنیتی دامنه فقط سیگنال‌های عمومی (هدرها، TLS، DNS، کوکی، محتوا) را می‌خواند، بدون IP شما در نتیجه، با شناسهٔ تصادفی و ماندگاری ۷ روز.",
            "آمار بازدید (Matomo) به‌صورت پیش‌فرض خاموش است و تنها در صورت فعال‌سازی توسط تیم، بدون کوکی و بدون ابزار شخص ثالث اجرا می‌شود.",
          ],
        },
        {
          heading: "چه چیزی جمع نمی‌شود",
          body: [
            "هیچ دادهٔ واقعی بیمار پذیرفته نمی‌شود؛ در صورت ارسال، سرویس آن را رد می‌کند و هیچ‌جا ذخیره نمی‌شود.",
            "هیچ توالی، توکن JWT، کد ملی یا متن ورودی در لاگ سرور نوشته نمی‌شود.",
            "هیچ داده‌ای برای تبلیغات یا فروش به شخص ثالث منتقل نمی‌شود.",
          ],
        },
        {
          heading: "حق شما",
          body: [
            "هر زمان بخواهید می‌توانید درخواست حذف دادهٔ خود را از طریق راه‌های تماس ثبت‌شده مطرح کنید.",
            "برای نتیجه‌های اسکنر، لینک عمومی خودش پس از ۷ روز منقضی می‌شود و توسط cron پاک می‌شود.",
          ],
        },
      ],
      pending: { marker: "[INPUT B9]", note: "بازبینی حقوقی این متن انجام نشده است؛ تا آن زمان همان رفتار واقعی سیستم توضیح داده شده، بدون ادعای انطباق قانونی." },
    },
    terms: {
      title: "شرایط",
      accent: "استفاده.",
      intro: "استفاده از ابزارهای این سایت آزاد است، با شرط‌هایی که در ادامه می‌آید.",
      sections: [
        {
          heading: "ابزارها",
          body: [
            "ابزارهای عمومی برای پژوهش، آموزش و کار روزمره ارائه می‌شوند و بدون ضمانت صحت برای تصمیم‌های حقوقی، مالی یا بالینی هستند.",
            "میز کار بیوانفورماتیک ابزار پژوهشی است و جایگزین نرم‌افزار آزمایشگاهی یا تأیید بالینی نیست.",
          ],
        },
        {
          heading: "اسکن امنیتی",
          body: [
            "اسکن فقط برای دامنه‌ای مجاز است که مالکیت آن را دارید یا اجازهٔ کتبی گرفته‌اید؛ تأیید مالکیت اجباری است.",
            "روش کار passive است: هیچ پورت‌اسکن، تلاش نفوذ یا بارگذاری مخرب انجام نمی‌شود. تخلف از این شرط موجب محدودیت دسترسی می‌شود.",
          ],
        },
        {
          heading: "مسئولیت",
          body: [
            "خروجی‌ها «همان‌طور که هستند» ارائه می‌شوند؛ تصمیم نهایی با شماست.",
            "برای پروژه‌های سفارشی، شرایط در قرارداد جداگانه تعیین می‌شود.",
          ],
        },
      ],
      pending: { marker: "[INPUT B15]", note: "متن رضایت اسکنر و شرایط استفاده نیازمند بازبینی حقوقی است؛ این نسخه رفتار واقعی سیستم را توصیف می‌کند." },
    },
    security: {
      title: "افشای",
      accent: "آسیب‌پذیری.",
      intro: "اگر آسیب‌پذیری‌ای در این سایت یا سرویس‌هایش پیدا کردید، مسیر گزارش اینجاست.",
      sections: [
        {
          heading: "چطور گزارش دهید",
          body: [
            "شرح کوتاه آسیب‌پذیری، مسیر بازتولید و اثر تخمینی را بفرستید؛ اگر اثبات مفهوم دارید، فقط روی حساب خودتان باشد، نه دادهٔ دیگران.",
            "کانال تماس امنیتی هنوز ثبت نشده است ([INPUT B5])؛ تا آن زمان از فرم تماس همین سایت با موضوع «امنیت» استفاده کنید.",
            "پس از ثبت کانال، فایل /.well-known/security.txt با همان نشانی منتشر می‌شود.",
          ],
        },
        {
          heading: "تعهد ما",
          body: [
            "در نخستین فرصت کاری پاسخ می‌دهیم و پس از رفع، با اجازهٔ شما از شما تشکر می‌کنیم.",
            "اقدام قانونی علیه پژوهشگر خوش‌نیّتی که این چارچوب را رعایت کند انجام نمی‌شود.",
          ],
        },
        {
          heading: "خارج از دامنه",
          body: [
            "تست نفوذ، پورت‌اسکن، حملهٔ بار یا دسترسی به دادهٔ دیگران مجاز نیست و ما آن را پیگیری می‌کنیم.",
          ],
        },
      ],
      pending: { marker: "[INPUT B5]", note: "نشانی امنیتی اختصاصی هنوز از تیم دریافت نشده؛ تا آن زمان فرم تماس مسیر رسمی گزارش است." },
    },
  },
  en: {
    privacy: {
      title: "Privacy",
      accent: "policy.",
      intro: "This text describes exactly what this site's code does — nothing more.",
      sections: [
        {
          heading: "What is collected",
          body: [
            "Our tools compute in your browser; your input is not sent to our servers.",
            "The assistant receives your question text to answer it and does not store it in the database; cached answers are keyed by a hash of the normalised question, never the raw text.",
            "The domain security check-up reads public signals only (headers, TLS, DNS, cookies, content), stores no IP with the result, uses a random identifier and keeps the result for seven days.",
            "Analytics (Matomo) is off by default and, when the team enables it, runs cookieless with no third-party pixel.",
          ],
        },
        {
          heading: "What is never collected",
          body: [
            "Real patient data is never accepted: submissions are rejected server-side and stored nowhere.",
            "No sequence, JWT, national ID or free-text input is written to server logs.",
            "Nothing is sold or shared with third parties for advertising.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You can ask us to delete your data at any time through the published contact channels.",
            "Scanner result links expire after seven days and are removed by a scheduled cleanup.",
          ],
        },
      ],
      pending: { marker: "[INPUT B9]", note: "This text has not yet had legal review; until then it describes the system's actual behaviour without claiming regulatory compliance." },
    },
    terms: {
      title: "Terms of",
      accent: "use.",
      intro: "Using this site's tools is free, under the conditions below.",
      sections: [
        {
          heading: "The tools",
          body: [
            "Public tools are provided for research, education and day-to-day work, with no warranty for legal, financial or clinical decisions.",
            "The bioinformatics workbench is a research tool and is not a substitute for laboratory software or clinical approval.",
          ],
        },
        {
          heading: "Security scanning",
          body: [
            "Only scan domains you own or have written permission for; confirming that is mandatory.",
            "The method is passive: no port scanning, no intrusion attempts, no harmful payloads. Violating this results in access restrictions.",
          ],
        },
        {
          heading: "Liability",
          body: [
            "Outputs are provided “as is”; the decision remains yours.",
            "For custom engagements, terms are set in a separate contract.",
          ],
        },
      ],
      pending: { marker: "[INPUT B15]", note: "The scanner consent wording and terms require legal review; this version documents the system's real behaviour." },
    },
    security: {
      title: "Vulnerability",
      accent: "disclosure.",
      intro: "If you find a vulnerability in this site or its services, this is how to report it.",
      sections: [
        {
          heading: "How to report",
          body: [
            "Send a short description, reproduction steps and the estimated impact; if you have a proof of concept, keep it limited to your own account and never other people's data.",
            "A dedicated security contact is not registered yet ([INPUT B5]); until then, use this site's contact form with the subject “security”.",
            "Once the channel exists, /.well-known/security.txt will publish it.",
          ],
        },
        {
          heading: "Our commitment",
          body: [
            "We reply at the first working opportunity and credit you after the fix, with your permission.",
            "We will not pursue legal action against a good-faith researcher who follows this framework.",
          ],
        },
        {
          heading: "Out of scope",
          body: [
            "Penetration testing, port scanning, load attacks or accessing other people's data are not permitted, and we will act on them.",
          ],
        },
      ],
      pending: { marker: "[INPUT B5]", note: "A dedicated security address has not been provided by the team; the contact form is the official channel until then." },
    },
  },
};
