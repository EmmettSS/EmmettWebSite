/** F-14 page — `/fa/capabilities/` and `/en/capabilities/`. */
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { Footer } from "@/app/components/Footer";
import { useI18n } from "@/app/i18n";
import { Reveal } from "@/app/components/MotionKit";
import { useSEO } from "@/lib/seo";
import { emit } from "@/lib/events";
import { buildMatrix, capabilityCoverage, MATRIX_COPY } from "./matrix";

export function Capabilities() {
  const { lang, path } = useI18n();
  const copy = MATRIX_COPY[lang];
  const rows = buildMatrix(lang);
  const coverage = capabilityCoverage();
  const liveArtifacts = rows.reduce((sum, row) => sum + row.cells.length, 0);

  useSEO({
    title: lang === "fa" ? "ماتریس توانمندی امت | هر خانه یک شاهد زنده" : "Emmett capability matrix — every cell is live proof",
    description: copy.intro,
    canonical: `${typeof window !== "undefined" ? window.location.origin : ""}/${lang}/capabilities/`,
    lang,
    image: `${typeof window !== "undefined" ? window.location.origin : ""}/og/capabilities-${lang}.png`,
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--deep)]/92 pt-16 text-[var(--text)]">
      <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-24 lg:px-12">
        <div className="eyebrow">
          <span />
          {copy.eyebrow}
        </div>
        <h1 className="hero-title">
          {copy.title}
          <br />
          <em>{copy.accent}</em>
        </h1>
        <p className="hero-copy">{copy.intro}</p>
        <div className="mt-8 flex flex-wrap gap-3 text-xs text-white/60">
          <span className="rounded-full border border-[var(--bright)]/50 px-3 py-1 text-[var(--bright)]">
            {copy.legendLive}: {liveArtifacts}
          </span>
          <span className="rounded-full border border-[var(--line)] px-3 py-1">{copy.legendEmpty}</span>
          <span className="rounded-full border border-[var(--line)] px-3 py-1" data-testid="matrix-coverage">
            {copy.coverage}: {coverage.map((entry) => `${entry.capability} ${entry.artifacts}`).join(" · ")}
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] space-y-4 px-6 pb-24 lg:px-12" aria-label={copy.eyebrow}>
        {rows.map((row, index) => (
          <Reveal key={row.capability} delay={index * 0.05}>
            <article
              className={`rounded-3xl border p-6 ${row.live ? "border-[var(--line)] bg-[#081a12]/80" : "border-white/10 bg-white/[.02]"}`}
              data-capability={row.capability}
              data-live={row.live ? "true" : "false"}
            >
              <header className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-3 text-xl">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.token }} aria-hidden />
                  {row.label}
                </h2>
                <span className="font-mono text-[11px] text-white/45">{row.cells.length || "—"}</span>
              </header>

              {row.live ? (
                <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {row.cells.map((cell) => (
                    <li key={cell.id}>
                      <Link
                        to={cell.href}
                        onClick={() => emit("capability_click", { capability: row.capability })}
                        data-evidence={cell.id}
                        className="group flex h-full flex-col gap-2 rounded-2xl border border-[var(--line)] bg-black/25 p-5 transition-colors hover:border-[var(--bright)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--bright)]"
                      >
                        <span className="text-sm text-white/90">{cell.title}</span>
                        <span className="text-[11px] leading-6 text-white/50">{cell.description}</span>
                        <span className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-[var(--bright)]">
                          {cell.version ? `v${cell.version} · ` : ""}
                          {cell.kind}
                          <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:rotate-45" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 rounded-2xl border border-dashed border-white/15 p-5 text-xs text-white/40" data-testid="matrix-empty">
                  {copy.emptyRow}
                </p>
              )}
            </article>
          </Reveal>
        ))}
      </section>

      <section className="mx-4 mb-4 rounded-[2rem] bg-[var(--emerald)] px-6 py-20 text-[var(--deep)] lg:px-12">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="max-w-4xl text-4xl font-medium leading-[1.08] tracking-[-.03em] lg:text-6xl">{copy.cta}</h2>
          <p className="mt-5 max-w-2xl text-sm text-[var(--deep)]/70">{copy.proof}</p>
          <Link to={path("contact")} className="mt-9 inline-flex rounded-full bg-[var(--deep)] px-7 py-4 font-semibold text-white">
            {copy.ctaButton}
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default Capabilities;
