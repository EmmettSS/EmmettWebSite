/**
 * G1 contract (Show, Don't Tell): every live `tool` registry entry must prove itself with
 * an `evidenceUrl` that maps to a real tool page, and that page must actually contain
 * `SoftwareApplication` structured data.
 *
 * Static mode (default, CI): validates the registry ↔ meta ↔ route-slug contract.
 * Live mode (`--live` + PUBLIC_SITE_URL): additionally fetches each evidence URL and
 * requires HTTP 200 + SoftwareApplication JSON-LD in the returned HTML.
 */
import { toolEntries } from "../src/features/registry";
import { toolIdFromSlug, toolMeta } from "../src/features/toolbox/metas";
import { COMMANDS } from "../src/features/shell/terminal/commands";

const errors: string[] = [];
const live = process.argv.includes("--live");
const base = process.env.PUBLIC_SITE_URL;

for (const entry of toolEntries) {
  const label = entry.id;
  if (entry.status !== "live") continue;
  if (!entry.evidenceUrl?.fa || !entry.evidenceUrl?.en) {
    errors.push(`${label}: live tool is missing an evidenceUrl for fa/en (G1)`);
    continue;
  }
  if (!entry.version) errors.push(`${label}: missing version`);
  if (entry.command && !(entry.command.name in COMMANDS)) {
    errors.push(`${label}: registry advertises command “${entry.command.name}” but the terminal allow-list does not implement it`);
  }

  for (const lang of ["fa", "en"] as const) {
    const slug = entry.path?.[lang]?.split("/").filter(Boolean).pop();
    if (!slug) {
      errors.push(`${label}: missing ${lang} path`);
      continue;
    }
    const id = toolIdFromSlug(slug);
    const meta = id ? toolMeta(id) : undefined;
    if (!meta) {
      errors.push(`${label}: no tool meta resolves for ${lang} slug “${slug}”`);
      continue;
    }
    if (meta.slug[lang] !== slug) {
      errors.push(`${label}: registry ${lang} slug “${slug}” ≠ meta slug “${meta.slug[lang]}”`);
    }
    if (entry.evidenceUrl[lang] !== `/${lang}/tools/${slug}/`) {
      errors.push(`${label}: evidenceUrl.${lang} “${entry.evidenceUrl[lang]}” must equal “/${lang}/tools/${slug}/”`);
    }
  }
}

if (live) {
  if (!base) {
    errors.push("--live requires PUBLIC_SITE_URL (the deployed origin) so evidence can be fetched");
  } else {
    for (const entry of toolEntries) {
      if (entry.status !== "live" || !entry.evidenceUrl) continue;
      for (const lang of ["fa", "en"] as const) {
        const url = new URL(entry.evidenceUrl[lang], base).toString();
        try {
          const response = await fetch(url, { redirect: "follow" });
          if (response.status !== 200) {
            errors.push(`${entry.id}: evidence ${url} returned HTTP ${response.status}`);
            continue;
          }
          const html = await response.text();
          if (!html.includes("SoftwareApplication")) errors.push(`${entry.id}: evidence ${url} has no SoftwareApplication JSON-LD`);
        } catch (error) {
          errors.push(`${entry.id}: evidence ${url} unreachable (${error instanceof Error ? error.message : String(error)})`);
        }
      }
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error(`✖ ${error}`);
  console.error(`\nTool contract failed with ${errors.length} problem(s).`);
  process.exit(1);
}
console.log(`Tool contract OK: ${toolEntries.filter((entry) => entry.status === "live").length} live tools carry resolvable evidence${live ? " (live URLs verified)" : ""}.`);
