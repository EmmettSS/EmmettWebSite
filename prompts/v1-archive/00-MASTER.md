> **⚠️ DEPRECATED (v1) — 2026-09-23.** این فایل بخشی از بستهٔ v1 است و با بستهٔ جدید در `prompts/` جایگزین شده است. فقط برای ردیابی نگه داشته شده؛ اجرا نکنید. مبنای اجرا: `prompts/README.md`.

# EMMETT GROUP — MASTER PROMPT
### Commercial Website Program: Backend from Scratch + Frontend Completion, Persian/English (Persian-First)

> **How to use this pack.** This folder contains one master prompt (this file) and four
> independent phase prompts:
>
> | # | File | Phase |
> |---|------|-------|
> | 0 | `prompts/00-MASTER.md` | **This file** — program definition, architecture, gates, inputs |
> | 1 | `prompts/01-FOUNDATION.md` | Phase 1 — Audit, monorepo, tooling, i18n architecture, design tokens, SEO skeleton |
> | 2 | `prompts/02-BACKEND.md` | Phase 2 — Django backend: API, admin, email, static-bridge SEO, cPanel packaging, tests |
> | 3 | `prompts/03-FRONTEND.md` | Phase 3 — Frontend completion: design system execution, all pages, API wiring, SEO, a11y, perf |
> | 4 | `prompts/04-LAUNCH.md` | Phase 4 — Content, SEO final, analytics/monitoring, security hardening, runbook, final docs |
>
> **Execution protocol**
> 1. Fill in the **Inputs** table (§6) with real values before Phase 1 starts.
> 2. Execute phases **in order**, one phase per agent session. Paste the phase prompt as the
>    session's first message. Each phase prompt is **self-contained**: it repeats the project
>    context and invariants it needs, so it can also be re-run standalone after failures.
> 3. After each phase, verify its **Exit Gates** checklist item-by-item. Do not start the next
>    phase until every gate is green. Commit and tag: `phase-1`, `phase-2`, `phase-3`, `phase-4`.
> 4. At the end of Phase 4, verify the **Definition of Done** (§9) line-by-line.
> 5. Anything that changes a decision recorded here or in an ADR must go through a new ADR —
>    never silently.

---

## 1. Mission

Transform this repository from a partially-built, Figma-exported marketing SPA into a
**commercial-grade, bilingual (Persian-first / English) website for Emmett**, an independent
software-engineering studio, with:

- A **complete backend written from scratch** on Django (leads, newsletter, waitlists,
  blog/case-studies, team, testimonials — all admin-manageable, all API-served, all tested).
- A **completed, production-ready frontend** that reuses the existing React/TypeScript codebase
  (no un-justified full rewrite), fully bilingual with **Persian as the default**, Jalali dates,
  Toman currency, RTL done properly, and a professionally re-directed visual identity.
- **Full documentation** — architecture, API, design, content, deployment, runbook, security —
  delivered as the final handoff.

The result must be deployable on the team's **shared Linux hosting with cPanel** and must work
reliably for users **in Iran** (no hard dependency on services commonly blocked or degraded
inside Iran: no Google-Fonts CDN, no Google-Analytics-only stack).

## 2. Who Emmett is (narrative context — use it when writing copy)

- **Name:** "Emmett" (EN). Persian working name: "امت" — see Input B4 for final confirmation.
- **Positioning:** an independent engineering studio / engineering collective — not an agency,
  not a SaaS vendor. It turns difficult operational problems into secure, well-crafted products.
  Tagline direction (existing): *"We engineer intelligent systems."*
- **Services (divisions):** software/product engineering, AI/ML, cybersecurity,
  cloud/infrastructure, product rescue.
- **Products:**
  - **PenTestor** — an automated/AI-assisted security testing product (security-scanning angle).
  - **Emmett CRM** — a relationship/sales-intelligence CRM.
  Both are **early-stage** → the site must support **waitlists** for both, not pricing pages.
- **Content assets:** "Field Library" (playbooks, research notes, whitepapers — some should be
  lead-gated), **Selected Work** (case studies with architecture, metrics, process),
  **Academy** (talent development programs), **Team** (real people), **Careers**.
- **Market:** Iran-first (Tehran), international ambition. All money is **Toman**.
- **Tone:** confident, technical, editorial. Never hyped, never generic-SaaS, never
  "AI-cliché" (neon gradients, glowing orbs, stock neural nets). The site must *look* like it
  was built by the kind of engineers it says it is.

## 3. Non-negotiable invariants (Golden Rules)

1. **Persian-first bilingual.** Persian (`fa`) is the default language: `/` redirects to `/fa`.
   English lives at `/en`. Every user-visible string, page, doc page, email, form label, error,
   OG tag and sitemap entry exists in **both** languages. Persian copy must be a **proper
   rewrite** (idiomatic, natural Persian), never a literal translation of the English.
   A machine-checkable **bilingual parity gate** must fail CI when keys are missing in either
   language.
2. **Iran-first conventions.** Jalali (Solar Hijri) calendar for all displayed dates;
   **Toman (IRT)** for all money; Persian digits in the `fa` UI; timezone `Asia/Tehran`;
   phone formats `+98`; RTL done with logical properties (no manual left/right hacks).
   Date-bearing URLs stay ASCII/Gregorian-stable for compatibility — Jalali is for display.
   Slugs: primary `slug` is ASCII; an optional Persian `slug_fa` may be added per
   ADR-002 for SEO, never replacing the ASCII one.
3. **Django is the core backend.** Python 3.12, Django 5.2 LTS, Django REST Framework.
   No other backend framework. The backend is a real product: models, migrations, admin,
   API docs, tests — not throwaway endpoint glue.
4. **Hosting reality: shared Linux hosting with cPanel.** No Docker at runtime, no Node.js
   runtime on the server, no Kubernetes. The backend runs as a cPanel "Python App" (WSGI).
   Database: **MariaDB/MySQL** (PostgreSQL-compatible decisions are acceptable, but MariaDB is
   the default target). Cron jobs via cPanel. SMTP via cPanel or a configured provider.
   Static assets served by Django (whitenoise) + Apache. Every deployment artifact must work
   inside this envelope.
5. **No dependency on services degraded/blocked in Iran.** Fonts are **self-hosted**
   (`@fontsource`, woff2, subset). Analytics: **Matomo self-hosted on the same cPanel account**
   (cookieless config). Captcha: **honeypot + server rate limiting**, not a third-party widget.
   If a third party is unavoidable, it must be optional and behind a config flag with a
   no-dependency fallback.
6. **The existing frontend is the base.** Vite + React 18 + TypeScript + Tailwind 4 +
   react-router + motion/react stay. A full rewrite is only allowed if justified in an ADR.
   Unused Figma-Make leftovers must be deleted, not carried forward.
7. **Commercial-grade quality bar.** WCAG 2.1 AA accessibility; Lighthouse ≥ 90 (mobile)
   for Performance/Accessibility/Best-Practices/SEO on the top routes in **both** languages;
   security checklist (OWASP) applied; backups with a documented restore test; monitoring;
   legal pages (privacy, terms) in both languages; honest, working forms — no fake submits.
8. **Document as you build.** Every architectural decision → ADR. Every phase ends with updated
   docs. The final doc tree (§8) is part of the Definition of Done.
9. **No secrets in the repo.** All configuration via environment variables; `.env.example`
   committed; credential-free CI; commit hygiene (conventional commits, CHANGELOG).
10. **Nothing ships untested.** Backend: pytest with ≥ 80% coverage on business logic.
    Frontend: unit (vitest) + e2e smoke (Playwright) in both languages + content parity check.

## 4. Target architecture (decisions — locked unless re-decided via ADR)

```
emmett/
├── web/                      # React SPA (existing frontend, moved here in Phase 1)
│   ├── src/content/          # fa-first typed content module — single source of truth for
│   │                         #   marketing-page copy (UI strings, sections, CTAs)
│   ├── src/i18n/             # language context, t() helper, parity types
│   ├── src/lib/              # jalali dates, toman formatting, api client, seo hooks
│   └── ...                   # existing components/pages, restructured and completed
├── api/                      # Django project (created in Phase 2)
│   ├── manage.py
│   ├── emmett/               # settings split base/dev/prod, urls, wsgi
│   └── apps/
│       ├── core/             # health, sitemaps, RSS, static-bridge rendering, SEO views
│       ├── leads/            # ContactLead, NewsletterSubscriber, WaitlistSignup
│       └── content/          # Post, Category, CaseStudy, TeamMember, Testimonial, JobOpening
├── docs/                     # ALL documentation (tree in §8) + references/design-history/
├── deploy/                   # cPanel packaging: wsgi, requirements pinning, cron lines,
│                             #   step-by-step fa+en deployment guide assets
├── prompts/                  # this prompt pack (kept for traceability)
└── .github/workflows/        # CI: lint/typecheck/test/build + content parity + LHCI gate
```

**Key architectural patterns (each formalized as an ADR in Phase 1):**

- **ADR-001 — Django core + React SPA split.** React SPA for UX; Django REST API for all
  dynamic data (leads, content, waitlists). API versioned under `/api/v1/`, OpenAPI-published
  via drf-spectacular; frontend types **generated from the OpenAPI spec** (single contract,
  no duplicated models in TS).
- **ADR-002 — i18n model.** URL-based locale (`/fa/...`, `/en/...`), `fa` default +
  `x-default`. Two content channels: (a) marketing copy in `web/src/content/` (dev-owned,
  versioned, fa-first source of truth); (b) operational content in the DB (admin-owned:
  posts, case studies, team, testimonials, jobs) with dual-language fields
  (`*_fa` / `*_en`) and per-language slugs (`slug` ASCII + `slug_fa` Persian, optional).
  API resolves language from the request path/param; every response in both languages where
  applicable. `hreflang` + localized sitemaps for both.
- **ADR-003 — Static Bridge (SEO without SSR on shared hosting).** Crawlable entry HTML for
  **every** route: marketing routes are **prerendered at CI build time** (headless-browser
  pass over the built SPA, committed to the build artifact); dynamic content routes
  (`/blog/...`, case-study details) are rendered **server-side by a Django management command**
  `render_public_html` (nightly cron + on-publish) into static HTML files with full meta/OG/
  JSON-LD and the complete article body (works without JS). The SPA hydrates over these
  documents. Result: Google crawlers, social scrapers, `<noscript>` users and link previews
  always see real content — with zero SSR infrastructure on shared hosting.
- **ADR-004 — Hosting envelope.** One cPanel Python App (Django, WSGI) serves API + static +
  built SPA (whitenoise). MariaDB via cPanel MySQL. cPanel cron for: static-bridge render,
  DB dump backup, newsletter digest (monthly, configurable). Build happens in CI
  (GitHub Actions) — the shared host never runs Node.

**Data-flow summary:** visitor → Apache → Django catch-all → (crawlable entry HTML) →
browser → React hydrates → API calls for dynamic data → POSTs (contact/waitlist/newsletter) →
Django validates + throttles + stores → SMTP email + admin dashboard + lead export.

## 5. Phase map

| Phase | File | Goal | Key outputs | Exit gate summary |
|-------|------|------|-------------|-------------------|
| 1 | `01-FOUNDATION.md` | Clean, structured, toolable codebase with i18n + design + SEO architecture | Monorepo layout, CI green, i18n content system, token system, ADRs, docs skeleton | CI green, build clean, parity gate working, ADRs committed |
| 2 | `02-BACKEND.md` | Complete Django backend + cPanel packaging | API + admin + email + static bridge + tests + deploy guide | All tests green, OpenAPI live, cPanel guide step-verified |
| 3 | `03-FRONTEND.md` | Completed frontend, both languages, wired to API, at quality bar | All pages, new design system, SEO layer, a11y, perf budget, e2e | Lighthouse budgets met in fa+en, e2e green, parity green |
| 4 | `04-LAUNCH.md` | Content, SEO final, ops, hardening, launch | Final content, analytics, monitoring, runbook, full doc tree, launch report | Definition of Done (§9) verified item-by-item |

**Handoff artifacts** (what each phase must leave in the repo for the next):
- Phase 1 → monorepo layout, CI, content system, tokens, ADR-001…004, docs skeleton.
- Phase 2 → working API (dev), OpenAPI spec, seed commands, `render_public_html`,
  `deploy/` package, `docs/API.md`, `docs/DEPLOYMENT.md` (draft).
- Phase 3 → completed site on `main`, e2e/parity/LHCI in CI, `docs/DESIGN.md`, updated README.
- Phase 4 → final content, analytics, runbook, `docs/LAUNCH-REPORT.md`, complete §8 tree.

## 6. Inputs required from the team (fill before Phase 1; placeholders allowed with `[INPUT]` markers)

| ID | Input | Example / notes |
|----|-------|-----------------|
| B1 | Primary domain + staging subdomain | `emmett.example` / `staging.emmett.example` (or `.ir` domain — state which DNS you control) |
| B2 | cPanel access: host, username, panel URL (credentials only in CI secrets / server, never in repo) | Python version available (target 3.12), MySQL version |
| B3 | SMTP: host/port/user or provider; team inbox address (e.g. `hello@domain`) | cPanel SMTP or external (state TLS requirement) |
| B4 | **Final brand names:** EN (Emmett vs "Emmett Group") and FA (امت ?) + logo files (SVG preferred) | Working defaults: EN "Emmett", FA "امت" |
| B5 | Contact block: email, phone (+98), address (Tehran), working hours, socials (Instagram/LinkedIn/GitHub/Telegram) | Drives footer, contact page, JSON-LD |
| B6 | Real content availability: team roster, case studies, testimonials — or approval to use high-quality placeholders marked for replacement | Drives Phase 4 content work |
| B7 | Budget ranges in Toman for the contact form (working proposal: < 500M · 500M–1.5B · 1.5B–3.75B · 3.75B+ Toman — approve/adjust) | Replaces the current EUR ranges |
| B8 | Analytics confirmation (Matomo, cookieless, self-hosted) + any existing analytics to migrate | |
| B9 | Legal text: approved privacy policy & terms (fa/en), or approval to draft for legal review | Required before launch, can be drafted earlier |
| B10 | Any mandatory internal constraints (brand book, existing contracts, existing DNS/SSL setup) | cPanel typically owns SSL via AutoSSL — confirm |

If an input is missing during a phase: proceed with a clearly-marked placeholder
(`[INPUT Bx]`), record it in `docs/OPEN-ITEMS.md`, and surface it in the phase report.
Never block the whole phase on a missing input unless it is B2/B3 (deploy-critical).

## 7. Global quality gates (applied at every phase boundary, final-enforced in Phase 4)

- **Build/CI:** lint (eslint/ruff) + typecheck (tsc strict) + tests (pytest ≥ 80% business
  logic; vitest unit; Playwright e2e fa+en) + `vite build` all green in CI.
- **Bilingual parity:** `npm run content:check` green (every fa key has an en key and vice
  versa, including UI strings, metadata, emails); both languages fully navigable.
- **Performance (mobile, top-5 routes, both languages):** Lighthouse Perf ≥ 90, LCP < 2.5 s,
  CLS < 0.1, INP < 200 ms; initial JS ≤ 250 KB gzip; no render-blocking third-party from
  outside the origin; images AVIF/WebP with `sizes` + lazy; fonts self-hosted woff2 subset.
- **Accessibility:** WCAG 2.1 AA — axe-core clean on all routes in both languages, keyboard
  complete, `prefers-reduced-motion` honored, RTL focus order verified.
- **SEO (final, Phase 4):** sitemap(s) valid (fa+en, hreflang-consistent), robots.txt,
  JSON-LD validated (Organization, WebSite, BlogPosting, BreadcrumbList, Person),
  OG images render for every route, canonicals correct, 0 indexable 404s, legacy routes
  redirect-mapped.
- **Security:** OWASP Top-10 mapping reviewed for every endpoint (validation, CSRF,
  throttling, honeypot, header hygiene, upload validation), `npm audit`/`pip-audit` clean of
  high/critical, secrets scan clean, CSP draft committed.
- **Ops:** backup + **restore test** documented and executed once; uptime check on
  `/api/v1/health/` and one page; error-log review procedure in runbook; deploy + rollback
  procedure executed once on staging.
- **Docs:** every doc in §8 exists, is current, and is linked from README; ADR index current.

## 8. Final documentation deliverable (doc tree — must exist at the end of Phase 4)

```
README.md                     # bilingual, Persian section FIRST: what it is, quickstart
                              #   (dev), how to deploy (operator), how to manage content,
                              #   links into docs/, status badges
docs/
├── ARCHITECTURE.md           # system overview, data-flow diagrams (SVG/mermaid), ADR index
├── ADRS/0001…n.md            # decisions (001 architecture, 002 i18n, 003 static bridge,
│                             #   004 hosting envelope, + any new ones)
├── API.md                    # generated OpenAPI + Persian quickstart (curl examples)
├── DESIGN.md                 # creative direction, design tokens, component inventory,
│                             #   motion vocabulary, typography (fa+en), 3D/canvas policy
├── I18N.md                   # fa-first model, parity gate, Jalali/Toman rules, new-string workflow
├── CONTENT_GUIDE.md          # Persian (primary): how to add/edit posts, team, testimonials,
│                             #   jobs, waitlists via admin; media & image specs
├── DEPLOYMENT.md             # fa+en: cPanel setup step-by-step, env vars, DNS, cron, SSL
├── RUNBOOK.md                # Persian: daily/weekly ops, backups + restore, monitoring,
│                             #   incident response, common failures
├── SECURITY.md               # threat model summary, OWASP mapping, secrets policy,
│                             #   vulnerability process
├── OPEN-ITEMS.md             # all [INPUT Bx] placeholders + open questions (drain before launch)
├── LAUNCH-REPORT.md          # final acceptance: Definition of Done checklist with evidence
│                             #   (Lighthouse captures, parity output, test reports, restore test)
└── references/design-history/  # former src/imports/pasted_text/* (moved, untouched)
```

## 9. Definition of Done (whole project — verified at the end of Phase 4)

- [ ] Site is live (or demonstrably deployable) at the production domain on cPanel.
- [ ] `/` serves **Persian, RTL, Jalali, Toman** by default; `/en` fully parallel.
- [ ] Every marketing route has crawlable entry HTML (prerendered or Static-Bridge), correct
      meta/OG/hreflang/JSON-LD, and a valid sitemap entry in both languages.
- [ ] Contact form, waitlists (PenTestor, Emmett CRM), newsletter subscribe/unsubscribe,
      job application: all real, API-backed, stored, email-confirmed, rate-limited, tested.
- [ ] Django admin: bilingual content management works end-to-end (create post fa+en →
      appears on site + sitemap + RSS within one cron cycle); leads exportable.
- [ ] Matomo tracking (contact submit, waitlist, newsletter, whitepaper download) verified;
      cookieless; no third-party pixels outside the origin.
- [ ] Lighthouse (mobile) ≥ 90 on Perf/A11y/BP/SEO for top-5 routes in **both** languages;
      budgets in §7 met.
- [ ] E2E (fa+en), unit, contract, content-parity and Lighthouse CI all green on `main`.
- [ ] Security checklist (§7) signed off; secrets scan + dependency audit clean.
- [ ] Backup + restore executed and documented; uptime + log monitoring active.
- [ ] Privacy policy & terms live in both languages; legal review noted in OPEN-ITEMS if pending.
- [ ] Full doc tree (§8) committed; README (fa-first) correct; ADR index current.
- [ ] `docs/LAUNCH-REPORT.md` contains evidence for every item above.

## 10. Working rules for the executing agent (all phases)

1. Work on the current branch; small, conventional commits; update `CHANGELOG.md`
   (Keep-a-Changelog) at every phase end.
2. **Do not delete the `.git` directory or the repo root.** Prefer deleting unused *files*.
3. Keep `prompts/` as-is (traceability). When a phase prompt conflicts with reality, follow
   the ADRs and record the deviation in `docs/OPEN-ITEMS.md`.
4. At the end of each phase produce a **phase report** (commit message + short section in
   `CHANGELOG.md` + updated `docs/OPEN-ITEMS.md`) stating: gates passed (with evidence),
   deviations, open items, and what the next phase can rely on.
5. Never invent client names, metrics or awards that don't exist. Proof sections use the
   team's actual data (Input B6) or clearly-labeled placeholders.
6. When generating copy: write Persian first (as a native rewrite), then English; keep the
   confident-engineering tone; no marketing hyperbole; no AI-cliché vocabulary
   ("synergy", "next-gen", "unleash", neon-purple, glowing orbs).
7. Treat performance as a feature: budget checks run in CI, not as a one-off.
8. If an input (B1–B10) is missing, mark placeholders, continue, record in OPEN-ITEMS.
9. Accessibility and RTL are not phases-4 concerns — they are verified at every phase boundary.
10. The final site must be **embarrassing-free**: no lorem ipsum without `[INPUT]` markers,
    no dead links, no console errors, no fake success states, no English leaking into `fa`.
