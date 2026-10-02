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
