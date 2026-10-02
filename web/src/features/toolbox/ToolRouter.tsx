import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { routeFor, toolIdFromSlug, toolMeta } from "./metas";

/** Every tool is code-split; none of them is part of the initial bundle (ADR-005). */
const pages: Record<string, LazyExoticComponent<ComponentType>> = {
  jalali: lazy(() => import("./jalali")),
  "kod-meli": lazy(() => import("./kod-meli")),
  toman: lazy(() => import("./toman")),
  "matn-farsi": lazy(() => import("./matn-farsi")),
  jwt: lazy(() => import("./jwt")),
  "check-security": lazy(() => import("@/features/scanner")),
  assistant: lazy(() => import("@/features/assistant")),
};

export default function ToolRouter() {
  const { slug } = useParams();
  const { lang, path } = useI18n();
  const copy = toolsCopy[lang];
  const id = slug ? toolIdFromSlug(slug) : undefined;
  const meta = id ? toolMeta(id) : undefined;
  const Page = id ? pages[id] : undefined;

  // Tools that live outside /tools/* (route override) keep working from their old path,
  // but always land on the canonical route so no duplicate page is served.
  if (meta && meta.route && !pages[id ?? ""]) {
    return <Navigate to={`/${lang}/${routeFor(meta, lang)}/`} replace />;
  }

  if (!meta || !Page) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-5 pb-24 pt-32 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-[var(--bright)]">404</p>
        <h1 className="mt-4 text-2xl font-semibold">{copy.index.empty}</h1>
        <Link to={path("tools")} className="mt-6 inline-block rounded-xl border border-[var(--line)] px-4 py-2 text-sm text-[var(--bright)]">
          {copy.index.open}
        </Link>
      </div>
    );
  }

  return <Page />;
}
