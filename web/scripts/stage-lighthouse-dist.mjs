/**
 * Stages the directory Lighthouse CI measures: a copy of `dist/` (the exact Static Bridge
 * artifact) plus a stand-in for the two read-only API endpoints the shell calls while it boots.
 *
 * Why this exists
 * ---------------
 * The measured artifact is the static build and this job runs without the backend. A failed
 * `/api/` request is logged by the *browser* — no page script can suppress it — so
 * `errors-in-console` would end up measuring the absence of a server instead of the app.
 *
 * What it answers with
 * --------------------
 * Exactly the payloads the API serves before any content is configured: the `SiteConfig` field
 * defaults from `api/apps/content/models.py` and the health payload shape from
 * `api/apps/core/views.py`. Nothing visitor-visible is invented — every optional field stays empty
 * or null, so the UI renders its documented not-configured states. Any other `/api/` path is
 * absent on purpose: a new API call cannot silently pass the gate.
 *
 * The staging copy only ever exists as `web/dist-measure/` (gitignored) — `dist/` and therefore the
 * deployment artifact never contain a stand-in.
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(webDir, "dist");
const target = path.join(webDir, "dist-measure");

const SITE_CONFIG = {
  brand_en: "Emmett",
  brand_fa: "امت",
  telegram_handle: "",
  building_fa: "",
  building_en: "",
  lab_samples_per_day: null,
  lab_turnaround_hours: null,
  lab_tests_per_sample: null,
};

const HEALTH = { status: "ok", version: "1.0.0", uptime: 0, db: "ok" };

const STUBS = {
  "site-config": SITE_CONFIG,
  health: HEALTH,
};

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });

for (const [route, payload] of Object.entries(STUBS)) {
  const directory = path.join(target, "api", "v1", route);
  await mkdir(directory, { recursive: true });
  // The static server answers a directory request with its `index.html`; the app parses whatever
  // body it gets as JSON (`lib/api-client.ts`), so the file only has to be named that.
  await writeFile(path.join(directory, "index.html"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

console.log(
  `Staged ${path.relative(webDir, target)}: ${Object.keys(STUBS)
    .map((route) => `/api/v1/${route}/`)
    .join(" + ")} answered with pre-launch payloads.`,
);
