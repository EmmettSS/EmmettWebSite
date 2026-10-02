/**
 * F-11 — Architecture advisor (`/fa/architect/`, `/en/architect/`).
 *
 * Three questions → a diagram genuinely generated from a rules graph, a stack with reasons,
 * a time band and a Toman cost band from the versioned table. The page never claims certainty:
 * assumptions are printed next to the numbers, and the share link reproduces the answers.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, GitBranch, Share2 } from "lucide-react";
import { Link } from "react-router";
import { Footer } from "@/app/components/Footer";
import { useI18n } from "@/app/i18n";
import { useSEO } from "@/lib/seo";
import { trackGoal } from "@/lib/analytics";
import { TelegramCta } from "@/features/telegram/TelegramCta";
import { COST_TABLE_VERSION } from "./config";
import { NODE_LABELS, diagramSize, layout, recommend, tomanRangeOf, type Answers, type Constraint, type Scale, type SystemKind } from "./rules";

const COPY = {
  fa: {
    eyebrow: "پیشنهاد معماری",
    title: "سه پرسش، یک",
    accent: "دیاگرام واقعی.",
    intro:
      "این فرم قالب آماده نیست: پاسخ‌های شما یک گراف قواعد را انتخاب می‌کنند و دیاگرام از همان گراف ساخته می‌شود. برای هر انتخاب، دلیلش نوشته می‌شود و بازهٔ هزینه با فرض‌های اعلام‌شده می‌آید.",
    step1: "۱) چه نوع سامانه‌ای؟",
    step2: "۲) مقیاس و کاربرانت؟",
    step3: "۳) قیدهای واقعی (چند مورد مجاز است)",
    build: "ساخت پیشنهاد",
    rebuild: "دوباره بساز",
    empty: "پاسخ‌ها را انتخاب کنید و «ساخت پیشنهاد» را بزنید.",
    diagram: "دیاگرام تولیدشده",
    stack: "پشتهٔ پیشنهادی و دلیلش",
    risks: "ریسک‌هایی که باید پیش از شروع روشن شوند",
    reasonsTitle: "این دیاگرام از کجا آمد؟",
    time: "بازهٔ زمان (نفر-هفته)",
    cost: "بازهٔ هزینه (تومان)",
    assumptions: "فرض‌ها",
    assumptionsBody: "بازه‌ها بر پایهٔ جدول نسخه‌دار محاسبه شده‌اند و تخمینی‌اند؛ پیشنهاد قطعی و تعهد قیمت نیستند. نرخ‌ها از پیکربندی نسخه {version} می‌آیند و تیم می‌تواند آن‌ها را در پنل مدیریت تغییر دهد.",
    share: "کپی لینک همین پیشنهاد",
    copied: "لینک کپی شد",
    cta: "می‌خواهید همین را واقعی بسازیم؟",
    ctaButton: "گفت‌وگو با تیم",
    telegram: "یا در تلگرام پیام بدهید",
    notConfigured: "پاسخ‌ها هنوز کامل نیست.",
  },
  en: {
    eyebrow: "ARCHITECTURE ADVISOR",
    title: "Three questions, one",
    accent: "real diagram.",
    intro:
      "This is not a fixed template: your answers select nodes in a rules graph, and the diagram is generated from that graph. Every choice states its reason, and the cost band arrives with stated assumptions.",
    step1: "1) What kind of system?",
    step2: "2) What scale?",
    step3: "3) Real constraints (pick any)",
    build: "Generate the proposal",
    rebuild: "Rebuild",
    empty: "Pick your answers and press “Generate the proposal”.",
    diagram: "Generated diagram",
    stack: "Recommended stack, with reasons",
    risks: "Risks to settle before starting",
    reasonsTitle: "Where did this diagram come from?",
    time: "Time band (person-weeks)",
    cost: "Cost band (Toman)",
    assumptions: "Assumptions",
    assumptionsBody: "The bands are computed from the versioned table and are estimates; they are not a quotation or a guarantee. Rates come from configuration version {version}, editable by the team in the admin.",
    share: "Copy a link to this proposal",
    copied: "Link copied",
    cta: "Want us to build this for real?",
    ctaButton: "Talk to the team",
    telegram: "Or message us on Telegram",
    notConfigured: "Your answers are not complete yet.",
  },
} as const;

const KIND_OPTIONS: { id: SystemKind; fa: string; en: string }[] = [
  { id: "internal_tool", fa: "ابزار داخلی سازمان", en: "Internal tool" },
  { id: "customer_portal", fa: "پورتال مشتری", en: "Customer portal" },
  { id: "data_platform", fa: "پلتفرم داده", en: "Data platform" },
  { id: "ai_assistant", fa: "دستیار هوش مصنوعی", en: "AI assistant" },
  { id: "regulated_system", fa: "سامانهٔ تنظیم‌شده/حساس", en: "Regulated system" },
];

const SCALE_OPTIONS: { id: Scale; fa: string; en: string }[] = [
  { id: "pilot", fa: "پایلوت / تیم کوچک", en: "Pilot / small team" },
  { id: "growing", fa: "در حال رشد", en: "Growing" },
  { id: "high_traffic", fa: "ترافیک بالا", en: "High traffic" },
];

const CONSTRAINT_OPTIONS: { id: Constraint; fa: string; en: string }[] = [
  { id: "budget", fa: "بودجهٔ محدود", en: "Limited budget" },
  { id: "cpanel_hosting", fa: "میزبانی cPanel", en: "cPanel hosting" },
  { id: "deadline", fa: "ضرب‌الاجل سخت", en: "Hard deadline" },
  { id: "compliance", fa: "الزام انطباق/حسابرسی", en: "Compliance/audit" },
  { id: "offline_first", fa: "اتصال ضعیف کاربران", en: "Weak user connectivity" },
  { id: "team_size", fa: "تیم نگهداری کوچک", en: "Small maintenance team" },
];

function toman(value: number): string {
  return value.toLocaleString("en-US");
}

export default function Architect() {
  const { lang, path } = useI18n();
  const copy = COPY[lang];
  const [answers, setAnswers] = useState<{ kind: SystemKind | null; scale: Scale | null; constraints: Constraint[] }>({ kind: null, scale: null, constraints: [] });
  const [submitted, setSubmitted] = useState<Answers | null>(null);

  useSEO({
    title: lang === "fa" ? "پیشنهاد معماری | امت" : "Architecture advisor — Emmett",
    description: copy.intro,
    canonical: `${typeof window !== "undefined" ? window.location.origin : ""}/${lang}/architect/`,
    lang,
    image: `${typeof window !== "undefined" ? window.location.origin : ""}/og/architect-${lang}.png`,
  });

  // A shared link carries the answers, so the same proposal can be reopened exactly.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("kind") as SystemKind | null;
    const scale = params.get("scale") as Scale | null;
    const constraints = (params.get("constraints") ?? "").split(",").filter(Boolean) as Constraint[];
    if (!kind || !KIND_OPTIONS.some((option) => option.id === kind)) return;
    if (!scale || !SCALE_OPTIONS.some((option) => option.id === scale)) return;
    const restored: Answers = { kind, scale, constraints: constraints.filter((item) => CONSTRAINT_OPTIONS.some((option) => option.id === item)) };
    setAnswers({ kind: restored.kind, scale: restored.scale, constraints: restored.constraints });
    setSubmitted(restored);
  }, []);

  const result = useMemo(() => (submitted ? recommend(submitted) : null), [submitted]);
  const positions = useMemo(() => (result ? layout(result.nodes, result.edges) : null), [result]);
  const size = useMemo(() => (result ? diagramSize(result.nodes) : null), [result]);
  const band = submitted ? tomanRangeOf(submitted.kind) : null;

  const toggleConstraint = (constraint: Constraint) => {
    setAnswers((current) => ({
      ...current,
      constraints: current.constraints.includes(constraint)
        ? current.constraints.filter((item) => item !== constraint)
        : [...current.constraints, constraint],
    }));
  };

  const build = () => {
    if (!answers.kind || !answers.scale) return;
    const next: Answers = { kind: answers.kind, scale: answers.scale, constraints: answers.constraints };
    setSubmitted(next);
    trackGoal("architect_proposal", `${next.kind}:${next.scale}:${next.constraints.length}`);
    const params = new URLSearchParams({
      kind: next.kind,
      scale: next.scale,
      constraints: next.constraints.join(","),
      table: COST_TABLE_VERSION,
    });
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const copyLink = async () => {
    const params = new URLSearchParams({ kind: submitted!.kind, scale: submitted!.scale, constraints: submitted!.constraints.join(","), table: COST_TABLE_VERSION });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      trackGoal("architect_share", submitted!.kind);
    } catch {
      /* clipboard blocked — the URL bar still holds the answers */
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--deep)]/92 pt-16 text-[var(--text)]">
      <section className="mx-auto max-w-[1280px] px-6 pb-10 pt-24 lg:px-12">
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
      </section>

      <section className="mx-auto max-w-[1280px] px-6 pb-16 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-3">
          <fieldset className="rounded-2xl border border-[var(--line)] bg-black/20 p-5">
            <legend className="px-2 text-sm text-white/80">{copy.step1}</legend>
            <div className="mt-3 space-y-2">
              {KIND_OPTIONS.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center gap-3 text-sm text-white/75">
                  <input
                    type="radio"
                    name="kind"
                    value={option.id}
                    checked={answers.kind === option.id}
                    onChange={() => setAnswers((current) => ({ ...current, kind: option.id }))}
                    className="accent-[var(--bright)]"
                  />
                  {option[lang]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-[var(--line)] bg-black/20 p-5">
            <legend className="px-2 text-sm text-white/80">{copy.step2}</legend>
            <div className="mt-3 space-y-2">
              {SCALE_OPTIONS.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center gap-3 text-sm text-white/75">
                  <input
                    type="radio"
                    name="scale"
                    value={option.id}
                    checked={answers.scale === option.id}
                    onChange={() => setAnswers((current) => ({ ...current, scale: option.id }))}
                    className="accent-[var(--bright)]"
                  />
                  {option[lang]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-[var(--line)] bg-black/20 p-5">
            <legend className="px-2 text-sm text-white/80">{copy.step3}</legend>
            <div className="mt-3 space-y-2">
              {CONSTRAINT_OPTIONS.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center gap-3 text-sm text-white/75">
                  <input
                    type="checkbox"
                    checked={answers.constraints.includes(option.id)}
                    onChange={() => toggleConstraint(option.id)}
                    className="accent-[var(--bright)]"
                  />
                  {option[lang]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={build}
            disabled={!answers.kind || !answers.scale}
            data-testid="architect-build"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--bright)] px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
          >
            <GitBranch className="h-4 w-4" />
            {copy.build}
          </button>
          {submitted ? (
            <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-5 py-3 text-sm text-white/80">
              <Share2 className="h-4 w-4" />
              {copy.share}
            </button>
          ) : null}
        </div>

        {!result ? (
          <p className="mt-8 rounded-2xl border border-dashed border-white/15 p-6 text-sm text-white/45" data-testid="architect-empty">
            {copy.empty}
          </p>
        ) : (
          <div className="mt-10 space-y-8" data-testid="architect-result">
            <section aria-label={copy.diagram} className="rounded-3xl border border-[var(--line)] bg-black/25 p-5">
              <h2 className="text-lg text-white/90">{copy.diagram}</h2>
              <div className="mt-4 overflow-x-auto">
                <svg
                  viewBox={`0 0 ${size!.width} ${size!.height}`}
                  className="min-h-[260px] w-full"
                  role="img"
                  aria-label={copy.diagram}
                  data-testid="architect-diagram"
                >
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3fd0a0" />
                    </marker>
                  </defs>
                  {result.edges.map((edge) => {
                    const from = positions![edge.from];
                    const to = positions![edge.to];
                    const midX = (from.x + to.x) / 2;
                    return (
                      <g key={`${edge.from}-${edge.to}`}>
                        <path
                          d={`M ${from.x + 62} ${from.y} C ${midX + 40} ${from.y}, ${midX - 40} ${to.y}, ${to.x - 62} ${to.y}`}
                          fill="none"
                          stroke="#3fd0a0"
                          strokeOpacity="0.55"
                          strokeWidth="1.6"
                          markerEnd="url(#arrow)"
                        />
                        {edge.label ? (
                          <text x={midX} y={(from.y + to.y) / 2 - 6} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)">
                            {edge.label[lang]}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                  {result.nodes.map((node) => {
                    const position = positions![node];
                    return (
                      <g key={node}>
                        <rect x={position.x - 62} y={position.y - 26} width="124" height="52" rx="14" fill="#07130d" stroke="#25c779" strokeOpacity="0.5" />
                        <text x={position.x} y={position.y + 4} textAnchor="middle" fontSize="11.5" fill="rgba(255,255,255,0.85)">
                          {NODE_LABELS[node][lang]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-[var(--line)] bg-black/20 p-5">
                <h2 className="text-lg text-white/90">{copy.stack}</h2>
                <ul className="mt-4 space-y-4">
                  {result.stack.map((choice) => (
                    <li key={`${choice.layer.en}-${choice.choice.en}`} className="border-t border-[var(--line)] pt-3 first:border-t-0 first:pt-0">
                      <p className="text-xs text-white/45">{choice.layer[lang]}</p>
                      <p className="mt-1 text-sm text-white/90">{choice.choice[lang]}</p>
                      <p className="mt-1 text-xs leading-6 text-white/50">{choice.why[lang]}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="space-y-6">
                <section className="rounded-3xl border border-[var(--line)] bg-black/20 p-5">
                  <h2 className="text-lg text-white/90">{copy.reasonsTitle}</h2>
                  <ul className="mt-4 space-y-2 text-xs leading-6 text-white/60">
                    {result.reasons.map((reason) => (
                      <li key={reason.en}>— {reason[lang]}</li>
                    ))}
                  </ul>
                </section>

                {band ? (
                  <section className="rounded-3xl border border-[var(--bright)]/40 bg-[var(--emerald)]/5 p-5" data-testid="architect-cost">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-white/50">{copy.time}</p>
                        <p className="mt-1 font-mono text-lg text-[var(--bright)]">
                          {band.weeks[0]}–{band.weeks[1]}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/50">{copy.cost}</p>
                        <p className="mt-1 font-mono text-lg text-[var(--bright)]">
                          {toman(band.toman[0])} – {toman(band.toman[1])}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] leading-6 text-white/50">
                      <strong className="text-white/70">{copy.assumptions}:</strong> {copy.assumptionsBody.replace("{version}", COST_TABLE_VERSION)}
                    </p>
                  </section>
                ) : null}

                {result.risks.length ? (
                  <section className="rounded-3xl border border-amber-400/40 bg-amber-400/10 p-5">
                    <h2 className="text-lg text-amber-100">{copy.risks}</h2>
                    <ul className="mt-3 space-y-2 text-xs leading-6 text-amber-100/85">
                      {result.risks.map((risk) => (
                        <li key={risk.en}>— {risk[lang]}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mx-4 mb-4 rounded-[2rem] bg-[var(--emerald)] px-6 py-20 text-[var(--deep)] lg:px-12">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-8">
          <h2 className="max-w-3xl text-4xl font-medium leading-[1.08] tracking-[-.03em] lg:text-6xl">{copy.cta}</h2>
          <div className="flex flex-col gap-4">
            <Link to={path("contact")} className="inline-flex items-center gap-2 rounded-full bg-[var(--deep)] px-7 py-4 font-semibold text-white">
              {copy.ctaButton}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <TelegramCta source="architect" variant="ghost" />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
