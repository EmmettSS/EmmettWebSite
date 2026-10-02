import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { routeFor, toolMetas } from "../src/features/toolbox/metas";
import { convertJalali, formatGregorian } from "../src/features/toolbox/jalali/logic";
import { validateNationalId } from "../src/features/toolbox/kod-meli/logic";
import { formatTomanFa, parseAmount, tomanToWords } from "../src/features/toolbox/toman/logic";
import { normalizePersian } from "../src/features/toolbox/matn-farsi/logic";
import { decodeJwt } from "../src/features/toolbox/jwt/logic";
import { composition, parseFasta, sanitizeInput, translate } from "../src/features/biolab/logic";
import { REFERENCE_SAMPLE } from "../src/features/biolab/data/reference";

/**
 * Every tool page must ship a *real* computed example in the static HTML (SEO + G1):
 * this runs the exact same `logic.ts` used in the browser, so the HTML cannot advertise a
 * capability the tool does not have.
 */
function realExample(toolId: string, lang: "fa" | "en"): string {
  switch (toolId) {
    case "jalali": {
      const conversion = convertJalali("1403/12/30");
      if (!conversion.ok) return "";
      return lang === "fa"
        ? `۱۴۰۳/۱۲/۳۰ = ${formatGregorian(conversion.gregorian)} (${conversion.weekdayFa})`
        : `1403/12/30 = ${formatGregorian(conversion.gregorian)} (${conversion.weekdayFa})`;
    }
    case "kod-meli": {
      const result = validateNationalId("2715830491");
      return lang === "fa"
        ? `نمونه: کد ۲۷۱۵۸۳۰۴۹۱ → ${result.valid ? "ساختار معتبر" : "نامعتبر"}؛ رقم کنترل مورد انتظار ${result.expectedCheckDigit}`
        : `Example: 2715830491 → ${result.valid ? "structurally valid" : "invalid"}; expected check digit ${result.expectedCheckDigit}`;
    }
    case "toman": {
      const parsed = parseAmount("۱٬۲۵۰٬۰۰۰");
      if (!parsed.ok) return "";
      return lang === "fa"
        ? `${formatTomanFa(parsed.toman)} — حروف‌نویسی: ${tomanToWords(parsed.toman)}`
        : `${formatTomanFa(parsed.toman)} — words: ${tomanToWords(parsed.toman)}`;
    }
    case "matn-farsi": {
      const result = normalizePersian("مي شود اين كتاب را دید");
      return lang === "fa"
        ? `«مي شود اين كتاب را دید» → «${result.normalized}» (${result.total} تغییر)`
        : `"مي شود اين كتاب را دید" → "${result.normalized}" (${result.total} changes)`;
    }
    case "jwt": {
      const result = decodeJwt("eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.");
      if (!result.ok) return "";
      return lang === "fa"
        ? `توکن نمونه (alg: none) → ${result.warnings.length} هشدار امنیتی، اولین مورد: ${result.warnings[0]?.cwe ?? "—"}`
        : `Sample token (alg: none) → ${result.warnings.length} security warning(s), first: ${result.warnings[0]?.cwe ?? "—"}`;
    }
    case "biolab": {
      const record = parseFasta(REFERENCE_SAMPLE.fasta)[0];
      const cleaned = sanitizeInput(record.sequence);
      if (cleaned.error) return "";
      const stats = composition(cleaned.sequence);
      const protein = translate(cleaned.sequence).slice(0, 30).split("").join(" ");
      return lang === "fa"
        ? `نمونهٔ مرجع عمومی MN908947.3: طول ${cleaned.sequence.length}، GC ${stats.gcPercent.toFixed(2)}٪، پروتئین: ${protein}…`
        : `Public reference sample MN908947.3: ${cleaned.sequence.length} nt, GC ${stats.gcPercent.toFixed(2)}%, protein: ${protein}…`;
    }
    default:
      return "";
  }
}

const dist = path.resolve("dist");
const template = await readFile(path.join(dist, "index.html"), "utf8");
const configuredBase = process.env.PUBLIC_SITE_URL;
if (!configuredBase) throw new Error("PUBLIC_SITE_URL is required to emit canonical links and sitemap URLs (set the verified domain; never ship example.invalid).");
const base = new URL(configuredBase).origin;

type Localized = { title: string; description: string; body: string };
type Route = { slug: { fa: string; en: string }; fa: Localized; en: Localized; schema: (locale: "fa" | "en", canonical: string) => Record<string, unknown> };

const organizationSchema = (locale: "fa" | "en", canonical: string) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: locale === "fa" ? "امت" : "Emmett",
  url: canonical,
  description: locale === "fa" ? "مهندسی نرم‌افزار، هوش مصنوعی و امنیت برای مسائل واقعی." : "Software, AI and security engineering for real-world problems.",
});

const routes: Route[] = [
  {
    slug: { fa: "", en: "" },
    fa: { title: "امت | مهندسی نرم‌افزار و هوش مصنوعی", description: "امت سامانه‌های نرم‌افزاری، هوش مصنوعی و امنیت را برای مسائل واقعی مهندسی می‌کند.", body: "مهندسی سامانه‌های نرم‌افزاری، هوش مصنوعی و امنیت برای مسائل واقعی." },
    en: { title: "Emmett | Software and AI Engineering", description: "Emmett engineers software, AI and security systems for real-world problems.", body: "Software, AI and security engineering for real-world problems." },
    schema: organizationSchema,
  },
  {
    slug: { fa: "services", en: "services" },
    fa: { title: "خدمات مهندسی | امت", description: "از تعریف مسئله تا ساخت سامانهٔ نرم‌افزاری و هوش مصنوعی.", body: "خدمات مهندسی نرم‌افزار و هوش مصنوعی؛ جزئیات خدمات را در وب‌سایت ببینید." },
    en: { title: "Engineering Services | Emmett", description: "From problem framing to production software and AI systems.", body: "Software and AI engineering services, from problem framing to delivery." },
    schema: organizationSchema,
  },
  {
    slug: { fa: "assistant", en: "assistant" },
    fa: {
      title: "دستیار امت | پرسش از محتوای واقعی",
      description: "دستیار فقط از روی مطالب امت پاسخ می‌دهد، هر پاسخ ارجاع دارد و اگر پاسخ نباشد صریح می‌گوید پیدا نکردم.",
      body: "دستیار امت روی محتوای خود سایت (مستندات، توضیح ابزارها و FAQ) جست‌وجو می‌کند و پاسخ را با ارجاع می‌دهد. وقتی پاسخ در کورپوس نباشد، بدون تماس با مدل زبانی «پیدا نکردم» برمی‌گرداند.",
    },
    en: {
      title: "Emmett Assistant — answers from our own material",
      description: "The assistant answers only from Emmett's own material, cites a source for every answer and says so when it cannot find one.",
      body: "The Emmett assistant searches the site's own content (documentation, tool descriptions and FAQ) and answers with citations. When the corpus has no answer it returns “I could not find this” without calling a language model.",
    },
    schema: organizationSchema,
  },
  {
    slug: { fa: "contact", en: "contact" },
    fa: { title: "تماس با امت", description: "برای گفت‌وگو دربارهٔ مسئلهٔ فنی یا همکاری با امت در تماس باشید.", body: "برای گفت‌وگو دربارهٔ همکاری، از راه‌های تماس ثبت‌شده استفاده کنید." },
    en: { title: "Contact Emmett", description: "Get in touch with Emmett about an engineering challenge or collaboration.", body: "Contact Emmett to discuss an engineering challenge or collaboration." },
    schema: organizationSchema,
  },
  {
    slug: { fa: "tools", en: "tools" },
    fa: { title: "ابزارهای زندهٔ امت | جعبه‌ابزار", description: "ابزارهای واقعی و بدون شبیه‌سازی: تاریخ شمسی، کد ملی، تومان، متن فارسی، JWT و چک‌آپ امنیتی دامنه.", body: "ابزارهای زندهٔ امت: تاریخ شمسی، اعتبارسنجی کد ملی، فرمت‌کنندهٔ تومان، نرمال‌ساز متن فارسی، دیباگر JWT و چک‌آپ امنیتی دامنه؛ پنج ابزار اول کاملاً در مرورگر اجرا می‌شوند." },
    en: { title: "Emmett Live Tools — Toolbox", description: "Real, non-mocked tools: Jalali date, national ID, toman, Persian text, JWT and a passive domain security check.", body: "Emmett live tools: Jalali date conversion, national-ID validation, toman formatting, Persian text normalisation, a JWT debugger and a passive domain security check; the first five run entirely in the browser." },
    schema: (locale, canonical) => ({
      "@context": "https://schema.org",
      "@type": "ItemList",
      url: canonical,
      numberOfItems: toolMetas.length,
      itemListElement: toolMetas.map((meta, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: meta.title[locale],
        url: `${base}/${locale}/${routeFor(meta, locale)}/`,
      })),
    }),
  },
  {
    slug: { fa: "capabilities", en: "capabilities" },
    fa: {
      title: "ماتریس توانمندی امت | هر خانه یک شاهد زنده",
      description: "پنج توان تیم در یک ماتریس که از رجیستری سایت ساخته می‌شود؛ هر خانه به artifact زنده لینک دارد و خانهٔ بی‌شاهد خاکستری می‌ماند.",
      body: "ماتریس توانمندی از رجیستری خود سایت ساخته می‌شود: فرانت‌اند، بک‌اند، امنیت، هوش مصنوعی و بیوتکنولوژی؛ هر خانه به یک artifact زنده لینک دارد (ابزارهای محلی، چک‌آپ امنیتی، دستیار و میز کار بیوانفورماتیک) و توان بدون شاهد غیرفعال و خاکستری رندر می‌شود.",
    },
    en: {
      title: "Emmett capability matrix — every cell is live proof",
      description: "The five team capabilities as a matrix generated from the site registry: every cell links to a live artifact, and a capability without evidence stays grey.",
      body: "The capability matrix is generated from the site's own registry: frontend, backend, security, AI and biotech. Every cell links to a live artifact (browser tools, the passive security check-up, the assistant and the bioinformatics workbench); a capability without evidence renders disabled and grey.",
    },
    schema: (locale, canonical) => ({
      "@context": "https://schema.org",
      "@type": "ItemList",
      url: canonical,
      name: locale === "fa" ? "ماتریس توانمندی امت" : "Emmett capability matrix",
      numberOfItems: 5,
    }),
  },
  {
    slug: { fa: "lab/performance", en: "lab/performance" },
    fa: {
      title: "آزمایشگاه کارایی امت | اعداد واقعی همین سایت",
      description: "FPS زنده، Core Web Vitals همین بازدیدکننده، حجم واقعی باندل از CI و سطح دستگاه — همه Measured، بدون عدد ساختگی.",
      body: "آزمایشگاه کارایی همان چیزی را نشان می‌دهد که اندازه‌گیری می‌شود: حجم واقعی باندل هر روت از خروجی build، Core Web Vitals همین بازدیدکننده از PerformanceObserver، FPS زنده (فقط در حالت تمام) و سطح دستگاه با دلیل انتخابش. در حالت کم‌مصرف، نمودار FPS غیرفعال می‌ماند و همان اعداد به‌صورت جدول می‌آیند.",
    },
    en: {
      title: "Emmett performance lab — this site's real numbers",
      description: "Live FPS, this visitor's Core Web Vitals, real bundle sizes from CI and the current device tier — measured, never invented.",
      body: "The performance lab shows what is actually measured: per-route bundle size from the build output, this visitor's Core Web Vitals from PerformanceObserver, live FPS (full tier only) and the device tier with its reason. In low-power mode the FPS chart is disabled and the same numbers are shown as a table.",
    },
    schema: (locale, canonical) => ({
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: canonical,
      name: locale === "fa" ? "آزمایشگاه کارایی" : "Performance lab",
    }),
  },
  {
    slug: { fa: "architect", en: "architect" },
    fa: {
      title: "پیشنهاد معماری | امت",
      description: "سه پرسش، یک دیاگرام واقعاً تولیدشده از گراف قواعد، پشتهٔ پیشنهادی با دلیل و بازهٔ زمان/هزینه با فرض‌های اعلام‌شده.",
      body: "با سه پرسش دربارهٔ نوع سامانه، مقیاس و قیدها، یک دیاگرام معماری از گراف قواعد ساخته می‌شود (نه قالب ثابت) و پشتهٔ پیشنهادی همراه با دلیل، بازهٔ زمان و بازهٔ هزینهٔ تومان بر پایهٔ جدول نسخه‌دار ارائه می‌شود. بازه‌ها تخمینی و با فرض‌های اعلام‌شده هستند و پیشنهاد قطعی نیستند.",
    },
    en: {
      title: "Architecture advisor — Emmett",
      description: "Three questions produce a diagram genuinely generated from a rules graph, a recommended stack with reasons, and time/cost ranges with stated assumptions.",
      body: "Three questions about system type, scale and constraints generate an architecture diagram from a rules graph (not a fixed template), plus a recommended stack with reasons and time and Toman cost ranges from a versioned configuration table. Ranges are estimates with stated assumptions, not a firm proposal.",
    },
    schema: (locale, canonical) => ({
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: canonical,
      name: locale === "fa" ? "پیشنهاد معماری" : "Architecture advisor",
    }),
  },
  {
    slug: { fa: "privacy", en: "privacy" },
    fa: { title: "سیاست حریم خصوصی | امت", description: "چه چیزی جمع می‌شود، چه چیزی هرگز جمع نمی‌شود و حق شما چیست.", body: "ابزارها در مرورگر اجرا می‌شوند و ورودی شما به سرور نمی‌رود؛ دستیار متن پرسش را ذخیره نمی‌کند؛ نتیجهٔ اسکنر پس از هفت روز پاک می‌شود؛ آمار بازدید به‌صورت پیش‌فرض خاموش است." },
    en: { title: "Privacy policy — Emmett", description: "What is collected, what is never collected and what your rights are.", body: "Tools run in your browser and your input is not sent to our servers; the assistant stores no question text; scanner results are removed after seven days; analytics is off by default." },
    schema: (locale, canonical) => ({ "@context": "https://schema.org", "@type": "WebPage", url: canonical, name: locale === "fa" ? "حریم خصوصی" : "Privacy policy" }),
  },
  {
    slug: { fa: "terms", en: "terms" },
    fa: { title: "شرایط استفاده | امت", description: "شرط‌های استفاده از ابزارهای عمومی، از جمله قواعد اسکن passive.", body: "ابزارها بدون ضمانت ارائه می‌شوند؛ اسکن فقط با تأیید مالکیت و به‌صورت passive انجام می‌شود؛ شرایط پروژه‌های سفارشی در قرارداد جداگانه تعیین می‌شود." },
    en: { title: "Terms of use — Emmett", description: "Conditions for the public tools, including the passive-scanning rules.", body: "Tools are provided as is; scanning requires ownership confirmation and is passive only; custom engagements are governed by a separate contract." },
    schema: (locale, canonical) => ({ "@context": "https://schema.org", "@type": "WebPage", url: canonical, name: locale === "fa" ? "شرایط استفاده" : "Terms of use" }),
  },
  {
    slug: { fa: "security", en: "security" },
    fa: { title: "افشای آسیب‌پذیری | امت", description: "مسیر گزارش آسیب‌پذیری، تعهد ما و موارد خارج از دامنه.", body: "آسیب‌پذیری‌ها را با شرح و مسیر بازتولید گزارش کنید؛ در نخستین فرصت پاسخ می‌دهیم؛ تست نفوذ و پورت‌اسکن خارج از دامنه است و پیگیری می‌شود." },
    en: { title: "Vulnerability disclosure — Emmett", description: "How to report a vulnerability, our commitment, and what is out of scope.", body: "Report vulnerabilities with a description and reproduction steps; we reply at the first working opportunity; penetration testing and port scanning are out of scope and will be acted on." },
    schema: (locale, canonical) => ({ "@context": "https://schema.org", "@type": "WebPage", url: canonical, name: locale === "fa" ? "افشای آسیب‌پذیری" : "Vulnerability disclosure" }),
  },
  ...toolMetas.map((meta): Route => ({
    slug: { fa: routeFor(meta, "fa"), en: routeFor(meta, "en") },
    fa: { title: `ابزار ${meta.title.fa} | امت`, description: meta.description.fa, body: `${meta.title.fa}: ${meta.description.fa} ${realExample(meta.id, "fa")}` },
    en: { title: `${meta.title.en} — Emmett`, description: meta.description.en, body: `${meta.title.en}: ${meta.description.en} ${realExample(meta.id, "en")}` },
    schema: (locale, canonical) => ({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: meta.title[locale],
      description: meta.description[locale],
      url: canonical,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      inLanguage: locale === "fa" ? "fa-IR" : "en",
      offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
      ...(meta.howToSteps
        ? {
            potentialAction: {
              "@type": "HowTo",
              name: meta.title[locale],
              step: meta.howToSteps[locale].map((step) => ({ "@type": "HowToStep", name: step.name, text: step.text })),
            },
          }
        : {}),
    }),
  })),
];

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

for (const route of routes) {
  for (const locale of ["fa", "en"] as const) {
    const copy = route[locale];
    const dir = locale === "fa" ? "rtl" : "ltr";
    const pathFor = (lang: "fa" | "en") => `/${lang}/${route.slug[lang]}${route.slug[lang] ? "/" : ""}`;
    const canonical = `${base}${pathFor(locale)}`;
    const faCanonical = `${base}${pathFor("fa")}`;
    const enCanonical = `${base}${pathFor("en")}`;
    const schema = route.schema(locale, canonical);
    const html = template
      .replace(/<html[^>]*>/, `<html lang="${locale}" dir="${dir}">`)
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(copy.title)}</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(copy.description)}">`)
      .replace(/<meta name="robots"[^>]*>/, `<meta name="robots" content="index,follow">`)
      .replace("</head>", `<link rel="canonical" href="${escapeHtml(canonical)}"><link rel="alternate" hreflang="fa" href="${escapeHtml(faCanonical)}"><link rel="alternate" hreflang="en" href="${escapeHtml(enCanonical)}"><link rel="alternate" hreflang="x-default" href="${escapeHtml(faCanonical)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script></head>`)
      .replace('<div id="root"></div>', `<div id="root"><main><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.body)}</p></main></div>`);
    const target = path.join(dist, locale, ...route.slug[locale].split("/").filter(Boolean), "index.html");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html, "utf8");
  }
}

await writeFile(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n");

// Hardening §7: RFC 9116 security.txt. The contact is a URL on this site (valid per spec) and the
// policy page states that the dedicated security address is still pending ([INPUT B5]).
const securityTxt = [
  `Contact: ${base}/fa/security/`,
  `Contact: ${base}/en/security/`,
  `Expires: ${new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()}`,
  `Canonical: ${base}/.well-known/security.txt`,
  `Policy: ${base}/fa/security/`,
  `Preferred-Languages: fa, en`,
].join("\n");
await mkdir(path.join(dist, ".well-known"), { recursive: true });
await writeFile(path.join(dist, ".well-known", "security.txt"), `${securityTxt}\n`, "utf8");
const links = routes
  .flatMap(({ slug }) => (["fa", "en"] as const).map((locale) => ({ locale, url: `${base}/${locale}/${slug[locale]}${slug[locale] ? "/" : ""}` })))
  .map(({ locale, url }) => {
    const route = routes.find((entry) => `${base}/${locale}/${entry.slug[locale]}`.replace(/\/$/, "") === url.replace(/\/$/, ""))!;
    const fa = `${base}/fa/${route.slug.fa}${route.slug.fa ? "/" : ""}`;
    const en = `${base}/en/${route.slug.en}${route.slug.en ? "/" : ""}`;
    return `<url><loc>${escapeHtml(url)}</loc><xhtml:link rel="alternate" hreflang="fa" href="${escapeHtml(fa)}"/><xhtml:link rel="alternate" hreflang="en" href="${escapeHtml(en)}"/></url>`;
  })
  .join("");
await writeFile(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${links}</urlset>`);
console.log(`Static Bridge generated ${routes.length * 2} localized pages, robots.txt and sitemap.xml.`);
