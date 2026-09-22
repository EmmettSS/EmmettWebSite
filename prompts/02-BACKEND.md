# EMMETT GROUP — PHASE 2 PROMPT: BACKEND
### Complete Django Backend — API, Admin, Email, Static Bridge, cPanel Packaging, Tests

> **Self-contained phase prompt.** Assume Phase 1 has landed (monorepo with `web/` + `api/`
> slot, CI with an `api` job, ADR-001/003/004, `docs/I18N.md` API language model). If you are
> running this phase standalone, first read `prompts/00-MASTER.md` (authoritative) and ensure
> the Phase 1 exit gates are met; if any are not, fix them first (they are preconditions).

---

## 1. Mission

Build Emmett's **complete, production-grade Django backend** in `api/` — the commercial core
of the site: lead intake (contact + job application), newsletter, product waitlists
(PenTestor, Emmett CRM), and all admin-manageable content (posts/Field Library, case studies,
team, testimonials, jobs) — plus the **Static Bridge** that makes dynamic content crawlable
without SSR infrastructure, email integration, Django admin as the real CMS, OpenAPI docs,
a full test suite, and a step-by-step **cPanel deployment package**.

## 2. Locked context (condensed)

- **Stack:** Python 3.12, Django 5.2 LTS, DRF, drf-spectacular, whitenoise, MariaDB/MySQL
  (default target; Postgres-compatible code acceptable). `Asia/Tehran` timezone; `fa` and
  `en` locales. **No Docker, no Node at runtime** — cPanel "Python App" (WSGI) + cron + SMTP.
- **i18n model (ADR-002 / `docs/I18N.md`):** dual language fields (`*_fa` / `*_en`),
  `slug` (ASCII, unique per language pair) + optional `slug_fa` (Persian); locale resolution:
  request path locale wins (`/fa/...`, `/en/...`), `?lang=` as API fallback. Every
  content-bearing model stores **both** languages; publishing requires fa complete;
  en missing → flag in admin (draft warning), never 500.
- **Golden rules:** Persian-first everywhere (emails, admin strings where sensible, seed
  data written fa-first); Toman for money (store integer **tomans**, no floats); Jalali for
  any human-facing date (store ISO-8601 UTC, convert at the edge); tests ≥ 80% on business
  logic; no secrets in repo; conventional commits; update CHANGELOG + docs each milestone.
- **Inputs:** B3 (SMTP) may still be a placeholder — dev uses console email backend; the
  mailer must be config-swappable. B5 (contact block) placeholders OK. Missing input →
  `[INPUT Bx]` + `docs/OPEN-ITEMS.md`.

## 3. Repository layout (create exactly)

```
api/
├── manage.py
├── requirements.txt            # pinned (requirements.lock.txt for exact)
├── .env.example                # every var documented
├── emmett/                     # project package
│   ├── settings/{__init__,base,dev,prod}.py
│   ├── urls.py                 # /api/v1/..., /admin/, SEO catch-all (Phase 3 wires web)
│   ├── wsgi.py
│   └── asgi.py                 # present but not used on cPanel (document why)
├── apps/
│   ├── core/                   # health, sitemaps, RSS, render_public_html, SEO views,
│   │                           #   email utilities, throttling/honeypot mixins
│   ├── leads/                  # ContactLead, JobApplication, NewsletterSubscriber,
│   │                           #   WaitlistSignup (+ referral), unsubscribe tokens
│   └── content/                # Category, Post, CaseStudy, TeamMember, Testimonial, JobOpening
├── templates/                  # SEO HTML docs, email templates (fa/en, text+html)
├── static/                     # seo/ output dir (gitignored), admin overrides
├── scripts/                    # render_public_html cron wrapper, db_dump
├── tests/                      # per-app test packages + fixtures
└── content_data/               # seed JSON (fa-first source) — production content
```

## 4. Tasks

### 4.1 Project setup
1. Scaffold per §3. Settings split: base (app registry, middleware, DRF config, caching),
   dev (console email, debug, in-memory/file DB option), prod (env-driven:
   `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DB_*`, `SMTP_*`, `SITE_URL`,
   `CORS_ORIGINS`, `THROTTLE_*`, `EMAIL_FROM`, `TEAM_INBOX`, feature flags).
   Use `dj-database-url`-style parsing by hand (no surprises) or `django-environ`.
2. MariaDB engine with sane defaults (`utf8mb4` everywhere — Persian text is non-negotiable
   at the storage level). Migrations must be CI-generated (no hand-edits).
3. Security baseline from day one: `SecurityMiddleware`, strict `ALLOWED_HOSTS`, CSRF,
   HSTS in prod, secure cookies in prod, `X-Content-Type-Options`, referrer policy,
   response caching for safe API list endpoints (short TTL + cache-bust on publish),
   `SECURE_CONTENT_TYPE_NOSNIFF`.
4. Timezone/locale: `TIME_ZONE="Asia/Tehran"`, `USE_TZ=True`, `LOCALES=("fa","en")`,
   Django admin interface in fa (Django ships fa translations — enable and verify).
5. Dependencies (pinned): `django`, `djangorestframework`, `drf-spectacular`,
   `django-cors-headers` (dev only), `whitenoise`, `Pillow`, `python-jalali`,
   `markdown` (+ `markdown-it-py` if MDX-style), `pyyaml` (OG meta), `pre-commit`,
   dev: `pytest-django`, `factory-boy`, `ruff`, `coverage`. Keep it lean.
6. CI `api` job goes live: ruff check + format, `pytest --cov`, migrations check
   (`makemigrations --check --dry-run`), `python manage.py check --deploy` in prod settings
   (CI-safe mode).

### 4.2 Domain models (write fa-first seed thinking into the model docs)
All models: `created_at`/`updated_at` (auto), `published` bool + `published_at` nullable,
ordering where sensible, `__str__` fa.

**leads**
- `ContactLead`: name, email (validated), phone (optional, +98 aware), company,
  project_type (choices: AI product / platform engineering / security system / product
  rescue / other), budget_range (choices in **Toman**: <500M / 500M–1.5B / 1.5B–3.75B /
  >3.75B / prefer-not-to-say), message (max 5000), `lang` submitted in, `source` (page/ref),
  `status` (new/contacted/qualified/closed-won/closed-lost), `notes` (admin), `ip_hash`
  (privacy-friendly), `honey` honeypot field (must be empty), `user_agent` (lightweight).
- `JobApplication`: job FK, name, email, phone, message, link (GitHub/LinkedIn), CV upload
  (validated: pdf/docx only, ≤ 5 MB, stored outside webroot or permission-checked).
- `NewsletterSubscriber`: email unique, `lang` preference, `status` (active/unsubscribed/
  bounced), `unsubscribe_token` (secrets.token_urlsafe), timestamps.
- `WaitlistSignup`: product (choices: `pentestor` / `emmett_crm`), name, email, company
  (optional), use_case (text), `referral_code` (optional, self-referral rejected),
  `referred_by` email (optional), `notified` bool + `notified_at`, unique
  (product, email).

**content** (dual-language fields as per ADR-002)
- `Category`: name_fa/en, slug/slug_fa, description_fa/en, order.
- `Post`: category FK, title_fa/en, slug/slug_fa, excerpt_fa/en, `body_fa_md`/`body_en_md`
  (Markdown, rendered server-side for SEO + sanitized), cover image (nullable),
  `featured` bool, `gated` bool (whitepaper → lead-gated download), `download_token`
  (for gated), authors (M2M TeamMember), seo_title/seo_description fa+en, published.
- `CaseStudy`: client_name (nullable → "confidential" support), sector, title_fa/en,
  slug/slug_fa, summary_fa/en, `body_fa_md`/`body_en_md`, `challenge`, `approach`,
  `outcome` (structured subfields fa/en), metrics JSON (label/value pairs, **Toman/percent
  only**), stack tags, timeline JSON (phase/duration), cover image, related products
  (choices: pentestor/emmett_crm/none), published.
- `TeamMember`: name_fa/en, role_fa/en, bio_fa_md/bio_en_md, photo, links (M2M-ish JSON:
  site/label/url: linkedin, github, telegram, website), expertise tags, `featured_order`,
  active bool.
- `Testimonial`: person_name, company (nullable), role, quote_fa_md/quote_en_md,
  product/services reference, published, order.
- `JobOpening`: title_fa/en, department (choices), location (Tehran/remote-IR/hybrid),
  employment (full-time/contract), `description_fa_md`/`description_en_md`,
  `requirements_fa_md`/`requirements_en_md`, `perks_fa_md`/`perks_en_md`, opens/closes dates,
  active, published.

Admin registration for all: list displays with fa columns, search (fa+en+email),
filters (status, lang-completeness), inlines (Post: authors; CaseStudy: metrics),
**custom admin action** "flag translation gaps" (lists records missing en), bulk
publish/unpublish, `changelist` language tabs not required — dual fields side by side are
fine, but add a **completeness badge** per record (fa ✓ / en ✓) via admin action or
custom list field.

### 4.3 REST API (DRF) — `/api/v1/`
All list/detail views support locale: path-locale (mounted under `/api/v1/fa/...` and
`/api/v1/en/...`) or `?lang=`; response includes `i18n` hints (locale, links to the
other language). OpenAPI (drf-spectacular) at `/api/v1/schema/`, browsable docs at
`/api/v1/docs/` (fa UI preferred).

Endpoints:
- `GET  /health/` — liveness (db ping, version) — used by uptime monitoring.
- `POST /leads/contact/` — validation (name ≥ 2 chars, valid email, message ≥ 20 chars),
  honeypot reject (200 silent fake-success for bots), **throttle: 5/hour/IP + 20/day/IP**
  (config), creates `ContactLead`, sends team notification email (fa template, BCC pattern
  for privacy), returns generic 201 (no lead id leaks). Idempotency: duplicate email+
  message within 6h → same fake-success, no second row (documented).
- `POST /leads/newsletter/subscribe/` + `POST /leads/newsletter/unsubscribe/`
  (token link, no email required) + `GET /leads/newsletter/status/` (email, lightweight).
  Duplicate subscribe → 200 idempotent. Unsubscribe updates status, sends confirm email.
- `POST /leads/waitlist/` — product ∈ {pentestor, emmett_crm}; generates referral code
  (6-char, unambiguous charset) on first signup; referral: signing up with another's code
  credits `referred_by`; self-referral ignored (logged). Throttled like contact.
- `POST /leads/jobs/<job_slug>/apply/` — job application (CV upload validated server-side:
  magic bytes, size, extension; stored in `MEDIA_ROOT` outside static; download only via
  admin).
- `GET /content/posts/` (filter: category, featured, q search on both languages),
  `GET /content/posts/<locale-slug>/` (resolves `slug` or `slug_fa` by locale; 404 if
  unpublished), `GET /content/case-studies/` + detail, `GET /content/team/`,
  `GET /content/testimonials/`, `GET /content/jobs/` (active only) + detail,
  `GET /content/categories/`, `GET /content/gated-posts/<token>/download/` (stream the
  asset after token check; token single-use? no — per-subscriber token tied to the
  subscriber created at the lead gate; document).
- Markdown bodies returned **sanitized** (allowlist: headings, lists, code, links, images,
  emphasis; strip raw HTML — `markdown` + bleach) and also raw when `?raw=1` (admin/debug).
- Errors: consistent envelope `{"detail": ..., "code": ..., "fields": {...}}` in fa **and**
  en (DRF exception handler switched by locale). 429s include `Retry-After`.
- Contract: `openapi.json` committed at `api/docs/openapi.json` + `web/scripts/gen-api-types.mjs`
  producing `web/src/api/generated.d.ts` (openapi-typescript) wired to CI (web job) so the
  frontend's types are always generated, never hand-written.

### 4.4 Email (all templates dual-language, fa-first, HTML+text)
Templates in `templates/email/`: `lead_received` (to team: full lead, link to admin),
`lead_confirmation` (to sender: "we received it, 48h" promise, matches site copy),
`newsletter_welcome`, `newsletter_digest` (loop over posts, fa/en by subscriber pref),
`newsletter_unsubscribed`, `waitlist_confirmation` (+ referral code reveal),
`job_application_received` (to team) + `job_application_confirmation` (to candidate).
Rules: `EMAIL_FROM` = brand (B3/B5); lang chosen by the **form's submitted language**
(confirmations) or subscriber preference (newsletter); team inbox always fa-first with an
en summary line. Send via `django.core.mail` async-ish pattern: v1 synchronous is acceptable
but wrapped in a retrying utility (3 attempts, backoff) + failure log; document the upgrade
path (task queue) in ADR.

### 4.5 Static Bridge (ADR-003 — the SEO engine)
1. `management command render_public_html`: for every **published** Post and CaseStudy,
   render a complete standalone HTML document (Django template) containing: correct
   `<html lang>`/dir, title (SEO title or title), meta description, canonical, hreflang,
   OG + Twitter tags, JSON-LD (`BlogPosting`/`Article` with author Organization,
   `datePublished` ISO), breadcrumbs, **full article HTML** (sanitized markdown rendered),
   cover image, prev/next links, and the **web app bootstrap** (script/link tags to the
   built SPA assets with the right entry URL) so JS users hydrate into the interactive app.
   Output: `static/seo/<locale>/<kind>/<slug>/index.html`.
2. Also regenerate: `static/seo/sitemap.xml` (all dynamic URLs + marketing route list
   imported from a JSON manifest the web build emits — `web/build/sitemap-manifest.json`),
   `static/seo/robots.txt`, `static/seo/feed/<locale>.xml` (RSS, fa primary).
3. Trigger: `post_save` signal in dev (auto-render on publish), **cron** in prod
   (hourly + nightly), plus `--force` flag. Command must be idempotent, atomic (write to
   tmp, rename), and log counts.
4. Serving: `core` provides an `seo_catchall` view mounted on the **public paths themselves**
   (NOT under `/api/`): `/<locale>/library/<slug>/` and `/<locale>/projects/<slug>/` →
   the rendered SEO file (or the localized 404 document if unpublished). This is what makes
   ADR-003 work: crawlers, no-JS users and the SPA all hit the **same public URL** —
   crawlers get full HTML, JS users get that same HTML as entry document and hydrate the
   interactive app over it. Static listing pages (e.g. `/<locale>/library/`) come from the
   web build's prerender (Phase 3), served by the web catch-all; the Django catch-all only
   claims the detail paths. Document the exact URL matrix in `docs/ARCHITECTURE.md`
   (table: route | who serves | JS? | crawler HTML) and Phase 3 must verify it live.
5. No-JS experience: the SEO pages are styled (embed a minimal critical CSS subset of the
   tokens) and contain working links to the app — readable without JavaScript.

### 4.6 Admin as CMS (the operator surface)
1. Verify: create Post (fa full, en partial) → publish → API serves it → Static Bridge
   renders it → appears in sitemap + RSS → unsubscribe/newsletter/waitlist flows visible
   in leads app with fa filters.
2. Lead management: `ContactLead` changelist with status workflow (action buttons:
   mark contacted/qualified/closed), CSV export (fa headers), notes; Waitlist list with
   "mark notified" + CSV export (the team's sales feed); JobApplication list + CV download.
3. Site settings (simple `SiteConfig` singleton model in `core` admin): contact block
   (email/phone/address/hours/socials — B5), budget ranges text, social OG image,
   maintenance-mode flag (banner + API 503-friendly header), newsletter frequency.
   API `GET /content/site-config/` (public-safe subset).
4. Admin polish: fa brand header, custom login page (minimal, on-brand), `SITE_URL`
   shown, "open on site" buttons (external link to the public post/lead page).

### 4.7 Seed data and content
1. `content_data/` JSON fixtures (fa-first written, proper idiomatic Persian — this is the
   template for real content in Phase 4): 1 SiteConfig, 4 categories, **8 posts** (2
   featured, 1 gated whitepaper; mix: AI engineering, security, platform, product craft),
   **4 case studies** (one per service division, metrics in Toman/percent, at least one
   "confidential client"), **6 team members** (names as `[INPUT B6]`-labeled placeholders
   with realistic roles), **4 testimonials** (placeholder-labeled), **3 job openings**,
   2 newsletter test subscribers (disabled), 2 waitlist examples.
2. `management command seed_content [--demo|--production]`: idempotent (upsert by slug),
   fa-first, used by dev (`--demo`) and by the real launch (Phase 4 swaps `content_data/`
   production files). Document in `docs/CONTENT_GUIDE.md` (Persian, operator-level).

### 4.8 cPanel packaging (`deploy/` + docs)
1. `deploy/api/wsgi.py` copy reference, `deploy/api/requirements.lock.txt` generation
   script, `deploy/api/env.sample` (cPanel "Setup Python App" variable mapping table:
   each env var → cPanel field name).
2. `deploy/api/cron.txt` — exact cPanel cron lines: hourly `render_public_html --quiet`,
   nightly `db_dump` (mysqldump via cPanel mysql CLI → `backups/` dir + optional off-site
   copy step documented), monthly `send_newsletter_digest` (feature-flagged, off by default).
3. `docs/DEPLOYMENT.md` **draft** (fa section FIRST): prerequisites (Python 3.12 in cPanel,
   MySQL 10.x, SMTP), step-by-step: create app → venv → pip install → env → migrate →
   collectstatic (whitenoise) → cron → smoke test (`/api/v1/health/`) → cutover. Every
   command copy-paste ready. Mark "verified on staging: pending" until Phase 4 executes it.
4. Backup/restore: `db_dump` + `db_restore` management commands (from cPanel dump file),
   media backup note; restore procedure written in RUNBOOK (Phase 4 finalizes).

### 4.9 Tests (pytest-django) — coverage target ≥ 80% on apps/ business logic
- **Contract tests** per endpoint: success + each failure mode (validation, throttle,
  honeypot, locale switching, 404s, unpublished content hidden).
- **Model/admin tests**: dual-field integrity (publish blocked on missing fa), slug
  uniqueness per language pair, token generation (unsubscribe, referral, gated),
  idempotency (newsletter duplicate, contact dedupe), jalali/jan conversion at edges.
- **Static Bridge tests**: rendering produces valid HTML (parse), meta present, hreflang
  pair correct, sitemap lists published only, RSS valid (feedparser or xml parse),
  cron idempotency (run twice → same output).
- **Email tests**: template renders in both languages (locmem backend), from/to/subject,
  unsubscribe link works end-to-end.
- **Upload tests**: CV validation matrix (type/size/magic bytes).
- **Security tests**: throttling headers, CSRF on POSTs (APIClient), unauthorized 403s,
  XSS payload through markdown stays sanitized (assert no `<script>` survives).
- Fixtures: `factory` classes + `content_data` import fixture; no network, no real SMTP.

## 5. Explicitly NOT in this phase
- No frontend page work (Phase 3). No visual design. No real deployment to production
  (docs + packaging only; staging execution is Phase 4). No analytics code.

## 6. Exit gates

- [ ] `api` CI job green: ruff, `pytest --cov` ≥ 80% on business logic, migrations check,
      `check --deploy` (prod settings, CI-safe).
- [ ] **Demo runbook executed locally** (recorded in phase report): dev server up →
      `seed_content --demo` → contact form POST stored + email in outbox → newsletter
      subscribe + token unsubscribe → waitlist signup with working referral → post created
      in admin (fa complete, en partial) → published → API both locales → Static Bridge
      file valid (meta/OG/JSON-LD/body) → sitemap/RSS updated → admin CSV export opens.
- [ ] `openapi.json` committed; `web/scripts/gen-api-types.mjs` produces `generated.d.ts`
      in CI (web job consumes it).
- [ ] `render_public_html` idempotent + atomic (test: double run, corrupted output replaced).
- [ ] Email templates verified fa+en (HTML+text) for all 8+ flows.
- [ ] `docs/DEPLOYMENT.md` draft (fa-first) + `deploy/` package complete; cPanel mapping
      table matches `env.sample` 1:1.
- [ ] `docs/API.md` committed: OpenAPI link + Persian quickstart (curl for every endpoint,
      including the 429 and honeypot behaviors).
- [ ] `docs/ARCHITECTURE.md` updated: URL matrix (route | server | JS | crawler HTML),
      data-flow diagram, ADR-003 marked Implemented.
- [ ] New ADRs where decisions were refined (e.g., email async policy, gated-download
      token model) — recorded, not silent.
- [ ] Phase report (CHANGELOG + gates + deviations + open items) committed; `phase-2` tag.

## 7. Handoff to Phase 3
Phase 3 can rely on: a running local API (docker-free: `python manage.py runserver` +
MariaDB dev setup documented), generated API types, demo seed, `/api/v1/fa|en/...` contract,
Static Bridge files for blog detail paths, SiteConfig endpoint, health endpoint,
`VITE_API_URL`/`VITE_SITE_URL` env conventions, DEPLOYMENT draft.
