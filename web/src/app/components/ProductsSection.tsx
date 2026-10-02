import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

type Product = {
  id: string;
  num: string;
  name: string;
  tagline: string;
  copy: string;
  tags: string[];
  href: string;
  pill: string;
  bgFrom: string;
  bgTo: string;
};

const products: Product[] = [
  {
    id: "pentestor",
    num: "01",
    name: "Pentestor",
    tagline: "AI-powered security engineering.",
    copy: "Transforms complex security assessment into an intelligent, structured workflow. Attack surface mapping, network topology, findings analysis — all in one platform.",
    tags: ["Security", "AI Analysis", "Network Topology", "Risk Prioritization"],
    href: "/products/pentestor",
    pill: "Enterprise Security",
    bgFrom: "#07130F",
    bgTo: "#102A20",
  },
  {
    id: "crm",
    num: "02",
    name: "CRM Platform",
    tagline: "Business systems around real workflows.",
    copy: "A flexible CRM and operations platform designed around how teams actually work — not the other way around. Pipeline, contacts, tasks, analytics and automation.",
    tags: ["CRM", "Pipeline", "Automation", "Analytics"],
    href: "/products/crm",
    pill: "Business Operations",
    bgFrom: "#0B1F18",
    bgTo: "#16382B",
  },
  {
    id: "property",
    num: "03",
    name: "Property Platform",
    tagline: "Data-driven property discovery.",
    copy: "Location intelligence, listings, filters and analytics for the modern real estate ecosystem. Built for scale, designed for clarity.",
    tags: ["Location Intelligence", "Data", "Maps", "Analytics"],
    href: "/products",
    pill: "PropTech",
    bgFrom: "#102A20",
    bgTo: "#0B1F18",
  },
];

function PentestorUI() {
  return (
    <div className="space-y-2 p-4 rounded-xl bg-[rgba(31,174,110,0.04)] border border-[rgba(31,174,110,0.1)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-[#1FAE6E] animate-pulse" />
        <span className="text-[10px] font-mono text-[rgba(31,174,110,0.6)] tracking-widest uppercase">Scan Active</span>
      </div>
      {[
        { label: "Attack Surface", val: "247 endpoints", status: "ok" },
        { label: "Critical Findings", val: "3", status: "alert" },
        { label: "AI Risk Score", val: "7.4 / 10", status: "warn" },
        { label: "Remediation", val: "18 / 21", status: "ok" },
      ].map((row) => (
        <div key={row.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(16,42,32,0.4)] border border-[rgba(31,174,110,0.06)]">
          <span className="text-[10px] font-mono text-[rgba(243,250,246,0.4)]">{row.label}</span>
          <span className={`text-[10px] font-mono font-semibold ${
            row.status === "alert" ? "text-red-400" :
            row.status === "warn" ? "text-amber-400" :
            "text-[#1FAE6E]"
          }`}>{row.val}</span>
        </div>
      ))}
    </div>
  );
}

function CrmUI() {
  const stages = [
    { stage: "Qualified", count: 24, pct: 75 },
    { stage: "Proposal", count: 12, pct: 45 },
    { stage: "Negotiation", count: 6, pct: 22 },
    { stage: "Closed Won", count: 3, pct: 12 },
  ];
  return (
    <div className="space-y-2 p-4 rounded-xl bg-[rgba(31,174,110,0.04)] border border-[rgba(31,174,110,0.1)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-[rgba(243,250,246,0.4)] tracking-widest uppercase">Pipeline</span>
        <span className="text-[10px] font-mono text-[#1FAE6E]">Q3 2026</span>
      </div>
      {stages.map((row) => (
        <div key={row.stage} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[rgba(243,250,246,0.4)]">{row.stage}</span>
            <span className="text-[10px] font-mono text-[rgba(243,250,246,0.6)]">{row.count}</span>
          </div>
          <div className="h-1 rounded-full bg-[rgba(31,174,110,0.12)]">
            <div className="h-1 rounded-full bg-[#1FAE6E]" style={{ width: `${row.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PropertyUI() {
  const listings = [
    { area: "Zafaranieh", price: "18,400/m²", score: 94 },
    { area: "Elahieh", price: "21,200/m²", score: 88 },
    { area: "Farmanieh", price: "15,800/m²", score: 82 },
    { area: "Niavaran", price: "13,200/m²", score: 77 },
  ];
  return (
    <div className="space-y-2 p-4 rounded-xl bg-[rgba(31,174,110,0.04)] border border-[rgba(31,174,110,0.1)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-[rgba(243,250,246,0.4)] tracking-widest uppercase">Tehran</span>
        <span className="text-[10px] font-mono text-[#1FAE6E]">1,247 active</span>
      </div>
      {listings.map((row) => (
        <div key={row.area} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(16,42,32,0.4)] border border-[rgba(31,174,110,0.06)]">
          <span className="text-[10px] font-mono text-[rgba(243,250,246,0.5)]">{row.area}</span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-[rgba(243,250,246,0.35)]">₺ {row.price}</span>
            <span className="text-[10px] font-mono font-semibold text-[#1FAE6E]">{row.score}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductUI({ id }: { id: string }) {
  if (id === "pentestor") return <PentestorUI />;
  if (id === "crm") return <CrmUI />;
  return <PropertyUI />;
}

export function ProductsSection() {
  return (
    <section className="py-28 lg:py-36" style={{ background: "#0B1F18" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">

        <div className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-5"
          >
            <div className="w-6 h-px bg-[#1FAE6E]" />
            <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-[#1FAE6E]">
              Products · 02
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="text-[clamp(2rem,4.5vw,3.5rem)] font-medium tracking-tight text-[#F3FAF6] leading-tight max-w-2xl"
          >
            Products born from engineering problems.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="mt-4 text-base text-[rgba(243,250,246,0.5)] max-w-[52ch] leading-relaxed"
          >
            We build tools and systems because we have encountered problems worth solving ourselves.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col rounded-2xl overflow-hidden border border-[rgba(31,174,110,0.1)] hover:border-[rgba(31,174,110,0.25)] transition-all duration-300"
              style={{ background: `linear-gradient(160deg, ${p.bgFrom} 0%, ${p.bgTo} 100%)` }}
            >
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-[10px] font-mono text-[rgba(243,250,246,0.28)] tracking-widest">{p.num}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[rgba(31,174,110,0.2)] text-[rgba(31,174,110,0.6)] tracking-wider">
                    {p.pill}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-[#F3FAF6] mb-1">{p.name}</h3>
                <p className="text-sm text-[rgba(243,250,246,0.5)] mb-3 italic">{p.tagline}</p>
                <p className="text-sm text-[rgba(243,250,246,0.4)] leading-relaxed">{p.copy}</p>
              </div>

              <div className="px-6 py-3 flex-1">
                <ProductUI id={p.id} />
              </div>

              <div className="p-6 pt-4 border-t border-[rgba(31,174,110,0.08)]">
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.tags.map((t) => (
                    <span key={t} className="text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-[rgba(31,174,110,0.06)] border border-[rgba(31,174,110,0.12)] text-[rgba(31,174,110,0.55)]">
                      {t}
                    </span>
                  ))}
                </div>
                <Link
                  to={p.href}
                  className="group inline-flex items-center gap-2 text-sm font-mono text-[#1FAE6E] hover:text-[#35C98A] transition-colors"
                >
                  View product
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <Link
            to="/products"
            className="text-sm font-mono text-[rgba(243,250,246,0.35)] hover:text-[rgba(243,250,246,0.65)] transition-colors"
          >
            See all products →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
