# Emmett Software Development Group — Comprehensive Technical Documentation (English)

> **Document Type:** Unified Single-File Technical Reference (English)  
> **Persian Counterpart:** [`docs/TECHNICAL_DOCUMENTATION.fa.md`](./TECHNICAL_DOCUMENTATION.fa.md)  
> **Scope:** System Architecture, Data Model, Summary of All 35 ADRs, Complete REST API Reference (`/api/v1/`), SaaS Admin Panel Guide, Step-by-Step cPanel Shared Hosting Deployment Guide, and Quality Gates / CI-CD Pipeline.

---

## Table of Contents

1. [Section 1: System Architecture & Data Model](#section-1-system-architecture--data-model)
2. [Section 2: Architecture Decision Records Index (ADR-0001 to ADR-0035)](#section-2-architecture-decision-records-index-adr-0001-to-adr-0035)
3. [Section 3: Complete REST API Documentation (`/api/v1/`)](#section-3-complete-rest-api-documentation-apiv1)
4. [Section 4: SaaS Admin Panel Guide](#section-4-saas-admin-panel-guide)
5. [Section 5: Step-by-Step cPanel Shared Hosting Deployment Guide](#section-5-step-by-step-cpanel-shared-hosting-deployment-guide)
6. [Section 6: Quality Gates, Testing, Pre-commit & CI/CD Pipeline](#section-6-quality-gates-testing-pre-commit--cicd-pipeline)

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
  - **Server Components:** Fetch directly from `INTERNAL_API_URL` (default `http://127.0.0.1:8000`) with the active `Accept-Language` header and layered `revalidate` caching.
  - **Client Components:** Always call same-origin relative paths (`/api/v1/...`), which are proxied server-side by `frontend/src/app/api/[...path]/route.ts` while preserving trailing slashes (compatible with Django `APPEND_SLASH`) and forwarding `Set-Cookie` headers (`csrftoken`, `sessionid`).

### 1.2. Django Modular Monolith App Boundaries (`backend/apps/`)

| App | Domain Responsibility | Primary Models |
|---|---|---|
| `core` | Shared base models, soft-delete, media storage, dynamic translations, security audit log, full-text search (FTS), SEO settings/redirects/FAQs, security middleware & admin KPI dashboard | `SiteSettings`, `Media`, `Translation`, `AuditLog`, `SearchIndexEntry`, `Redirect`, `FAQItem` |
| `accounts` | Custom email-based user model, profiles, favorites, Session/CSRF authentication, and Admin 2FA (TOTP + recovery codes) | `User`, `Profile`, `Favorite` (+ `django_otp` tables) |
| `taxonomy` | Hierarchical categories and flat tags shared across content apps | `Category`, `Tag` |
| `company` | Team members and client testimonials (About page) | `TeamMember`, `Testimonial` |
| `services` | Software engineering service offerings | `Service` |
| `portfolio` | Portfolio projects, flagship products (`is_product=True` such as Pentestor and CRM), and 7-section case studies | `Project`, `CaseStudy` |
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

## Section 2: Architecture Decision Records Index (ADR-0001 to ADR-0035)

All 35 ADRs are stored in `docs/adr/`:

| ADR | Title | Summary of Decision |
|---|---|---|
| **ADR-0001** | Overall System Architecture | Monorepo with Next.js (SSR) in `frontend/` and Django/DRF in `backend/` targeting cPanel |
| **ADR-0002** | Django App Boundaries | Modular Monolith divided into 11 domain apps + `api` composition layer |
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
| `GET` | `/api/v1/health/` | Public | Checks database and cache connectivity (`{"status": "ok", "database": "ok", "cache": "ok"}`) |
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
  - Every model has an explicit `ModelResource` with natural import keys (`slug`, `(course, order)`, `(namespace, key, locale)`), transactional two-step import preview, and automatic CSV formula injection escaping (`=`, `+`, `-`, `@`).
  - Every data export is logged in `core.AuditLog` (`<app>.<Model>.exported`).

### 4.6. Admin Two-Factor Authentication (2FA) & System Checks

- **Admin 2FA (`ADR-0033`):** Enforced in production via `ADMIN_2FA_REQUIRED=True`. Staff enroll at `/admin/2fa/setup` using an offline inline `data:` SVG QR code or Base32 secret, verify at `/admin/2fa/verify` (rate-limited with lockout after 5 failed attempts), and receive 8 one-time recovery codes at `/admin/2fa/recovery`.
- **Django System Checks (`emmett_admin.E001`–`W013`):** Run `python manage.py check` (and `python manage.py check --deploy --settings=config.settings.production`) to verify Jazzmin ordering, static assets, `.mo` freshness, `PUBLIC_SITE_URL`, CSP, 2FA enforcement, Search Console verification code, writable `BACKUP_DIR`, and `SECRET_KEY` entropy.

---

## Section 5: Step-by-Step cPanel Shared Hosting Deployment Guide

This guide implements `ADR-0035` for Iranian shared hosting environments running **cPanel + Phusion Passenger (Python 3.11 & Node.js 22) + MySQL 8**.

### 5.1. Step 1: Create the MySQL 8 Database in cPanel

1. Open **MySQL® Databases** in cPanel and create database `cpaneluser_emmett`.
2. Create a database user `cpaneluser_app` with a strong password and grant `ALL PRIVILEGES`.
3. In **phpMyAdmin**, verify `utf8mb4` character set and collation:
   ```sql
   ALTER DATABASE `cpaneluser_emmett` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 5.2. Step 2: Clone Repository & Initialize Private Directories

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

### 5.3. Step 3: Configure Django Backend (`Setup Python App`)

1. In cPanel → **Setup Python App** → **Create Application**:
   - **Python version:** `3.11`
   - **Application root:** `EmmettWebSite/backend`
   - **Application startup file:** `passenger_wsgi.py`
   - **Application Entry point:** `application`
2. Activate the virtualenv in cPanel Terminal and install production dependencies:
   ```bash
   source /home/<cpanel_user>/virtualenv/EmmettWebSite/backend/3.11/bin/activate
   cd ~/EmmettWebSite/backend
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
3. Create `~/EmmettWebSite/backend/.env` (`chmod 600 .env`) from `backend/.env.example` with production values (`DJANGO_SETTINGS_MODULE=config.settings.production`, `DJANGO_DEBUG=False`, `PUBLIC_SITE_URL=https://emmett.ir`, `ADMIN_2FA_REQUIRED=True`, MySQL credentials, and a 64-character random `DJANGO_SECRET_KEY`).
4. Run database migrations, static collection, translation verification, and deploy checks:
   ```bash
   python manage.py migrate --noinput
   python manage.py collectstatic --noinput
   python scripts/i18n.py check
   python manage.py check --deploy
   python manage.py createsuperuser
   ```
5. Click **Restart** in **Setup Python App**.

### 5.4. Step 4: Build & Start Next.js Frontend (`Setup Node.js App`)

1. In cPanel → **Setup Node.js App** → **Create Application**:
   - **Node.js version:** `22.x`
   - **Application mode:** `Production`
   - **Application root:** `EmmettWebSite/frontend`
   - **Application URL:** `emmett.ir`
   - **Environment variables:** `NODE_ENV=production`, `PUBLIC_SITE_URL=https://emmett.ir`, `INTERNAL_API_URL=http://127.0.0.1:8000` (or `https://api.emmett.ir` in the subdomain topology).
2. In cPanel Terminal, activate the Node virtualenv, install packages, and build:
   ```bash
   source /home/<cpanel_user>/nodevenv/EmmettWebSite/frontend/22/bin/activate
   cd ~/EmmettWebSite/frontend
   npm ci
   npm run build
   ```
3. Click **Restart** in **Setup Node.js App**.

### 5.5. Step 5: Configure cPanel Cron Jobs

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

---

## Section 6: Quality Gates, Testing, Pre-commit & CI/CD Pipeline

### 6.1. Local Verification Commands

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
coverage run -m pytest -q && coverage report --fail-under=85 -m

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
