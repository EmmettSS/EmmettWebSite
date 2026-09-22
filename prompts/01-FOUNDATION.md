# EMMETT GROUP — PHASE 1 PROMPT: FOUNDATION
### Audit, Monorepo, Tooling, i18n Architecture, Design Tokens, SEO Skeleton

> **Self-contained phase prompt.** Execute in order after `00-MASTER.md` (which you should
> read first for the full program definition). This phase leaves a clean, structured,
> toolable codebase on which Phase 2 (Django backend) and Phase 3 (frontend completion)
> are built. **No backend work and no page redesign happens in this phase** — architecture,
> tooling, and foundations only.

---

## 1. Project context (condensed — authoritative detail is in `prompts/00-MASTER.md`)

Emmett is an independent software-engineering studio (Tehran, Iran-first market, international
ambition) shipping a commercial bilingual website for its services, its two early products
(**PenTestor** — security testing; **Emmett CRM** — relationship intelligence), a Field
Library, an Academy, case studies, team and careers. The current repo is a Vite + React 18 +
TypeScript + Tailwind 4 SPA exported from Figma Make: all main pages exist, i18n is URL-based
(`/en` default today), content is scattered in per-component `copy` objects, there is **no
backend**, SEO is minimal (`noindex` in index.html), and Figma-Make leftovers are present.

**Golden rules for this phase (from the master prompt):**
- **Persian-first:** `fa` becomes the default language; both languages always complete;
  Jalali dates, Toman, Persian digits in fa UI, `Asia/Tehran`, RTL via logical properties.
- **Django is the future core backend** — this phase only creates the monorepo slot for it
  (`api/`) and the ADRs; do not write Django code yet.
- **Hosting target: shared Linux + cPanel** (no Docker/Node at runtime, MariaDB, WSGI, cron).
- **No dependencies on services degraded in Iran** (self-hosted fonts, no GA4, no 3rd-party captcha).
- **The existing React SPA is the base** — restructure and clean, don't rewrite.
- Commercial quality bar, tests, docs, no secrets in repo — from now on, not "later".

**Inputs needed:** B4 (brand names/logo — placeholders OK), B5 (contact block — placeholders
OK). Missing inputs → `[INPUT Bx]` markers + `docs/OPEN-ITEMS.md`, never block.

## 2. Tasks

### 2.1 Audit and cleanup (do this first, record findings in `docs/AUDIT.md`)
1. Full inventory: every file under `src/`, every dependency, every route, every import.
   Identify **unused**: legacy pages (`Home.tsx`, `ComingSoon.tsx`, `ImmersivePage.tsx`,
   `LanguagePortal.tsx` and anything else unreachable), unused `ui/*` components, unused
   heavyweight dependencies (audit: `three`, `@react-three/*`, `recharts`, `@mui/*`,
   `react-slick`, `react-dnd`, `cmdk`, `canvas-confetti`, etc.).
2. Delete confirmed-unused files and dependencies (record each removal + reason in AUDIT.md).
   Keep `three`/`@react-three/*` for now **only if** at least one routed component uses them;
   the final 3D policy is decided in Phase 3 (tokens/motion in this phase must allow both).
3. Figma-Make artifacts: move `src/imports/pasted_text/*` →
   `docs/references/design-history/` (untouched). Decide fate of `default_shadcn_theme.css`
   and `ATTRIBUTIONS.md` (keep attribution content under `docs/` or delete with reason).
4. `index.html`: remove `noindex`; set `lang="fa"`, dir handling, Persian-first `<title>`
   and meta description (working copy, final copy in Phase 4); favicon set; font preloads
   (self-hosted, see 2.5); theme color; **no inline critical-CSS hacks that break hydration**.
5. `.gitignore` (node_modules, dist, .env, coverage, Playwright artifacts, .DS_Store),
   `.editorconfig`, license of the project (private commercial — state clearly).
6. Package manager: standardize on **npm** (existing lockfile) + `packageManager` field;
   `engines` field (Node ≥ 20 LTS at build time — CI only, not host).

### 2.2 Monorepo restructure
1. Move the SPA into `web/` (src, vite.config, index.html, package.json, postcss, tailwind
   config). Update all tooling to match. Root becomes the program root.
2. Create `api/` as an **empty scaffold stub** (`.gitkeep`, README stub "Phase 2",
   `requirements.txt` stub with only the pinned future versions comment, `.env.example` stub)
   — Phase 2 fills it. Do not write Django code.
3. Create `docs/` (tree per master §8, stub files with TOC), `deploy/` (stub README),
   `prompts/` stays.
4. `CHANGELOG.md` (Keep-a-Changelog), `CONTRIBUTING.md` (branching, commit style, review flow).
5. Root `README.md` **rewritten bilingual, Persian section FIRST**: what the site is,
   monorepo map, quickstart (web dev), where docs live. (Final version in Phase 4.)
6. GitHub Actions (`.github/workflows/`):
   - `ci.yml`: on PR + main — jobs: `web` (install, eslint, tsc --noEmit, vitest, content
     parity check, `vite build`), `api` (placeholder job, green until Phase 2 lands pytest),
     `docs` (link check on README/docs).
   - `lighthouse-ci.yml` skeleton: disabled/manual workflow now (activated in Phase 3);
     the script + config must be committed so Phase 3 only flips the switch.
   - `deploy.yml` skeleton: manual (workflow_dispatch) — builds web, packages api + web
     artifacts; deployment step is a **documented stub** (Phase 2 fills cPanel mechanics,
     Phase 4 makes it live). No secrets needed yet.

### 2.3 i18n architecture (the heart of this phase)
1. **Central content module** `web/src/content/`:
   - `web/src/content/types.ts` — typed schemas for every page's copy (home sections,
     services, products incl. PenTestor/CRM, projects, library, academy, about, careers,
     contact, footer, meta). All copy currently living in per-component `copy` objects
     must migrate here — components consume via `useContent<T>()`.
   - `web/src/content/fa/**` — **Persian source of truth**, idiomatic rewrites (not
     translations of the English files). Where current fa copy exists, keep/refine it;
     where it's a literal translation, rewrite it.
   - `web/src/content/en/**` — English mirror, complete parity.
   - `index.ts` — resolver by language.
2. **UI string layer** `web/src/i18n/strings/{fa,en}.ts` for chrome strings (nav, buttons,
   form labels, aria labels, error states, pagination, 404) — same schema, enforced parity.
3. **Parity gate:** `scripts/content-check.ts` + `npm run content:check` — walks fa/en
   structures, fails on missing/empty/mismatched keys, prints a table. Wired into CI.
4. **Router/i18n hardening** (keep URL-based `/fa /en`):
   - **`fa` is now the default:** `/` → `/fa`; unknown `/x` → `/fa/x`; language switcher
     preserves the current route; localStorage preference respected only for the bare `/`.
   - `document.documentElement.lang/dir` set synchronously pre-hydration (inline script in
     index.html reading localStorage+URL) to avoid LTR flash for fa.
   - All in-app links go through the i18n-aware `path()`/`AppLink` — no hardcoded `/en...`.
5. **Localization utilities** `web/src/lib/`:
   - `jalali.ts` — based on `jalaali-js`: format Jalali dates (long/short), relative fa
     strings ("۳ روز پیش"), Gregorian→Jalali conversion, week starts Saturday.
   - `money.ts` — Toman formatting: `formatToman(n, lang)` → `fa` uses Persian digits +
     "تومان" (with smart abbreviation for billions: میلیارد), `en` uses Latin digits;
     budgets/estimates only (no payment).
   - `digits.ts` — fa digit conversion helper (for static numbers in content).
   - Dates/phones/timezone: server-rendered dates arrive as ISO; display layer always
     localizes (Jalali in fa).
6. **Content contract with the backend (prepare for Phase 2):** `web/src/api/schema.d.ts`
   placeholder + `docs/I18N.md` section "API language model" documenting the agreed
   dual-field model (`*_fa`/`*_en`, `slug` ASCII + `slug_fa` optional) and the resolution
   rule (path locale wins; `?lang=` fallback). Phase 2 must implement exactly this.
7. Update every existing routed page to consume the content module (behavior unchanged —
   this is a refactor gate: e2e-free visual check manual or screenshot diff).

### 2.4 Design token foundation (decisions locked, execution in Phase 3)
1. Produce `docs/DESIGN.md` **Part A — Creative Direction** (this is the redesign decision
   the master prompt grants):
   - Write a short creative brief: audience (Iranian CTOs/ops leads + international), the
     "engineered, not flashy" constraint, what differentiates Emmett (studio rigor, real
     products, security pedigree), what is forbidden (AI-cliché visuals, generic SaaS,
     glassmorphism excess, neon hype).
   - **Keep the emerald brand association** as an anchor (current identity), but you are
     free to re-direct: tone (dark-dominant editorial? light/dark section alternation?),
     typography pairing, icon language, photography policy, illustration/diagram style
     (custom technical SVG diagrams — the site's signature), motion vocabulary
     (engineered micro-motion, no gratuitous 3D), and the **3D/canvas policy** (default:
     lightweight SVG/canvas; WebGL only if it serves a named section and fits budgets, with
     no-WebGL fallback). Record every choice + rationale.
   - Part A must be decision-complete so Phase 3 implements without re-deciding.
2. **Token system** `web/src/styles/tokens.css` (+ Tailwind 4 `@theme` mapping):
   color (semantic: bg/surface/text/line per section mode, brand emerald scale, accent
   semantics per division: security = cool cyan-teal, products = emerald, engineering =
   muted blue), type scale (display→metadata + **fa equivalents**: Vazirmatn is smaller-
   x-height — define fa-specific size/line-height multipliers), spacing (4/8pt), radius,
   elevation (soft real shadows, no glow-by-default), motion (fast/base/slow + easings),
   breakpoints (360/480/768/1024/1280/1440). Dark mode first; light-section tokens defined.
3. **Typography:** commit the pairing per DESIGN.md; self-host all faces via `@fontsource`:
   Vazirmatn (fa, weights 300–700), the Latin display/UI face, a mono (technical labels),
   optional editorial serif for en long-form. Verify: woff2 only, `font-display: swap`,
   unicode-range subsets, no Google-Fonts request anywhere (grep gate in CI).
4. Base styles: reset in `tokens.css`, global focus-visible ring, selection color,
   scrollbar styling (restrained), `.rtl-safe` conventions documented (logical properties
   only: `ms-*/me-*/ps-*/pe-*`, `start/end`).

### 2.5 SEO skeleton (Phase 4 finalizes; everything below must exist and be wired)
1. `web/src/lib/seo/` — `useSEO(meta)` hook (title, description, canonical, OG/Twitter,
   hreflang pair, JSON-LD array, `robots`); `JsonLd` component; default Organization +
   WebSite schema.
2. hreflang + canonical builders: `/fa/x` ↔ `/en/x` alternates, `x-default` → fa.
3. `robots.txt` (generated at build, sitemap URL templated via env `VITE_SITE_URL`),
   `sitemap.xml` generator (marketing route list — static for now; Phase 2 merges dynamic
   entries; Phase 4 finalizes/validates).
4. **Prerender pipeline (CI build step):** `web/scripts/prerender.mjs` using
   puppeteer-core against the built dist: renders every marketing route in both languages,
   injects/verifies head + renders full DOM into `dist/<locale>/<path>/index.html`
   (hydration-safe: app detects existing markup). Fallback documented: if headless render
   is impossible in an environment, the same pages must still be listed for the
   Static-Bridge path in Phase 2. Wire into `vite build` poststep (configurable, skip-able
   with `PRERENDER=0`).
5. OG image system: per-route OG template(s) rendered to `web/public/og/` (static now;
   per-post dynamic OG is Phase 2/4 work) + generator script.

### 2.6 Documentation and ADRs (required commits)
1. `docs/ARCHITECTURE.md` — monorepo map, data-flow sketch, ADR index.
2. ADRs (standard template: context/decision/consequences/status):
   - `ADRS/0001-django-core-react-spa.md`
   - `ADRS/0002-i18n-persian-first.md`
   - `ADRS/0003-static-bridge-seo.md`
   - `ADRS/0004-cpanel-hosting-envelope.md`
   (Content: the decisions from master §4, plus any refinements you make here.)
3. `docs/I18N.md` — fa-first rules, content module usage, parity gate, Jalali/Toman/digit
   rules, new-string workflow, API language model (§2.3.6), RTL checklist.
4. `docs/DESIGN.md` Part A (creative direction) — see §2.4.1.
5. `docs/AUDIT.md` — everything found/removed/kept in §2.1 with reasons.
6. `docs/OPEN-ITEMS.md` — seeded with all `[INPUT Bx]` placeholders + anything deferred.
7. `docs/STYLES/` — token reference (or inside DESIGN.md) so Phase 3 has a spec to build from.

## 3. Explicitly NOT in this phase
- No Django code (stub only). No new pages. No visual redesign execution (tokens + brief only).
- No deployment. No analytics. No content writing beyond migrating/rewriting existing copy.

## 4. Exit gates (all must be true; report evidence in the phase report)

- [ ] `npm ci && npm run lint && npx tsc --noEmit && npm test && npm run content:check &&
      npm run build` all green **in CI**.
- [ ] CI workflow runs green on a PR (screenshot of the run / run URL in report).
- [ ] `/` serves Persian RTL with correct `lang/dir` pre-hydration (no LTR flash);
      language switcher preserves routes in both directions.
- [ ] 100% of user-visible strings come from the content module / i18n strings (spot-audit
      script or grep evidence); parity gate fails on an intentionally-removed key (demo).
- [ ] No Google Fonts or other third-party CDN network requests (Lighthouse network /
      grep of built HTML+JS for `fonts.googleapis` → zero).
- [ ] Jalali + Toman utilities have unit tests (edge: leap years, billions formatting,
      Persian digits).
- [ ] Prerender pipeline produces crawlable HTML for home in fa+en (open one, inspect
      `<head>`: title/desc/canonical/hreflang/JSON-LD present).
- [ ] ADR-001…004 + AUDIT + I18N + DESIGN(Part A) + OPEN-ITEMS + bilingual README committed.
- [ ] `dist/` build ≤ size baseline recorded in AUDIT.md (starting point for Phase 3 budgets).
- [ ] Phase report committed (CHANGELOG entry + gates + deviations + open items).

## 5. Handoff to Phase 2
Phase 2 can rely on: monorepo layout with `api/` slot; CI with an `api` job ready to run
pytest; `docs/I18N.md` API language model (dual fields + slug rules + locale resolution);
`VITE_SITE_URL` env convention; `deploy/` stub; ADR-001/003/004 decisions.
