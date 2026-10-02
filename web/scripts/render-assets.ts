/**
 * Asset renderer (§3.1 rule 2 + Phase-5 SEO).
 *
 * Runs in CI after `vite build` (fonts + resvg are devDependencies, so this never touches the
 * runtime bundle):
 *  · re-renders every `src/visuals/fallbacks/*.svg` to PNG (so every scene ships a pre-rendered
 *    fallback image as well as the static React fallback);
 *  · renders one Open Graph card per public route with Persian typography (Vazirmatn), which
 *    `render-public-html.ts` then links as `og:image`.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { ogCardCount, ogCards } from "./og-routes";

const root = path.resolve(import.meta.dirname, "..");
const fallbacksDir = path.join(root, "src", "visuals", "fallbacks");
const publicDir = path.join(root, "public");
const fontsDir = path.join(root, "node_modules", "vazirmatn", "fonts", "ttf");

const FONT_FILES = ["Vazirmatn-Regular.ttf", "Vazirmatn-SemiBold.ttf", "Vazirmatn-Bold.ttf"].map((file) => path.join(fontsDir, file));

function render(svg: string, width: number): Buffer {
  const resvg = new Resvg(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Vazirmatn" },
    fitTo: { mode: "width", value: width },
  });
  return resvg.render().asPng();
}

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A 1200×630 OG card: brand, route title in the right language, and the honest subtitle. */
function ogCard({ title, subtitle, rtl }: { title: string; subtitle: string; rtl: boolean }): string {
  const direction = rtl ? "rtl" : "ltr";
  const anchor = rtl ? "1230" : "30";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#06140e"/>
      <stop offset="100%" stop-color="#0b2a1d"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="${rtl ? 1080 : 120}" cy="96" r="180" fill="#25c779" opacity="0.10"/>
  <circle cx="${rtl ? 120 : 1080}" cy="560" r="220" fill="#20b8a8" opacity="0.08"/>
  <text x="${anchor}" y="120" direction="${direction}" font-family="Vazirmatn" font-size="34" fill="#3fd0a0" text-anchor="${rtl ? "end" : "start"}">${escape(subtitle)}</text>
  <text x="${anchor}" y="330" direction="${direction}" font-family="Vazirmatn" font-size="68" font-weight="700" fill="#ffffff" text-anchor="${rtl ? "end" : "start"}">${escape(title)}</text>
  <text x="${anchor}" y="430" direction="${direction}" font-family="Vazirmatn" font-size="30" fill="#9fb8ac" text-anchor="${rtl ? "end" : "start"}">Emmett · emmett.ir</text>
</svg>`;
}

await mkdir(path.join(publicDir, "og"), { recursive: true });
await mkdir(path.join(publicDir, "visuals"), { recursive: true });

for (const name of ["hero-system", "signal-flow", "data-lattice"]) {
  const svg = await readFile(path.join(fallbacksDir, `${name}.svg`), "utf8");
  await writeFile(path.join(publicDir, "visuals", `${name}.png`), render(svg, 1200));
}

let cards = 0;
for (const route of ogCards) {
  for (const lang of ["fa", "en"] as const) {
    const svg = ogCard({ title: route.title[lang], subtitle: route.subtitle[lang], rtl: lang === "fa" });
    await writeFile(path.join(publicDir, "og", `${route.file}-${lang}.png`), render(svg, 1200));
    cards += 1;
  }
}

if (cards !== ogCardCount) throw new Error(`Rendered ${cards} OG cards but the shared table declares ${ogCardCount}`);
console.log(`Assets rendered: 3 scene fallbacks (PNG) + ${cards} OG cards (Vazirmatn, fa/en).`);
