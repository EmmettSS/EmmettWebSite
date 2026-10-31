# CMS API cache and invalidation contract

This contract covers the public Django APIs consumed by Next.js, database-managed site copy, RSS feeds, and the SEO endpoints already used by the site. It adds no public write endpoint for CMS records.

## Freshness behavior

- Service, project, blog, academy, company, search, and translation fetches use a 60-second Next.js data-cache lifetime and stable cache tags.
- RSS feed source fetches use a 60-second lifetime. The public feed response permits at most 60 seconds of shared-cache freshness and requires revalidation afterward.
- SEO settings and sitemap fetches retain their existing 900-second lifetime; managed redirects retain 300 seconds. Django sitemap/redirect caches are explicitly cleared when their corresponding records change.
- When the signed on-demand webhook is configured, CMS changes expire the matching Next.js tags after the database transaction commits. The next request reads the updated API value. The 60-second content/copy/feed TTLs remain the recovery bound if the optional webhook is not configured or temporarily unavailable.

## Invalidation transport

Django sends a server-to-server `POST` to the configured `FRONTEND_REVALIDATE_URL` with `Authorization: Bearer <shared secret>` and a JSON body containing one or more allowlisted tags. The Next.js `POST /api/revalidate` handler:

- fails closed if the shared secret is absent or incorrect;
- accepts only known tags, limits the body to 4 KiB and each request to 20 tags;
- expires approved tags immediately (`revalidateTag(tag, { expire: 0 })); and
- responds with `Cache-Control: no-store` and the tags it expired.

Django queues notification after transaction commit, uses a two-second default timeout, and does not roll back a successful CMS save if Next.js is unavailable. Failures are logged; the configured fetch TTL provides recovery. The Django and Next.js processes must receive the same `FRONTEND_REVALIDATE_SECRET`. The endpoint URL is intentionally deployment-configured; its internal address depends on the Passenger/Node topology established in the deployment step.

## Tag ownership

| Tag family | Invalidated by |
| --- | --- |
| `content:services`, `content:projects`, `content:blog`, `content:academy`, `content:company` | Corresponding record create/update/delete, relevant related-record changes, taxonomy changes, and admin publication/soft-delete/restore actions |
| `search:site` | Search-indexed content and shared taxonomy changes |
| `site-copy:fa`, `site-copy:en` | Admin edits/deletes in `site.copy` and actual changes made by `import_frontend_copy` |
| `feed:blog`, `feed:academy` | Blog/course publication changes and their taxonomy changes |
| `seo:settings`, `seo:sitemap`, `seo:redirects`, `seo:faq:fa`, `seo:faq:en` | Matching site settings, publishable content, redirects, FAQs, or taxonomy changes |

Only those tag values are accepted by the Next.js endpoint. The source allowlist is mirrored in `backend/apps/core/frontend_cache.py`; tests cover its request validation and the affected model mappings.

## Deployment note

Set the internal `FRONTEND_REVALIDATE_URL` and a high-entropy shared secret in both processes after confirming the actual Node/Passenger topology. Do not place the secret in a `NEXT_PUBLIC_*` variable or commit real `.env` files. Until the URL is selected for the target hosting layout, both URL and secret may remain unset and the documented TTL fallback applies.
