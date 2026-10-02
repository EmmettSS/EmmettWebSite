# Change log

## Phase 0 — Platform foundation (2026-10-01)
- Migrated the Vite/React application into `web/` and initialized the pnpm workspace.
- Made `/` Persian-first (`/fa`), corrected document metadata, removed dead components and the MUI/Emotion/Popper dependencies, and archived pasted design references in `docs/references/design-history/`.
- Added tested Jalali/Toman utilities, bilingual content parity gate, design tokens, device-tier engine and low-power controls.
- Added phase documentation, eight ADRs, Static Bridge skeleton, bundle budget, and CI workflows.

## Phase 1 — Django backend (2026-10-01)
- Added Django REST backend, DB job queue + offset polling, WSGI/cron cPanel packaging, health/schema/docs endpoints, lead and content models/admin, transactional email outbox, and bilingual server-rendered content.
- Pinned patched Django/DRF versions; added backend tests, security headers, seed command and deployment runbooks.
- External cPanel deployment and MariaDB race validation remain pending B2.

## Phase 2 — Shell + live tools (2026-10-02)
- Shipped F-07: a single feature registry, ⌘K/Ctrl+K command palette (pages, tools, team, case studies, executable commands), a real allow-list terminal connected to the public API and an accessible shortcut overlay.
- Shipped F-01…F-05 as real products: Jalali calculator (conversion, business-day planning with the versioned holiday source, bulk CSV), national-ID validator (local checksum, step-by-step), toman formatter (BigInt-only, cheque wording, invoice/VAT, rial), Persian text normaliser (conservative ZWNJ, live text-only diff) and JWT debugger (browser-only decode, CWE-tagged warnings).
- Added the Django tool endpoints (holidays, convert, normalize, share, usage) with the versioned `HolidayCalendar` model, typed serializers, throttles and 13 new API tests; regenerated `schema.yml` and `api-types.ts`.
- Added the static bridge for 18 localized pages with computed examples, `jalali:check` (4748 dates vs ICU), the G1 `tool:contract` gate, four mandatory security tests, the low-power functional test and Playwright specs for tools/palette/terminal.

## Phase 3 — Security & AI (2026-10-02)
- Shipped F-06: a fully passive domain check-up with the six mandatory guards enforced in code — single network choke point limited to ports 80/443, consent + Article 729 disclaimer, 5/hour + honeypot + random delay, versioned blocklist checked before job creation, random `result_id` with no IP and a 7-day TTL, and masked public output with a signed unlock link for the full report. Six sections, weighted A–F grade, shareable `noindex` report and a Matomo-tracked PenTestor CTA.
- Shipped F-08 with BM25 as the shipped default: a 138-chunk corpus built from this repository's own content, hash-based re-embedding on cron, similarity threshold applied before any provider call, citation-required output filter, per-IP limits, ≤500-character input, question text never retained, and a provider abstraction (ADR-007) with `NullProvider`/`HttpRelayProvider`/`HostedProvider`. B7 stays open in OPEN-ITEMS.
- Wired `scan` and `ask` into the real terminal (consent is taken on the terminal path too), added the assistant page plus a floating widget, and documented operations in `docs/AI-OPS.md`.
- Gates: 28 scanner API tests, 20 assistant API tests, scanner/assistant client unit tests, `corpus:check` in CI, `seo:check` now covers 24 pages, and the bundle budget covers all seven code-split routes.

## Pre-merge hardening (2026-10-02)
- Fixed a real routing bug: `/assistant` rendered the tool router instead of the assistant page.
- Made the three never-green CI jobs pass for the first time: gitleaks now gets full history plus a documented `.gitleaks.toml`; the queue-race job grants the throwaway MariaDB user and the scanner's `result_id` default now fits `varchar(32)` (MariaDB error 1067 — SQLite never enforces the width); the a11y job's Playwright specs were fixed (lazy ShellRoot readiness, strict-mode selectors, the consent gate needs a domain, the inert-markup assertion is scoped to the preview).
- Brought the site to WCAG-AA contrast: every muted token below `white/48` measured 1.8–4.4:1 against the real backgrounds, so the palette was raised to a `white/55` floor (≈5.1:1 worst case) and the dark ink on the light service cards to alpha 0.72; the decorative footer wordmark became CSS ornament on an `aria-hidden` host; tool pages gained a `<main>` landmark and keyboard access for scrollable output regions.
- CI is now diagnosable from the API: axe violations are dumped per worker (`A11Y_REPORT`) and aggregated into ≤10 annotations, and the queue-race job annotates the pytest failure lines.
- Removed a dead entry from the blocklist seed (`" judiciary.ir"` carried a leading space and was silently dropped by the seeder's `strip()` guard) and corrected the assistant test count in `docs/PHASE-3-REPORT.md` (19, not 20); the scanner suite grew to 30 with the seed-hygiene guard.
- Local gates re-run on the merged tree: 82 backend tests + 1 skipped, 84 vitest tests, ruff, migrations, schema, lint/typecheck, content/jalali/corpus/tool-contract, SEO (24 pages) and the bundle budget.
