/**
 * F-04 — Persian text normaliser.
 *
 * Hard guardrails (feature card F-04):
 *  - The intelligent ZWNJ rule is deliberately conservative: a rule that breaks text is
 *    worse than an incomplete rule, so prefix/suffix lists and exception lists are explicit,
 *    versioned in code and covered by tests.
 *  - Every rule is idempotent: normalise(normalise(x)) === normalise(x).
 *  - The diff returns plain-text segments only, so React escapes user input and a
 *    `<script>` payload can never become DOM.
 */
import { toPersianDigits } from "@/lib/jalali";

export type RuleId =
  | "yeh"
  | "kaf"
  | "digits"
  | "latin-digits"
  | "diacritics"
  | "zwnj"
  | "spaces"
  | "quotes"
  | "ra"
  | "kashida";

export const RULES_VERSION = "1404.07-r1";

const ZWNJ = "\u200c";
const PERSIAN_LETTER = "\\u0621-\\u0628\\u062a-\\u063a\\u0641-\\u064a\\u066e-\\u06d3\\u06fa-\\u06ff";
const PERSIAN_WORD_RE = new RegExp(`^[${PERSIAN_LETTER}]+$`);

/** Words that start with «می» but are not verbs — never split these. */
const MI_EXCEPTIONS = [
  "میز", "میزان", "میراث", "میرا", "میر", "میوه", "میهن", "میدان", "میانه", "میان",
  "میلیون", "میلیارد", "میلیمتر", "میکرو", "میکروسکوپ", "میگو", "میخ", "میخانه",
  "میم", "مینا", "میمنت", "میانگین", "میلی", "میدانی", "میرزا", "میهنی",
];
const SUFFIXES: { suffix: string; minStem: number }[] = [
  { suffix: "ترین", minStem: 3 },
  { suffix: "هایی", minStem: 2 },
  { suffix: "های", minStem: 2 },
  { suffix: "ها", minStem: 2 },
  { suffix: "تر", minStem: 3 },
];
/** Words whose tail looks like a suffix but must stay attached. */
const SUFFIX_EXCEPTIONS = ["دختر", "دفتر", "اختر", "بستر", "کبوتر", "دکتر", "مستر", "کشور", "بهتر", "مهتر", "کهتر", "استر", "دفترها", "دخترها", "کشورها"];
/** Words ending in «را» that are not an attached object marker. */
const RA_EXCEPTIONS = ["زهرا", "عذرا", "دارا", "چرا", "برای", "زیرا", "حاشا", "خدا را"];

export type RuleApply = { text: string; count: number; samples: string[] };
type Rule = { id: RuleId; apply: (text: string) => RuleApply };

export function extractSamples(input: string, output: string, limit = 3): string[] {
  if (input === output) return [];
  const samples: string[] = [];
  const length = Math.max(input.length, output.length);
  let index = 0;
  while (index < length && samples.length < limit) {
    if (input[index] !== output[index]) {
      const start = Math.max(0, index - 12);
      const end = Math.min(length, index + 18);
      samples.push(`${visible(input.slice(start, end))} → ${visible(output.slice(start, end))}`);
      index += 12;
    } else {
      index += 1;
    }
  }
  return samples;
}

function visible(value: string): string {
  return value.replace(/\u200c/g, "⌴").replace(/\n/g, "⏎");
}

function countOccurrences(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function replaceAll(input: string, pattern: RegExp, replacer: (match: string, ...groups: string[]) => string): RuleApply {
  let count = 0;
  const text = input.replace(pattern, (match: string, ...args: unknown[]) => {
    const next = replacer(match, ...(args as string[]));
    if (next !== match) count += 1;
    return next;
  });
  return { text, count, samples: extractSamples(input, text) };
}

const rules: Rule[] = [
  {
    id: "yeh",
    apply: (text) => replaceAll(text, /[\u064a\u0649]/g, () => "ی"),
  },
  {
    id: "kaf",
    apply: (text) => replaceAll(text, /\u0643/g, () => "ک"),
  },
  {
    id: "digits",
    apply: (text) => replaceAll(text, /[\u0660-\u0669]/g, (match) => toPersianDigits(String(match.charCodeAt(0) - 0x0660))),
  },
  {
    id: "latin-digits",
    apply: (text) => replaceAll(text, /\d/g, (match) => toPersianDigits(match)),
  },
  {
    id: "diacritics",
    apply: (text) => replaceAll(text, /[\u064b-\u0655\u0670]/g, () => ""),
  },
  {
    id: "kashida",
    apply: (text) => replaceAll(text, /\u0640+/g, () => ""),
  },
  {
    id: "zwnj",
    apply: (text) => {
      const before = text;
      let next = text;
      // 1) می / نمی prefixes before a verb-like word, honoring the exception list.
      for (const prefix of ["می", "نمی"]) {
        const pattern = new RegExp(`(^|[^${PERSIAN_LETTER}])(${prefix})(?![\u200c])([${PERSIAN_LETTER}]{3,})`, "g");
        next = next.replace(pattern, (match: string, lead: string, token: string, rest: string) => {
          const word = rest.match(new RegExp(`^[${PERSIAN_LETTER}]+`))?.[0] ?? "";
          if (!PERSIAN_WORD_RE.test(word)) return match;
          if (MI_EXCEPTIONS.some((exception) => (token + word).startsWith(exception))) return match;
          return `${lead}${token}${ZWNJ}${rest}`;
        });
      }
      // 2) ها / های / هایی / تر / ترین suffixes.
      for (const { suffix, minStem } of SUFFIXES) {
        const pattern = new RegExp(`([${PERSIAN_LETTER}]{${minStem},})(?![\u200c])(${suffix})(?![${PERSIAN_LETTER}])`, "g");
        next = next.replace(pattern, (match: string, stem: string, tail: string) => {
          if (SUFFIX_EXCEPTIONS.includes(stem + tail)) return match;
          if (suffix === "تر" && (stem + tail).length < 4) return match;
          return `${stem}${ZWNJ}${tail}`;
        });
      }
      // 3) Collapse accidental doubles and ZWNJ touching spaces.
      next = next.replace(/\u200c{2,}/g, ZWNJ).replace(/ ?\u200c /g, ZWNJ).replace(/ \u200c/g, ZWNJ);
      const count = Math.abs(countOccurrences(next, /\u200c/g) - countOccurrences(before, /\u200c/g));
      return { text: next, count: count || (next === before ? 0 : 1), samples: extractSamples(before, next) };
    },
  },
  {
    id: "spaces",
    apply: (text) => {
      let next = text
        .replace(/[ \t]+/g, " ")
        .replace(/ ?\n ?/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      next = next.replace(/ ([.,،؛:!؟»%])/g, "$1").replace(/([«(]) /g, "$1");
      next = next.replace(new RegExp(`([.,،؛:!؟])(?=[${PERSIAN_LETTER}])`, "g"), "$1 ");
      next = next.replace(/ ?\u200c ?/g, ZWNJ);
      const count = next === text ? 0 : 1;
      return { text: next, count, samples: extractSamples(text, next) };
    },
  },
  {
    id: "quotes",
    apply: (text) => {
      let expectOpen = true;
      let count = 0;
      let next = text.replace(/["“”„‟]/g, () => {
        const char = expectOpen ? "«" : "»";
        expectOpen = !expectOpen;
        count += 1;
        return char;
      });
      // Right single quote used as a fake ZWNJ between two Persian letters.
      next = next.replace(new RegExp(`([${PERSIAN_LETTER}])[\u2019']([${PERSIAN_LETTER}])`, "g"), (_match, before: string, after: string) => {
        count += 1;
        return `${before}${ZWNJ}${after}`;
      });
      next = next.replace(/[\u2018\u2019']/g, () => {
        count += 1;
        return "";
      });
      return { text: next, count, samples: extractSamples(text, next) };
    },
  },
  {
    id: "ra",
    apply: (text) => {
      const pattern = new RegExp(`([${PERSIAN_LETTER}]{3,})(را)(?=[\\s.,،؛:!؟»)]|$)`, "g");
      return replaceAll(text, pattern, (_match, stem: string) => {
        const word = `${stem}را`;
        if (RA_EXCEPTIONS.includes(word)) return `${stem}را`;
        return `${stem} را`;
      });
    },
  },
];

export const ALL_RULE_IDS = rules.map((rule) => rule.id);
export const DEFAULT_RULES: RuleId[] = ["yeh", "kaf", "digits", "diacritics", "zwnj", "spaces", "quotes", "ra", "kashida"];

export const RULE_LABELS: Record<RuleId, { fa: string; en: string; regex: string }> = {
  yeh: { fa: "ي و ى عربی → ی فارسی", en: "Arabic yeh → Persian yeh", regex: "[\\u064a\\u0649] → ی" },
  kaf: { fa: "ك عربی → ک فارسی", en: "Arabic kaf → Persian kaf", regex: "\\u0643 → ک" },
  digits: { fa: "ارقام عربی → ارقام فارسی", en: "Arabic-Indic digits → Persian digits", regex: "[٠-٩] → [۰-۹]" },
  "latin-digits": { fa: "ارقام لاتین → ارقام فارسی", en: "Latin digits → Persian digits", regex: "\\d → [۰-۹]" },
  diacritics: { fa: "حذف اعراب و تشدید", en: "Remove diacritics", regex: "[\\u064b-\\u0655\\u0670] → \"\"" },
  zwnj: { fa: "نیم‌فاصلهٔ هوشمند (محافظه‌کار)", en: "Smart ZWNJ (conservative)", regex: "می/نمی/ها/تر/ترین + فهرست استثنا" },
  spaces: { fa: "اصلاح فاصله‌های اضافه", en: "Collapse extra spaces", regex: "\\s{2,} → \\s" },
  quotes: { fa: "یکسان‌سازی نقل‌قول", en: "Normalise quotation marks", regex: "\" → «»" },
  ra: { fa: "اصلاح «را»ی چسبیده", en: "Detach attached را", regex: "([حروف]{3,})را → $1 را" },
  kashida: { fa: "حذف کشیده (ـ)", en: "Remove tatweel", regex: "\\u0640+ → \"\"" },
};

export type ChangeReport = { rule: RuleId; count: number; samples: string[] };
export type NormalizeResult = { normalized: string; changes: ChangeReport[]; total: number };

export function normalizePersian(text: string, enabled: RuleId[] = DEFAULT_RULES): NormalizeResult {
  let current = text;
  const changes: ChangeReport[] = [];
  for (const rule of rules) {
    if (!enabled.includes(rule.id)) continue;
    const before = current;
    const { text: after, count, samples } = rule.apply(before);
    current = after;
    if (after !== before && count > 0) changes.push({ rule: rule.id, count, samples });
  }
  return { normalized: current, changes, total: changes.reduce((sum, change) => sum + change.count, 0) };
}

/* ------------------------------------------------------------------ *
 * Diff — plain-text segments only
 * ------------------------------------------------------------------ */

export type DiffSegment = { text: string; changed: boolean };
const DIFF_TOKEN_LIMIT = 6000;

export function buildDiff(before: string, after: string): DiffSegment[] {
  const a = tokenize(before);
  const b = tokenize(after);
  if (a.length > DIFF_TOKEN_LIMIT || b.length > DIFF_TOKEN_LIMIT) return prefixSuffixDiff(before, after);
  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(segments, a[i], false);
      i += 1;
      j += 1;
      continue;
    }
    const resync = findResync(a, b, i, j);
    if (resync.i === i && resync.j === j) {
      push(segments, a[i] ?? "", true);
      push(segments, b[j] ?? "", true);
      i += 1;
      j += 1;
    } else {
      for (let k = i; k < resync.i; k += 1) push(segments, a[k], true);
      for (let k = j; k < resync.j; k += 1) push(segments, b[k], true);
      i = resync.i;
      j = resync.j;
    }
  }
  while (i < a.length) push(segments, a[i++], true);
  while (j < b.length) push(segments, b[j++], true);
  return segments;
}

function findResync(left: string[], right: string[], fromI: number, fromJ: number, lookahead = 24): { i: number; j: number } {
  for (let distance = 1; distance <= lookahead; distance += 1) {
    for (let delta = 0; delta <= distance; delta += 1) {
      const candidateI = fromI + distance - delta;
      const candidateJ = fromJ + delta;
      if (candidateI < left.length && candidateJ < right.length && left[candidateI] === right[candidateJ]) {
        return { i: candidateI, j: candidateJ };
      }
    }
  }
  return { i: fromI, j: fromJ };
}

function push(segments: DiffSegment[], text: string, changed: boolean) {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last && last.changed === changed) last.text += text;
  else segments.push({ text, changed });
}

function tokenize(value: string): string[] {
  return value.match(/\s+|[\u0600-\u06ff\u200c]+|[^\s\u0600-\u06ff]+/g) ?? [];
}

function prefixSuffixDiff(before: string, after: string): DiffSegment[] {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore -= 1;
    endAfter -= 1;
  }
  return [
    { text: before.slice(0, start), changed: false },
    { text: before.slice(start, endBefore), changed: true },
    { text: after.slice(start, endAfter), changed: true },
    { text: after.slice(endAfter), changed: false },
  ].filter((segment) => segment.text);
}

/** The plain text of the whole diff — used by tests to prove nothing is parsed as markup. */
export function diffPlainText(segments: DiffSegment[]): string {
  return segments.map((segment) => segment.text).join("");
}

export type PersianTextState = { text: string; rules: RuleId[] };
export function parsePersianTextState(params: URLSearchParams): PersianTextState {
  const encoded = params.get("t");
  const rules = params.get("r")?.split(",").filter((id): id is RuleId => ALL_RULE_IDS.includes(id as RuleId));
  return { text: encoded ? safeDecode(encoded) : "", rules: rules && rules.length ? rules : DEFAULT_RULES };
}
export function toPersianTextParams(state: PersianTextState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.text) params.set("t", encodeURIComponent(state.text.slice(0, 300)));
  params.set("r", state.rules.join(","));
  return params;
}
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
