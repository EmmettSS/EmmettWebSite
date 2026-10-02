import { pages, ui } from "../src/app/content";
import { siteCopy } from "../src/content/site";
import { toolsCopy } from "../src/content/tools";
import { toolMetas } from "../src/features/toolbox/metas";
function compare(path: string, left: unknown, right: unknown, errors: string[] = []): string[] {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) errors.push(`${path}: array shape mismatch`);
    else left.forEach((value, index) => compare(`${path}[${index}]`, value, right[index], errors));
  } else if (left && right && typeof left === "object" && typeof right === "object") {
    const faKeys = Object.keys(left), enKeys = Object.keys(right);
    for (const key of faKeys) if (!(key in right)) errors.push(`${path}.${key}: missing from en`);
    for (const key of enKeys) if (!(key in left)) errors.push(`${path}.${key}: missing from fa`);
    for (const key of faKeys) if (key in right) compare(`${path}.${key}`, (left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], errors);
  }
  return errors;
}
const surfaces = [
  ["siteCopy", siteCopy.fa, siteCopy.en],
  ["pages", pages.fa, pages.en],
  ["ui", ui.fa, ui.en],
  ["toolsCopy", toolsCopy.fa, toolsCopy.en],
] as const;
const errors = surfaces.flatMap(([name, fa, en]) => compare(name, fa, en));

// Tool metadata must be fully bilingual too (F-01..F-05, exit gate "content:check").
for (const meta of toolMetas) {
  const projection = {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    evidence: meta.evidence,
    howItWorks: meta.howItWorks,
    howToSteps: meta.howToSteps ?? {},
    disclaimers: meta.disclaimers ?? {},
    limitations: meta.limitations ?? {},
  };
  const localized = projection as unknown as Record<string, unknown>;
  const pairs: [string, unknown, unknown][] = [
    ["title", meta.title.fa, meta.title.en],
    ["description", meta.description.fa, meta.description.en],
    ["keywords", meta.keywords.fa, meta.keywords.en],
    ["evidence", meta.evidence.fa, meta.evidence.en],
    ["howItWorks", meta.howItWorks.fa, meta.howItWorks.en],
  ];
  if (meta.howToSteps) pairs.push(["howToSteps", meta.howToSteps.fa, meta.howToSteps.en]);
  if (meta.disclaimers) pairs.push(["disclaimers", meta.disclaimers.fa, meta.disclaimers.en]);
  if (meta.limitations) pairs.push(["limitations", meta.limitations.fa, meta.limitations.en]);
  for (const [field, fa, en] of pairs) {
    compare(`toolMetas.${meta.id}.${field}`, fa, en, errors);
  }
  void localized;
}
if (process.argv.includes("--self-test")) {
  const mutated = structuredClone(siteCopy.fa) as Record<string, unknown>;
  delete mutated.notFound;
  if (compare("mutation", mutated, siteCopy.en).length === 0) throw new Error("Parity self-test failed to detect an intentionally removed translation key");
  console.log("Parity self-test: intentionally missing translation correctly detected.");
}
if (errors.length) {
  console.error(`Bilingual content mismatch (${errors.length}):\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else console.log("Bilingual content parity passed for all siteCopy, page content and UI keys.");
