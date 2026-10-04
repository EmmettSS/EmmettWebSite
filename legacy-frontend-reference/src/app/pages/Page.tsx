import { motion } from "motion/react";
import { ArrowUpRight, Check, Cpu, Orbit, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { pages, ui, type PageKey } from "../content";
import { useI18n } from "../i18n";
import { GlowCard, Reveal } from "../components/MotionKit";
import { Footer } from "../components/Footer";

export function Page({ kind }: { kind: PageKey }) {
  const { lang, path, rtl } = useI18n();
  const d = pages[lang][kind];
  const t = ui[lang];
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--deep)]/92 pt-16 text-[var(--text)]">
      <section className="relative mx-auto max-w-[1280px] px-6 pb-24 pt-24 lg:px-12 lg:pb-36 lg:pt-36">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="eyebrow">
            <span />
            {d.eyebrow}
          </div>
          <h1 className="hero-title">
            {d.title}
            <br />
            <em>{d.accent}</em>
          </h1>
          <p className="hero-copy">{d.intro}</p>
          <div className="mt-11 flex flex-wrap gap-4">
            <Link to={path("contact")} className="primary-btn">
              {t.start}
              <ArrowUpRight className={rtl ? "rotate-[-90deg]" : "h-4 w-4"} />
            </Link>
            <a href="#explore" className="ghost-btn">
              {t.explore}
            </a>
          </div>
        </motion.div>
        <div className="mt-24 grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] md:grid-cols-3">
          {d.metrics.map(([v, l], i) => (
            <Reveal delay={i * 0.1} key={l} className="bg-[#081a12]/95 p-7">
              <b className="text-4xl font-medium text-[var(--bright)]">{v}</b>
              <div className="mt-2 text-xs text-white/40">{l}</div>
            </Reveal>
          ))}
        </div>
      </section>
      <section
        id="explore"
        className="relative border-y border-[var(--line)] bg-[#0a2017]/75 py-24 lg:py-32"
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <div className="mb-14 flex items-end justify-between">
            <div>
              <p className="text-xs text-[var(--bright)]">// {t.modules}</p>
              <h2 className="section-title mt-3">{t.modulesTitle}</h2>
            </div>
            <Orbit className="hidden h-12 w-12 text-[var(--emerald)]/40 md:block" />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {d.cards.map((c, i) => (
              <Reveal delay={i * 0.1} key={c.title}>
                <GlowCard className="group relative min-h-[320px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[#0d281d]/90 p-8">
                  <div className="text-[10px] tracking-[.2em] text-[var(--bright)]">
                    {c.tag}
                  </div>
                  <h3 className="mt-20 text-3xl">{c.title}</h3>
                  <p className="mt-5 leading-7 text-white/48">{c.copy}</p>
                  <ArrowUpRight className="absolute bottom-8 end-8 h-5 w-5 text-[var(--emerald)] transition group-hover:rotate-45" />
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="relative mx-auto max-w-[1280px] px-6 py-24 lg:px-12 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[.8fr_1.2fr]">
          <Reveal>
            <Sparkles className="h-8 w-8 text-[var(--bright)]" />
            <h2 className="section-title mt-7">{t.connected}</h2>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {d.capabilities.map((x, i) => (
              <Reveal
                delay={i * 0.05}
                key={x}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--emerald)]/[.035] p-5 text-white/65"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--emerald)]/10">
                  <Check className="h-3.5 w-3.5 text-[var(--bright)]" />
                </span>
                {x}
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="relative mx-4 mb-4 overflow-hidden rounded-[2rem] bg-[var(--emerald)] px-6 py-24 text-[var(--deep)] lg:px-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="absolute -end-20 -top-20"
        >
          <Cpu className="h-80 w-80 opacity-10" />
        </motion.div>
        <div className="relative mx-auto max-w-[1180px]">
          <p className="text-xs tracking-[.2em]">{t.next}</p>
          <h2 className="mt-6 max-w-4xl text-5xl font-medium leading-[1.05] tracking-[-.04em] lg:text-8xl">
            {t.cta}
          </h2>
          <Link
            to={path("contact")}
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-[var(--deep)] px-7 py-4 font-semibold text-white"
          >
            {t.talk}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
