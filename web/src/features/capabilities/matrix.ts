/**
 * F-14 — the capability matrix, built from the registry instead of hand-written copy.
 *
 * Every cell that carries a link is backed by a registry entry with a live `evidenceUrl`;
 * every capability without evidence renders as a disabled, grey cell. That is G1 made visual:
 * the site cannot claim a capability it cannot demonstrate.
 */
import { CAPABILITIES, CAPABILITY_LABELS, liveArtifactsFor, type Capability, type RegistryEntry } from "@/features/registry";

export type MatrixCell = {
  id: string;
  /** Absolute in-app href including the locale prefix. */
  href: string;
  title: string;
  description: string;
  kind: RegistryEntry["kind"];
  version?: string;
};

export type MatrixRow = {
  capability: Capability;
  label: string;
  token: string;
  cells: MatrixCell[];
  live: boolean;
};

export function buildMatrix(lang: "fa" | "en"): MatrixRow[] {
  return CAPABILITIES.map((capability) => {
    const entries = liveArtifactsFor(capability);
    const cells: MatrixCell[] = entries.map((entry) => ({
      id: entry.id,
      href: `${entry.evidenceUrl![lang]}?utm_source=capabilities&utm_medium=matrix&utm_campaign=f14`,
      title: entry.title[lang],
      description: entry.description[lang],
      kind: entry.kind,
      version: entry.version,
    }));
    return {
      capability,
      label: CAPABILITY_LABELS[capability][lang],
      token: CAPABILITY_LABELS[capability].token,
      cells,
      live: cells.length > 0,
    };
  });
}

/** Coverage numbers are computed, never typed: `content:check` asserts every row is live. */
export function capabilityCoverage(): { capability: Capability; artifacts: number }[] {
  return CAPABILITIES.map((capability) => ({ capability, artifacts: liveArtifactsFor(capability).length }));
}

export const MATRIX_COPY = {
  fa: {
    eyebrow: "ماتریس توانمندی",
    title: "هر خانه، یک",
    accent: "شاهد زنده.",
    intro:
      "این ماتریس از رجیستری خود سایت ساخته می‌شود، نه از متن دست‌نویس. هر خانه به artifact زندهٔ همان توان باز می‌شود و خانه‌ای که شاهد ندارد، خاکستری و غیرفعال می‌ماند.",
    legendLive: "زنده — با شاهد قابل کلیک",
    legendEmpty: "بدون شاهد — غیرفعال",
    emptyRow: "برای این توان هنوز artifact زنده‌ای ثبت نشده است.",
    coverage: "پوشش",
    covereageNote: "شمار artifactهای زندهٔ هر توان",
    cta: "همین انضباط را برای سامانهٔ شما هم اعمال می‌کنیم.",
    ctaButton: "شروع گفت‌وگو",
    proof: "هر لینک در حالت production همان صفحه‌ای است که در سایت منتشر شده؛ تست CI وجود شاهد را بررسی می‌کند.",
  },
  en: {
    eyebrow: "CAPABILITY MATRIX",
    title: "Every cell is a",
    accent: "live proof.",
    intro:
      "This matrix is generated from the site's own registry, not written by hand. Each cell opens the live artifact for that capability; a capability without evidence stays grey and disabled.",
    legendLive: "Live — clickable evidence",
    legendEmpty: "No evidence yet — disabled",
    emptyRow: "No live artifact is registered for this capability yet.",
    coverage: "Coverage",
    covereageNote: "Number of live artifacts per capability",
    cta: "We apply the same discipline to your system.",
    ctaButton: "Start a conversation",
    proof: "Every link points at the same page shipped in production; a CI test verifies the evidence exists.",
  },
} as const;

export type MatrixCopy = (typeof MATRIX_COPY)["fa"];
