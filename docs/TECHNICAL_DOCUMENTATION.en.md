# Emmett Software Development Group — Comprehensive Technical Documentation (English)

> **Document Type:** Unified Single-File Technical Reference (English)  
> **Persian Counterpart:** [`docs/TECHNICAL_DOCUMENTATION.fa.md`](./TECHNICAL_DOCUMENTATION.fa.md)  
> **Scope:** System Architecture, Data Model, Rendering Model (ADR-0041), Summary of All 41 ADRs, Complete REST API Reference (`/api/v1/`), SaaS Admin Panel Guide, Step-by-Step cPanel Shared Hosting Deployment Guide, and Quality Gates / CI-CD Pipeline.

---

## Table of Contents

1. [Section 1: System Architecture & Data Model](#section-1-system-architecture--data-model)
2. [Section 2: Architecture Decision Records Index (ADR-0001 to ADR-0041)](#section-2-architecture-decision-records-index-adr-0001-to-adr-0041)
3. [Section 3: Complete REST API Documentation (`/api/v1/`)](#section-3-complete-rest-api-documentation-apiv1)
4. [Section 4: SaaS Admin Panel Guide](#section-4-saas-admin-panel-guide)
5. [Section 5: Step-by-Step cPanel Shared Hosting Deployment Guide](#section-5-step-by-step-cpanel-shared-hosting-deployment-guide)
6. [Section 6: Quality Gates, Testing, Pre-commit & CI/CD Pipeline](#section-6-quality-gates-testing-pre-commit--cicd-pipeline)

### Persian/English Parity — Section Mapping

These two files are a **functional** mirror of each other, not a line-by-line one.
The Package 7 rule was: anything a reader needs in order to *act* must exist in both
languages, but subsection numbering need not match, because the English file merges
several Persian subsections into one. This table records the only remaining
differences — anything not listed here is identically numbered and identically
covered in both languages.

| Persian | English | Difference |
|---|---|---|
| ۴.۵. Managing the AI engine in admin | 4.5. AI Catalogs, Prompts, Summaries & Data Import/Export | English merges Persian 4.5 and 4.6 |
| ۴.۶. Data export and import | (inside 4.5) | Content present, no separate number |
| ۴.۷. 2FA and admin SEO management | 4.6 (2FA) + 4.7 (SEO) | Persian keeps two topics in one section; English splits them |
| ۴.۸. `System Checks` code reference | (inside 4.6) | Content present, no separate number |
| ۵.۱ to ۵.۷ | 5.1 to 5.7 | ✅ **Identical** — since Package 7 |
| ۶.۲. Pre-commit hooks | 6.2. Pre-commit Hooks & GitHub Actions Pipeline | English merges Persian 6.2 and 6.3 |
| ۶.۳. GitHub Actions pipeline | (inside 6.2) | Content present, no separate number |
| ۶.۴. Test coverage: actual measured scope | 6.3. Test Coverage: Actual Measured Scope | Same content under a **different number** — the only numbering offset visible in cross-references |

No content remains single-language: host prerequisites (5.1), the post-deployment
checklist (5.7) and admin SEO management (4.7) were added to the English file in
Package 7.

---

## Section 1: System Architecture & Data Model

### 1.1. High-Level Architecture (Next.js 16 SSR + Django 5.2 Modular Monolith)

The Emmett corporate platform is engineered as a **Monorepo** combining a server-rendered Next.js 16 frontend and a Django 5.2 + Django REST Framework (DRF) backend (`ADR-0001`):

```
┌────────────────────────────────────┐        HTTPS / JSON        ┌────────────────────────────────────┐
│   Next.js 16 (SSR) Frontend        │ ─────────────────────────▶ │   Django 5.2 + DRF API (/api/v1/)  │
│   Directory: frontend/             │ ◀───────────────────────── │   Directory: backend/              │
│   - Persian default at root (/)    │   Server-to-Server + Proxy │   - 11 Modular Monolith apps       │
│   - English at /en                 │                            │   - Centralized ai_engine gateway  │
│   - SEO, JSON-LD, OG, Sitemap/RSS  │                            │   - SaaS Admin (Jazzmin + RTL)     │
└────────────────────────────────────┘                            └─────────────────┬──────────────────┘
                                                                                    │
                                                                      ┌─────────────┴─────────────┐
                                                                      │ SQLite 3 (Dev & CI Test)  │
                                                                      │ MySQL 8 (Production)      │
                                                                      └───────────────────────────┘
```

- **Frontend-to-Backend Communication:**
  - **Server Components:** Fetch server-side from `INTERNAL_API_URL`; local development uses `http://127.0.0.1:8000`, while the cPanel topology uses `https://<canonical-host>/backend` (the Django Passenger mount). See ADR-0035.
  - **Client Components:** Always call same-origin relative paths (`/api/v1/...`), which are proxied server-side by `frontend/src/app/api/[...path]/route.ts` while preserving trailing slashes (compatible with Django `APPEND_SLASH`) and forwarding `Set-Cookie` headers (`csrftoken`, `sessionid`).

#### 1.1.1. Rendering model (updated by `ADR-0041` — 2026-10-31)

| Route category | Mode | Freshness |
|---|---|---|
| `/fa/**`, `/en/**` content pages (home, about, services, blog, academy, projects, contact, …) | **SSG + ISR** (prerendered at build) | `revalidate = 60` (from `serverFetch`); instant refresh via the `/api/revalidate` webhook |
| `sitemap.xml`, `robots.txt` | static | 900 s |
| `/{locale}/{blog,academy,services,projects}/[slug]` | dynamic, then ISR-cached | 60 s |
| `/{locale}/search`, RSS feeds, `advisor/results/[token]`, `/profile` (client-rendered) | dynamic | — |
| `/api/[...path]` | Route Handler (proxy) | — |

**Why this table matters:** before `ADR-0041` the first row was dynamic too. A single
`await connection()` in `src/app/[locale]/layout.tsx` (required by the per-response CSP nonce)
forced every route to `ƒ Dynamic`, so each visit cost a full Node render plus an extra
`seo/redirects` request from `proxy.ts` and several Django calls. After the fix, home-page TTFB
dropped from 59.6 ms to 4.0 ms (10 concurrent clients: 130.2 ms → 5.9 ms).

**Guard:** `npm run verify:rendering` reads `.next/prerender-manifest.json` after every build
and fails if any of the 14 required content routes is not prerendered. Re-introducing
`headers()`/`cookies()`/`connection()`/`searchParams` into a public layout or page turns CI red.
**Every performance number in this document has a reproducible command** in
`docs/audit/2026-10-31-deep-audit.fa.md` §1.

### 1.2. Django Modular Monolith App Boundaries (`backend/apps/`)

| App | Domain Responsibility | Primary Models |
|---|---|---|
| `core` | Shared base models, soft-delete, media storage, dynamic translations, security audit log, full-text search (FTS), SEO settings/redirects/FAQs, security middleware & admin KPI dashboard | `SiteSettings`, `Media`, `Translation`, `AuditLog`, `SearchIndexEntry`, `Redirect`, `FAQItem` |
| `accounts` | Custom email-based user model, profiles, favorites, Session/CSRF authentication, and Admin 2FA (TOTP + recovery codes) | `User`, `Profile`, `Favorite` (+ `django_otp` tables) |
| `taxonomy` | Hierarchical categories and flat tags shared across content apps | `Category`, `Tag` |
| `company` | Team members and client testimonials (About page) | `TeamMember`, `Testimonial` |
| `services` | Software engineering service offerings | `Service` |
| `portfolio` | Portfolio projects, flagship products (`is_product=True`) and 7-section case studies. In the demo data only **`pentestor`** is a product; CRM has no database record at all and `/products/crm` is a live "coming soon" page (`ADR-0040`) | `Project`, `CaseStudy` |
| `academy` | Instructors, courses, ordered lessons, and student enrollments | `Instructor`, `Course`, `Lesson`, `Enrollment` |
| `blog` | Library articles, moderated threaded comments, and RSS feed | `BlogPost`, `Comment` |
| `leads` | Contact submissions, 6-stage CRM sales pipeline (`Lead`), newsletter subscriptions, and Kavenegar SMS adapter | `Contact`, `Lead`, `Newsletter` |
| `ai_engine` | Centralized AI gateway, DB-backed closed-enum catalogs, versioned prompts, Iranian cultural guardrails, creative advisor, deterministic estimator, and admin-reviewed blog summaries | `Catalog`, `CatalogOption`, `PromptTemplate`, `GuardrailRule`, `EstimationRule`, `AIRequest`, `AISuggestion`, `AIConcept`, `AIContentArtifact` |
| `api` | Composition layer mounting all domain routers under `/api/v1/` + OpenAPI 3.0 schema endpoints (`drf-spectacular`) | Stateless (no models) |

### 1.3. Internationalization (i18n), Jalali/Gregorian Calendars & RTL/LTR

1. **Three-Tier Translation Architecture (`ADR-0003`, `ADR-0030`):**
   - **Tier 1 (Static UI strings):** Django `gettext` (`backend/locale/{fa,en}/LC_MESSAGES/django.po`) managed by the pure-Python `python scripts/i18n.py {extract,compile,check,stats}` tool; and `next-intl` symmetric JSON catalogs (`frontend/messages/{fa,en}.json`).
   - **Tier 2 (Database model fields):** `django-modeltranslation` automatically expands registered fields into `*_fa` and `*_en` columns.
   - **Tier 3 (Admin-editable runtime strings):** `core.Translation` keyed by `(namespace, key, locale)`.
2. **Calendars & Numerals (Rule 10 — `ADR-0004`, `ADR-0019`):**
   - All timestamps are stored in UTC Gregorian in the database.
   - Persian (`fa`) renders dates in the **Solar Hijri (Jalali) calendar** (`jdatetime` on backend, `dayjs` + `jalaliday` on frontend) and formats numbers with **Persian digits (`۰۱۲۳۴۵۶۷۸۹`)**.
   - English (`en`) renders Gregorian dates and Latin digits (`0123456789`).
3. **Component-Level RTL/LTR (Rule 11):**
   - Document direction (`dir="rtl"` for `fa`, `dir="ltr"` for `en`) is set on `<html>` in `app/[locale]/layout.tsx`, and directional components (e.g., `Breadcrumb` chevron icons) and logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) handle layout without CSS hacks.

### 1.4. Centralized AI Engine & Guardrails (Rules 12, 13 & 14 — `ADR-0026`)

- **Single Gateway (Rule 12):** All AI operations execute exclusively through `apps.ai_engine` using the `OpenAICompatibleProvider` over `requests`. AI is disabled by default (`AI_ENABLED=false`) until configured via `.env`.
- **Closed-Enum User Inputs Only (Rule 13):** Customer-facing AI endpoints (`/api/v1/ai/advisor/` and `/api/v1/ai/estimates/`) accept only active keys from `CatalogOption`. Free-text user input and contact details are never sent to the LLM provider.
- **Iranian Cultural Guardrails (Rule 14):** `apps/ai_engine/guardrails/service.py` enforces active `GuardrailRule` patterns on both prompts and model outputs, blocking non-compliant generations (`AIOutputBlocked`).
- **Privacy by Design:** `AIRequest` operational audit records store no IP addresses, no User-Agent strings, and no PII—only an HMAC pseudonym (`requester_hash`), and are automatically purged after 365 days via `python manage.py purge_ai_audit`.

---

## Section 2: Architecture Decision Records Index (ADR-0001 to ADR-0041)

All 41 ADRs are stored in `docs/adr/`. **The complete, authoritative index — including known dead references and amendment notes — is [`adr/README.md`](./adr/README.md).** The table below summarises each *decision*; it is not the existence list:

| ADR | Title | Summary of Decision |
|---|---|---|
| **ADR-0001** | Overall System Architecture | Monorepo with Next.js (SSR) in `frontend/` and Django/DRF in `backend/` targeting cPanel |
| **ADR-0002** | Django App Boundaries | Modular Monolith of 10 domain apps plus the `api` composition layer (11 apps in total; `api` has no models) |
| **ADR-0003** | Three-Tier i18n Strategy | `gettext` + `django-modeltranslation` + `core.Translation` key-value store |
| **ADR-0004** | Backend Date & Number Localization | UTC storage; Jalali (`jdatetime`) + Persian numerals in presentation layer |
| **ADR-0005** | Media Storage Strategy | Local disk storage with UUID filenames, extension/size/magic-byte validation & `.htaccess` script execution block |
| **ADR-0006** | Caching & Rate Limiting without Redis | `FileBasedCache` in production and custom DRF `ScopedRateThrottle` classes |
| **ADR-0007** | Authentication Strategy | Email + password authentication with UUID `public_id` exposure to prevent IDOR |
| **ADR-0008** | Leads & CRM Pipeline | Separation of raw `Contact` submissions, 6-stage `Lead` pipeline, and `Newsletter` opt-in |
| **ADR-0009** | Initial AI Engine Data Architecture | Foundational schema for catalogs, prompt templates, guardrails, and AI audit logs |
| **ADR-0010** | Dependency Management | Pinned `requirements.txt` and `requirements-dev.txt` for cPanel Python App compatibility |
| **ADR-0011** | Custom User Model & DB Driver | Email-based `User`, Django Session + CSRF auth, and pure-Python `PyMySQL` driver |
| **ADR-0012** | BaseModel & Soft Delete | `BaseModel` with `deleted_at`, `is_active`, `delete(hard=False)`, and `restore()` |
| **ADR-0013** | Audit Log Design | Centralized `AuditLog` using `GenericForeignKey` for sensitive security and admin actions |
| **ADR-0014** | DRF API Layer Conventions | Unified pagination envelope, structured error envelope, and `drf-spectacular` OpenAPI |
| **ADR-0015** | Structured Logging & Test Tooling | `structlog` (JSON in prod) + `pytest-django`, `factory-boy`, `ruff`, and `mypy --strict` |
| **ADR-0016** | Next.js 16 i18n Routing & `proxy.ts` | `next-intl` with `localePrefix: "as-needed"` (`/` for Persian, `/en` for English) and `src/proxy.ts` |
| **ADR-0017** | Design Tokens without Binary Figma | Extracted Emerald/Obsidian tokens from design specs into Tailwind v4 `@theme inline` |
| **ADR-0018** | Self-Hosted Font Selection | `@fontsource/{vazirmatn,inter,jetbrains-mono}` with `font-display: swap` and zero external CDN |
| **ADR-0019** | Frontend Date & Number Localization | `dayjs` + `jalaliday` and `Intl.NumberFormat` centralized in `src/lib/format/` |
| **ADR-0020** | CSS Token Naming & `/design-system` Page | Prevention of CSS variable circular references and live `/design-system` showcase page |
| **ADR-0021** | Full-Text Search Strategy | `SearchIndexEntry` table using MySQL `FULLTEXT` in production and ranked search in `/api/v1/search/` |
| **ADR-0022** | Sanitized Markdown Content Pipeline | Markdown storage rendered and sanitized via `Markdown` + `nh3` (Rust Ammonia XSS sanitizer) |
| **ADR-0023** | E2E Testing with Playwright | `@playwright/test` configured with `fa` (RTL) and `en` (LTR) projects against production builds |
| **ADR-0024** | Kavenegar SMS Notification Adapter | Lightweight REST adapter over `requests` with configurable email fallback |
| **ADR-0025** | User Profile, Favorites & Moderation | Authenticated course enrollment, generic favorites, and pre-publication comment moderation |
| **ADR-0026** | AI Engine Implementation & Advisor | Creative Advisor (up to 3 concepts), revocable hashed share tokens, deterministic estimator, and blog summaries |
| **ADR-0027** | Custom Admin Theme & Scoped RTL | Jazzmin themed with Emmett brand tokens, self-hosted Vazirmatn font, and 106 scoped `html[dir="rtl"]` rules |
| **ADR-0028** | Admin KPI Dashboard & Workflow | Cached KPI dashboard with inline SVG charts and bulk publish/draft/archive/restore actions |
| **ADR-0029** | Admin Export & Import Strategy | `django-import-export` (CSV/TSV/JSON) with two-step preview, natural keys, and CSV formula injection escaping |
| **ADR-0030** | i18n Tooling & Translation Management | Pure-Python `scripts/i18n.py` (`ast` + `polib`) and admin translation completeness filters |
| **ADR-0031** | SEO Rendering & Managed URLs | Next.js renders sitemap, robots, hreflang, 6 JSON-LD types, 1200×630 OG images & RSS from Django admin data |
| **ADR-0032** | Performance Budget & Asset Strategy | `next/image` AVIF/WebP, self-hosted fonts, layered caching, and per-endpoint DB query count ceilings |
| **ADR-0033** | Security Hardening, 2FA & Backups | Dual-policy CSP, Admin TOTP 2FA (`django-otp`), brute-force login lockout (`429`), and `backup_db` command |
| **ADR-0034** | CI/CD Quality Gates & Pre-commit | Unified Ruff + Black + mypy + ESLint + Prettier, ≥ 85% coverage gates, Pre-commit hooks, and GitHub Actions |
| **ADR-0035** | cPanel Shared Hosting Deployment | Same-origin single-domain Passenger WSGI + Passenger Node.js topology with MySQL 8 and Cron jobs |
| **ADR-0036** | Deployment Readiness & Runbooks (Phase 9) | 100% pinned `requirements.txt`, finalized `production.py`, `deploy_backend.sh`/`deploy_frontend.sh`/`restore_backup.sh` scripts, and `DEPLOYMENT.md` |
| **ADR-0037** | Phase 8 UI Port — E2E, Width Matrix & Lighthouse | CI moved to the repository root, two port-specific E2E suites (`ui-port.spec.ts` and `responsive.spec.ts` across 8 breakpoint widths), and real Lighthouse CI on six URLs gated at `0.95` on all four axes |
| **ADR-0038** | CI Workflow at Repo Root & CI Test Settings | One workflow with six jobs and flat paths at `.github/workflows/ci.yml`, plus `.github/ci/ci_test_settings.py`, which overrides **only** the `staticfiles` key to plain `StaticFilesStorage` for tests |
| **ADR-0039** | Design Token Standard & Raw-Colour Ratchet | Tokens become mandatory over raw literals: two existing tokens wired up, four category palette tokens and two muted-text tokens added, plus the two-way `hardcoded-colors.test.ts` regression guard (amendment note: `adr/README.md`) |
| **ADR-0040** | Product Detail Canonical Is `/projects/{slug}` | The canonical product-detail path is `/projects/{slug}`, not `/products/{slug}`; a module-level `projectDetailPath()` feeds canonical, breadcrumb and JSON-LD from one source, and `/products/pentestor` now 308-redirects to it |
| **ADR-0041** | Content-Page Rendering Model & Internal Service Auth | Public content pages are prerendered at build time and refreshed by ISR (`revalidate` from `serverFetch`); `connection()`/`headers()` were removed from the root layout and `JsonLd`, CSP moved from per-response nonces to a static policy, `proxy.ts` no longer fetches the backend per request (60 s in-memory cache), and server-to-server calls bypass the anonymous throttle via `X-Internal-Token`; regression guard: `npm run verify:rendering` |

---

## Section 3: Complete REST API Documentation (`/api/v1/`)

### 3.1. OpenAPI Schema & Interactive Docs (Rule 8)

- **Raw OpenAPI 3.0 Schema:** `GET /api/v1/schema/`
- **Swagger UI:** `GET /api/v1/schema/swagger-ui/`
- **ReDoc:** `GET /api/v1/schema/redoc/`
- **CLI Validation Gate:**
  ```bash
  python manage.py spectacular --file /tmp/schema.yaml --validate --fail-on-warn
  ```

### 3.2. Global Request & Response Contracts

1. **Localization (`Accept-Language`):** Pass `Accept-Language: fa` (default) or `Accept-Language: en` to receive translated model fields and localized error messages.
2. **Session + CSRF Authentication:**
   - Call `GET /api/v1/auth/csrf/` before any state-changing request (`POST`, `PATCH`, `DELETE`) and send the `csrftoken` cookie value in the `X-CSRFToken` header.
3. **Standard Pagination Envelope:**
   ```json
   {
     "count": 24,
     "total_pages": 2,
     "current_page": 1,
     "next": "https://emmett.ir/api/v1/blog/?page=2",
     "previous": null,
     "results": []
   }
   ```
4. **Standard Error Envelope:**
   ```json
   {
     "error": {
       "code": "validation_error",
       "message": "Invalid input.",
       "details": {}
     }
   }
   ```
5. **Rate Limits (`ScopedRateThrottle`):**
   - `anon`: `100/hour` | `user`: `1000/hour` | `contact_form`: `5/hour` | `auth`: `10/hour` (+ `LoginLockout` returning `429` with `Retry-After`) | `ai_engine`: `20/hour` | `newsletter`: `3/day`.

### 3.3. Complete Endpoint Reference

#### A. Core, Health, Search & SEO (`core`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/health/` | Public | Checks database and cache connectivity (`{"status": "ok", "checks": {"database": true, "cache": true}}`) |
| `GET` | `/api/v1/health/proxy/` | Admin (`IsAdminUser`) | Live on-host proxy-chain diagnostic (`X-Forwarded-For` / `X-Real-IP` / CDN) verifying real client IP sync across `get_client_ip` and DRF `Throttle` (`verdict.ready_for_traffic`) |
| `GET` | `/api/v1/search/` | Public | Global full-text search; query params: `q`, `locale` (`fa`/`en`), `limit` (max 50) |
| `GET` | `/api/v1/seo/settings/` | Public | Global SEO metadata, organization schema fields, social links, Search Console verification code, and `noindex_paths` |
| `GET` | `/api/v1/seo/sitemap/` | Public | All published, indexable URLs across pages, services, projects, blog, and academy |
| `GET` | `/api/v1/seo/redirects/` | Public | Active admin-managed redirects (`301`, `302`, `410`) |
| `GET` | `/api/v1/seo/faq/` | Public | Published FAQ items for a given path (`?path=/services`) used for `FAQPage` JSON-LD |

#### B. Authentication, Profile & Favorites (`accounts`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/auth/csrf/` | Public | Sets the `csrftoken` cookie |
| `POST` | `/api/v1/auth/register/` | Public (`auth` throttle) | Registers a new user (`email`, `password`, `first_name`, `last_name`, `phone`) and starts a session |
| `POST` | `/api/v1/auth/login/` | Public (`auth` throttle) | Authenticates with `email` and `password`; protected by brute-force `LoginLockout` |
| `POST` | `/api/v1/auth/logout/` | Authenticated | Terminates the active session (`204 No Content`) |
| `GET` | `/api/v1/auth/me/` | Authenticated | Returns current user and nested `profile` |
| `PATCH` | `/api/v1/auth/me/` | Authenticated | Updates user/profile fields (`first_name`, `last_name`, `bio`, `job_title`, `company_name`, `locale_preference`) |
| `GET` | `/api/v1/auth/favorites/` | Authenticated | Paginated list of the user's saved favorites |
| `POST` | `/api/v1/auth/favorites/add/` | Authenticated | Bookmarks a content item (`content_type`, `public_id`) |
| `DELETE` | `/api/v1/auth/favorites/{id}/` | Authenticated | Removes a favorite item |

#### C. Taxonomy, Company, Services & Portfolio (`taxonomy`, `company`, `services`, `portfolio`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/taxonomy/categories/` | Public | Lists categories; filterable by `?scope=blog\|academy\|portfolio\|service` |
| `GET` | `/api/v1/taxonomy/tags/` | Public | Lists tags |
| `GET` | `/api/v1/company/team/` | Public | Lists active team members ordered by `order` |
| `GET` | `/api/v1/company/testimonials/` | Public | Lists client testimonials; filterable by `?featured=true` |
| `GET` | `/api/v1/services/` | Public | Lists published services; filterable by `is_featured`, `categories__slug`, `tags__slug` |
| `GET` | `/api/v1/services/{slug}/` | Public | Service detail with sanitized `description_html` and SEO metadata |
| `GET` | `/api/v1/projects/` | Public | Lists published projects; pass `?is_product=true` for flagship products (Pentestor, CRM) |
| `GET` | `/api/v1/projects/{slug}/` | Public | Project detail including `gallery_urls` and 7-section `case_study` |

#### D. Academy, Library (Blog) & Leads (`academy`, `blog`, `leads`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/academy/` | Public | Lists published courses; filterable by `level`, `is_featured`, `categories__slug` |
| `GET` | `/api/v1/academy/{slug}/` | Public | Course detail with `instructor` and ordered `lessons` |
| `GET` | `/api/v1/academy/enrollments/` | Authenticated | Lists current user's course enrollments |
| `POST` | `/api/v1/academy/enrollments/add/` | Authenticated | Idempotently enrolls current user in a course (`{"course_slug": "..."}`) |
| `GET` | `/api/v1/academy/rss/` | Public | RSS 2.0 feed of published courses |
| `GET` | `/api/v1/blog/` | Public | Lists published blog posts |
| `GET` | `/api/v1/blog/{slug}/` | Public | Blog post detail with `content_html`, generated `toc`, approved `comments`, `related_posts`, and approved `ai_summary` |
| `POST` | `/api/v1/blog/{slug}/comments/` | Authenticated | Submits a comment (`status=pending` until admin approval) |
| `GET` | `/api/v1/blog/rss/` | Public | RSS 2.0 feed of published blog posts |
| `POST` | `/api/v1/leads/contact/` | Public (`contact_form` throttle) | Submits contact form (`name`, `email`, `phone`, `project_type`, `budget_range`, `timeline`, `message`, `consent_given=true`) |
| `POST` | `/api/v1/leads/newsletter/` | Public (`newsletter` throttle) | Subscribes an email to the newsletter (`email`, `locale_preference`) |

#### E. Centralized AI Engine (`ai_engine`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/ai/catalogs/` | Public | Returns active public catalogs and localized options; filterable by `?keys=job_role,goal,...` |
| `POST` | `/api/v1/ai/advisor/` | Public (`ai_engine` throttle) | Generates up to 3 structured software concepts from closed catalog keys (`job_role`, `business_size`, `city_scale`, `budget_range`, `team_size`, `goals[]`); returns `share_token` and `suggestion` |
| `GET` | `/api/v1/ai/results/{token}/` | Public (`noindex`) | Retrieves a shared AI suggestion by token (excludes input payload and contact PII) |
| `POST` | `/api/v1/ai/leads/` | Public (`contact_form` throttle) | Creates a `Contact` and sales `Lead` linked to a shared AI suggestion and concept (`share_token`, `concept_public_id`, `contact`) |
| `POST` | `/api/v1/ai/estimates/` | Public (`ai_engine` throttle) | Deterministic optimistic minimum working-day estimate by `delivery_scope` (no monetary price) |

---

## Section 4: SaaS Admin Panel Guide

> In cPanel production, Django is mounted with `DJANGO_FORCE_SCRIPT_NAME=/backend`; prefix every Django admin and i18n URL below with `/backend` (for example `/backend/admin/`). The unprefixed paths describe Django's local/development mount.

### 4.1. Access, Roles, Theme & Scoped RTL

- **URL:** `/admin/`
- **Language & Direction:** Switch between **Persian (`fa`, RTL default)** and **English (`en`, LTR)** via the top bar language selector (`/i18n/setlang/`). The custom `emmett-rtl.css` stylesheet (106 rules scoped under `html[dir="rtl"]`) loads exclusively when the active locale is Persian (`ADR-0027`).
- **Self-Hosted Assets:** All fonts (Vazirmatn `woff2`) and brand icons are served locally without external CDNs.

### 4.2. KPI Dashboard (`/admin/`)

The admin index page renders a cached operational dashboard (`ADMIN_DASHBOARD_CACHE_SECONDS=120`, `ADR-0028`):
- **6 KPI Cards:** Registered Users, AI Requests (with Cache Hit rate and Guardrail blocks), Sales Leads & conversion rate, Academy Enrollments, 30-day Sales Signals, and Pending AI Summaries.
- **8-Week Trend Charts:** Inline SVG bar charts for weekly AI requests and new contacts.
- **Pipeline & Content Breakdown:** Lead counts by stage (`new → contacted → qualified → proposal → won → lost`) and content counts by publication status (`draft / published / archived`).
- **Audit Widgets:** Latest sensitive events from `core.AuditLog` and the current staff user's recent changes from `admin.LogEntry`.

### 4.3. Publication Workflow & Soft-Delete / Restore

- **Bulk Publication Actions (`PublishWorkflowMixin`):**
  - `Publish selected content`: sets `status="published"` and populates `published_at` if empty (preserving original publication timestamps on re-publish).
  - `Return selected content to draft`: sets `status="draft"`.
  - `Archive selected content`: sets `status="archived"`.
  - Every bulk action requires `change` permission and writes a structured entry to `core.AuditLog`.
- **Soft-Delete & Restore (`SoftDeleteAdminMixin`):**
  - Deleting any `BaseModel` sets `deleted_at` and `is_active=False` without removing the row.
  - To restore: filter by **Record state → Deleted** (`?record_state=deleted`), select the rows, and run **Restore selected records**.

### 4.4. Translation Management & `scripts/i18n.py`

- **In Admin (`Core → Translations`):** Use the **Translation completeness** filter (`Missing Persian (fa)`, `Missing English (en)`, `Registered in both languages`) and the **Create the missing language row** bulk action.
- **In CLI (for gettext `.po`/`.mo` files):**
  ```bash
  cd backend
  python scripts/i18n.py extract   # Extract translatable strings via Python AST & template lexer
  python scripts/i18n.py compile   # Compile .po files to binary .mo files
  python scripts/i18n.py check     # Quality gate: 100% Persian coverage + .mo freshness
  python scripts/i18n.py stats     # Display translation coverage statistics
  ```

### 4.5. AI Catalogs, Prompts, Summaries & Data Import/Export

- **AI Governance (`ai_engine`):** Catalog keys and PromptTemplate `(feature, locale, version)` keys become immutable after creation. Use **Archive superseded versions** to retire older prompts, **Approve/Reject selected summaries** on `AIContentArtifact`, and **Revoke public share links** on `AISuggestion`.
- **CSV / TSV / JSON Import & Export (`ADR-0029`):**
  - All 35 registered models across the 10 domain apps have an explicit `Resource` class in `apps/<app>/resources.py` — 36 `*Resource` classes in total: 35 model-specific plus the shared `EmmettResource` base at `apps/core/resources.py:60`. Each has natural import keys (`slug`, `(course, order)`, `(namespace, key, locale)`), transactional two-step import preview, and automatic CSV formula injection escaping (`=`, `+`, `-`, `@`).
  - Every data export is logged in `core.AuditLog` (`<app>.<Model>.exported`).

### 4.6. Admin Two-Factor Authentication (2FA) & System Checks

- **Admin 2FA (`ADR-0033`):** Enforced in production via `ADMIN_2FA_REQUIRED=True`. Staff enroll at `/admin/2fa/setup` using an offline inline `data:` SVG QR code or Base32 secret, verify at `/admin/2fa/verify` (rate-limited with lockout after 5 failed attempts), and receive 8 one-time recovery codes at `/admin/2fa/recovery`.
- **Django System Checks (`emmett_admin.E001`–`W013`):** Run `python manage.py check` (and `python manage.py check --deploy --settings=config.settings.production`) to verify Jazzmin ordering, static assets, `.mo` freshness, `PUBLIC_SITE_URL`, CSP, 2FA enforcement, Search Console verification code, writable `BACKUP_DIR`, and `SECRET_KEY` entropy.

### 4.7. Admin SEO, Redirects & FAQ Management

- **SEO settings (`ADR-0031`):**
  - In `Site settings`: the default meta title and description, organization contact details, social profile links, the default Open Graph image, and the Google Search Console verification code.
  - In `Redirects`: map legacy paths with status `301` (permanent), `302` (temporary) or `410` (content permanently removed, served through a dedicated `410 Gone` page).
  - In `FAQ items`: record each page's frequently asked questions (for example `/services`); they are emitted automatically into that page's `FAQPage` schema.

---

## Section 5: Step-by-Step cPanel Shared Hosting Deployment Guide

This guide implements `ADR-0035` for Iranian shared hosting environments running **cPanel + Phusion Passenger (Python 3.11 & Node.js 22) + MySQL 8**.

### 5.1. cPanel Host Prerequisites

1. **Setup Python App** (with Python 3.11) and **Setup Node.js App** (with Node.js 22 LTS) enabled in cPanel;
2. Access to **MySQL Databases** (MySQL 8.0, or an equivalent MariaDB with full `utf8mb4` support and `FULLTEXT` indexing);
3. A valid SSL certificate on the primary domain (issued through **SSL/TLS Status → Run AutoSSL**);
4. Access to **Terminal** (or SSH) and **Cron Jobs** in cPanel.

### 5.2. Step 1: Create the MySQL 8 Database in cPanel

1. Open **MySQL® Databases** in cPanel and create database `cpaneluser_emmett`.
2. Create a database user `cpaneluser_app` with a strong password and grant `ALL PRIVILEGES`.
3. In **phpMyAdmin**, verify `utf8mb4` character set and collation:
   ```sql
   ALTER DATABASE `cpaneluser_emmett` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 5.3. Step 2: Clone Repository & Initialize Private Directories

```bash
cd ~
git clone https://github.com/EmmettSS/EmmettWebSite.git
cd ~/EmmettWebSite

mkdir -p ~/EmmettWebSite/backend/media
mkdir -p ~/EmmettWebSite/backend/backups
mkdir -p ~/EmmettWebSite/backend/.cache/django-cache
chmod 700 ~/EmmettWebSite/backend/backups ~/EmmettWebSite/backend/.cache/django-cache

# Harden media directory against script execution (ADR-0005)
cp ~/EmmettWebSite/backend/deploy/media.htaccess.example ~/EmmettWebSite/backend/media/.htaccess

# Copy Passenger WSGI entrypoint (ADR-0035)
cp ~/EmmettWebSite/backend/deploy/passenger_wsgi.py.example ~/EmmettWebSite/backend/passenger_wsgi.py
```

### 5.4. Step 3: Configure Django Backend (`Setup Python App`)

1. In cPanel → **Setup Python App** → **Create Application**:
   - **Python version:** `3.11`
   - **Application root:** `EmmettWebSite/backend`
   - **Application URL:** exactly `/backend` on the primary domain; Node.js owns `/`. The host must support both Passenger apps at these URL mounts.
   - **Application startup file:** `passenger_wsgi.py`
   - **Application Entry point:** `application`
2. Activate the virtualenv in cPanel Terminal and install production dependencies:
   ```bash
   source /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/activate
   cd ~/EmmettWebSite/backend
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
3. Set Python runtime values in **Setup Python App → Environment Variables** (including `DJANGO_SETTINGS_MODULE=config.settings.production`, `DJANGO_FORCE_SCRIPT_NAME=/backend`, `PUBLIC_SITE_URL`, MySQL credentials, `FRONTEND_REVALIDATE_URL=https://emmett.ir/api/revalidate`, and `FRONTEND_REVALIDATE_SECRET`). Set that same high-entropy revalidation secret in the Node App environment. If cPanel Terminal/Cron does not inherit the app variables, create a server-only `backend/.env` (`chmod 600`, excluded from Git) for CLI commands; do not assume Passenger variables are available to CLI/Cron. See the [Production operations runbook](deployment/production-operations.md).
4. Run database migrations, static collection, translation verification, and deploy checks:
   ```bash
   python manage.py migrate --noinput
   python manage.py collectstatic --noinput
   python scripts/i18n.py check
   python manage.py check --deploy
   python manage.py createsuperuser
   ```
5. Click **Restart** in **Setup Python App**.

### 5.5. Step 4: Build & Start Next.js Frontend (`Setup Node.js App`)

1. In cPanel → **Setup Node.js App** → **Create Application**:
   - **Node.js version:** exactly `22.22.3` (matches `frontend/package.json` and CI)
   - **Application mode:** `Production`
   - **Application root:** `EmmettWebSite/frontend`
   - **Application URL:** `emmett.ir`
   - **Application startup file:** `server.js` from `frontend/deploy/server.js.example`.
   - **Environment variables:** `NODE_ENV=production`, `PUBLIC_SITE_URL=https://emmett.ir`, `INTERNAL_API_URL=https://emmett.ir/backend`, and the same server-only `FRONTEND_REVALIDATE_SECRET` used by Django.
2. In cPanel Terminal, activate the Node virtualenv, install packages, and build:
   ```bash
   source /home/<cpanel_user>/nodevenv/EmmettWebSite/frontend/22/bin/activate
   cd ~/EmmettWebSite/frontend
   npm ci
   npm run build
   ```
3. Click **Restart** in **Setup Node.js App**.

### 5.6. Step 5: Configure cPanel Cron Jobs

Register three cron jobs in cPanel → **Cron Jobs**:
1. **Daily Database & Media Backup (03:30 AM):**
   ```cron
   30 3 * * * cd /home/<cpanel_user>/EmmettWebSite/backend && /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/python manage.py backup_db --keep 7 >> /home/<cpanel_user>/backup.log 2>&1
   ```
2. **Weekly AI Operational Audit Purge (Sundays at 04:00 AM):**
   ```cron
   0 4 * * 0 cd /home/<cpanel_user>/EmmettWebSite/backend && /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/python manage.py purge_ai_audit >> /home/<cpanel_user>/ai_purge.log 2>&1
   ```
3. **Daily Draft Blog Summary Generation (04:30 AM, when `AI_ENABLED=true`):**
   ```cron
   30 4 * * * cd /home/<cpanel_user>/EmmettWebSite/backend && /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/python manage.py generate_blog_summaries >> /home/<cpanel_user>/ai_summary.log 2>&1
   ```

### 5.7. Step 6: Post-Deployment Verification Checklist

- [ ] `https://emmett.ir/api/v1/health/` returns `200 OK` with `{"status": "ok", "checks": {"database": true, "cache": true}}`.
- [ ] While signed in to `/backend/admin/`, `https://emmett.ir/api/v1/health/proxy/` returns `200 OK` with `verdict.ready_for_traffic: true` (verifying `X-Forwarded-For` traverses Apache and Next.js and `resolved_client_ip` is the real client IP, not `127.0.0.1`).
- [ ] `python manage.py check --deploy` reports no errors and no security warnings (`W007`–`W013`).
- [ ] Signing in at `https://emmett.ir/backend/admin/` redirects staff to 2FA enrolment (`/backend/admin/2fa/setup`), and the recovery codes have been stored somewhere safe.
- [ ] In the admin's `Site settings`, the Google Search Console verification code is filled in and `https://emmett.ir/sitemap.xml` has been submitted to Search Console.
- [ ] `/` (Persian, `dir="rtl"`), `/en` (English, `dir="ltr"`), the `/blog/rss` and `/academy/rss` feeds, and the `/opengraph-image` all load without error.
- [ ] `python manage.py backup_db` has been run once by hand and the `db-*.gz` and `manifest-*.json` files exist under `backups/`.

---

## Section 6: Quality Gates, Testing, Pre-commit & CI/CD Pipeline

### 6.1. Local Verification Commands

> **Shortest path:** `make verify` (format-check + lint + typecheck + tests + build + `verify:rendering`). See `make help` for all targets.

```bash
# Backend Quality & Tests (Coverage ≥ 85%)
cd backend && source .venv/bin/activate
ruff check .
ruff format --check .
black --check .
mypy apps config
bandit -c pyproject.toml -r apps config -ll
python scripts/i18n.py check
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py spectacular --file /tmp/schema.yaml --validate --fail-on-warn
PYTHONPATH=../.github/ci DJANGO_SETTINGS_MODULE=ci_test_settings coverage run -m pytest -q && coverage report --fail-under=85 -m
    # CI settings shim switches test static storage to plain `StaticFilesStorage`; base settings configure `NonStrictCompressedManifestStaticFilesStorage` so both direct `pytest` runs and production Jazzmin admin pages render cleanly

# Frontend Quality, Unit Coverage (≥ 85%), Build & E2E
cd ../frontend
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run test:e2e
```

### 6.2. Pre-commit Hooks & GitHub Actions Pipeline

- **Pre-commit (`.pre-commit-config.yaml`):** Runs `scripts/check_secrets.py`, `ruff check`, `ruff format --check`, `black --check`, `mypy apps config`, `scripts/i18n.py check`, `prettier --check`, `eslint`, `tsc --noEmit`, and `scripts/check_commit_msg.py` (Conventional Commits validator).
- **GitHub Actions (`.github/workflows/ci.yml`):** Executes 6 automated jobs (`backend-quality`, `backend-test`, `frontend-quality`, `frontend-test-build`, `security-scan`, and `e2e-and-lighthouse` enforcing Lighthouse CI ≥ 0.95 via `.lighthouserc.json`).

### 6.3. Test Coverage: Actual Measured Scope

> **This subsection is deliberately explicit.** Quoting a coverage percentage without its scope is misleading, because the CI gates apply to a **subset** of the code, not all of it. Every coverage number in this repository must be read together with its scope.
>
> All figures in this subsection come from a single measurement session at commit `9c6d685` (Vitest `5.0.3` with the `v8` provider; Python `coverage` using `backend/pyproject.toml`) and are consistent with **99 frontend unit tests** and **497 backend tests**.

#### 6.3.1. Frontend — what the gate actually measures

`coverage.include` in `frontend/vitest.config.mts` is set to **five globs**: `src/lib/**/*.ts` and `src/components/{ui,molecules,organisms,seo}/**/*.tsx`. The enforced thresholds are `85 / 78 / 85 / 85` (statements / branches / functions / lines).

That scope walks **32 of the 93 source files under `src`** (34%):

| Measured scope | Files | statements | branches | functions | lines |
|---|---|---|---|---|---|
| CI gate as configured | 32 of 93 | **98.08** | **78.31** | **98.22** | **98.68** |
| Same scope **without** the `profile-view.tsx` exclusion | 33 of 93 | 88.10 | **71.37** ⚠️ | 91.20 | 88.38 |
| **All of `src`** (the honest frontend number) | 93 | **41.67** | **36.14** | **45.31** | **41.99** |

⚠️ The second row matters because it is **load-bearing for the gate**: including `profile-view.tsx` drops `branches` to 71.37, which **breaks** the 78 threshold. In other words, the branches gate passes only because that one file is excluded (details in 6.3.3).

#### 6.3.2. Frontend — what is not measured

**61 source files** fall outside the five globs above and are therefore **absent from the coverage number**:

| Path | Files | statements | branches | functions | lines | What it is |
|---|---|---|---|---|---|---|
| `src/app/**` | 35 | **0.48** | 0 | 0 | **0.51** | All 35 files under `src/app`: 31 route-segment files (20 `page.tsx`, 4 `layout.tsx`, 3 `route.ts`, 2 `error.tsx` including `global-error.tsx`, 2 `not-found.tsx`) plus 4 metadata/data generators (`sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `hardcoded-colors.baseline.ts`) |
| `src/components/ui-port/**` | 22 | **21.07** | 20.49 | 24.41 | 21.32 | The visible site shell: home page, navbar, hero, ⌘K palette, footer and the products/services/projects/academy/library/contact sections |
| `src/i18n/**` | 3 | **28.57** | 0 | 0 | 28.57 | `navigation.ts`, `request.ts`, `routing.ts` |
| `src/proxy.ts` | 1 | **0** | 0 | 0 | 0 | Proxy middleware (path rewriting and redirects) |

Measured across all of `src`, frontend coverage is **41.67%** — not 98%.

> **Methodology warning about the table above:** Vitest's `text` reporter aggregates only the files **directly** in each directory, not the whole subtree. That is why the `src/app` row in the `text` output reads **6.25%**, while the true figure across all 35 files of the subtree is **0.48%** (statements) and **0.51%** (lines). The `src/app/**` figures in this table are computed from `coverage/coverage-summary.json`, which is the authoritative source. For the remaining directories (`ui-port`, `i18n`, `organisms`, `seo`, `ui`, `molecules`) there are no subdirectories, so the text-report row equals the subtree value.
>
> Weight of each scope within the frontend's 1699 total statements: `ui-port` **39.4%**, `src/app/**` **24.5%**, `src/lib/**` **17.4%**, the four measured component directories **16.4%**, `src/proxy.ts` **1.9%** and `src/i18n/**` **0.4%**. These weights drive the projection in 6.3.8.
>
> Precision note: `ui-port` also contains five `.ts` files, two of which are well covered (`dialog-a11y.ts` = 91.48%, `home-data.ts` = 100%). If the scope is written as `**/*.tsx` only, those two are dropped and `ui-port` is misreported as **13.24%** instead of **21.07%**. The correct figure is 21.07%, which covers every file in the directory.

#### 6.3.3. Frontend — the `coverage.exclude` entries

Three files are explicitly excluded. The first two are fully justified; the third is not:

| File | Lines | Runtime exports | Coverage | Verdict |
|---|---|---|---|---|
| `src/lib/api/types.ts` | 283 | **0** (31 `type`/`interface`) | — | ✅ **Justified** — type declarations only, emits no JS |
| `src/lib/seo/types.ts` | 74 | **0** (9 `type`) | — | ✅ **Justified** — same reason |
| `src/components/organisms/profile-view.tsx` | 250 | **16** | **0%** (lines 1–238) | ❌ **Not justified** — a real runtime component that no test executes |

#### 6.3.4. Frontend — two properties of the gate itself worth knowing

**1) The `branches` threshold (78) is not homogeneous with the other three (85)**, and a single global threshold hides per-directory weakness. Within the measured scope itself, two directories are **individually below 78** and pass only because `lib`/`ui`/`molecules` sit at 100% and lift the aggregate:

| Directory | statements | branches | functions | lines |
|---|---|---|---|---|
| `src/lib` | 100 | 100 | 100 | 100 |
| `src/lib/api` | 98.38 | 85.71 | 100 | 100 |
| `src/lib/format` | 100 | 75 | 100 | 100 |
| `src/lib/seo` | 97.35 | 79.54 | 94.44 | 97.76 |
| `src/components/ui` | 100 | 100 | 100 | 100 |
| `src/components/molecules` | 100 | 93.33 | 100 | 100 |
| `src/components/organisms` | 97.89 | **71.28** ← below 78 | 98.41 | 98.22 |
| `src/components/seo` | 100 | **75** ← below 78 | 100 | 100 |

**2) The gate margin is thin.** After Package 4 the `branches` margin is only **+0.31** (78.31 against a threshold of 78). Adding almost any branching code without a test will turn the gate red.

#### 6.3.5. Backend — scope and figures

`backend/pyproject.toml` sets `source = ["apps"]`, `omit = ["*/migrations/*", "*/tests/*"]` and `fail_under = 85`.

| Measured scope | Files | statements | missed | Coverage |
|---|---|---|---|---|
| CI gate as configured (`apps/`) | 157 | 5607 | 325 | **94%** |
| Wide scope (`apps` + `config` + `scripts`) | — | 6083 | 513 | **92%** |

Outside the gate scope: `config/` (773 lines) and `scripts/` (524 lines). Measured, they break down as follows:

| File | Coverage | Why |
|---|---|---|
| `config/settings/base.py` | 98% | Most of it executes when settings load |
| `config/settings/dev.py` | 79% | Development-only conditional branches |
| `config/urls.py` | 75% | |
| `config/settings/production.py` | **0%** | CI runs dev settings, so it never loads |
| `config/asgi.py` / `config/wsgi.py` | **0%** | Server entry points; not executed under test |
| `scripts/i18n.py` | **58%** | Has `test_i18n_tooling.py`, but its CLI branches are uncovered |
| `scripts/generate_brand_assets.py` | **0%** | No tests |

`migrations` (18 files / 1837 lines) are omitted, which is **standard practice**: machine-generated code rather than hand-written logic.

**Conclusion for the backend:** both figures (94% and 92%) are above the 85% threshold, so the backend gap is **small and defensible** compared with the frontend one.

#### 6.3.6. What lint and type-checking cover (unlike test coverage)

The statement "all repository code is linted and type-checked" is **true**; only "tested" has a restricted scope. Verified breakdown:

| Gate | Actual scope | Status |
|---|---|---|
| `tsc --noEmit` (frontend) | `**/*.ts` and `**/*.tsx` → **all of `src`**, including `ui-port` and `app` | ✅ Complete |
| `eslint` (frontend) | Whole project | ✅ Complete |
| `prettier --check` (frontend) | `src/**`, `e2e/**`, `messages/**` | ✅ Complete |
| `ruff check .` / `ruff format --check .` / `black --check .` (backend) | **Everything**, including `scripts/` | ✅ Complete |
| `mypy apps config` (backend) | 242 files — **does not include `scripts/`** | ⚠️ Gap |

The only non-coverage gap: `backend/scripts/` (524 lines) is not type-checked, because CI runs `mypy apps config` rather than `mypy .`.

#### 6.3.7. Compensating controls — unmeasured code is not unprotected

Unit-test coverage is not the only protective layer. For those same 61 unmeasured files, CI runs:

- **60 E2E tests across 9 files** on **real Chromium** in three projects (`fa` / `fa-locale` / `en`). Most of these exercise exactly the `src/app/**` pages and the `ui-port` shell in a browser — the places where unit coverage is 6% and 21%.
- **Lighthouse CI with a minimum score of `0.95`** across all four axes on **6 URLs** (`.lighthouserc.json`: `/`, `/en`, `/services`, `/blog`, `/projects/pentestor` and `/products/crm`), active on `main` and `workflow_dispatch`.
- **A two-way raw-colour ratchet** (Package 2, `hardcoded-colors.test.ts`): the ceiling is now **177 literals across 16 files** — Package 6 lowered it from 360 across 20 files — with four explicit reasoned exceptions (three of them have no CSS cascade: `global-error.tsx`, `not-found.tsx`, and shared `brand-colors.ts` serving the OG image and 410 page; the fourth, `neural-network-3d.tsx`, feeds colors to Three.js/WebGL as numbers; `scannedTotal = 200 = 177 + 23`). The breakdown of the 177 remaining literals (151 with no equal-value token + 26 that have one but cannot be migrated) is in the Package 6 CHANGELOG entry.
- Strict `mypy` and `ruff` across the codebase (subsection 6.3.6).

The risk is therefore not "untested code"; it is **"code whose unit tests never execute at function/branch level"**. That distinction matters and must stay precise in any risk assessment.

#### 6.3.8. Decision status

Package 5 of the seven-package remediation plan ("honest coverage") was to add `src/components/ui-port/**/*.tsx` to `coverage.include`. Three options were examined and measured:

| Option | Measured outcome |
|---|---|
| Write tests up to the existing threshold | **Arithmetically impossible at the measured weights.** `ui-port` accounts for 39.4% of statements, so even taking it to **100%** lifts the overall average only to **72.75%** (85% would have required 131% coverage). Reaching 85% also requires covering `src/app/**`: either `ui-port` → 100% **and** `src/app` → 50.5%, or both → 85%, which yields 87.54%. Separately, most of `ui-port` is presentational/animation code, so percentage-driven tests would have been **coverage theatre**. Rejected |
| Per-directory thresholds | Measured with Vitest `5.0.3`: the global threshold **still applies to every file**, and glob-specific thresholds do **not** remove matched files from the global calculation. Implementable only if the global threshold is also set to the honest figure |
| Include in the report with no gate | Produces an honest number but leaves nothing enforcing it |

**Owner decision (2026-10-20):** Package 5 was **deferred until after deployment** (time constraint). Consequently:

- `coverage.include` and `thresholds` were **left untouched**. No threshold was lowered (rule 19 respected).
- **No CI change was required**: the gate is green and internally consistent at its current scope.
- The replacement commitment is **this subsection**: instead of changing the gate, its actual scope is fully disclosed so that no number can be quoted without context.
- This is a **consciously accepted technical debt**, not an unintended state. Any future revision must start from the figures in this subsection, not from 98%.

#### 6.3.9. Reproducing the figures

```bash
# Frontend — the gate number (exactly what CI runs)
cd frontend && npm run test:coverage          # → 98.08 / 78.31 / 98.22 / 98.68

# Backend — the gate number
cd backend && PYTHONPATH=../.github/ci DJANGO_SETTINGS_MODULE=ci_test_settings coverage run -m pytest --create-db -q && coverage report --fail-under=85
#                                                          → 5607 stmt / 325 missed / 94%

# Backend — wide scope
coverage run --source=apps,config,scripts -m pytest --create-db -q && coverage report --fail-under=0
#                                                          → 6083 stmt / 513 missed / 92%

# E2E test count (authoritative source, not a grep count)
cd frontend && npx playwright test --list      # → Total: 60 tests in 9 files
```

The **all-of-`src`** figure (41.67%) is not part of CI. It was obtained with a temporary throwaway configuration that was **not** committed: `coverage.include` widened to `["src/**/*.ts", "src/**/*.tsx"]` and every `thresholds` entry set to zero, then `npx vitest run --coverage`. To repeat it, apply those two changes to `vitest.config.mts` temporarily and revert them afterwards.

> **Methodology warning:** counting tests with `grep -c 'test('` yields **63**, which is **wrong**; the only authoritative source is `npx playwright test --list`. Likewise, directory coverage must be taken from a single report: the `**/*.tsx` glob alone reports 13.24% for `ui-port` because it drops the `.ts` files in that same directory.
