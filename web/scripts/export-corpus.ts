/**
 * Exports the *verifiable* site content (page copy, tool copy, FAQ) into the assistant corpus.
 *
 * Why a build step instead of hand-written Python data: the assistant must cite what the site
 * actually says, so the corpus is derived from the very files that render the site. Run with
 * `pnpm corpus:export` (wired into `content:check` in CI, so drift fails the build).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pages } from "../src/app/content";
import { faq } from "../src/content/faq";
import { toolMetas } from "../src/features/toolbox/metas";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.resolve(root, "../api/apps/assistant/data/site_corpus.json");

const pageIds: Record<string, { path: string; title: Record<string, string> }> = {
  services: { path: "/services", title: { fa: "خدمات مهندسی", en: "Engineering services" } },
  products: { path: "/products", title: { fa: "محصولات", en: "Products" } },
  pentestor: { path: "/products/pentestor", title: { fa: "PenTestor", en: "PenTestor" } },
  crm: { path: "/products/crm", title: { fa: "Emmett CRM", en: "Emmett CRM" } },
  projects: { path: "/projects", title: { fa: "پروژه‌ها", en: "Projects" } },
  academy: { path: "/academy", title: { fa: "آکادمی", en: "Academy" } },
  about: { path: "/about", title: { fa: "دربارهٔ ما", en: "About" } },
};

const payload = {
  generated_by: "web/scripts/export-corpus.ts",
  pages: Object.entries(pageIds).map(([id, meta]) => ({
    id,
    path: meta.path,
    title: meta.title,
    copy: pages.fa[id as keyof typeof pages.fa] && pages.en[id as keyof typeof pages.en]
      ? { fa: pages.fa[id as keyof typeof pages.fa], en: pages.en[id as keyof typeof pages.en] }
      : {},
  })),
  tools: toolMetas.map((meta) => ({
    id: meta.id,
    version: meta.version,
    path: { fa: `/tools/${meta.slug.fa}`, en: `/tools/${meta.slug.en}` },
    copy: {
      fa: {
        name: meta.title.fa,
        tagline: meta.subtitle.fa,
        description: meta.description.fa,
        howItWorks: meta.howItWorks.fa,
        notes: meta.limitations?.fa ?? [],
      },
      en: {
        name: meta.title.en,
        tagline: meta.subtitle.en,
        description: meta.description.en,
        howItWorks: meta.howItWorks.en,
        notes: meta.limitations?.en ?? [],
      },
    },
  })),
  faq: faq.map((entry) => ({
    id: entry.id,
    question: entry.question,
    answer: entry.answer,
    url: entry.url,
    tags: entry.tags,
  })),
};

const serialized = `${JSON.stringify(payload, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(target, "utf8").catch(() => "");
  if (current !== serialized) {
    console.error(
      "Assistant corpus is stale: run `pnpm corpus:export` and commit api/apps/assistant/data/site_corpus.json",
    );
    process.exit(1);
  }
  console.log(`corpus is in sync (${payload.pages.length} pages, ${payload.tools.length} tools, ${payload.faq.length} FAQ)`);
} else {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, serialized, "utf8");
  console.log(`corpus exported → ${path.relative(root, target)} (${payload.pages.length} pages, ${payload.tools.length} tools, ${payload.faq.length} FAQ)`);
}
