import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { Link } from "react-router";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { searchRegistry, toolEntries, type Capability } from "@/features/registry";
import { JsonLd, useSEO } from "@/lib/seo";
import { siteOrigin } from "./ui/ToolShell";
import { toPersianDigits } from "@/lib/jalali";

const CAPABILITIES: Capability[] = ["frontend", "backend", "security", "ai", "biotech"];

export default function ToolsIndex() {
  const { lang, rtl, path } = useI18n();
  const copy = toolsCopy[lang];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Capability | "all">("all");
  const results = useMemo(() => {
    const searched = query.trim() ? searchRegistry(query, lang, { kinds: ["tool"], limit: 20 }) : toolEntries;
    return searched.filter((entry) => filter === "all" || entry.capability === filter);
  }, [query, filter, lang]);

  useSEO({
    title: lang === "fa" ? "ابزارهای زندهٔ امت | جعبه‌ابزار" : "Emmett live tools — toolbox",
    description: copy.index.intro,
    canonical: `${siteOrigin()}/${lang}/tools/`,
    lang,
    image: `${siteOrigin()}/og/emmett-og.png`,
  });

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: results.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteOrigin()}/${lang}${entry.path?.[lang] ?? ""}/`,
      name: entry.title[lang],
    })),
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-24 pt-28 lg:px-10">
      <JsonLd data={itemList} />
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.3em] text-[var(--bright)]">{copy.index.eyebrow}</p>
        <h1 className="mt-4 text-3xl font-semibold lg:text-4xl">{copy.index.title}</h1>
        <p className="mt-3 text-sm leading-7 text-white/60">{copy.index.intro}</p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[240px]">
          <span className="sr-only">{copy.index.search}</span>
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-white/35" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.index.search}
            className="w-full rounded-2xl border border-[var(--line)] bg-black/30 py-3 pe-4 ps-10 text-sm outline-none focus:border-[var(--bright)]/60"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilter("all")} aria-pressed={filter === "all"} className={`rounded-xl border px-3 py-2 text-xs ${filter === "all" ? "border-[var(--bright)]/60 text-white" : "border-[var(--line)] text-white/50"}`}>
            {copy.index.all}
          </button>
          {CAPABILITIES.map((capability) => (
            <button
              key={capability}
              type="button"
              onClick={() => setFilter(capability)}
              aria-pressed={filter === capability}
              className={`rounded-xl border px-3 py-2 text-xs ${filter === capability ? "border-[var(--bright)]/60 text-white" : "border-[var(--line)] text-white/50"}`}
            >
              {capability === "ai" ? (lang === "fa" ? "هوش مصنوعی" : "AI") : capability === "biotech" ? (lang === "fa" ? "بیوتک" : "Biotech") : capability === "security" ? (lang === "fa" ? "امنیت" : "Security") : capability === "backend" ? (lang === "fa" ? "بک‌اند" : "Backend") : lang === "fa" ? "فرانت‌اند" : "Frontend"}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-white/40">
        {toPersianDigits(results.length)} {copy.index.toolsCount} · {copy.index.offlineFirst}
      </p>

      {results.length ? (
        <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((entry) => (
            <li key={entry.id}>
              <Link to={path(entry.path?.[lang] ?? "")} className="group flex h-full flex-col rounded-3xl border border-[var(--line)] bg-[#081b13]/60 p-6 transition hover:border-[var(--bright)]/40">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-[var(--line)] px-3 py-1 text-[11px] text-white/55">
                    {entry.title[lang === "fa" ? "en" : "fa"]}
                  </span>
                  {entry.version ? <span className="font-mono text-[11px] text-white/35">v{entry.version}</span> : null}
                </div>
                <h2 className="mt-4 text-lg font-semibold">{entry.title[lang]}</h2>
                <p className="mt-2 flex-1 text-sm leading-7 text-white/55">{entry.description[lang]}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--bright)]">
                  {copy.index.open}
                  {rtl ? <ArrowLeft className="h-4 w-4" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 rounded-3xl border border-[var(--line)] p-8 text-center text-sm text-white/50">{copy.index.empty}</p>
      )}
    </div>
  );
}
