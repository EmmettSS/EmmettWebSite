import type { Capability } from "@/features/registry";

export type Localized<T> = { fa: T; en: T };

export type ToolMeta = {
  id: string;
  slug: Localized<string>;
  title: Localized<string>;
  subtitle: Localized<string>;
  description: Localized<string>;
  capability: Capability;
  version: string;
  updatedFa: string;
  keywords: Localized<string[]>;
  /** What this tool proves (G1) — shown in the header and used by the capability matrix. */
  evidence: Localized<string>;
  howItWorks: Localized<string[]>;
  howToSteps?: Localized<{ name: string; text: string }[]>;
  codeSamples: { label: string; language: string; code: string }[];
  disclaimers?: Localized<string[]>;
  limitations?: Localized<string[]>;
  /** Tools that stay fully functional when the API is unreachable (all Phase-2 tools). */
  offlineCapable: boolean;
  /** Result pages must be noindex (card §۷). */
  noindexResults?: boolean;
};

export type SharePayload = {
  summaryFa: string;
  summaryEn: string;
  params: Record<string, string>;
};
