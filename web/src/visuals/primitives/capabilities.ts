/**
 * The five capabilities, each bound to a *live* artifact (G1 — show, don't tell).
 *
 * `HeroSystem` draws these nodes and every node links to its evidence URL. The binding is
 * verified by `visuals.test.ts`, which fails if a node points at a registry entry that is not
 * live or carries no evidence URL — so the scene can never become decorative.
 */
import { CAPABILITY_LABELS, toolEntries, type Capability, type RegistryEntry } from "@/features/registry";

export type CapabilityNode = {
  capability: Capability;
  /** Registry ids that prove this capability (phase-4 evidence table, §6). */
  artifactIds: string[];
  edgeNote: { fa: string; en: string };
};

export const CAPABILITY_NODES: CapabilityNode[] = [
  {
    capability: "frontend",
    artifactIds: ["tool.toman", "tool.matn-farsi", "tool.jalali"],
    edgeNote: { fa: "همان چیزی که کاربر می‌بیند؛ محاسبه در مرورگر", en: "What the visitor sees; computation in the browser" },
  },
  {
    capability: "backend",
    artifactIds: ["tool.jalali", "tool.check-security"],
    edgeNote: { fa: "سرویس و صف واقعی پشت هر ابزار", en: "The service and queue behind each tool" },
  },
  {
    capability: "security",
    artifactIds: ["tool.check-security", "tool.kod-meli"],
    edgeNote: { fa: "پوشش passive و اعتبارسنجی بدون استعلام", en: "Passive-only scanning and offline validation" },
  },
  {
    capability: "ai",
    artifactIds: ["tool.assistant"],
    edgeNote: { fa: "دستیار روی محتوای واقعی، با ارجاع", en: "Assistant over our own content, with citations" },
  },
  {
    capability: "biotech",
    artifactIds: ["tool.biolab"],
    edgeNote: { fa: "میز کار بیوانفورماتیک در مرورگر", en: "Bioinformatics workbench in the browser" },
  },
];

/** How the capabilities combine — the edges are claims, so each one carries its reason. */
export type CapabilityEdge = {
  from: Capability;
  to: Capability;
  label: { fa: string; en: string };
};

export const CAPABILITY_EDGES: CapabilityEdge[] = [
  { from: "frontend", to: "backend", label: { fa: "ابزار زنده روی سرویس واقعی", en: "Live tool on a real service" } },
  { from: "backend", to: "security", label: { fa: "صف اسکن passive", en: "Passive scan queue" } },
  { from: "backend", to: "ai", label: { fa: "دستیار روی محتوای سایت", en: "Assistant over site content" } },
  { from: "security", to: "ai", label: { fa: "نگهبان‌های مسیر مدل", en: "Model-path guardrails" } },
  { from: "frontend", to: "ai", label: { fa: "ویجت دستیار در رابط", en: "Assistant widget in the UI" } },
  { from: "frontend", to: "biotech", label: { fa: "محاسبات سنگین در Web Worker", en: "Heavy compute in a Web Worker" } },
];

export function entryForCapability(node: CapabilityNode): RegistryEntry | undefined {
  return node.artifactIds
    .map((id) => toolEntries.find((entry) => entry.id === id))
    .find((entry) => entry !== undefined);
}

export function evidencePathFor(node: CapabilityNode, lang: "fa" | "en"): string | undefined {
  const entry = entryForCapability(node);
  return entry?.evidenceUrl?.[lang];
}

export function labelFor(capability: Capability, lang: "fa" | "en"): string {
  return CAPABILITY_LABELS[capability][lang];
}

/** Concrete colours for canvas drawing, read from the CSS tokens so there is one source of truth. */
export const CAPABILITY_FALLBACK_COLORS: Record<Capability, string> = {
  frontend: "#25c779",
  backend: "#8296aa",
  security: "#20b8a8",
  ai: "#9a83d7",
  biotech: "#74b86b",
};

export function capabilityColor(capability: Capability): string {
  if (typeof window === "undefined" || typeof getComputedStyle !== "function") {
    return CAPABILITY_FALLBACK_COLORS[capability];
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--color-capability-${capability}`).trim();
  return value || CAPABILITY_FALLBACK_COLORS[capability];
}
