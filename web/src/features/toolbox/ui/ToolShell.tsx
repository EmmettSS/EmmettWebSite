import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Copy } from "lucide-react";
import { Link } from "react-router";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { CAPABILITY_LABELS, toolEntries } from "@/features/registry";
import { JsonLd, toolJsonLd } from "@/lib/seo";
import { useCopyToClipboard } from "../hooks";
import type { ToolMeta } from "../types";

export function siteOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://emmett.example";
}

export function ToolShell({ meta, children, aside }: { meta: ToolMeta; children: ReactNode; aside?: ReactNode }) {
  const { lang, path, rtl } = useI18n();
  const copy = toolsCopy[lang];
  const capability = CAPABILITY_LABELS[meta.capability];
  const related = toolEntries.filter((entry) => entry.id !== `tool.${meta.id}`).slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-24 pt-28 lg:px-10">
      <JsonLd
        data={toolJsonLd({
          title: meta.title[lang],
          description: meta.description[lang],
          slug: meta.slug,
          lang,
          keywords: meta.keywords[lang],
          version: meta.version,
          siteOrigin: siteOrigin(),
          howToSteps: meta.howToSteps?.[lang],
        })}
      />
      <nav aria-label={lang === "fa" ? "مسیر" : "Breadcrumb"} className="mb-6 flex items-center gap-2 text-xs text-white/40">
        <Link to={path("tools")} className="hover:text-white">
          {copy.tool.backToTools}
        </Link>
        <span aria-hidden>{rtl ? "←" : "→"}</span>
        <span className="text-white/70">{meta.title[lang]}</span>
      </nav>

      <header className="tool-signature relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[#081b13]/70 p-6 lg:p-9">
        <div className="tool-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1" style={{ color: capability.token }}>
              <span className="h-2 w-2 rounded-full" style={{ background: capability.token }} aria-hidden />
              {capability[lang]}
            </span>
            <span className="rounded-full border border-[var(--line)] px-3 py-1 text-white/60">
              {copy.tool.version} {meta.version}
            </span>
            <span className="rounded-full border border-[var(--line)] px-3 py-1 text-white/60">
              {copy.tool.updated}: {meta.updatedFa}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1 text-[var(--bright)]">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              {meta.evidence[lang]}
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight lg:text-4xl">{meta.title[lang]}</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/55">{meta.subtitle[lang]}</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">{meta.description[lang]}</p>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="rounded-3xl border border-[var(--line)] bg-[#07130d]/60 p-5 lg:p-7">{children}</div>

          <section aria-labelledby="how-it-works" className="mt-8 rounded-3xl border border-[var(--line)] p-5 lg:p-7">
            <h2 id="how-it-works" className="text-lg font-semibold">
              {copy.tool.howItWorks}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/70">
              {meta.howItWorks[lang].map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-6 space-y-4">
              {meta.codeSamples.map((sample) => (
                <CodeBlock key={sample.label} label={sample.label} language={sample.language} code={sample.code} />
              ))}
            </div>
            {meta.limitations ? (
              <div className="mt-6 rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-xs leading-6 text-white/55">
                <b className="mb-1 block text-white/70">{copy.tool.disclaimer}</b>
                <ul className="list-disc space-y-1 ps-5">
                  {meta.limitations[lang].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {meta.disclaimers ? (
              <div className="mt-4 space-y-2 text-xs leading-6 text-white/55">
                {meta.disclaimers[lang].map((item) => (
                  <p key={item} className="rounded-xl border border-[var(--line)] bg-black/20 p-3">
                    {item}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-6">
          {aside}
          <section aria-labelledby="related-tools" className="rounded-3xl border border-[var(--line)] p-5">
            <h2 id="related-tools" className="text-sm font-semibold">
              {copy.tool.related}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {related.map((entry) => (
                <li key={entry.id}>
                  <Link className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-white/70 hover:bg-white/5 hover:text-white" to={`/${lang}${entry.path?.[lang] ?? ""}`}>
                    <span>{entry.title[lang]}</span>
                    {rtl ? <ArrowLeft className="h-4 w-4" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <p className="rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-xs leading-6 text-white/50">
            {copy.tool.resultNoindex} · {meta.offlineCapable ? copy.tool.lowPowerNote : copy.index.offlineFirst}
          </p>
        </aside>
      </div>
    </div>
  );
}

function CodeBlock({ label, language, code }: { label: string; language: string; code: string }) {
  const { lang } = useI18n();
  const copy = toolsCopy[lang];
  const { copied, copy: copyText } = useCopyToClipboard();
  return (
    <figure className="overflow-hidden rounded-2xl border border-[var(--line)] bg-black/40">
      <figcaption className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-2 text-xs text-white/50">
        <span>
          {label} · {language}
        </span>
        <button type="button" onClick={() => void copyText(code, label)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2 py-1 hover:text-white">
          <Copy className="h-3.5 w-3.5" aria-hidden />
          {copied === label ? copy.tool.copied : copy.tool.copy}
        </button>
      </figcaption>
      <pre dir="ltr" className="max-h-80 overflow-auto p-4 text-left text-[12.5px] leading-6 text-white/80">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
