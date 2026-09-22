# EMMETT GROUP — PHASE 3 PROMPT: FRONTEND COMPLETION
### Design System Execution, All Pages (fa/en), API Wiring, SEO Layer, A11y, Performance

> **Self-contained phase prompt.** Assume Phases 1–2 have landed (monorepo, content module +
> parity gate, tokens + DESIGN.md Part A, ADRs, running Django API with generated TS types,
> demo seed, Static Bridge). Read `prompts/00-MASTER.md` first for the authoritative program
> definition; verify Phases 1–2 exit gates — if any are red, fix before starting here.

---

## 1. Mission

Complete the **entire frontend** of the Emmett commercial website in `web/`:
- Execute the creative direction (DESIGN.md Part A) into a real design system and
  component language — a confident, engineered, editorial identity anchored on emerald.
- Build/finish **every page in both languages** (Persian-first), wired to the real API
  (contact, waitlists, newsletter, jobs, blog, case studies, team, testimonials, config).
- Deliver the **SEO layer** (per-route head, hreflang, JSON-LD, prerender, Static-Bridge
  paths), **WCAG 2.1 AA accessibility**, **performance within budget**, and full
  localization depth (Jalali, Toman, Persian digits, true RTL).
- Prove it: e2e (fa+en), unit, content parity, Lighthouse CI — all in CI.

## 2. Locked context (condensed)

- Vite + React 18 + TS strict + Tailwind 4 + react-router + motion/react; existing
  components are the base — restyle/restructure, don't rewrite un-justified parts (ADRs
  if you deviate). Fonts self-hosted. No third-party runtime dependencies from outside the
  origin (Iran rule). API: `/api/v1/fa|en/...` (types in `web/src/api/generated.d.ts`).
  Dev proxy: Vite dev server proxies `/api` → Django (document; never `localhost` in code —
  relative URLs only).
- Persian-first: `/` → `/fa`; Jalali display dates; Toman; Persian digits in fa; RTL via
  logical properties; fa copy idiomatic (the content module is fa-first — keep it that way).
- 3D/canvas policy from DESIGN.md Part A: default is lightweight SVG/canvas; WebGL only per
  the recorded policy, always with a non-WebGL fallback and a `prefers-reduced-motion` kill
  switch.

## 3. Tasks

### 3.1 Design system execution (implement DESIGN.md Part A — no new decisions)
1. Tokens are already in `web/src/styles/tokens.css` — extend as needed **only** with
   documented additions (update DESIGN.md token tables in the same commit).
2. Component layer: keep Radix primitives, restyle everything to the new direction
   (buttons, cards, inputs, selects, tabs, dialogs, tooltips, sonner toasts). Remove unused
   ui/* files from Phase 1's leftovers if still present. Build the signature components:
   - `SectionHeading` (eyebrow + title + accent pattern, fa/en), `GlowCard` restyled per
     tokens (soft real elevation, no default glow), `TechDiagram` (custom SVG technical
     diagrams — the site's visual signature; see creative ideas §3.4), `TerminalCard`
     (restrained, used for code/architecture snippets), `Metric` (count-up on view,
     respects reduced-motion), `CTABand`, `Breadcrumbs` (SEO + UX), `LeadGate` (email
     capture modal for whitepapers), `WaitlistCard` (per product, with referral reveal).
3. Motion vocabulary (document in DESIGN.md Part B): one reveal pattern (staggered
   fade/shift), hover elevation, magnetic buttons (subtle), scroll-linked progress (exists),
   number count-ups, diagram "draw-on" (SVG stroke animation on view). All: 150–400 ms,
   token easings, fully disabled under `prefers-reduced-motion`, never layout-shifting
   (CLS-safe: no animating height/width of containers).
4. Iconography: single language (lucide, current weight) — audit and normalize; division
   accent colors used **semantically** (security sections get the cool accent, etc.).
5. Photography/imagery policy execution: product shots = real or high-fidelity mock UI
   frames (build PenTestor console + Emmett CRM dashboard as **in-app SVG/HTML mockups** —
   not stock photos); team photos placeholder-slot until B6 (graceful avatar fallback with
   initials + terminal-card style); case studies get custom cover compositions (diagram-led,
   not stock). Record the mockup components (they are reusable assets).
6. `docs/DESIGN.md` Part B — Implementation: component inventory (table: component |
   variants | usage | fa/en notes), motion spec, typography spec (fa metrics!), image
   specs, do/don't screenshots (capture 3–5 annotated screenshots into docs/assets).

### 3.2 Page build/finish (all routes × fa × en; fa is the quality bar — write/verify fa first)
Every page: consistent header pattern (eyebrow/title/accent/intro), breadcrumbs where
deep, section rhythm (dark ↔ light alternation per tokens), CTA at the end, footer,
scroll-top on route change (exists), loading skeletons for API-driven sections,
empty/error states for API sections (localized, human, never raw JSON).

- **Home** (`/`): hero (message ≤ 3 s: "these people engineer systems, not websites";
  dual CTA: "Start a project" + "Explore our work"; engineered visual — the signature
  diagram/scene per DESIGN.md, not a particle field), trusted-by strip only if real (else
  credibility metrics: disciplines, uptime target, prototype sprint time — from content
  module, no invented clients), **Divisions** (4–5 service lines as an interactive
  capability index), **Products** (PenTestor + Emmett CRM feature blocks, each with its
  own contained visual language + waitlist CTA), **Selected Work** (3–4 case study
  cards → detail), **Process** (the engineering workflow as a horizontal/vertical
  timeline: diagnose → architecture → prototype → build → security review → ship →
  operate), **Library teaser** (3 featured posts), **Academy band**, **Team strip**
  (featured members), **Careers band** (open roles count → /careers), final **CTA band**
  (the "hard problem" line + contact).
- **Services** (`/services`): each division as a deep section: what, how (bulleted
  method), tech (tags), engagement models (advisory / embedded team / product rescue /
  greenfield — interactive selector with descriptions + indicative Toman budget ranges
  from SiteConfig + "discuss scope" CTA), outcome examples (link case studies).
- **Products** (`/products`) + **PenTestor** (`/products/pentestor`) +
  **Emmett CRM** (`/products/crm`): positioning, problem → how it works (animated
  diagram steps), capabilities grid, architecture (trust/security: data handling,
  access model), early-access **waitlist** (real API: email + product + use case →
  success screen shows **referral code** + share link), FAQ (per product, localized),
  CTA. Beta badge. No pricing.
- **Projects / Case Studies** (`/projects` + `/projects/<slug>` from API): index grid
  (sector filter, Toman/percent metric chips), detail = the portfolio showpiece:
  context, challenge, approach (narrative), architecture (TechDiagram), metrics (count-up,
  Toman/percent), timeline, stack, quote (testimonial), related product CTA. Bilingual
  slugs (fa slug in fa UI).
- **Field Library** (`/library` + `/library/<slug>` from API): category chips, featured
  post hero, list (Jalali dates, reading time), **gated whitepaper** flow (LeadGate modal
  → real API call → success + token link), post page: TOC (scroll-spy), markdown rendered
  (sanitized subset — mirror server rules), code blocks (mono, copy button), pull quotes,
  author card, related posts, prev/next, JSON-LD BlogPosting, share row. (Note: the old
  `/resources` route and redirect — keep the redirect map in one place, `/resources` →
  `/library`.)
- **Academy** (`/academy`): program(s) (e.g., engineering apprenticeship / security track):
  structure (phases, duration in Jalali-friendly terms), who it's for, outcomes, alumni
  notes if real (else placeholder-labeled), apply CTA (contact with type preset).
- **About** (`/about`): story (founded, why, how we work), values (4–5, concrete not
  poster-speak), the engineering philosophy (the "studio, not agency" argument),
  full team grid (from API, terminal-card hover: name, role, expertise, links),
  tech commitment (standards: code review, testing, observability), CTA.
- **Careers** (`/careers` + `/careers/<slug>` from API): culture section, open roles list
  (department/location/employment chips), role detail (description/requirements/perks,
  apply → real API form with CV upload, progress states, success), "closed roles" note,
  "no role fits? send your profile" CTA.
- **Contact** (`/contact`): real API form (name, email, phone optional, company, project
  type, **Toman budget ranges from SiteConfig**, message) with zod validation mirroring
  server, honeypot (hidden), client + server error mapping (fa-first messages), 429
  handling ("you've sent a few already — email us directly" + mailto), success state
  (48h promise + "what happens next" 3-step), direct channels block (email, phone +98,
  Telegram, office, working hours in Asia/Tehran with Jalali weekday names), map/office
  note, JSON-LD ContactPoint.
- **Legal**: `/privacy` + `/terms` (both languages; content = B9 or clearly-marked draft
  awaiting legal review; structured, not lorem).
- **404**: branded (diagram of a broken signal / 404 in mono), localized, quick links
  home/services/contact; also 500-friendly error boundary (localized, no stack leak).

### 3.3 API wiring
1. `web/src/api/client.ts`: fetch wrapper (base `/api`, locale from route, `Accept-Language`
   header, timeout 10 s, retry once on network error for GETs, typed via generated types,
   error normalization into the fa/en message map), single request cache per (url, locale)
   with stale-while-revalidate for content endpoints.
2. Forms (contact/waitlist/newsletter/job): react-hook-form + zod (schemas in
   `web/src/api/schemas.ts`, mirror server — comment the server file they mirror),
   per-field localized errors, optimistic UI disabled for leads (honest pending state),
   success/failure states with sonner (localized), disable double-submit, preserve
   entered data on server error.
3. Dev: Vite proxy `/api` → `http://127.0.0.1:8000` (config only, never in bundled code);
   `VITE_API_URL` for non-default setups. E2E runs against real dev API (compose script
   `scripts/dev-up.sh`: MariaDB (or documented fallback SQLite dev), django runserver,
   vite) — committed, one-command.

### 3.4 Creative ideas (implement the marked subset — engineered, never flashy)
*Pick ≥ 6 of the "P1" items; P2 items only if budget/effort allows. Every implemented idea
gets a spec entry in DESIGN.md (behavior, states, reduced-motion fallback) and an e2e or
unit test.*

**P1 (high value / low risk):**
1. **Systems Map** — the hero/divisions visual: an interactive SVG "engineering systems
   map" (nodes = divisions/products, edges = how they compose) with hover states,
   draw-on animation, click → navigate. Replaces the generic 3D object as the signature.
2. **Engagement estimator** (Services): a 3-step selector (division × model × budget band)
   that produces a written "point of view" (2–3 sentences, from content module, not a
   calculator gimmick) + pre-filled contact CTA. Lead magnet, honest output.
3. **Lead-gated whitepaper** (Library): one flagship whitepaper ("Secure-by-Design
   Playbook") behind email capture → real token download. Proves the full lead pipeline.
4. **Waitlist with referrals**: per-product waitlist cards; on success show personal
   referral code + copy-link; list positions are NOT shown (no fake countdowns).
5. **Terminal easter egg**: pressing `~` (or `/` when not in an input) opens a minimal
   on-brand terminal: `/help`, `/team`, `/stack`, `/projects`, `/about` navigate; `/jokes`
   returns one dry engineering one-liner (localized). 20-line component, documented as
   easter egg in DESIGN.md, disabled for reduced-motion.
6. **Case study "proof cards"**: each case study ends with a stamped "proof" block
   (metric + timestamp + "measured in production") — consistent across all, data from API.
7. **Local touch**: office strip on Contact/About: Tehran, Jalali weekday working hours,
   timezone live indicator ("Tehran 14:32"), Telegram/Instagram links — the local signal
   that builds trust with Iranian visitors.

**P2 (stretch):**
8. Live "currently building" status line in footer (from SiteConfig: e.g., "Now: hardening
   PenTestor v0.4") — one editable field, no fake metrics.
9. Interactive FAQ on product pages with search.
10. "Architecture card" share: OG images for case studies generated from the case study's
    diagram + metrics (server-side via Phase 2's OG pipeline if available; else static).
11. Academy program as a mini "cohort timeline" with Jalali month labels.

### 3.5 SEO layer (final per-route head; Phase 4 validates)
1. `useSEO` on every route: title (fa/en patterns: `<Page> — Emmett` / fa: `Emmett | <صفحه>`
   — exact format fixed in I18N.md), description (150–160 chars each language, no
   templated junk), canonical (locale-specific, `VITE_SITE_URL`), hreflang pair +
   x-default → fa, OG (image per route from the OG system; post pages get API cover +
   generated OG), Twitter card, `robots` default index.
2. JSON-LD per route: Organization (once, footer-injected), WebSite, BreadcrumbList
   (deep pages), BlogPosting (posts), Person (team members on About), ContactPoint
   (Contact), FAQPage (product FAQ blocks), Product (PenTestor/CRM as `SoftwareApplication`).
3. Sitemap: web emits `build/sitemap-manifest.json` (marketing routes + slugs, both
   locales) consumed by Phase 2's `render_public_html` → final `sitemap.xml` (verify the
   pipeline end-to-end in this phase with dev API; fix mismatches in either side).
4. Prerender (Phase 1 pipeline): now runs over the full route list; add the dynamic
   *listing* pages to prerender (blog index, projects index) with the seeded API data
   (CI env `VITE_SEED_API` pointing at a dev server? no — CI uses recorded fixtures:
   `web/tests/fixtures/api.json` recorded from the API, replayed in a local mock server
   during prerender. Document.) Detail pages come from the Static Bridge (verify URL
   matrix live in dev).
5. Structured-data + meta validation in CI: `scripts/seo-check.mjs` (parse prerendered
   HTML: required meta present, hreflang symmetry, JSON-LD parses, canonical correct,
   no `noindex` leakage, title length budget) — fails CI on violation.
6. Legacy redirect map (single source `web/redirects.ts`, exported to server config in
   Phase 4): `/` handled by app; `/library` → `/library`; `/resources` → `/library`;
   `/en/...` old paths; document the .htaccess/`vercel`-style rules for cPanel (Phase 4).

### 3.6 Localization depth (the fa-first bar)
1. Jalali everywhere dates appear (blog dates, published/updated, job openings, process
   timeline, "last updated" on gated docs) via `lib/jalali`; weekday names fa; relative
   fa strings; Gregorian shown in a subtle secondary line only where contracts need it
   (e.g., `14 آبان ۱۴۰۴ · 5 Nov 2025`).
2. Toman: all budget ranges, estimator output, case-study metrics via `lib/money`
   (Persian digits + میلیارد shorthand in fa; Latin in en).
3. Persian digits: all fa UI numbers (counters, stats, form hints) via `lib/digits` —
   audit pass: grep for hard-coded `[0-9]` in fa strings (CI check with allowlist).
4. RTL: logical properties audit (no physical `left/right` in layout), icon direction
   (arrows mirror: `rtl:rotate-180` only where semantically "forward"), scroll
   progress bar origin, carousel/marquee direction, `dir` on embedded mono/code blocks
   (stays LTR inside), number inputs, focus order screenshot test.
5. Language switcher: navbar always-visible EN|FA pill (route-preserving), also in 404 +
   error states; hreflang respected server-side for no-JS (Static Bridge pages carry
   alternates).
6. Copy QA pass (manual, recorded): fa tone consistency (not literal translations), no
   broken half-Persian lines in en, spacing between fa/latin words, punctuation (Persian
   comma/semicolon where appropriate), no leftover "Emmett Group" vs "Emmett" mixups (B4).

### 3.7 Accessibility (WCAG 2.1 AA — verified, not asserted)
1. axe-core in e2e (Playwright) on **every route × both languages** — zero critical/serious
   violations; baseline committed.
2. Keyboard: full nav via Tab/Enter/Esc (terminal easter egg: Esc closes, focus returns),
   focus-visible token ring everywhere (contrast-checked), no focus traps, skip-link
   (localized, first tab stop), carousel/marquee pause on focus.
3. Forms: labels (visible or aria), error association (`aria-describedby`), announce
   success/failure (aria-live), file input accessible, no color-only signals.
4. Contrast: all text/border combinations ≥ 4.5:1 (large text 3:1) — run a contrast
   script over token pairs in CI (tokens are the source; document exceptions if any).
5. Motion: `prefers-reduced-motion` kills all non-essential animation (single global
   hook + CSS gate), loader still works, count-ups show final value.
6. Screen-reader smoke: documented manual pass (VoiceOver/NVDA or TalkBack) on home,
   contact, one post — findings recorded in the phase report (fix all blockers).

### 3.8 Performance (budgets enforced in CI)
1. Lighthouse CI: activate Phase 1's `lighthouse-ci.yml` — mobile, top-5 routes (home,
   services, products/pentestor, library, contact) × fa × en; assertions: Perf ≥ 90,
   A11y ≥ 95, BP ≥ 95, SEO ≥ 95; baseline stored; CI fail on regression > 3 pts.
2. Budgets: initial JS ≤ 250 KB gzip on home (measured from build + LCI), LCP element =
   hero text (no image LCP), CLS < 0.1 (image/`sizes` + reserved diagram heights),
   fonts: swap + subset + preload critical face per locale; images: AVIF/WebP pipeline
   (build script `web/scripts/optimize-images.mjs`: AVIF + WebP + `srcset`, originals
   kept out of git if large — LFS or docs note).
3. Dependency diet: remove anything unused (final pass: three.js decision executed per
   DESIGN.md policy — if kept, dynamic import + no-WebGL fallback + bundle-impact test;
   if dropped, ADR note), code-split every route, lazy below-fold components, motion
   import only where used.
4. API: cache content endpoints (SWR-ish client cache + server response cache), no
   request waterfall on home (critical data first, progressive sections), skeleton
   strategy (no layout shift between skeleton and content — fixed heights).

### 3.9 Tests
1. **Unit (vitest):** i18n utils (jalali/money/digits edge cases), seo builders (hreflang
   symmetry), API client (error mapping, retry, locale), form schemas (mirror check:
   zod schema keys ⊆ server serializer fields — a contract test), redirect map.
2. **E2E (Playwright), both locales, both viewports (mobile 375 + desktop 1280):**
   - smoke: every route renders (no 500/console errors), nav complete, footer links.
   - language: `/` → fa; switch to en preserves route; switch back; `lang`/`dir` correct.
   - contact: valid submit → API call → success state (test against dev API + seeded DB;
     assert lead row created via API GET? no — assert HTTP 201 + success UI; DB assertion
     via a test-only admin cookie is optional); honeypot: fill hidden field → no row
     (assert via direct API); invalid email → fa error text.
   - waitlist: submit → referral code shown → copy link works.
   - library: gated post → lead gate → submit → download link appears (token).
   - careers: apply with fake CV (fixture file) → success.
   - a11y: axe pass per route (3.7.1).
   - rtl: fa home screenshot vs en home screenshot both captured (visual regression
     baseline committed; also 375px).
3. **Visual regression:** Playwright screenshots of home/services/products/library/fa+en
   at 375/768/1280 committed as baselines; diff on PR (threshold documented).
4. **seo-check** (3.5.5) in CI. All of it green = this phase's proof.

## 4. Explicitly NOT in this phase
- No backend changes beyond fixing a genuine contract bug (documented, minimal, tests
  updated on both sides). No final content (Phase 4 swaps seed data for real/approved).
  No deployment to production (staging verification is Phase 4). No analytics code
  (Matomo wiring is Phase 4 — leave the documented hook points: `web/src/lib/analytics.ts`
  stub with event names: `contact_submit`, `waitlist_join`, `newsletter_subscribe`,
  `whitepaper_download`, `job_apply`).

## 5. Exit gates

- [ ] Every route in §3.2 exists in **both languages**, API-wired where dynamic, with
      loading/empty/error states; screenshots (fa+en, mobile+desktop) in the report.
- [ ] Lighthouse CI green: all assertions met on top-5 routes × fa × en (evidence in
      report); budgets (3.8) met; initial JS ≤ 250 KB gzip home.
- [ ] E2E suite green (both locales, both viewports, axe pass, contact/waitlist/gated/
      careers flows against dev API); visual baselines committed.
- [ ] `npm run content:check` green; digits audit green; no `fonts.googleapis` or
      non-origin runtime requests (network audit in e2e).
- [ ] Prerender + Static Bridge URL matrix verified live in dev: open
      `/fa/blog/<slug>` with JS disabled (devtools) → full article readable with meta.
- [ ] Sitemap manifest ↔ API slugs match (script output in report); robots OK.
- [ ] A11y: axe zero critical/serious; contrast script clean; keyboard pass documented;
      reduced-motion verified (devtools emulation screenshots).
- [ ] DESIGN.md Part B complete (inventory, motion, typography fa metrics, do/don't).
- [ ] `docs/I18N.md` updated (new-string workflow proven), `docs/ARCHITECTURE.md` URL
      matrix updated, README quickstart still accurate, CHANGELOG + phase report committed,
      `phase-3` tag.

## 6. Handoff to Phase 4
Phase 4 can rely on: a complete, tested site on `main`; real API flows working end-to-end
locally; SEO pipeline (prerender + bridge + sitemap + seo-check); analytics hook points
with fixed event names; Lighthouse CI gate; redirect map; DEPLOYMENT draft; the one-command
`scripts/dev-up.sh`; seed data that Phase 4 will replace with production content.
