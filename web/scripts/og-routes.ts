/**
 * Single source of truth for Open Graph cards.
 *
 * `render-assets.ts` renders one card per entry and `render-public-html.ts` links the matching
 * card from each route's HTML, so a route can never ship without its social image.
 */
import { routeFor, toolMetas } from "../src/features/toolbox/metas";

export type OgCard = {
  /** File stem under /og/<stem>-<lang>.png */
  file: string;
  title: { fa: string; en: string };
  subtitle: { fa: string; en: string };
  /** In-app route slug (no locale prefix); undefined means the card is not tied to one route. */
  slug?: string;
};

export const ogCards: OgCard[] = [
  { file: "home", slug: "", title: { fa: "مهندسی نرم‌افزار و هوش مصنوعی", en: "Software & AI engineering" }, subtitle: { fa: "پنج توان، پنج شاهد زنده", en: "Five capabilities, five live proofs" } },
  { file: "services", slug: "services", title: { fa: "خدمات مهندسی", en: "Engineering services" }, subtitle: { fa: "از مسئله تا سامانهٔ زنده", en: "From problem to living system" } },
  { file: "tools", slug: "tools", title: { fa: "ابزارهای زنده", en: "Live tools" }, subtitle: { fa: "بدون شبیه‌سازی، واقعی", en: "Real, not mocked" } },
  { file: "assistant", slug: "assistant", title: { fa: "دستیار امت", en: "Emmett assistant" }, subtitle: { fa: "پاسخ با ارجاع، یا «پیدا نکردم»", en: "Cited answers, or an honest miss" } },
  { file: "capabilities", slug: "capabilities", title: { fa: "ماتریس توانمندی", en: "Capability matrix" }, subtitle: { fa: "هر خانه یک شاهد زنده", en: "Every cell is live proof" } },
  { file: "lab-performance", slug: "lab/performance", title: { fa: "آزمایشگاه کارایی", en: "Performance lab" }, subtitle: { fa: "اعداد واقعی همین سایت", en: "This site's real numbers" } },
  { file: "architect", slug: "architect", title: { fa: "پیشنهاد معماری", en: "Architecture advisor" }, subtitle: { fa: "دیاگرام واقعاً تولیدشده", en: "A diagram actually generated" } },
  { file: "contact", slug: "contact", title: { fa: "تماس با امت", en: "Contact Emmett" }, subtitle: { fa: "گفت‌وگو دربارهٔ مسئلهٔ فنی", en: "Talk about an engineering problem" } },
  { file: "privacy", slug: "privacy", title: { fa: "حریم خصوصی", en: "Privacy policy" }, subtitle: { fa: "چه چیزی جمع می‌شود و چه چیزی هرگز", en: "What is collected and what never is" } },
  { file: "terms", slug: "terms", title: { fa: "شرایط استفاده", en: "Terms of use" }, subtitle: { fa: "قواعد استفاده و اسکن passive", en: "Rules of use and passive scanning" } },
  { file: "security", slug: "security", title: { fa: "افشای آسیب‌پذیری", en: "Vulnerability disclosure" }, subtitle: { fa: "مسیر گزارش و تعهد ما", en: "How to report and what we commit to" } },
  // Used by the Django static bridge for published posts (their titles are dynamic).
  { file: "posts", title: { fa: "نوشته‌های امت", en: "Emmett posts" }, subtitle: { fa: "یادداشت‌های مهندسی", en: "Engineering notes" } },
  ...toolMetas.map((meta) => ({
    file: routeFor(meta, "fa").replace(/\//g, "-"),
    slug: routeFor(meta, "fa"),
    title: meta.title,
    subtitle: { fa: "ابزار زندهٔ امت", en: "An Emmett live tool" },
  })),
];

/** `/og/<stem>-<lang>.png` for a route slug (`""` = home). Throws when a route has no card. */
export function ogImageFor(slug: string, lang: "fa" | "en"): string {
  const card = ogCards.find((entry) => entry.slug === slug);
  if (!card) throw new Error(`No Open Graph card is registered for route “${slug}”`);
  return `/og/${card.file}-${lang}.png`;
}

export const ogCardCount = ogCards.length * 2;
