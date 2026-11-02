# CMS Content Inventory and Dynamic-Content Contract

**Status:** Baseline inventory for the dynamic-content implementation. This document records what the current repository stores in the database, what it renders from the frontend, and what must be editable through Django Admin without a frontend deployment. It does not authorize inventing or publishing business claims, metrics, testimonials, prices, customers, or project records.

## 1. Scope and definition

For this project, **dynamic content** means content that an authorized editor can create, edit, preview, publish/unpublish, and localize in the CMS, with the public website reflecting the published version without a code deployment. It does not mean storing React component code, CSS, or arbitrary executable markup in the database.

The presentation components and their visual design remain version-controlled in Next.js. Editors select and populate supported content types; the frontend validates and renders those types. Translation files may continue to hold interface chrome—validation messages, accessibility labels, loading states, pagination controls, and generic UI actions—unless those strings are explicitly part of a marketing/content editing requirement.

## 2. Current database-backed content

| Content | Existing model/API | Current coverage and target |
| --- | --- | --- |
| Services | `apps.services.Service`; `/api/v1/services/` | Title, slug, summary, Markdown description, icon, taxonomy, order, featured state and SEO already exist. Keep the existing model and make sure all public-facing fields used by the site are returned and localized. |
| Projects and case studies | `apps.portfolio.Project`, `CaseStudy`; `/api/v1/projects/` | Project identity, summary, client, year, image/gallery, categories/tags, product flag and order are database-backed. Case-study narrative, stack and metrics are also stored. Homepage-only claims currently shown from translation slots must not override these records. |
| Blog/library | `apps.blog.BlogPost`; `/api/v1/blog/` | Title, excerpt, Markdown content, cover, author, taxonomy and publish date are database-backed. Keep public queries limited to published records. |
| Academy | `Instructor`, `Course`, `Lesson` and existing academy APIs | Courses, lessons and instructors are database records. Confirm every displayed instructor/course field is exposed and translated before claiming complete editability. |
| Company | `TeamMember`, `Testimonial` | Records exist in the database. Identify and connect the pages/sections that should display them; a model by itself does not make a frontend section dynamic. |
| FAQ | `core.FAQItem`; SEO FAQ API | Question, answer, page path and order are already database-backed. Preserve per-path filtering and published/active semantics. |
| Global settings and SEO | `core.SiteSettings`, `SEOMetaModel`, `core.Redirect` | Site identity/contact/social settings, SEO defaults, organization metadata, canonical values and redirects have database representations. Verify each public setting is actually consumed by the frontend before treating it as editable end-to-end. |
| Media | `core.Media` | Uploaded files, alt text, captions and metadata are stored. Final media URL behavior must be consistent across the API, Next.js image configuration and cPanel document roots. |
| Leads/forms | Existing leads models and API | User-submitted records are persisted; form labels and success/error copy are interface strings unless deliberately made CMS-managed. Notification delivery is a separate integration/configuration concern. |

Existing public content endpoints are read-only for visitors. Content changes are expected to be performed by authorized staff through Django Admin, not through public write endpoints.

## 3. Content currently embedded in the frontend

The homepage is a hybrid of database records and content embedded in `frontend/messages/fa.json`, `frontend/messages/en.json`, and UI components. The following content must move to editor-managed records if the requirement is that editors can change it without deploying Next.js:

| Surface | Current source | Required CMS behavior |
| --- | --- | --- |
| Home hero | `ui.hero` translation namespace | Editable localized eyebrow, heading lines, lead, CTA labels/links and optional stats. Claims such as system counts, SLA, country counts, version and operational status require owner verification; do not seed them as facts without approval. |
| Home section introductions | `ui.services`, `ui.products`, `ui.projects`, `ui.library`, `ui.academy`, `ui.contact` | Editable localized eyebrow, heading, lead, CTA copy and visibility/order. Component layout and animation remain in code. |
| Service cards | Mix of `Service` API data and static `ui.services.slots` | Card identity/summary/tags/order must come from a single source. Do not silently use static sample cards when the API fails or returns no published records. |
| Product cards and product previews | `ui.products.slots`, `productChrome`, `PentestorUI`, `CrmUI`, `PropertyUI` in `products-section.tsx` | Product identity, copy, tags, status, metrics, labels and supported links must be data-backed, validated and localized. Product visual shells may remain typed React components. Never display fabricated CRM/property/Pentestor metrics as live customer data. |
| Project cards and outcomes | Database project list plus `ui.projects.slots` | Project title, industry/client, summary, technologies, outcomes, year and links must come from the matching published Project/CaseStudy record. Remove or explicitly mark unverified sample records. |
| Library cards and feature story | Blog API plus `ui.library.slots` | Published blog records supply the card content; featured selection/order and category labels must be editor-controlled or derived from the records. |
| Academy paths/nodes | Course API plus `ui.academy.slots` | Show actual published courses/lessons and their metadata. The current illustrative graph/nodes must either be modeled as learning-path content or removed; do not imply they are real courses unless backed by records. |
| Navigation and command palette | Translation JSON plus arrays/links in UI components | Editable menu and command destinations/labels with validation. Keep route handling and accessibility behavior in code. Internal system routes that are not content links can remain in code. |
| Footer/contact | Translation JSON and component values | Editable localized footer groups/links, social URLs, company contact data and legal links. Remove `#` placeholder destinations or leave them unpublished until real targets are supplied. |
| Coming-soon pages | Translation JSON and route-specific React pages | Preserve intentional product availability. If an editor must change the status/copy, represent it as product/page content; otherwise treat it as controlled interface copy. A CMS record must not imply a feature is implemented when it is not. |
| Static interior-page copy | `frontend/messages/fa.json` and `en.json` namespaces such as services, projects, academy, blog, contact and metadata | Separate content intended for marketing editors from interface strings (empty-state text, form validation, breadcrumbs, accessibility labels). Move only the former into CMS. |

`frontend/src/components/ui-port/home-data.ts` documents the current boundary: several headings, tags, product visual data and sample slots are currently treated as design copy. The future implementation must replace that boundary intentionally rather than adding another fallback data source.

## 4. Localization, publishing and data integrity requirements

1. Every editor-managed text field must support the configured locales (`fa` and `en`) and define an explicit fallback policy. Missing translation must not silently show the wrong language or a fabricated English/Persian sample.
2. Records used publicly must have a clear publication state. Draft, inactive, soft-deleted or incomplete records must not appear in public APIs, feeds, search, sitemap, JSON-LD or homepage cards.
3. Ordered collections need an explicit order field and deterministic tie-breaker. The frontend must not infer business meaning from array position or hard-coded IDs.
4. Rich content must use the repository's safe Markdown/rendering pipeline. Do not enable arbitrary editor-supplied HTML or executable content.
5. Existing published content and URLs must remain compatible. Migrations must be reversible where practical, avoid fabricating records, and retain stable slugs/canonical URLs.
6. Public content endpoints remain read-only. Admin editing requires authenticated, least-privilege staff permissions and should use Django's audit facilities where available.
7. Publish/update/unpublish must invalidate relevant Next.js data/page caches, including SEO, feeds and sitemap where applicable. The expected propagation time must be explicit and tested.
8. API outage, successful empty response and missing translation are distinct states. Production must never substitute illustrative/sample content for real records.

## 5. Implementation acceptance criteria

This inventory is complete enough to begin implementation when each row above is assigned to either (a) an existing database model/API to connect, (b) a typed CMS field/model/API to add, or (c) an intentional interface string to retain in translation files. Before Production content is populated, a content owner must approve all factual statements, statistics, customer/project claims, prices and legal links. No such approval is implied by this inventory.
