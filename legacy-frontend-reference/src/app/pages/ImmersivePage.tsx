import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowUpRight, Check, Cpu, Orbit, Sparkles } from "lucide-react";
import { Footer } from "../components/Footer";

type PageData = {
  eyebrow: string; title: string; accent: string; intro: string;
  stats: [string, string][];
  pillars: { tag: string; title: string; copy: string }[];
  capabilities: string[];
};

const DATA: Record<string, PageData> = {
  services: {
    eyebrow: "THE ENGINEERING SYSTEM", title: "From hard problem to", accent: "living system.",
    intro: "We combine product strategy, AI engineering and resilient infrastructure in one senior team—so ambitious systems move from concept to production without losing their edge.",
    stats: [["04", "Integrated disciplines"], ["14d", "Prototype sprint"], ["99.9%", "Production target"]],
    pillars: [
      { tag: "01 / DISCOVER", title: "Systems diagnosis", copy: "We map the real constraint, model risk and find the smallest high-leverage move." },
      { tag: "02 / BUILD", title: "Product engineering", copy: "Design, software and AI move as one continuous delivery loop." },
      { tag: "03 / SCALE", title: "Operational intelligence", copy: "Observability, automation and governance designed in—not bolted on." },
    ], capabilities: ["AI product engineering", "Cloud & platform architecture", "Security engineering", "Data systems", "Product design", "Technical strategy"],
  },
  products: {
    eyebrow: "EMMETT PRODUCT LAB", title: "Tools born from", accent: "real constraints.",
    intro: "Our products begin where off-the-shelf software stops: high-friction workflows, sensitive data and decisions that need intelligence—not another dashboard.",
    stats: [["02", "Flagship products"], ["24/7", "Autonomous signals"], ["1", "Unified intelligence layer"]],
    pillars: [
      { tag: "SECURITY", title: "PenTestor", copy: "An autonomous security co-pilot that turns continuous attack simulation into clear, actionable fixes." },
      { tag: "OPERATIONS", title: "Emmett CRM", copy: "A relationship operating system that captures context and turns every interaction into momentum." },
      { tag: "EXPERIMENTAL", title: "Signal Engine", copy: "A modular intelligence layer for routing events, agents and human decisions in real time." },
    ], capabilities: ["Agentic workflows", "Privacy-first architecture", "Explainable intelligence", "Human-in-the-loop controls", "Live telemetry", "Composable APIs"],
  },
  projects: {
    eyebrow: "PROOF OF WORK", title: "Systems that perform", accent: "under pressure.",
    intro: "Selected engagements across security, operations and intelligent products—measured by what changed after launch, not by the size of the slide deck.",
    stats: [["42%", "Less operational drag"], ["3.2x", "Faster decisions"], ["8wk", "Average first release"]],
    pillars: [
      { tag: "FINTECH / AI", title: "Decision cockpit", copy: "Unified fragmented risk signals into one explainable decision surface for a regulated team." },
      { tag: "SECURITY", title: "Continuous assurance", copy: "Replaced quarterly snapshots with a live model of exposure and remediation." },
      { tag: "OPERATIONS", title: "Workflow autopilot", copy: "Orchestrated repetitive casework while keeping experts in control of exceptions." },
    ], capabilities: ["Discovery sprint", "Experience architecture", "Full-stack delivery", "AI evaluation", "Production hardening", "Team enablement"],
  },
  resources: {
    eyebrow: "THE FIELD LIBRARY", title: "Ideas you can", accent: "build with.",
    intro: "Field notes, playbooks and experiments from inside the work. No recycled thought leadership—only useful models from building intelligent systems.",
    stats: [["36", "Field notes"], ["12", "Open playbooks"], ["06", "Research tracks"]],
    pillars: [
      { tag: "FIELD NOTE / 08 MIN", title: "Designing reliable agents", copy: "A practical anatomy of tools, memory, evaluations and graceful failure." },
      { tag: "PLAYBOOK / 14 MIN", title: "The AI readiness audit", copy: "How to locate high-value workflows before committing to a platform." },
      { tag: "RESEARCH / LIVE", title: "Interfaces after chat", copy: "Exploring spatial, ambient and adaptive interfaces for intelligent products." },
    ], capabilities: ["Engineering notes", "Product playbooks", "Research briefs", "Open-source tools", "Architecture maps", "Team workshops"],
  },
  academy: {
    eyebrow: "EMMETT ACADEMY", title: "Learn by shipping", accent: "real systems.",
    intro: "Focused learning paths for builders who want durable mental models, production habits and a portfolio that proves the work.",
    stats: [["06", "Learning paths"], ["70%", "Project based"], ["∞", "Builder mindset"]],
    pillars: [
      { tag: "FOUNDATIONS", title: "AI systems engineering", copy: "Move beyond prompts into architecture, evaluation and reliable agent behavior." },
      { tag: "ADVANCED", title: "Production intelligence", copy: "Build observable, secure and cost-aware systems that survive real usage." },
      { tag: "STUDIO", title: "Ship with mentors", copy: "Turn one consequential idea into a working product alongside senior builders." },
    ], capabilities: ["Live studios", "Hands-on labs", "Code reviews", "Architecture clinics", "Portfolio projects", "Builder community"],
  },
  about: {
    eyebrow: "BUILT BY BUILDERS", title: "Small team.", accent: "Deep range.",
    intro: "Emmett is an engineering studio for consequential digital systems. We stay close to the craft, the customer and the outcome.",
    stats: [["01", "Integrated team"], ["10+", "Years building"], ["100%", "Senior attention"]],
    pillars: [
      { tag: "PRINCIPLE 01", title: "Clarity before velocity", copy: "We make the system legible before making it larger." },
      { tag: "PRINCIPLE 02", title: "Craft is strategy", copy: "The details of an interface or API compound into trust." },
      { tag: "PRINCIPLE 03", title: "Stay with the outcome", copy: "We measure what works in the world, not what was delivered." },
    ], capabilities: ["Senior-only teams", "Direct collaboration", "Weekly working demos", "Transparent tradeoffs", "Long-term stewardship", "Knowledge transfer"],
  },
  contact: {
    eyebrow: "START A CONVERSATION", title: "Bring us the", accent: "hard problem.",
    intro: "Tell us what is stuck, what is at stake and what good could look like. We will respond with a point of view—not a generic sales sequence.",
    stats: [["48h", "Typical response"], ["30m", "First conversation"], ["0", "Sales theatre"]],
    pillars: [
      { tag: "STEP 01", title: "Share the signal", copy: "A short note about the problem, constraints and why now is enough." },
      { tag: "STEP 02", title: "Working session", copy: "We pressure-test the opportunity and map the first valuable move." },
      { tag: "STEP 03", title: "Start small", copy: "A focused engagement with a clear outcome, cadence and decision point." },
    ], capabilities: ["New products", "AI transformation", "Platform modernization", "Security systems", "Product rescue", "Technical advisory"],
  },
};

export function ImmersivePage({ kind }: { kind: keyof typeof DATA }) {
  const d = DATA[kind];
  return <main className="relative min-h-screen overflow-hidden bg-[#06140e] pt-16 text-[#effff6]">
    <div className="page-grid pointer-events-none fixed inset-0 opacity-70" />
    <motion.div className="pointer-events-none absolute left-1/2 top-0 h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-[#22d985]/12 blur-[120px]" animate={{ scale: [1, 1.15, 1], opacity: [.35, .7, .35] }} transition={{ duration: 8, repeat: Infinity }} />
    <section className="relative mx-auto max-w-[1280px] px-6 pb-24 pt-24 lg:px-12 lg:pb-36 lg:pt-36">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }}>
        <div className="mb-7 flex items-center gap-3 font-mono text-[11px] tracking-[.24em] text-[#45e99b]"><span className="h-px w-10 bg-[#45e99b]" />{d.eyebrow}</div>
        <h1 className="max-w-[1000px] text-[clamp(3.4rem,8vw,8rem)] font-medium leading-[.88] tracking-[-.065em]">{d.title}<br/><span className="text-[#35c98a]">{d.accent}</span></h1>
        <p className="mt-10 max-w-2xl text-lg leading-8 text-white/52 lg:text-xl">{d.intro}</p>
        <div className="mt-12 flex flex-wrap gap-4"><Link to="/contact" className="group flex items-center gap-3 rounded-full bg-[#35c98a] px-7 py-4 font-semibold text-[#06140e] transition hover:scale-[1.03] hover:bg-[#62f5ae]">Start a conversation <ArrowUpRight className="h-4 w-4 transition group-hover:rotate-45"/></Link><a href="#explore" className="rounded-full border border-[#35c98a]/25 bg-[#35c98a]/5 px-7 py-4 text-white/70 backdrop-blur transition hover:border-[#35c98a]/60 hover:text-white">Explore the system</a></div>
      </motion.div>
      <div className="mt-24 grid gap-px overflow-hidden rounded-2xl border border-[#35c98a]/15 bg-[#35c98a]/15 md:grid-cols-3">{d.stats.map(([value,label],i)=><motion.div key={label} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*.12}} className="bg-[#091c14]/95 p-7"><div className="text-4xl text-[#45e99b]">{value}</div><div className="mt-2 font-mono text-[11px] tracking-widest text-white/35">{label.toUpperCase()}</div></motion.div>)}</div>
    </section>
    <section id="explore" className="relative border-y border-[#35c98a]/10 bg-[#0a2017]/65 py-24 lg:py-32"><div className="mx-auto max-w-[1280px] px-6 lg:px-12"><div className="mb-14 flex items-end justify-between"><div><div className="font-mono text-xs text-[#45e99b]">// CORE MODULES</div><h2 className="mt-3 text-4xl tracking-tight lg:text-6xl">How it comes alive.</h2></div><Orbit className="hidden h-12 w-12 text-[#35c98a]/40 md:block"/></div><div className="grid gap-5 lg:grid-cols-3">{d.pillars.map((p,i)=><motion.article key={p.title} initial={{opacity:0,y:35}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:"-80px"}} transition={{delay:i*.12,duration:.55}} whileHover={{y:-8}} className="group relative min-h-[310px] overflow-hidden rounded-2xl border border-[#35c98a]/15 bg-[#0d281d] p-8"><div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#35c98a]/0 blur-3xl transition duration-500 group-hover:bg-[#35c98a]/25"/><div className="font-mono text-[10px] tracking-[.2em] text-[#45e99b]">{p.tag}</div><h3 className="mt-20 text-3xl leading-tight">{p.title}</h3><p className="mt-5 leading-7 text-white/45">{p.copy}</p><ArrowUpRight className="absolute bottom-8 right-8 h-5 w-5 text-[#35c98a]/35 transition group-hover:rotate-45 group-hover:text-[#45e99b]"/></motion.article>)}</div></div></section>
    <section className="relative mx-auto max-w-[1280px] px-6 py-24 lg:px-12 lg:py-32"><div className="grid gap-14 lg:grid-cols-[.8fr_1.2fr]"><div><Sparkles className="h-8 w-8 text-[#45e99b]"/><h2 className="mt-7 text-4xl leading-tight lg:text-6xl">Built as one<br/>connected system.</h2></div><div className="grid gap-3 sm:grid-cols-2">{d.capabilities.map((x,i)=><motion.div key={x} initial={{opacity:0,x:18}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:i*.06}} className="flex items-center gap-3 rounded-xl border border-[#35c98a]/12 bg-[#35c98a]/[.035] p-5 text-white/65"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#35c98a]/10"><Check className="h-3.5 w-3.5 text-[#45e99b]"/></span>{x}</motion.div>)}</div></div></section>
    <section className="relative mx-4 mb-4 overflow-hidden rounded-[2rem] border border-[#45e99b]/25 bg-[#35c98a] px-6 py-24 text-[#06140e] lg:px-12"><motion.div animate={{rotate:360}} transition={{duration:22,repeat:Infinity,ease:"linear"}} className="absolute -right-20 -top-20"><Cpu className="h-80 w-80 opacity-10"/></motion.div><div className="relative mx-auto max-w-[1180px]"><p className="font-mono text-xs tracking-[.2em]">NEXT / BUILD SOMETHING CONSEQUENTIAL</p><h2 className="mt-6 max-w-4xl text-5xl font-medium leading-[.95] tracking-[-.045em] lg:text-8xl">Your hardest problem might be your best product.</h2><Link to="/contact" className="mt-10 inline-flex items-center gap-3 rounded-full bg-[#06140e] px-7 py-4 font-semibold text-white">Talk to the builders <ArrowUpRight className="h-4 w-4"/></Link></div></section>
    <Footer />
  </main>;
}
