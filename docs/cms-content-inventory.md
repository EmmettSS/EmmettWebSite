# CMS Content Inventory and Dynamic-Content Contract (v2)

**Status:** Superseded baseline inventory (v2, 2026-11-05). This version replaces the v1 baseline with a per-field, per-endpoint audit of what the repository actually stores, serializes, and renders today. It still does not authorize inventing or publishing business claims, metrics, testimonials, prices, customers, or project records.

Companion document: `docs/audit/frontend-backend-gap-2026-11-05.fa.md` (endpoint → UI contract, gap list, phase-4 task mapping). Where the two documents disagree, the audit is the newer evidence.

## 0. What changed from v1

| Area | v1 claim | v2 finding |
| --- | --- | --- |
| Presentation layer | "version-controlled in Next.js" | Technology choice is under revision; the *contract* below is what must survive any rendering change. Content fields and their editability are independent of the renderer. |
| Services | "all public-facing fields … returned and localized" | `icon`, `published_at`, `canonical_path` are returned but never rendered. `order` is returned and never displayed. |
| Projects | "case-study narrative, stack and metrics are also stored" | True, and fully rendered — but `service_slug`, `canonical_path`, and `Media.alt_text` are not. Gallery order is non-deterministic (M2M without `ordering`). |
| Blog | "keep public queries limited to published records" | True. `view_count`, `canonical_path`, and nested comment `parent` are returned and unused. |
| Academy | "confirm every displayed instructor/course field is exposed" | Exposed **and** unused: `lessons[].content_html`, `lessons[].video_url` are never rendered, so a lesson cannot be read on the site. |
| Company | "identify and connect the pages/sections that should display them" | Connected on `/about` only for name/role/quote. `bio` and `social_links` never render; `featured` filter never issued. |
| FAQ | "preserve per-path filtering" | Preserved, but the content is emitted **only as `FAQPage` JSON-LD**; no visible FAQ block exists anywhere. |
| Global settings/SEO | "verify each public setting is consumed" | `search_console_help`, `sitemap_sections`, `generated_at`, `two_factor_required` have no consumer. `canonical_path` (per-record) is ignored in favour of a computed path. |
| Media | "final media URL behavior must be consistent" | URLs are consistent; `alt_text`, `width`, `height`, `caption` never leave the serializer. |
| Leads | unchanged | Confirmed: write-only, no public read surface. Throttle responses (`429`) are not surfaced to the user. |

## 1. Scope and definition

For this project, **dynamic content** means content that an authorized editor can create, edit, preview, publish/unpublish, and localize in the CMS, with the public website reflecting the published version without a code deployment. It does not mean storing component code, CSS, or arbitrary executable markup in the database.

Editors select and populate supported content types; the presentation layer validates and renders those types. Translation files may continue to hold interface chrome—validation messages, accessibility labels, loading states, pagination controls, and generic UI actions—unless those strings are explicitly part of a marketing/content editing requirement.

## 2. Database-backed content, field by field

Legend — **Rendered**: appears on the public site. **API-only**: returned by the API but not shown. **Unused**: not returned by any public serializer.

### 2.1 Services — `apps.services.Service`, `/api/v1/services/`

| Field | Rendered | Notes |
| --- | --- | --- |
| `title`, `slug`, `summary` | yes | list + detail |
| `description` → `description_html` | yes (detail) | Markdown sanitized server-side, sanitized again client-side |
| `categories`, `tags` | yes (detail, as chips) | list serializer also returns them |
| `is_featured` | yes | star badge |
| `icon` | **API-only** | lucide icon name — detail page shows no icon |
| `order` | **API-only** | controls ordering, never displayed |
| `published_at` | **API-only** | detail serializer only |
| `meta_title`, `meta_description` | yes | head only |
| `canonical_path` | **API-only** | canonical is computed from the route instead |

### 2.2 Projects and case studies — `apps.portfolio.Project`, `CaseStudy`, `/api/v1/projects/`

| Field | Rendered | Notes |
| --- | --- | --- |
| `title`, `slug`, `summary`, `client_name`, `year` | yes | |
| `cover_image_url` | yes | `alt` is the project title (not `Media.alt_text`) |
| `gallery_urls` | yes (detail) | order not guaranteed — M2M without `ordering` |
| `categories`, `tags` | yes | |
| `is_product`, `is_featured` | yes / **API-only** | `is_product` drives `/products` |
| `case_study.*_html`, `technology_stack`, `metrics` | yes | full narrative rendered |
| `service_slug` | **API-only** | no cross-link to the related service |
| `canonical_path` | **API-only** | computed instead |

### 2.3 Blog — `apps.blog.BlogPost`, `Comment`, `/api/v1/blog/`

| Field | Rendered | Notes |
| --- | --- | --- |
| `title`, `slug`, `excerpt`, `content_html` | yes | |
| `cover_image_url`, `author_name`, `categories`, `tags` | yes | |
| `reading_time_minutes`, `published_at` | yes | |
| `toc` | yes | server-extracted heading list |
| `comments` (approved, top-level) | yes | |
| `comments[].parent` | **API-only** | no threaded replies in UI |
| `related_posts` | yes | |
| `ai_summary` | yes | only when an approved, non-stale `AIContentArtifact` matches the current content hash |
| `view_count` | **API-only** | stored and incremented, never shown |
| `canonical_path` | **API-only** | computed instead |

### 2.4 Academy — `Instructor`, `Course`, `Lesson`, `Enrollment`, `/api/v1/academy/`

| Field | Rendered | Notes |
| --- | --- | --- |
| `Course.title/slug/summary/level/duration_hours` | yes | |
| `Course.description_html` | yes | |
| `Course.cover_image_url`, `is_featured`, `lesson_count` | yes (list) | `lesson_count` only on the homepage |
| `Instructor.name/title/photo_url` | yes | |
| `Instructor.bio` | **API-only** | |
| `Lesson.title/summary/order/duration_minutes/is_preview` | yes | curriculum outline only |
| `Lesson.content_html` | **API-only** | lesson body is never readable on the site |
| `Lesson.video_url` | **API-only** | no player, no link |
| `Enrollment.status`, `completed_at` | **API-only** | profile shows only progress % |
| `canonical_path` | **API-only** | computed instead |

### 2.5 Company — `TeamMember`, `Testimonial`, `/api/v1/company/`

| Field | Rendered | Notes |
| --- | --- | --- |
| `TeamMember.full_name/role_title/photo_url` | yes | |
| `TeamMember.bio` | **API-only** | |
| `TeamMember.social_links` | **API-only** | |
| `Testimonial.author_name/role/company/photo_url/quote` | yes | |
| `Testimonial.related_project_slug` | **API-only** | no link from quote to project |
| `Testimonial.is_featured` | **API-only** | `?featured=` is never requested |

### 2.6 FAQ — `core.FAQItem`, `/api/v1/seo/faq/?path=`

`path`, `question`, `answer`, `order` are database-backed and returned per path in the request language. **They are consumed only as `FAQPage` JSON-LD.** Three routes emit the schema (`/`, `/contact`, `/services/<slug>`) and none renders a visible question list. This is the single largest content-visibility gap in the repository.

### 2.7 Global settings and SEO — `core.SiteSettings`, `SEOMetaModel`, `core.Redirect`

| Setting | Consumed | Where |
| --- | --- | --- |
| `site_name` | yes | title template, JSON-LD, OG |
| `meta_title`, `meta_description` | yes | page fallbacks |
| `search_console_verification` | yes | metadata verification tag |
| `twitter_handle` | yes | `twitter:site`/`creator` |
| `organization_legal_name`, `organization_address`, `organization_same_as`, `contact_email`, `contact_phone` | yes | `Organization` JSON-LD |
| `og_default_image` | yes | OG fallback |
| `social_links` | yes | merged into `same_as` |
| `maintenance_mode` | **no public consumer** | admin-only flag |
| `SEO_NOINDEX_PATHS` | yes | robots.txt |
| `SEO_STATIC_PAGES` | yes | sitemap |
| `SITEMAP_SECTIONS` (payload `sitemap_sections`) | **API-only** | |
| `generated_at` | **API-only** | |
| `search_console_help` | **API-only** | |
| `two_factor_required` | **API-only** | |

### 2.8 Media — `core.Media`

| Field | Rendered | Notes |
| --- | --- | --- |
| `file` (URL) | yes | via `cover_image_url` / `photo_url` / `avatar_url` / `gallery_urls` |
| `alt_text` | **API-only** | no serializer exposes it; images use titles or empty alt |
| `caption` | **unused** | |
| `width`, `height` | **unused** | |
| `media_type`, `mime_type`, `file_size`, `checksum` | **unused** publicly | validation/audit only |
| `uploaded_by` | **unused** publicly | audit only |

### 2.9 Leads — `Contact`, `Lead`, `Newsletter`

Write-only by design: `POST /leads/contact/`, `POST /leads/newsletter/`, `POST /ai/leads/`. Public read endpoints do not exist and must not be added. `Lead.status` and `Lead.priority_score` are staff-only workflow fields.

### 2.10 AI engine — `Catalog`, `CatalogOption`, `PromptTemplate`, `GuardrailRule`, `EstimationRule`, `AIRequest`, `AISuggestion`, `AIConcept`, `AIContentArtifact`

| Model | Public surface |
| --- | --- |
| `Catalog`, `CatalogOption` | `GET /api/v1/ai/catalogs/?keys=` — labels localized by `Accept-Language` |
| `AISuggestion`, `AIConcept` | fully rendered on `/advisor/results/<token>` |
| `EstimationRule.minimum_working_days` | rendered by `/estimate` |
| `EstimationRule.note_fa`, `note_en` | **not serialized at all** — editor copy that can never appear |
| `AIContentArtifact` | rendered for blog posts only (`ai_summary`); no surface for services, projects, or courses |
| `PromptTemplate`, `GuardrailRule`, `AIRequest` | staff-only by design |

## 3. Content still embedded in the frontend

| Surface | Current source | Required behaviour |
| --- | --- | --- |
| Home hero | `ui.hero` translation namespace | Editable localised eyebrow/heading/lead/CTA. Claims (system counts, SLA, country counts, version, operational status) require owner verification; do not seed them as facts. |
| Home section introductions | `ui.services`, `ui.products`, `ui.projects`, `ui.library`, `ui.academy`, `ui.contact` | Editable eyebrow/heading/lead/CTA and visibility/order. Layout and animation stay in code. |
| Service cards | `Service` API only | Already fully API-driven — no static sample slots remain. |
| Product cards | `ui.products` chrome + `Project` API | Product identity must come from `Project` rows with `is_product=true`; `/products/pentestor` is redirected to the canonical `/projects/pentestor`. |
| Project cards | `Project` + `CaseStudy` API | Fully API-driven. |
| Library cards | `BlogPost` API | Fully API-driven. |
| Academy cards and curriculum | `Course` + `Lesson` API | Cards API-driven; lesson **bodies** are fetched but never rendered (see 2.4). |
| Navigation and command palette | `nav` + `ui.nav.palette` | Palette destinations are translation data; inside-site routes must stay valid. |
| Footer | `ui.footer.columns` | Links with `href: "#"` are filtered out at render time. |
| Coming-soon pages | `ui.comingSoon` | `/products/crm` remains an intentional "not in database" page; `/projects/crm` must not be published. |
| Static interior copy | namespaces `services`, `projects`, `academy`, `blog`, `contact`, `team`, `search`, `profile`, `ai`, `metadata`, `form`, `pagination`, `errors`, `locale` | Interface strings; may stay in translation files. |

## 4. Localisation, publishing and data integrity requirements

1. Every editor-managed text field supports `fa` and `en` with an explicit fallback (`MODELTRANSLATION_FALLBACK_LANGUAGES = ("fa", "en")`). A missing translation must never silently show a fabricated sample.
2. Records used publicly must be published (`PublishableModel.status = published`) and active, non-soft-deleted. Draft/archived/inactive records must not appear in APIs, feeds, search, sitemap, JSON-LD, or cards.
3. Ordered collections need an explicit order field **and a deterministic tie-breaker**. Open exceptions today: `Project.gallery` (M2M, no ordering), `AIConcept.position` (unique per suggestion — OK), `FAQItem` (`path, order, id` — OK).
4. Rich content stays on the safe Markdown pipeline (`render_markdown_i18n_fields` → nh3 server-side, `sanitizeRichHtml` client-side). No arbitrary editor HTML.
5. Published content and URLs remain stable: slugs and `canonical_path` are contracts.
6. Public content endpoints stay read-only; editing requires authenticated, least-privilege staff access with audit logging (`core.AuditLog`, `admin.LogEntry`).
7. Publish/update/unpublish must invalidate the caches that serve the page. The tag contract lives in `docs/cms-cache-contract.md` and `apps/core/frontend_cache.py`; any rendering-stack change must preserve an equivalent invalidation path or reduce the TTL explicitly.
8. API outage, successful empty response, and missing translation are three distinct states. Production must never substitute illustrative content for real records.

## 5. Acceptance criteria

This inventory is complete enough to implement when every row in section 2 is assigned to one of: (a) render it, (b) explicitly declare it non-public by design, or (c) drop it from the serializer. Rows already carrying a phase-4 task ID in the companion audit must be resolved before the migration is declared complete.

Before production content is populated, a content owner must approve every factual statement, statistic, customer/project claim, price, and legal link. No such approval is implied by this inventory.
