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

const copy = {
  en: {
    eyebrow: "INDEPENDENT ENGINEERING STUDIO",
    title: "We engineer",
    accent: "intelligent systems.",
    intro:
      "Emmett turns difficult operational problems into secure, beautifully crafted products powered by AI.",
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
        "Real products, real users and measurable operational change.",
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
          <div className="mt-11 flex flex-wrap gap-4">
            <Link className="primary-btn" to={path("contact")}>
              {t.start}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link className="ghost-btn" to={path("projects")}>
              {t.work}
            </Link>
          </div>
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
                    <div className="mt-16 text-xs text-white/35">
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
