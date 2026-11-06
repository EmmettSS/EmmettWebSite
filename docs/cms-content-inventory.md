# CMS Content Inventory and Dynamic-Content Contract

**Status:** **v2 (2026-11-06)** — contract verified against the running repository after the Phase 1 audit ([`docs/audit/frontend-backend-gap-2026-11-06.md`](audit/frontend-backend-gap-2026-11-06.md)). v1 sections are preserved; the audit added measured "frontend today" columns, confirmed display gaps, and new acceptance sections (8–9) below. This document records what the current repository stores in the database, what it renders from the frontend, and what must be editable through Django Admin without a frontend deployment. It does not authorize inventing or publishing business claims, metrics, testimonials, prices, customers, or project records.

**Measured during v2 (this checkout):** 35 concrete models across 11 apps; 36 admin registrations; 48 `/api/v1/` endpoints (62 inventory rows including admin/2FA/i18n/frontend routes); 22 frontend routes (20 pages + 2 RSS route handlers); 301 message leaves ×2 locales; 11 public AI catalogs (61 options). See the audit for method.

## 1. Scope and definition

For this project, **dynamic content** means content that an authorized editor can create, edit, preview, publish/unpublish, and localize in the CMS, with the public website reflecting the published version without a code deployment. It does not mean storing React component code, CSS, or arbitrary executable markup in the database.

The presentation components and their visual design remain version-controlled in the frontend (today Next.js; target: Vite+React per the audit and the migration master prompt). Editors select and populate supported content types; the frontend validates and renders those types. Translation files may continue to hold interface chrome—validation messages, accessibility labels, loading states, pagination controls, and generic UI actions—unless those strings are explicitly part of a marketing/content editing requirement.

## 2. Current database-backed content

Columns "Frontend today" and "Phase 4 task" were added in v2 from the audit; Phase numbers follow `docs/audit/frontend-backend-gap-2026-11-06.md` (§7).

| Content | Existing model/API | Frontend today (measured) | Phase 4 | Contract and target |
| --- | --- | --- | --- | --- |
| Services | `apps.services.Service`; `/api/v1/services/` | List + detail wired (home, `/services`, `/services/[slug]`); fetched filters `categories__slug`, `tags__slug`, `is_featured`, `search` never passed; `service.icon` fetched never rendered | F4-033/034 | Title, slug, summary, Markdown description, icon, taxonomy, order, featured state and SEO already exist. Keep the existing model and make sure all public-facing fields used by the site are returned and localized. Decide per-field: render `icon` or remove it from the serializer. |
| Projects and case studies | `apps.portfolio.Project`, `CaseStudy`; `/api/v1/projects/` | List + detail wired (home ×2, `/products`, `/projects`, `/projects/[slug]`); only `is_product` + `ordering=` filters used; `case_study.*` sections rendered; `service_slug` fetched never rendered; products SEO uses Article schema | F4-036/037 | Project identity, summary, client, year, image/gallery, categories/tags, product flag and order are database-backed. Case-study narrative, stack and metrics are also stored. Homepage-only claims currently shown from translation slots must not override these records. |
| Blog/library | `apps.blog.BlogPost`; `/api/v1/blog/` | List + detail + RSS wired; `view_count` incremented server-side, never rendered; `ai_summary` rendered (approved + source_hash match only); comments render approved list, no `status`/`parent` UI | F4-042/043 | Title, excerpt, Markdown content, cover, author, taxonomy and publish date are database-backed. Keep public queries limited to published records. Decide: show a view badge or drop the counter. |
| Academy | `Instructor`, `Course`, `Lesson`, `Enrollment`; `/api/v1/academy/` | List + detail + enrollment flow wired; `level` filter never passed; `instructor_name` fetched in list items, never rendered (name shows only on detail); enroll button + progress display OK | F4-039/040 | Courses, lessons and instructors are database records. Confirm every displayed instructor/course field is exposed and translated before claiming complete editability. |
| Company | `TeamMember`, `Testimonial` | Team rendered on `/about`; testimonials rendered on `/about` **without** the `featured=true` filter (home shows none); `social_links` never rendered; detail endpoints (`<public_id>` / `<pk>`) unused | F4-031/042 | Records exist in the database. Home should surface `is_featured=true` testimonials (owner decision) or drop the flag. Connect or delete the unused detail endpoints. |
| FAQ | `core.FAQItem`; `/api/v1/seo/faq/?path=` | Consumed only on `/`, `/services/[slug]`, `/contact` (JSON-LD FAQPage + visible list) | F4-012/034 | Question, answer, page path and order are already database-backed. Preserve per-path filtering and published/active semantics. Other pages may opt in only if editors add FAQ rows for those paths. |
| Global settings and SEO | `core.SiteSettings`, `SEOMetaModel`, `core.Redirect` | Consumed by every page (metadata, hreflang, OG fallback, verification, org JSON-LD) **except** `default_locale`, `sitemap_sections`, `generated_at`, `two_factor_required`, `search_console_help` — fetched, never read | F4-010…F4-018 | Site identity/contact/social settings, SEO defaults, organization metadata, canonical values and redirects have database representations. The five dead fields must be used by Django during the migration or removed from the payload. |
| Media | `core.Media` | All `<img>`/`Image` usages pass empty `alt=""` except cover/project/team; `alt_text`/`caption` are translated but not surfaced | F4-032/037 | Uploaded files, alt text, captions and metadata are stored. The frontend must render `alt_text` instead of `""`. Deploy document root must serve `/media/` directly without the Next route handler. |
| Leads/forms | `apps.leads.Contact`, `Lead`, `Newsletter`; `/api/v1/leads/` | Contact + newsletter + advisor-lead all wired with throttle messaging; Contact source auto-set `WEBSITE`/`AI_ASSISTANT`; notifications via Kavenegar/email | F4-030/050 | User-submitted records are persisted; form labels and success/error copy are interface strings unless deliberately made CMS-managed. Notification delivery is a separate integration/configuration concern. |
| AI engine | `apps.ai_engine.*`; `/api/v1/ai/*` | Advisor + estimate + advisor-results pages exist but have **zero** navigation entry points (see audit §3.2); results page renders concepts fully; advisor lead capture works from result cards only | F4-050/051/052 | Full endpoint inventory with throttle/lockout/cache contract is in the audit §2. EstimationRule seed required for `/ai/estimates/`; PromptTemplate/GuardrailRule required for `/ai/advisor/`. |

Existing public content endpoints are read-only for visitors. Content changes are expected to be performed by authorized staff through Django Admin, not through public write endpoints.

## 3. Content currently embedded in the frontend

The homepage is a hybrid of database records and content embedded in `frontend/messages/fa.json`, `frontend/messages/en.json`, and UI components. The following content must move to editor-managed records if the requirement is that editors can change it without deploying the frontend:

| Surface | Current source | Required CMS behavior | Phase 4 |
| --- | --- | --- | --- |
| Home hero | `ui.hero` translation namespace | Editable localized eyebrow, heading lines, lead, CTA labels/links and optional stats. Claims such as system counts, SLA, country counts, version and operational status require owner verification; do not seed them as facts without approval. Plus (hidden today): advisor/estimate CTA — see audit §3.2; requires owner approval for any visual addition. | F4-031, F4-051 |
| Home section introductions | `ui.services`, `ui.products`, `ui.projects`, `ui.library`, `ui.academy`, `ui.contact` | Editable localized eyebrow, heading, lead, CTA copy and visibility/order. Component layout and animation remain in code. | F4-031 |
| Service cards | Mix of `Service` API data and static `ui.services.slots` | Card identity/summary/tags/order must come from a single source. Do not silently use static sample cards when the API fails or returns no published records. | F4-031/033 |
| Product cards and product previews | `ui.products.slots`, `productChrome`, `PentestorUI`, `CrmUI`, `PropertyUI` in `products-section.tsx` | Product identity, copy, tags, status, metrics, labels and supported links must be data-backed, validated and localized. Product visual shells may remain typed React components. Never display fabricated CRM/property/Pentestor metrics as live customer data. | F4-038 |
| Project cards and outcomes | Database project list plus `ui.projects.slots` | Project title, industry/client, summary, technologies, outcomes, year and links must come from the matching published Project/CaseStudy record. Remove or explicitly mark unverified sample records. | F4-031/036/037 |
| Library cards and feature story | Blog API plus `ui.library.slots` | Published blog records supply the card content; featured selection/order and category labels must be editor-controlled or derived from the records. | F4-031/042 |
| Academy paths/nodes | Course API plus `ui.academy.slots` | Show actual published courses/lessons and their metadata. The current illustrative graph/nodes must either be modeled as learning-path content or removed; do not imply they are real courses unless backed by records. | F4-031/039/040 |
| Navigation and command palette | Translation JSON plus arrays/links in UI components | Editable menu and command destinations/labels with validation. Keep route handling and accessibility behavior in code. Internal system routes that are not content links can remain in code. **Measured gap: `/advisor` and `/estimate` are absent from the nav; they exist only as palette entries.** | F4-051 |
| Footer/contact | Translation JSON and component values | Editable localized footer groups/links, social URLs, company contact data and legal links. Footer ships no advisor link today. Remove `#` placeholder destinations or leave them unpublished until real targets are supplied. | F4-051 (add), tag-filtered (rest) |
| Coming-soon pages | Translation JSON and route-specific React pages | Preserve intentional product availability. `/products/crm` is intentional Coming Soon with no backing Project record (`/projects/crm` → 404). If an editor must change the status/copy, represent it as product/page content; otherwise treat it as controlled interface copy. A CMS record must not imply a feature is implemented when it is not. | F4-038 |
| Static interior-page copy | `frontend/messages/fa.json` and `en.json` namespaces such as services, projects, academy, blog, contact and metadata | Separate content intended for marketing editors from interface strings (empty-state text, form validation, breadcrumbs, accessibility labels). Move only the former into CMS. | F4-002/003/066 |

`frontend/src/components/ui-port/home-data.ts` documents the current boundary: several headings, tags, product visual data and sample slots are currently treated as design copy. The future implementation must replace that boundary intentionally rather than adding another fallback data source.

Runtime overlay: `GET /api/v1/site-content/translations/?locale=` (namespace `site.copy`, flat string keys, `is_html=False`) is merged over the bundled messages at request time (`src/i18n/request.ts`); keys never present in the DB delta are left untouched and byte-trimmed arrays fail closed (fall back to bundled). This stays under `site.copy` with `is_html=False` in the target architecture (no `modeltranslation` on `Translation`).

## 4. Localization, publishing and data integrity requirements

1. Every editor-managed text field must support the configured locales (`fa` and `en`) and define an explicit fallback policy. Missing translation must not silently show the wrong language or a fabricated English/Persian sample.
2. Records used publicly must have a clear publication state. Draft, inactive, soft-deleted or incomplete records must not appear in public APIs, feeds, search, sitemap, JSON-LD or homepage cards.
3. Ordered collections need an explicit order field and deterministic tie-breaker. The frontend must not infer business meaning from array position or hard-coded IDs.
4. Rich content must use the repository's safe Markdown/rendering pipeline (`nh3` server-side; `sanitize-html` on the client). Do not enable arbitrary editor-supplied HTML or executable content.
5. Existing published content and URLs must remain compatible. Migrations must be reversible where practical, avoid fabricating records, and retain stable slugs/canonical URLs. `/products/pentestor` must keep its 301 to `/projects/pentestor`; `/products/crm` stays Coming Soon; `/feed` → `/blog/rss` and legacy paths stay 301.
6. Public content endpoints remain read-only. Admin editing requires authenticated, least-privilege staff permissions and should use Django's audit facilities where available (`core.AuditLog`).
7. Publish/update/unpublish must invalidate relevant caches. In the Next architecture this used the `FRONTEND_REVALIDATE_URL` webhook + 16 cache tags; in the target (Django/WhiteNoise, no Node) invalidation is same-process (Django caches: `SEO_SETTINGS_CACHE_SECONDS=900`, `SEO_SITEMAP_CACHE_SECONDS=900`, redirect cache, 60–300s SWR) with an explicit tested TTL — replace requirement 7 with the measured propagation time from the Phase 3/4 runbook.
8. API outage, successful empty response and missing translation are distinct states. Production must never substitute illustrative/sample content for real records.
9. Jalali dates render via `jdatetime` on the server (backend serializes ISO) and Persian digits are applied at render time; the academy/blog/post date lines use `Intl.DateTimeFormat('fa-IR', …)` in detail pages, which knowingly overlaps `formatDate` (ADR-0019 drift to resolve during the rewrite, not silently).

## 5. Implementation acceptance criteria

This inventory is complete enough to begin implementation when each row above is assigned to either (a) an existing database model/API to connect, (b) a typed CMS field/model/API to add, or (c) an intentional interface string to retain in translation files. Before Production content is populated, a content owner must approve all factual statements, statistics, customer/project claims, prices and legal links. No such approval is implied by this inventory.

**v2 note:** the Phase 1 audit (`docs/audit/frontend-backend-gap-2026-11-06.md`) assigned every open row above to a Phase 4 task (F4-001…F4-066). **Owner sign-off was recorded on 2026-11-06** (audit §9, D-01…D-03 — AI surfaces become visible everywhere they are needed; open items closed per project judgment). The gate for Phase 2 (admin rebuild) is the Phase 2 prompt from the owner.

## 6. Display-level contract details (v1 preserved)

### 6.1 Service

- Required public fields: title/slug/summary/description_html/icon/featured/order/published_at/categories/tags/SEO (from `ServiceListSerializer`/`ServiceDetailSerializer`; payload has both `icon` and `category_slug`).
- `icon` is a Lucide icon **name** (choices enforced in admin); the frontend must map it to the existing icon set or the field stays invisible.
- Slug is the public key; `id` never appears in the payload.

### 6.2 Project and CaseStudy

- Gallery is `Media` M2M (`project.gallery`), returned as `gallery_urls`; cover is `Media` FK.
- `case_study` is nested 1:1 and returns the narrative sections as `*_html` (safe HTML through Markdown pipeline) plus `technology_stack: string[]` and `metrics: {label,value}[]`.
- `/projects/{slug}` is the canonical URL even for `is_product=True` rows (ADR-0040); `/products/{slug}` exists only to keep legacy links alive via 301.

### 6.3 BlogPost

- `view_count` is incremented in a single `UPDATE … F('view_count')+1` on retrieve; the list endpoint never increments.
- Comments render `approved` only, newest first; the API also returns `parent` for threads (no UI today).
- `ai_summary` is visible only when `status=approved`, `is_stale=False` and the article `source_hash` still matches; regeneration is an admin action.

### 6.4 Academy

- `lesson_count` counts published lessons only; detail returns lessons ordered by `order` with `is_preview` marking.
- Enrollment is idempotent (`get_or_create`); unauthenticated users get 401 → the UI prompts to register/login on `/profile`.

### 6.5 FAQItem

- Per-path scoping on public route (`?path=/contact|/services/<slug>|/`); only `status=published` + `is_active` rows; ordered by `order, id`.

## 7. Model count and admin surface (measured v2)

Concrete models = **35**: core 7 (`AuditLog`, `Media`, `Translation`, `SiteSettings`, `SearchIndexEntry`, `Redirect`, `FAQItem`), accounts 3 (`User`, `Profile`, `Favorite`), taxonomy 2, company 2, services 1, portfolio 2, academy 4, blog 2, leads 3, ai_engine 9. Admin registrations = **36** (the 35 + `auth.LogEntry`). The `DocumentModelAdmin` mixins provide soft-delete admin, restore action and duplicate action where applicable.

## 8. Display gaps found in v2 (must be actionable in Phase 4)

| # | Gap | Evidence | Phase 4 |
| --- | --- | --- | --- |
| D1 | AI advisor / project estimator unreachable for end users | No link in navbar/footer/home; palette-only | F4-050/051 |
| D2 | Favorites: list renders; add/remove UI does not exist | `client.ts` helpers unused; no button on cards | F4-022 |
| D3 | Profile edit (`PATCH /auth/me/`) unwired | No form on `/profile` | F4-021 |
| D4 | Taxonomy filters (categories/tags/level/year/is_featured) declared but unsurfaced | No filter UI; endpoints never called | F4-033/036/039 |
| D5 | Testimonials shown only on `/about`; `featured` flag never passed | `getTestimonials()` without params | F4-031/042 |
| D6 | `service.icon`, `view_count`, `instructor_name`, `social_links`, `service_slug` fetched but never rendered | Section 3.3 of the audit | per page tasks |
| D7 | SEO dead fields (`default_locale`, `sitemap_sections`, `generated_at`, `two_factor_required`, `search_console_help`) | `lib/seo/types.ts` vs usage scan | F4-010 |
| D8 | Media `alt_text`/`caption` translated but `alt=""` in UI | `Image` usages across components | F4-032/037 |
| D9 | RSS route cache mismatch (`FEED_REVALIDATE_SECONDS=60` vs `revalidate=900`) | `lib/seo/feed.ts` vs RSS route handlers | F4-017/018 |
| D10 | Settings translations fetched every request (`revalidate=60`) — acceptable today; must get an explicit TTL in Django | `src/i18n/request.ts` | F4-003 |
| D11 | `X-Robots-Tag: noindex` missing on `/estimate` responses (has `no-store` only) | `ai_engine` views | F4-010/052 |

## 9. Pre-production content acceptance checklist (new in v2)

Before any production content population:

1. Owner approves every factual claim surfaced from `ui.*` slots vs database truth; remove or mark unverified sample records.
2. `EstimationRule` rows exist for all four `delivery_scope` keys (prototype 2, mvp 5, integrated_mvp 10, multi_module_platform 15) — otherwise `/ai/estimates/` answers `minimum_working_days=null`.
3. `PromptTemplate` (advisor, blog_summary × fa/en) and the four `GuardrailRule`s present — otherwise the advisor pipeline fails to `generation_failed`/`provider_unavailable`.
4. Every `BlogPost` AI summary intended for public display is `approved` with a matching `source_hash`; stale drafts stay invisible.
5. `site.copy` translations cover all keys the UI renders; arrays keep exact length with bundled fallback.
6. Alt text present for every uploaded `Media` used on public pages.
7. FAQ rows exist for `/`, `/contact` and every `/services/<slug>` that should emit FAQPage JSON-LD; others simply render no FAQ block.
8. Redirects needed by legacy URLs (`/feed`, `/products/pentestor`, …) exist as `Redirect` rows (301/302/410) with `hit_count` monitored, or as server-level rules — one source only after the migration.
9. `noindex` verified for `/profile`, `/search`, `/advisor`, `/estimate`, `/advisor/results/*` at both Django header and route levels.
10. Owner approval of the Phase 1 audit (`docs/audit/frontend-backend-gap-2026-11-06.md`) — **recorded 2026-11-06** (audit §9). Later phases proceed per owner prompts.
