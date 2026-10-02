import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { routeFor, toolIdFromSlug, toolMeta, toolMetas } from "../src/features/toolbox/metas";

const dist = path.resolve("dist");
const expected = [
  "fa/index.html",
  "en/index.html",
  "fa/services/index.html",
  "en/services/index.html",
  "fa/contact/index.html",
  "en/contact/index.html",
  "fa/tools/index.html",
  "en/tools/index.html",
  "fa/assistant/index.html",
  "en/assistant/index.html",
  "fa/capabilities/index.html",
  "en/capabilities/index.html",
  "fa/lab/performance/index.html",
  "en/lab/performance/index.html",
  "fa/architect/index.html",
  "en/architect/index.html",
  "fa/privacy/index.html",
  "en/privacy/index.html",
  "fa/terms/index.html",
  "en/terms/index.html",
  "fa/security/index.html",
  "en/security/index.html",
  ...toolMetas.flatMap((meta) => [`fa/${routeFor(meta, "fa")}/index.html`, `en/${routeFor(meta, "en")}/index.html`]),
];
for (const file of expected) {
  const html = await readFile(path.join(dist, file), "utf8");
  for (const token of ['<title>', 'name="description"', 'rel="canonical"', 'hreflang="fa"', 'hreflang="en"', 'hreflang="x-default"', 'application/ld+json', "<main>"]) {
    if (!html.includes(token)) throw new Error(`${file} is missing ${token}`);
  }
}

// Every tool page must carry SoftwareApplication structured data, and the tools index an ItemList.
for (const meta of toolMetas) {
  const html = await readFile(path.join(dist, `fa/${routeFor(meta, "fa")}/index.html`), "utf8");
  if (!html.includes('"@type":"SoftwareApplication"')) throw new Error(`fa/${routeFor(meta, "fa")} is missing SoftwareApplication JSON-LD`);
}
const toolsIndex = await readFile(path.join(dist, "fa/tools/index.html"), "utf8");
if (!toolsIndex.includes('"@type":"ItemList"')) throw new Error("tools index is missing ItemList JSON-LD");

// Structured-data contract per route class (Phase 5 §4): the entities Google expects, and the
// breadcrumbs that make the nested pages legible in results.
const schemaContract: [string, string[]][] = [
  ["fa/index.html", ["Organization", "WebSite"]],
  ["en/index.html", ["Organization", "WebSite"]],
  ["fa/tools/index.html", ["ItemList"]],
  ["fa/capabilities/index.html", ["ItemList"]],
  ["fa/lab/performance/index.html", ["WebPage", "BreadcrumbList"]],
  ["fa/architect/index.html", ["WebPage", "BreadcrumbList"]],
  ["fa/privacy/index.html", ["WebPage", "BreadcrumbList"]],
  ["en/security/index.html", ["WebPage", "BreadcrumbList"]],
];
for (const [file, types] of schemaContract) {
  const html = await readFile(path.join(dist, file), "utf8");
  for (const type of types) {
    if (!html.includes(`"@type":"${type}"`)) throw new Error(`${file} is missing ${type} JSON-LD`);
  }
}
for (const meta of toolMetas) {
  const html = await readFile(path.join(dist, `en/${routeFor(meta, "en")}/index.html`), "utf8");
  for (const type of ["SoftwareApplication", "BreadcrumbList"]) {
    if (!html.includes(`"@type":"${type}"`)) {
      throw new Error(`en/${routeFor(meta, "en")} is missing ${type} JSON-LD`);
    }
  }
}
// hreflang must stay reciprocal and x-default must point at the Persian canonical (fa-first).
for (const file of ["fa/tools/index.html", "en/tools/index.html"]) {
  const html = await readFile(path.join(dist, file), "utf8");
  const fa = html.match(/hreflang="fa" href="([^"]+)"/)?.[1];
  const en = html.match(/hreflang="en" href="([^"]+)"/)?.[1];
  const fallback = html.match(/hreflang="x-default" href="([^"]+)"/)?.[1];
  if (!fa?.endsWith("/fa/tools/") || !en?.endsWith("/en/tools/") || fallback !== fa) {
    throw new Error(`${file} has broken hreflang reciprocity (fa=${fa}, en=${en}, x-default=${fallback})`);
  }
}

// Each tool page must show a real computed example in the crawlable HTML (not a placeholder).
// The two API-backed surfaces (scanner, assistant) cannot be computed at build time, so for them
// the guard pins the *live-surface* claim they make instead: the passive envelope and the
// honest "not found" contract — the two things a fake page would never state.
const computedExamples: [string, string][] = [
  ["tarikh-shamsi", "2025/03/20"],
  ["kod-meli", "۲۷۱۵۸۳۰۴۹۱"],
  ["toman", "۱٬۲۵۰٬۰۰۰"],
  ["matn-farsi", "می شود این کتاب را دید"],
  ["jwt", "CWE-347"],
  ["check-security", "هیچ پورت‌اسکن یا تلاش نفوذی انجام نمی‌شود"],
  ["assistant", "پیدا نکردم"],
  ["biolab", "M F V F L V L L P L V S S Q C V N L T T"],
];
for (const [slug, needle] of computedExamples) {
  // Feature cards may override the canonical route (F-09 → /biolab/), so the check follows
  // `routeFor` instead of assuming `/tools/<slug>/`.
  const meta = toolMeta(toolIdFromSlug(slug) ?? slug);
  if (!meta) throw new Error(`no tool meta resolves for computed-example slug “${slug}”`);
  const file = `fa/${routeFor(meta, "fa")}/index.html`;
  const html = await readFile(path.join(dist, file), "utf8");
  if (!html.includes(needle)) throw new Error(`${file} does not contain its computed example (${needle})`);
}
{
  const assistant = await readFile(path.join(dist, "fa/assistant/index.html"), "utf8");
  if (!assistant.includes("پیدا نکردم")) throw new Error("fa/assistant is missing the honest not-found contract");
}

const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
const expectedUrls = expected.filter((file) => file.endsWith("index.html")).length;
if ((sitemap.match(/<url>/g) ?? []).length !== expectedUrls) throw new Error(`Expected ${expectedUrls} sitemap URLs, found ${(sitemap.match(/<url>/g) ?? []).length}`);
if ((sitemap.match(/<loc>https:\/\//g) ?? []).length !== expectedUrls) throw new Error("Sitemap locations must be absolute HTTPS URLs");
console.log(`Static Bridge SEO checks passed: ${expectedUrls} HTML pages + sitemap.`);

// Phase 5 §4: every crawlable route must also carry a real Open Graph card — the image file
// must exist on disk and the tags must point at it (a route shipping the home card is a bug).
for (const file of expected) {
  const html = await readFile(path.join(dist, file), "utf8");
  const lang = file.startsWith("fa/") ? "fa" : "en";
  const image = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1] ?? "";
  if (!image) throw new Error(`${file} is missing og:image`);
  if (!image.endsWith(`-${lang}.png`)) throw new Error(`${file} points at the ${image} card for lang=${lang}`);
  const asset = image.startsWith("http") ? image.replace(/^https?:\/\/[^/]+/, "") : image;
  await access(path.join(dist, asset.replace(/^\//, "")));
  for (const required of ['property="og:title"', 'property="og:description"', 'property="og:url"', 'property="og:locale"', 'name="twitter:card"', 'name="twitter:image"']) {
    if (!html.includes(required)) throw new Error(`${file} is missing ${required}`);
  }
  if (!html.includes(`property="og:url" content="${canonical}"`)) {
    throw new Error(`${file}: og:url must equal the canonical URL`);
  }
}

// Hardening: security.txt must exist and carry the fields RFC 9116 requires.
{
  const securityTxt = await readFile(path.join(dist, ".well-known", "security.txt"), "utf8");
  for (const field of ["Contact:", "Expires:", "Canonical:", "Policy:"]) {
    if (!securityTxt.includes(field)) throw new Error(`security.txt is missing ${field}`);
  }
}
