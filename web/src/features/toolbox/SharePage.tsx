import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { apiGet, ApiError } from "@/lib/api-client";
import { useSEO } from "@/lib/seo";
import { slugFor, toolMeta } from "./metas";
import { siteOrigin } from "./ui/ToolShell";

type ShareDetail = {
  share_id: string;
  tool: string;
  locale: "fa" | "en";
  summary_fa: string;
  summary_en: string;
  params: Record<string, string>;
  created_at: string;
};

/** Permanent share links are always noindex: results must never enter search engines. */
export default function SharePage() {
  const { id } = useParams();
  const { lang, path } = useI18n();
  const copy = toolsCopy[lang];
  const [state, setState] = useState<{ status: "loading" } | { status: "ready"; data: ShareDetail } | { status: "missing" | "error"; message: string }>({ status: "loading" });

  useSEO({
    title: lang === "fa" ? "نتیجهٔ اشتراکی | امت" : "Shared result — Emmett",
    description: copy.share.description,
    canonical: `${siteOrigin()}/${lang}/share/${id ?? ""}/`,
    lang,
    robots: "noindex,nofollow",
  });

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setState({ status: "missing", message: copy.share.notFound });
      return;
    }
    apiGet<ShareDetail>(`/tools/share/${id}/`)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof ApiError ? (lang === "fa" ? error.messageFa : error.messageEn) : copy.share.notFound;
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [id, lang, copy.share.notFound]);

  return (
    <main className="mx-auto w-full max-w-[860px] px-5 pb-24 pt-32 lg:px-10">
      <p className="font-mono text-xs tracking-[0.3em] text-[var(--bright)]">{copy.share.eyebrow}</p>
      <h1 className="mt-4 text-3xl font-semibold">{copy.share.title}</h1>
      <p className="mt-3 text-sm leading-7 text-white/55">{copy.share.description}</p>

      {state.status === "loading" ? <p className="mt-10 text-sm text-white/50">{copy.share.loading}</p> : null}
      {state.status === "missing" || state.status === "error" ? (
        <p role="alert" className="mt-10 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5 text-sm text-amber-200">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <article className="mt-10 rounded-3xl border border-[var(--line)] bg-black/20 p-6">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs text-white/55">{copy.share.tool}</dt>
              <dd className="mt-1">
                {toolMeta(state.data.tool) ? (
                  <Link className="text-[var(--bright)] underline decoration-dotted" to={path(`tools/${slugFor(state.data.tool, lang)}`)}>
                    {toolMeta(state.data.tool)!.title[lang]}
                  </Link>
                ) : (
                  state.data.tool
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/55">{copy.share.summary}</dt>
              <dd className="mt-1 whitespace-pre-wrap leading-7" dir="auto">
                {lang === "fa" ? state.data.summary_fa : state.data.summary_en || state.data.summary_fa}
              </dd>
            </div>
            {Object.keys(state.data.params).length ? (
              <div>
                <dt className="text-xs text-white/55">{copy.share.params}</dt>
                <dd className="mt-1 font-mono text-xs text-white/60" dir="ltr">
                  {Object.entries(state.data.params).map(([key, value]) => (
                    <span key={key} className="me-3 inline-block">
                      {key}={value}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-6 text-xs text-white/55">{copy.share.noindexNote}</p>
        </article>
      ) : null}
    </main>
  );
}
