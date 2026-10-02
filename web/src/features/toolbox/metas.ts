import type { ToolMeta } from "./types";
import { meta as assistant } from "@/features/assistant/meta";
import { meta as scanner } from "@/features/scanner/meta";
import { meta as jalali } from "./jalali/meta";
import { meta as jwt } from "./jwt/meta";
import { meta as kodMeli } from "./kod-meli/meta";
import { meta as matnFarsi } from "./matn-farsi/meta";
import { meta as toman } from "./toman/meta";

/** All tool metadata is tiny and needed for SEO, the palette and cross-linking. */
export const toolMetas: ToolMeta[] = [jalali, kodMeli, toman, matnFarsi, jwt, scanner, assistant];

const byId = new Map(toolMetas.map((meta) => [meta.id, meta]));

export function toolMeta(id: string): ToolMeta | undefined {
  return byId.get(id);
}

/** Legacy/alternative slugs stay resolvable so an old link never 404s. */
export const SLUG_ALIASES: Record<string, string> = {
  jalali: "jalali",
  "tarikh-shamsi": "jalali",
  "jalali-date": "jalali",
  "national-id": "kod-meli",
  "persian-text": "matn-farsi",
  security: "check-security",
  "security-check": "check-security",
  domain: "check-security",
};

export function toolIdFromSlug(slug: string): string | undefined {
  if (byId.has(slug)) return slug;
  const match = toolMetas.find((meta) => meta.slug.fa === slug || meta.slug.en === slug);
  if (match) return match.id;
  return SLUG_ALIASES[slug];
}

export function slugFor(id: string, lang: "fa" | "en"): string {
  return byId.get(id)?.slug[lang] ?? id;
}

export function alternatesFor(id: string): { fa: string; en: string } {
  const meta = byId.get(id);
  return { fa: meta?.slug.fa ?? id, en: meta?.slug.en ?? id };
}
