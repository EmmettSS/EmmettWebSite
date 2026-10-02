import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { useI18n } from "@/app/i18n";
import { useSEO } from "@/lib/seo";
import { ToolShell, siteOrigin } from "./ToolShell";
import type { ToolMeta } from "../types";

export const DEFAULT_OG_IMAGE = "/og/emmett-og.png";

/** Query params that carry a user result: any of them makes the page noindex (never index user data). */
const RESULT_PARAMS = ["d", "b", "add", "v", "off", "vat", "t", "r", "s", "id"];

/**
 * Shared page wrapper: bilingual metadata, canonical/hreflang, JSON-LD and the shell.
 * The canonical URL always points at the clean route (no query), and any URL that
 * carries result state is rendered `noindex` (feature-card rule 4 + exit gate).
 */
export function ToolRoute({ meta, children, noindex = false }: { meta: ToolMeta; children: ReactNode; noindex?: boolean }) {
  const { lang } = useI18n();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const hasResult = RESULT_PARAMS.some((key) => params.has(key));
  const isNoindex = noindex || hasResult;
  const canonical = `${siteOrigin()}/${lang}/tools/${meta.slug[lang]}/`;
  useSEO({
    title: lang === "fa" ? `ابزار ${meta.title.fa} | امت` : `${meta.title.en} — Emmett`,
    description: meta.description[lang],
    canonical,
    lang,
    robots: isNoindex ? "noindex,follow" : "index,follow",
    image: `${siteOrigin()}${DEFAULT_OG_IMAGE}`,
    type: "website",
  });
  return <ToolShell meta={meta}>{children}</ToolShell>;
}
