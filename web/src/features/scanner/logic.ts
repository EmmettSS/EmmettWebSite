/** Client helpers for F-06 — pure functions, unit-tested, shared with the terminal command. */

export type ScanStep = {
  step: string;
  label_fa: string;
  label_en: string;
  state: "running" | "done" | "failed";
  note_fa?: string;
  note_en?: string;
  embedded?: number;
};

export type ScanFinding = {
  key: string;
  label_fa: string;
  label_en: string;
  status: "pass" | "warn" | "fail" | "info";
  detail_fa: string;
  detail_en: string;
  advice_fa: string;
  advice_en: string;
  snippet: string;
};

export type ScanSection = {
  id: string;
  label_fa: string;
  label_en: string;
  checked: boolean;
  score: number;
  reason_fa: string;
  reason_en: string;
  findings: ScanFinding[];
};

export type ScanResult = {
  result_id: string;
  domain: string;
  grade: string;
  score: number;
  created_at: string;
  expires_at: string;
  ttl_days: number;
  noindex: boolean;
  sections: ScanSection[];
  internal: boolean;
};

export const STEP_ORDER = ["dns", "tls", "headers", "cookies", "content", "leak"] as const;

/** Accepts what people actually paste (URLs, trailing dots, uppercase) and normalizes it. */
export function normalizeDomainInput(value: string): string {
  let domain = (value ?? "").trim().toLowerCase();
  domain = domain.replace(/^[a-z]+:\/\//, "");
  domain = domain.split("/")[0] ?? "";
  domain = domain.split("@").pop() ?? "";
  domain = domain.split(":")[0] ?? "";
  domain = domain.replace(/\.+$/, "");
  if (domain.startsWith("www.")) domain = domain.slice(4);
  return domain;
}

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/** Mirrors the server rule closely enough to fail fast, but the server remains the authority. */
export function isValidDomain(value: string): boolean {
  const domain = normalizeDomainInput(value);
  if (!domain || domain.length > 253) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return false; // IPs are refused (private-range policy)
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  return labels.every((label) => LABEL.test(label) && !label.startsWith("-") && !label.endsWith("-"));
}

/** Polling keeps an offset; merging must never duplicate a step already shown. */
export function mergeSteps(previous: ScanStep[], incoming: ScanStep[]): ScanStep[] {
  const seen = new Set(previous.map((step) => `${step.step}:${step.state}`));
  const merged = [...previous];
  for (const step of incoming) {
    const key = `${step.step}:${step.state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(step);
  }
  return merged;
}

export function gradeTone(grade: string): "good" | "mid" | "bad" {
  if (grade === "A" || grade === "B") return "good";
  if (grade === "C" || grade === "D") return "mid";
  return "bad";
}

export function sectionSummary(section: ScanSection): { pass: number; warn: number; fail: number } {
  const summary = { pass: 0, warn: 0, fail: 0 };
  for (const finding of section.findings ?? []) {
    if (finding.status === "pass") summary.pass += 1;
    else if (finding.status === "fail") summary.fail += 1;
  }
  return summary;
}

export function overallSummary(sections: ScanSection[]): { pass: number; warn: number; fail: number } {
  return sections.reduce(
    (total, section) => {
      const part = sectionSummary(section);
      return { pass: total.pass + part.pass, warn: total.warn + part.warn, fail: total.fail + part.fail };
    },
    { pass: 0, warn: 0, fail: 0 },
  );
}

/** Findings worth showing as recommendations: everything that is not a pass. */
export function recommendations(sections: ScanSection[], limit = 8): ScanFinding[] {
  return sections
    .flatMap((section) => section.findings ?? [])
    .filter((finding) => finding.status === "fail" || finding.status === "warn")
    .slice(0, limit);
}

export function stepLabel(step: ScanStep, lang: "fa" | "en"): string {
  return lang === "fa" ? step.label_fa : step.label_en;
}

export function stepNote(step: ScanStep, lang: "fa" | "en"): string {
  return (lang === "fa" ? step.note_fa : step.note_en) ?? "";
}

export function statusLabel(status: ScanFinding["status"], lang: "fa" | "en"): string {
  const labels = {
    pass: { fa: "درست", en: "Pass" },
    warn: { fa: "هشدار", en: "Warning" },
    fail: { fa: "ایراد", en: "Fail" },
    info: { fa: "اطلاع", en: "Info" },
  } as const;
  return labels[status][lang];
}

/** The report link carries `id`, so ToolRoute renders it noindex automatically. */
export function reportPath(lang: "fa" | "en", resultId: string): string {
  return `/${lang}/tools/check-security?id=${encodeURIComponent(resultId)}`;
}
