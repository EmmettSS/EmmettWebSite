/**
 * Central feature registry — the single source of truth that feeds the command palette,
 * the real terminal, the tools index and (in Phase 5) the capability matrix (F-14).
 *
 * G1: every `tool` entry must carry an `evidenceUrl` that points at the live artifact;
 * `scripts/tool-contract.ts` fails the build otherwise.
 */
import { toLatinDigits } from "@/lib/jalali";

export type Capability = "frontend" | "backend" | "security" | "ai" | "biotech";
export type RegistryKind = "page" | "tool" | "team" | "case" | "command";

export type RegistryEntry = {
  id: string;
  kind: RegistryKind;
  capability: Capability;
  title: { fa: string; en: string };
  description: { fa: string; en: string };
  /** Site path without the locale prefix, e.g. "/tools/tarikh-shamsi". */
  path?: { fa: string; en: string };
  keywords: { fa: string[]; en: string[] };
  status: "live" | "soon";
  /** Live artifact that proves the capability (required for `tool` entries). */
  evidenceUrl?: { fa: string; en: string };
  /** Terminal command exposed for this entry (palette shows the hint). */
  command?: { name: string; example: string };
  version?: string;
  updatedFa?: string;
};

export const CAPABILITY_LABELS: Record<Capability, { fa: string; en: string; token: string }> = {
  frontend: { fa: "فرانت‌اند", en: "Frontend", token: "var(--color-capability-frontend)" },
  backend: { fa: "بک‌اند", en: "Backend", token: "var(--color-capability-backend)" },
  security: { fa: "امنیت", en: "Security", token: "var(--color-capability-security)" },
  ai: { fa: "هوش مصنوعی", en: "AI", token: "var(--color-capability-ai)" },
  biotech: { fa: "بیوتکنولوژی", en: "Biotech", token: "var(--color-capability-biotech)" },
};

const pages: RegistryEntry[] = [
  pageEntry("home", { fa: "خانه", en: "Home" }, "/", ["امت", "خانه"], ["emmett", "home"], "frontend"),
  pageEntry("services", { fa: "خدمات مهندسی", en: "Engineering services" }, "/services", ["خدمات", "مهندسی"], ["services", "engineering"], "backend"),
  pageEntry("products", { fa: "محصولات", en: "Products" }, "/products", ["محصولات"], ["products"], "frontend"),
  pageEntry("pentestor", { fa: "PenTestor", en: "PenTestor" }, "/products/pentestor", ["امنیت", "تست نفوذ", "پنتستور"], ["security", "pentest", "pentestor"], "security"),
  pageEntry("crm", { fa: "Emmett CRM", en: "Emmett CRM" }, "/products/crm", ["سی‌آر‌ام", "مشتری"], ["crm"], "backend"),
  pageEntry("projects", { fa: "پروژه‌ها", en: "Projects" }, "/projects", ["پروژه", "نمونه‌کار"], ["projects", "work"], "backend"),
  pageEntry("resources", { fa: "کتابخانه امت", en: "Field Library" }, "/resources", ["منابع", "کتابخانه", "مقاله"], ["resources", "library", "notes"], "frontend"),
  pageEntry("academy", { fa: "آکادمی", en: "Academy" }, "/academy", ["آکادمی", "آموزش"], ["academy", "training"], "frontend"),
  pageEntry("about", { fa: "دربارهٔ ما", en: "About" }, "/about", ["درباره", "تیم"], ["about", "team"], "frontend"),
  pageEntry("contact", { fa: "تماس", en: "Contact" }, "/contact", ["تماس", "ارتباط"], ["contact", "talk"], "frontend"),
  pageEntry(
    "assistant",
    { fa: "دستیار امت", en: "Emmett assistant" },
    "/assistant",
    ["دستیار", "هوش مصنوعی", "پرسش", "ai"],
    ["assistant", "ai", "rag", "ask"],
    "ai",
    { fa: "/fa/assistant/", en: "/en/assistant/" },
  ),
];

function pageEntry(
  id: string,
  title: { fa: string; en: string },
  path: string,
  keywordsFa: string[],
  keywordsEn: string[],
  capability: Capability,
  evidenceUrl?: { fa: string; en: string },
): RegistryEntry {
  return {
    id: `page.${id}`,
    kind: "page",
    capability,
    title,
    description: { fa: `رفتن به صفحهٔ ${title.fa}`, en: `Go to ${title.en}` },
    path: { fa: path, en: path },
    keywords: { fa: keywordsFa, en: keywordsEn },
    status: "live",
    ...(evidenceUrl ? { evidenceUrl } : {}),
  };
}

export const toolEntries: RegistryEntry[] = [
  {
    id: "tool.jalali",
    kind: "tool",
    capability: "backend",
    title: { fa: "محاسبات تاریخ شمسی", en: "Jalali date calculator" },
    description: { fa: "تبدیل شمسی/میلادی، روز کاری، تعطیلات رسمی و تبدیل انبوه.", en: "Jalali ↔ Gregorian conversion, business days, holidays and bulk conversion." },
    path: { fa: "/tools/tarikh-shamsi", en: "/tools/jalali-date" },
    keywords: {
      fa: ["تاریخ", "شمسی", "تقویم", "میلادی", "روز کاری", "تعطیلات", "نوروز", "تبدیل تاریخ"],
      en: ["date", "jalali", "persian", "calendar", "gregorian", "workdays", "convert"],
    },
    status: "live",
    evidenceUrl: { fa: "/fa/tools/tarikh-shamsi/", en: "/en/tools/jalali-date/" },
    command: { name: "jalali", example: "jalali 1404/07/01" },
    version: "1.0.0",
    updatedFa: "۱۴۰۵/۰۷/۱۰",
  },
  {
    id: "tool.kod-meli",
    kind: "tool",
    capability: "security",
    title: { fa: "اعتبارسنج کد ملی و شناسهٔ ملی", en: "National ID validator" },
    description: { fa: "بررسی محلی checksum با توضیح گام‌به‌گام؛ بدون هیچ استعلام هویتی.", en: "Local checksum validation with step-by-step maths; no identity lookup." },
    path: { fa: "/tools/kod-meli", en: "/tools/national-id" },
    keywords: {
      fa: ["کد ملی", "شناسه ملی", "اعتبارسنجی", "ثبت احوال", "شرکت", "checksum"],
      en: ["national id", "code melli", "legal id", "validator", "checksum"],
    },
    status: "live",
    evidenceUrl: { fa: "/fa/tools/kod-meli/", en: "/en/tools/national-id/" },
    command: { name: "kod", example: "kod 2715830491" },
    version: "1.0.0",
    updatedFa: "۱۴۰۵/۰۷/۱۰",
  },
  {
    id: "tool.toman",
    kind: "tool",
    capability: "frontend",
    title: { fa: "فرمت‌کنندهٔ تومان و حروف‌نویسی چک", en: "Toman formatter & cheque words" },
    description: { fa: "تومان، ریال، حروف‌نویسی چک و ماشین‌حساب فاکتور — فقط با عدد صحیح.", en: "Toman, rial, cheque wording and an invoice calculator — integers only." },
    path: { fa: "/tools/toman", en: "/tools/toman" },
    keywords: {
      fa: ["تومان", "ریال", "چک", "حروف‌نویسی", "فاکتور", "مالیات", "مبلغ"],
      en: ["toman", "rial", "cheque", "invoice", "vat", "amount", "words"],
    },
    status: "live",
    evidenceUrl: { fa: "/fa/tools/toman/", en: "/en/tools/toman/" },
    command: { name: "toman", example: "toman 1250000" },
    version: "1.0.0",
    updatedFa: "۱۴۰۵/۰۷/۱۰",
  },
  {
    id: "tool.matn-farsi",
    kind: "tool",
    capability: "frontend",
    title: { fa: "نرمال‌ساز متن فارسی", en: "Persian text normaliser" },
    description: { fa: "ی/ک عربی، ارقام، اعراب، نیم‌فاصلهٔ محافظه‌کار و diff زنده.", en: "Arabic yeh/kaf, digits, diacritics, conservative ZWNJ and a live diff." },
    path: { fa: "/tools/matn-farsi", en: "/tools/persian-text" },
    keywords: {
      fa: ["متن", "نرمال‌سازی", "نیم‌فاصله", "ی عربی", "ک عربی", "اعراب", "ویرایش متن"],
      en: ["text", "normalise", "zwnj", "arabic yeh", "diacritics", "clean"],
    },
    status: "live",
    evidenceUrl: { fa: "/fa/tools/matn-farsi/", en: "/en/tools/persian-text/" },
    command: { name: "normalize", example: "normalize مي شود" },
    version: "1.0.0",
    updatedFa: "۱۴۰۵/۰۷/۱۰",
  },
  {
    id: "tool.check-security",
    kind: "tool",
    capability: "security",
    title: { fa: "چک‌آپ امنیتی دامنه", en: "Domain security check-up" },
    description: { fa: "شش بخش passive: هدرها، TLS، DNS، کوکی، محتوا و نشت اطلاعات — با گرید A تا F.", en: "Six passive sections: headers, TLS, DNS, cookies, content and leaks — with an A-to-F grade." },
    path: { fa: "/tools/check-security", en: "/tools/check-security" },
    keywords: {
      fa: ["امنیت", "اسکن", "دامنه", "هدر", "tls", "dns", "spf", "dmarc", "گرید", "چک‌آپ"],
      en: ["security", "scan", "domain", "headers", "tls", "dns", "spf", "dmarc", "grade"],
    },
    status: "live",
    evidenceUrl: { fa: "/fa/tools/check-security/", en: "/en/tools/check-security/" },
    command: { name: "scan", example: "scan example.com --consent" },
    version: "1.0.0",
    updatedFa: "۱۴۰۵/۰۷/۱۰",
  },
  {
    id: "tool.biolab",
    kind: "tool",
    capability: "biotech",
    title: { fa: "میز کار بیوانفورماتیک", en: "Bioinformatics workbench" },
    description: { fa: "تحلیل توالی، تبدیل‌ها، خط لولهٔ آزمایشگاه و نمونهٔ FHIR — کاملاً در مرورگر.", en: "Sequence analysis, conversions, a lab pipeline and FHIR samples — entirely in the browser." },
    path: { fa: "/biolab", en: "/biolab" },
    keywords: {
      fa: ["بیوانفورماتیک", "توالی", "دی‌ان‌ای", "فستا", "gc", "orf", "کدون", "تبدیل", "آزمایشگاه", "fhir"],
      en: ["bioinformatics", "sequence", "dna", "fasta", "gc", "orf", "codon", "translate", "lab", "fhir"],
    },
    status: "live",
    evidenceUrl: { fa: "/fa/biolab/", en: "/en/biolab/" },
    command: { name: "bio", example: "bio ATGCGTACGTTAGCTAGCTAGC" },
    version: "1.0.0",
    updatedFa: "۱۴۰۵/۰۷/۱۰",
  },
  {
    id: "tool.jwt",
    kind: "tool",
    capability: "security",
    title: { fa: "JWT Debugger با تحلیل امنیتی", en: "JWT debugger with security analysis" },
    description: { fa: "decode کاملاً در مرورگر + هشدارهای امنیتی با ارجاع CWE. توکن هرگز ارسال نمی‌شود.", en: "Browser-only decoding plus security warnings with CWE references. Tokens never leave your browser." },
    path: { fa: "/tools/jwt", en: "/tools/jwt" },
    keywords: {
      fa: ["جی‌دبلیوتی", "توکن", "امنیت", "alg none", "احراز هویت", "debugger"],
      en: ["jwt", "token", "security", "alg none", "auth", "debugger"],
    },
    status: "live",
    evidenceUrl: { fa: "/fa/tools/jwt/", en: "/en/tools/jwt/" },
    version: "1.0.0",
    updatedFa: "۱۴۰۵/۰۷/۱۰",
  },
];

export const commandEntries: RegistryEntry[] = [
  commandEntry("command.help", { fa: "راهنمای دستورها", en: "Command help" }, ["راهنما", "کمک", "دستور"], ["help", "commands"], "فهرست دستورها را نشان می‌دهد"),
  commandEntry("command.tools", { fa: "فهرست ابزارها", en: "List tools" }, ["ابزارها", "لیست"], ["tools", "list"], "ابزارهای زنده را از API می‌خواند"),
  commandEntry("command.status", { fa: "وضعیت سامانه", en: "System status" }, ["وضعیت", "سلامت"], ["status", "health"], "سلامت سامانه، نسخه و uptime"),
  commandEntry("command.open", { fa: "باز کردن صفحه", en: "Open page" }, ["باز کن", "رفتن"], ["open", "goto"], "باز کردن هر صفحه یا ابزار"),
  commandEntry("command.scan", { fa: "بررسی امنیتی دامنه", en: "Domain security check" }, ["اسکن", "امنیت", "دامنه"], ["scan", "security", "domain"], "شروع بررسی passive یک دامنه با تأیید مالکیت"),
  commandEntry("command.ask", { fa: "پرسیدن از دستیار", en: "Ask the assistant" }, ["دستیار", "پرسش", "سوال"], ["ask", "assistant", "question"], "پرسش از دستیار روی محتوای واقعی امت"),
  commandEntry("command.lang", { fa: "تغییر زبان", en: "Switch language" }, ["زبان", "فارسی", "انگلیسی"], ["lang", "language"], "تغییر زبان سایت"),
];

function commandEntry(id: string, title: { fa: string; en: string }, keywordsFa: string[], keywordsEn: string[], descriptionFa: string): RegistryEntry {
  return {
    id,
    kind: "command",
    capability: "frontend",
    title,
    description: { fa: descriptionFa, en: descriptionFa },
    keywords: { fa: keywordsFa, en: keywordsEn },
    status: "live",
  };
}

export const registry: RegistryEntry[] = [...pages, ...toolEntries, ...commandEntries];

/** Live artifacts that prove a capability (F-14 matrix). Pages count only with an evidenceUrl. */
export function liveArtifactsFor(capability: Capability): RegistryEntry[] {
  return registry.filter(
    (entry) => entry.capability === capability && entry.status === "live" && Boolean(entry.evidenceUrl?.fa && entry.evidenceUrl?.en),
  );
}

export const CAPABILITIES: Capability[] = ["frontend", "backend", "security", "ai", "biotech"];

/* ------------------------------------------------------------------ *
 * Bilingual fuzzy search
 * ------------------------------------------------------------------ */

function normalize(value: string): string {
  return toLatinDigits(value)
    .toLowerCase()
    .replace(/[\u200c\u200e\u200f]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/[يی]/g, "ی")
    .replace(/[كک]/g, "ک")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreEntry(entry: RegistryEntry, query: string, lang: "fa" | "en"): number {
  const needle = normalize(query);
  if (!needle) return 0;
  const haystacks = [entry.title[lang], entry.title[lang === "fa" ? "en" : "fa"], ...entry.keywords[lang], ...entry.keywords[lang === "fa" ? "en" : "fa"]].map(normalize);
  let best = 0;
  for (const haystack of haystacks) {
    if (!haystack) continue;
    if (haystack === needle) best = Math.max(best, 100);
    else if (haystack.startsWith(needle)) best = Math.max(best, 80 - haystack.length);
    else if (haystack.includes(needle)) best = Math.max(best, 55 - haystack.length);
    else {
      const tokens = needle.split(" ");
      const matched = tokens.filter((token) => haystack.includes(token)).length;
      if (matched) best = Math.max(best, 30 + matched * 5);
    }
  }
  if (entry.kind === "tool" && entry.status === "live") best += 8; // live artifacts rank first (G1)
  return best;
}

export function searchRegistry(query: string, lang: "fa" | "en", options: { kinds?: RegistryKind[]; limit?: number } = {}): RegistryEntry[] {
  const { kinds, limit = 12 } = options;
  return registry
    .filter((entry) => !kinds || kinds.includes(entry.kind))
    .map((entry) => ({ entry, score: scoreEntry(entry, query, lang) }))
    .filter((item) => (query.trim() ? item.score > 0 : true))
    .sort((a, b) => b.score - a.score || a.entry.title[lang].localeCompare(b.entry.title[lang], lang))
    .slice(0, limit)
    .map((item) => item.entry);
}

export function pathFor(entry: RegistryEntry, lang: "fa" | "en"): string {
  return `/${lang}${entry.path?.[lang] ?? "/"}`;
}

export function toolBySlug(slug: string): RegistryEntry | undefined {
  return toolEntries.find((entry) => entry.path?.fa.replace("/tools/", "") === slug || entry.path?.en.replace("/tools/", "") === slug || entry.id === `tool.${slug}`);
}
