import {
  ArrowUpRight,
  BrainCircuit,
  Code2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";
import { useI18n } from "../i18n";
import { GlowCard, Reveal } from "../components/MotionKit";
import { Footer } from "../components/Footer";
import { TierScene } from "@/visuals/TierScene";
import { HeroSystemStatic } from "@/visuals/fallbacks/HeroSystemStatic";
import { TelegramCta } from "@/features/telegram/TelegramCta";
import { useSiteConfig } from "@/lib/site-config";

const capabilityCopy = {
  fa: {
    title: "پنج توان، پنج شاهد زنده",
    note: "هر گره این شبکه یک توان تیم است و به artifact زندهٔ همان توان باز می‌شود؛ روی گره‌ها بروید و خودتان بررسی کنید.",
  },
  en: {
    title: "Five capabilities, five live proofs",
    note: "Each node is one team capability and opens the live artifact that proves it — hover, click and check for yourself.",
  },
} as const;

/** Copy for the SiteConfig-driven "what we are building now" band (Phase 5 §2). */
const buildingCopy = {
  fa: {
    label: "الان چه می‌سازیم",
    pending: "این خط از پیکربندی سایت خوانده می‌شود و تا ثبت متن تأییدشده خالی می‌ماند — [INPUT B6].",
  },
  en: {
    label: "What we are building now",
    pending: "This line is read from the site configuration; until approved copy is entered it stays empty — [INPUT B6].",
  },
} as const;

const copy = {
  en: {
    eyebrow: "INDEPENDENT ENGINEERING STUDIO",
    title: "We engineer",
    accent: "intelligent systems.",
    intro:
      "Emmett turns difficult operational problems into secure, maintainable products — and shows the work instead of describing it.",
    start: "Start a project",
    work: "Explore our work",
    sections: [
      "Engineering across the entire stack",
      "Products born from real constraints",
      "Proof lives in production",
      "Ideas worth building with",
    ],
    items: [
      [
        "AI & Product Engineering",
        "From ambitious concept to dependable software.",
      ],
      [
        "PenTestor + Emmett CRM",
        "Focused products for security and relationship intelligence.",
      ],
      [
        "Selected systems",
        "Live tools and products, built and maintained by the same team.",
      ],
      [
        "The Field Library",
        "Playbooks, research and notes from inside the work.",
      ],
    ],
    cta: "Bring us the problem that refuses to fit in a template.",
  },
  fa: {
    eyebrow: "استودیوی مهندسی و هوش مصنوعی امت",
    title: "برای مسئله‌های دشوار،",
    accent: "راه‌حل هوشمند می‌سازیم.",
    intro:
      "از ایده خام تا محصولی امن، سریع و قابل‌اعتماد کنار شما هستیم؛ محصولی که فقط زیبا نیست، در دنیای واقعی نتیجه می‌سازد.",
    start: "پروژه‌تان را شروع کنید",
    work: "نمونه‌کارها را ببینید",
    sections: [
      "مهندسی یکپارچه، از تجربه کاربر تا زیرساخت",
      "محصولاتی که از یک نیاز واقعی متولد شده‌اند",
      "نتیجه‌ای که در عمل می‌شود اندازه گرفت",
      "دانشی که در مسیر ساخت به دست آورده‌ایم",
    ],
    items: [
      [
        "مهندسی محصول و هوش مصنوعی",
        "ایده‌های بزرگ را به نرم‌افزاری سریع، دقیق و قابل‌اتکا تبدیل می‌کنیم.",
      ],
      [
        "PenTestor و Emmett CRM",
        "دو محصول تخصصی برای امنیت پیوسته و مدیریت هوشمند ارتباط با مشتری.",
      ],
      [
        "پروژه‌های منتخب",
        "راهکارهای واقعی برای کاربران واقعی؛ با اثر قابل‌اندازه‌گیری بر کسب‌وکار.",
      ],
      [
        "کتابخانه امت",
        "راهنماها، تحلیل‌ها و تجربه‌هایی که مستقیم از دل پروژه‌ها آمده‌اند.",
      ],
    ],
    cta: "اگر مسئله‌تان با راه‌حل‌های آماده حل نمی‌شود، جای درستی آمده‌اید.",
  },
};
const icons = [BrainCircuit, ShieldCheck, Code2, Sparkles];
const hrefs = ["services", "products", "projects", "resources"];
/**
 * "Now building" — the only place the home page states current work, and it reads it from
 * `SiteConfig` (editable in the admin). When the team has not filled it in yet, the page says
 * exactly that instead of inventing a project (MASTER §10: no fabricated claims).
 */
function BuildingNow({ lang }: { lang: "fa" | "en" }) {
  const { status, config } = useSiteConfig();
  const copyFor = buildingCopy[lang];
  const text = lang === "fa" ? config?.building_fa : config?.building_en;
  const ready = status === "ready" && Boolean(text && text.trim());

  return (
    <p
      data-testid="building-now"
      data-state={ready ? "configured" : status === "error" ? "unavailable" : "pending"}
      className="mt-6 max-w-2xl rounded-2xl border border-[var(--line)] bg-white/[0.02] px-4 py-3 text-sm leading-7 text-white/55"
    >
      <span className="font-mono text-[0.7rem] uppercase tracking-widest text-[var(--bright)]/80">
        {copyFor.label}
      </span>{" "}
      {ready ? text : copyFor.pending}
    </p>
  );
}

export function HomeBilingual() {
  const { lang, path } = useI18n();
  const t = copy[lang];
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--deep)]/92 pt-16 text-[var(--text)]">
      <section className="relative mx-auto flex min-h-[92vh] max-w-[1360px] items-center px-6 py-24 lg:px-12">
        <div className="max-w-5xl">
          <div className="eyebrow">
            <span />
            {t.eyebrow}
          </div>
          <h1 className="hero-title">
            {t.title}
            <br />
            <em>{t.accent}</em>
          </h1>
          <p className="hero-copy">{t.intro}</p>
          <BuildingNow lang={lang} />
          <div className="mt-11 flex flex-wrap gap-4">
            <Link className="primary-btn" to={path("contact")}>
              {t.start}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link className="ghost-btn" to={path("projects")}>
              {t.work}
            </Link>
            <TelegramCta source="home" variant="ghost" />
          </div>
        </div>
      </section>
      <section className="relative mx-auto max-w-[1280px] px-6 pb-14 lg:px-12" aria-labelledby="capability-map">
        <h2 id="capability-map" className="text-2xl text-white/90">
          {capabilityCopy[lang].title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">{capabilityCopy[lang].note}</p>
        <div className="mt-7">
          <TierScene scene="HeroSystem" height={340} fallback={<HeroSystemStatic />} />
        </div>
      </section>
      <section className="relative mx-auto max-w-[1280px] px-6 pb-28 lg:px-12">
        <div className="grid gap-5 md:grid-cols-2">
          {t.items.map(([title, desc], i) => {
            const Icon = icons[i];
            return (
              <Reveal key={title} delay={i * 0.08}>
                <Link to={path(hrefs[i])}>
                  <GlowCard className="group min-h-[300px] rounded-2xl border border-[var(--line)] bg-[#0d281d]/85 p-8">
                    <Icon className="h-8 w-8 text-[var(--bright)]" />
                    <div className="mt-16 text-xs text-white/55">
                      0{i + 1} / {t.sections[i]}
                    </div>
                    <h2 className="mt-4 text-3xl">{title}</h2>
                    <p className="mt-4 max-w-md leading-7 text-white/48">
                      {desc}
                    </p>
                    <ArrowUpRight className="mt-8 h-5 w-5 text-[var(--emerald)] transition group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </GlowCard>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>
      <section className="relative mx-4 mb-4 rounded-[2rem] bg-[var(--emerald)] px-6 py-24 text-[var(--deep)] lg:px-12">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="max-w-5xl text-5xl font-medium leading-[1.08] tracking-[-.04em] lg:text-8xl">
            {t.cta}
          </h2>
          <Link
            to={path("contact")}
            className="mt-10 inline-flex rounded-full bg-[var(--deep)] px-7 py-4 font-semibold text-white"
          >
            {t.start}
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
