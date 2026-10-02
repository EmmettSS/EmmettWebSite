import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { GlowCard, Reveal } from "../components/MotionKit";
import { useI18n } from "../i18n";
import { Footer } from "../components/Footer";

const data = {
  en: {
    eyebrow: "THE FIELD LIBRARY",
    title: "Ideas you can",
    accent: "build with.",
    intro:
      "Playbooks, research and field notes from inside the work—not recycled thought leadership.",
    search: "Search the library…",
    all: "All",
    empty: "No signals found. Try another search.",
    featured: "FEATURED",
    read: "min read",
    cats: ["All", "Field Notes", "Playbooks", "Research"],
    articles: [
      [
        "Field Notes",
        "Designing reliable agents",
        "A practical anatomy of tools, memory, evaluation and graceful failure.",
        "08",
      ],
      [
        "Playbooks",
        "The AI readiness audit",
        "Find high-value workflows before committing to a platform.",
        "14",
      ],
      [
        "Research",
        "Interfaces after chat",
        "Exploring spatial, ambient and adaptive intelligent interfaces.",
        "11",
      ],
      [
        "Field Notes",
        "Observability for AI",
        "The signals every production intelligence system must expose.",
        "07",
      ],
      [
        "Playbooks",
        "From prototype to production",
        "A risk-led checklist for shipping AI beyond the demo.",
        "12",
      ],
      [
        "Research",
        "Human control patterns",
        "Design patterns for keeping people meaningfully in the loop.",
        "09",
      ],
    ],
  },
  fa: {
    eyebrow: "کتابخانه امت",
    title: "دانشی برای",
    accent: "ساختن بهتر.",
    intro:
      "تحلیل‌ها، راهنماها و تجربه‌هایی که مستقیم از دل طراحی و ساخت محصولات واقعی بیرون آمده‌اند؛ کوتاه، کاربردی و بدون حرف اضافه.",
    search: "جستجو در کتابخانه…",
    all: "همه",
    empty: "نتیجه‌ای پیدا نشد؛ عبارت دیگری را امتحان کنید.",
    featured: "منتخب",
    read: "دقیقه مطالعه",
    cats: ["همه", "یادداشت میدانی", "راهنماها", "پژوهش"],
    articles: [
      [
        "یادداشت میدانی",
        "طراحی عامل‌های قابل اتکا",
        "نگاهی عملی به ابزار، حافظه، ارزیابی و شکست کنترل‌شده.",
        "08",
      ],
      [
        "راهنماها",
        "ممیزی آمادگی هوش مصنوعی",
        "پیش از انتخاب سکو، فرایندهای واقعاً ارزشمند را پیدا کنید.",
        "14",
      ],
      [
        "پژوهش",
        "رابط کاربری پس از چت",
        "کاوش رابط‌های فضایی، محیطی و سازگار برای محصولات هوشمند.",
        "11",
      ],
      [
        "یادداشت میدانی",
        "رصدپذیری برای هوش مصنوعی",
        "سیگنال‌هایی که هر سامانه هوشمند عملیاتی باید آشکار کند.",
        "07",
      ],
      [
        "راهنماها",
        "از نمونه اولیه تا محصول واقعی",
        "فهرست کنترل مبتنی بر ریسک برای عبور از مرحله نمایش.",
        "12",
      ],
      [
        "پژوهش",
        "الگوهای کنترل انسانی",
        "الگوهایی برای حضور معنادار انسان در چرخه تصمیم.",
        "09",
      ],
    ],
  },
};
export function Resources() {
  const { lang } = useI18n();
  const t = data[lang];
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(t.cats[0]);
  const rows = useMemo(
    () =>
      t.articles.filter(
        (a) =>
          (cat === t.cats[0] || a[0] === cat) &&
          a.join(" ").toLowerCase().includes(q.toLowerCase()),
      ),
    [q, cat, t],
  );
  return (
    <main className="relative min-h-screen bg-[var(--deep)]/92 pt-16 text-[var(--text)]">
      <section className="relative mx-auto max-w-[1280px] px-6 py-24 lg:px-12 lg:py-36">
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
        <Reveal className="mt-16 grid gap-5 rounded-2xl border border-[var(--line)] bg-[#0d281d]/90 p-7 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <span className="rounded-full bg-[var(--emerald)] px-3 py-1 text-[10px] font-bold text-[var(--deep)]">
              {t.featured}
            </span>
            <h2 className="mt-8 text-4xl">{t.articles[0][1]}</h2>
            <p className="mt-4 text-white/50">{t.articles[0][2]}</p>
          </div>
          <div className="signal-viz min-h-48 rounded-xl border border-[var(--line)]" />
        </Reveal>
        <div className="mt-16 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {t.cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full border px-5 py-2 text-sm transition ${cat === c ? "border-[var(--bright)] bg-[var(--emerald)] text-[var(--deep)]" : "border-[var(--line)] text-white/55 hover:text-white"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="flex min-w-[280px] items-center gap-3 rounded-full border border-[var(--line)] bg-[#0d281d] px-5 py-3">
            <Search className="h-4 w-4 text-[var(--bright)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.search}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((a, i) => (
            <Reveal key={a[1]} delay={i * 0.05}>
              <GlowCard className="group min-h-[270px] rounded-2xl border border-[var(--line)] bg-[#0d281d]/85 p-7">
                <div className="flex justify-between text-[10px] text-[var(--bright)]">
                  <span>{a[0]}</span>
                  <span>
                    {a[3]} {t.read}
                  </span>
                </div>
                <h3 className="mt-16 text-2xl">{a[1]}</h3>
                <p className="mt-4 leading-7 text-white/45">{a[2]}</p>
                <ArrowUpRight className="mt-7 h-5 w-5 text-[var(--emerald)] transition group-hover:rotate-45" />
              </GlowCard>
            </Reveal>
          ))}
        </div>
        {!rows.length && (
          <div className="py-28 text-center text-white/45">{t.empty}</div>
        )}
      </section>
      <Footer />
    </main>
  );
}
