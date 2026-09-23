> **⚠️ DEPRECATED (v1) — 2026-09-23.** این فایل بخشی از بستهٔ v1 است و با بستهٔ جدید در `prompts/` جایگزین شده است. فقط برای ردیابی نگه داشته شده؛ اجرا نکنید. مبنای اجرا: `prompts/README.md`.

# EMMETT GROUP — PHASE 4 PROMPT: CONTENT, SEO FINAL, OPS & LAUNCH
### Real Content, Analytics/Monitoring, Security Hardening, Runbook, Final Documentation, Launch

> **Self-contained phase prompt.** Assume Phases 1–3 have landed (complete site on `main`,
> all tests/CI green, Lighthouse budgets met, API + Static Bridge + sitemap pipeline live,
> analytics hooks with fixed event names, DEPLOYMENT draft). Read `prompts/00-MASTER.md`
> first; verify Phases 1–3 exit gates. **This phase ends the program** — its exit gate is
> the master's Definition of Done (§9), verified line-by-line with evidence.

---

## 1. Mission

Take the technically-complete site to **commercial launch condition** on the team's cPanel
hosting: production content in both languages (Persian-first), final SEO verification,
self-hosted analytics (Matomo) + monitoring + backups, security hardening, a working
staging→production deployment executed and documented, operator runbooks, the complete
final documentation tree, and a launch report with evidence for every Definition-of-Done
item.

## 2. Locked context (condensed)

- Hosting: shared Linux + cPanel (Python App/WSGI, MariaDB, cPanel cron, SMTP via cPanel
  or provider, AutoSSL). **No Docker/Node at runtime.** Build in CI; deploy artifacts:
  web build (dist) + api (code + venv) + static seo output + media.
- Stack: web/ (React SPA, Persian-first, Jalali, Toman) + api/ (Django 5.2 LTS + DRF).
  Static Bridge renders crawlable detail pages; CI prerenders marketing routes.
- Golden rules unchanged: fa-first, Iran-safe dependencies only, tests green, docs current,
  no secrets in repo, `[INPUT Bx]` placeholders tracked in `docs/OPEN-ITEMS.md`.
- Inputs: by now B1–B10 should be real where launch-critical (domain, cPanel, SMTP, brand,
  contact, content, Toman budgets, legal). Anything still missing → it goes into
  OPEN-ITEMS as a **launch blocker** with an owner and a decision date.

## 3. Tasks

### 3.1 Production content (Persian-first; this is the site's actual copy)
1. **Content audit:** run the site with demo seed; produce `docs/CONTENT-AUDIT.md` —
   every string/section/media with status: `real` / `placeholder (replace: who, when)` /
   `needs-legal` / `blocked-on-input`. Nothing ships with an unmarked placeholder.
2. **Copywriting pass (fa written first as native rewrites, then en):** home (hero +
   every band), services (division sections, engagement models, estimator point-of-view
   lines), products (PenTestor & Emmett CRM: positioning, capabilities, FAQ, waitlist copy),
   about (story, values, philosophy), academy, careers (culture + job descriptions),
   contact (direct channels, 48h promise), legal pages, all UI strings, all email
   templates (final pass), 404/error states, OG titles/descriptions per section.
   Style: confident engineering voice, zero hype, zero AI-cliché vocabulary (the
   master's §10.6 list), Persian idiomatic (no translationese), numbers in Toman
   (B7-approved ranges), dates in Jalali, team facts only from B6.
3. **Production seed:** `api/content_data/production/` — the real/approved dataset:
   team roster (B6; if still placeholders, mark names/links as `[INPUT B6]` and set
   `TeamMember.active=false` for them so the site shows an "expanding team" band instead
   of fake people), real case studies (or 2 honest placeholder-labeled ones flagged
   "case study pending client approval" — **never fake client names**), posts (≥ 6,
   ≥ 1 gated whitepaper with a real PDF in media, authors linked), testimonials (real
   or honestly-labeled "in progress"), jobs (real openings), SiteConfig (B5 contact block,
   B7 budget ranges, socials, "now building" line).
   Re-run `seed_content --production` in dev; verify every page renders with real data in
   both languages; fix the model/content gaps this reveals (with tests).
4. **Media final:** logo (B4) placed in every slot (favicon set incl. `apple-touch`,
   navbar, footer, email header, OG); product mockups finalized (PenTestor console,
   Emmett CRM dashboard frames); OG images generated per route (Organization OG default +
   section OGs + per-post via the pipeline); all images optimized (AVIF/WebP, alt text in
   **both languages** where applicable — alt follows page locale).
5. **Legal (B9):** privacy policy + terms in fa + en — final text from the team or a
   professional-quality draft clearly stamped `DRAFT — pending legal review` in
   OPEN-ITEMS (launch blocker if still draft at launch; the pages must exist regardless).
   Privacy must actually describe: Matomo (cookieless, what it collects), form data
   storage (leads/CVs — where, how long, who accesses), email confirmations, CV handling,
   unsubscribe. Be truthful — the site's own copy promises privacy-respecting behavior.
6. **OPEN-ITEMS drain:** re-audit `[INPUT]` markers across code, content, docs; each item
   gets owner + status; zero unmarked placeholders in user-visible surfaces (CI grep
   gate: `[INPUT` must not appear in `web/src/content/` or `api/content_data/production/`
   at launch — the gate is added in this phase and runs in CI from now).

### 3.2 SEO final (verify, don't just trust Phase 3)
1. **On staging (the first thing this phase deploys — §3.6), execute the full SEO audit**
   and record it in `docs/SEO-REPORT.md` with evidence:
   - Sitemap: valid XML, every route × both locales present exactly once, hreflang ↔
     sitemap ↔ canonical three-way consistency (script output), lastmod sane.
   - `robots.txt` correct (sitemap URL live, no disallowed surprises).
   - Prerendered HTML: open each top route with JS disabled → content readable, meta
     complete; crawlers get real content on blog detail (Static Bridge) and marketing
     pages (prerender).
   - JSON-LD: validate every emitted schema (schema.org validator / `seo-check` output);
     BlogPosting author/organization links resolve.
   - OG: social-preview check for home, each product, one post, one case study (fa+en)
     (capture preview screenshots into docs/assets).
   - Internal linking: all nav/footer/CTA links resolve (200), redirect map executed
     (old routes land correctly, no loops), 404 only for real 404s (crawled with a
     route-list check), no orphan content pages (every seeded post/case study reachable
     via at least one link).
   - Titles/descriptions: no dupes, within budget, fa-first patterns (I18N.md format).
   - Search consoles: prepare `docs/SEO-REPORT.md` § setup — Google Search Console +
     Bing Webmaster verification file deployment steps (place verification files in
     static; note: access from Iran may require the team's own connection — document),
     sitemap submission steps, post-launch 2-week SEO watch checklist.
   - Performance-on-crawlers: TTFB notes (shared host reality — document the caching
     story: whitenoise immutable assets, API response cache, Static Bridge = static
     files).
2. **Fixes** found in the audit are implemented in this phase (either side, web or api),
   with tests for the regression.

### 3.3 Analytics & monitoring (Iran-safe, self-hosted)
1. **Matomo** installed on the cPanel account (separate subdomain or path — documented
   choice; cookieless config: `cookiedomain` disabled, IP anonymization on, log
   retention 12 months, excluded IPs: internal/staging). Tracker snippet in the web build
   behind the Phase 3 `analytics.ts` hooks (the only runtime integration — loaded async,
   non-blocking, fails silently if the host is unreachable).
2. **Events (exact names from Phase 3 hooks):** `contact_submit` (form, project_type,
   budget_range as custom variables — no PII), `waitlist_join` (product, has_referral),
   `newsletter_subscribe`, `whitepaper_download` (post slug), `job_apply` (job slug),
   `language_switch` (locale), `cta_click` (section). Dashboard: goals + conversion
   paths defined in RUNBOOK (weekly review).
3. **Uptime:** external monitoring on `/api/v1/health/` (200, < 3 s) + `/` (200 + title
   check) — tool: UptimeRobot (free) **or** self-hosted healthchecks.io-style on cPanel
   (team choice, documented); alert destination: the team channel (input B5). Alert
   wiring executed + test incident run (documented).
4. **Error observability:** Django: structured error log to file (rotating), a
   `/api/v1/health/`-adjacent **error count endpoint** (admin-only) or log-review
   procedure in RUNBOOK; web: error boundary logs + a `window.onerror` → Matomo log
   (non-PII). No external APM (hosting envelope) — document the review cadence (weekly,
   RUNBOOK).
5. **Backups:** cPanel DB backup (cron daily, 14-day retention, verified size), media
   backup (tar, cron), **restore test executed** on staging: restore yesterday's dump to a
   scratch DB, run API smoke, record in LAUNCH-REPORT (evidence: command + output).
   Off-site copy step: documented (rsync/SFTP to a second location — team's choice,
   input). Backup + restore = a Definition-of-Done item; prove it.

### 3.4 Security hardening (final pass)
1. `pip-audit` + `npm audit --audit-level=high` clean (or documented accepted risks with
   dates); dependency lockfiles final.
2. Secrets: repo scan (gitleaks or `git secret` scan in CI — commit the workflow),
   `.env.example` completeness check (every var in code exists in .env.example), no
   secret in any committed file (spot audit of history for the new files).
3. Headers final (prod settings + cPanel `.htaccess` where Django can't set them):
   `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
   `Permissions-Policy`, CSP **draft** (recorded in SECURITY.md; apply a starting CSP in
   report-only mode, move to enforce after one clean week — process documented).
4. OWASP Top-10 mapping for **every** endpoint (table in SECURITY.md: endpoint | threat |
   control | test proving it — link to the Phase 2 tests), plus: rate-limit values
   reviewed for launch (contact 5/h/IP; admin login — Django `axes` optional: if added,
   ADR + tests; if not, document the mitigation: unique hosts + cPanel-side fail2ban
   note), upload path permissions, session cookie flags, CSRF everywhere, Markdown
   sanitizer allowlist re-verified, unsubscribe token entropy, referral-code charset.
5. cPanel-level: directory listing off, PHP (Matomo) isolated, cron user scoping,
   file permissions (600 for .env, 750 for media), AutoSSL cert + HSTS preload
   decision, `.htaccess` hardened base (deny dotfiles, static cache rules).
6. **Incident basics** (RUNBOOK): how to freeze the site (maintenance flag from
   SiteConfig admin — verify it works end-to-end), how to roll back (last-good artifact
   retention: 3 releases on server, documented), who does what (roles, contacts).

### 3.5 Performance final (shared-host reality)
1. Re-run Lighthouse CI **against the staging deployment** (not just CI-local) — mobile,
   top-5 routes × fa × en; record the staging numbers in LAUNCH-REPORT (shared-host TTFB
   may differ — if a budget is missed due to TTFB, document mitigation: enable
   Apache/`mod_cache` or cPanel caching for static, `StaticFiles` cache headers, API
   cache TTLs; re-measure).
2. Web Vitals going forward: Matomo Real-Time/behavior reports as the post-launch
   instrument (RUNBOOK weekly check) — no external RUM.
3. Asset final: `vite build` size report committed (baseline table: initial JS/CSS per
   locale, fonts, images), any over-budget item fixed or documented.

### 3.6 Deployment (executed, not just documented)
1. Finalize `deploy/`: `deploy.sh` (single script: fetch artifacts → rsync web dist →
   api code → `pip install -r` in the cPanel venv → `migrate` → `collectstatic` →
   `render_public_html --force` → media sync → smoke: `/api/v1/health/` + `/` title
   check → done; `--rollback <n>` step), env mapping table (cPanel fields ↔ vars),
   cron lines installed (render hourly, backup daily, digest monthly-off).
2. **Staging first:** deploy to the staging subdomain (B1) with production settings
   (staging env values); run the Phase 2 demo runbook + Phase 3 e2e against staging
   (API base override); run §3.2 SEO audit on it (that's where it belongs); fix → redeploy
   until green. Evidence in LAUNCH-REPORT.
3. **Production:** execute the same flow on the production domain (domain/DNS notes in
   DEPLOYMENT.md: A/CNAME, SSL via AutoSSL, redirect http→https + www policy, old
   routes' .htaccess map from Phase 3's redirect list, 404 page route).
4. **Post-launch verification (same day):** analytics seeing traffic (Matomo), uptime
   live, health endpoint green from outside, form → real email received (test lead,
   then marked closed in admin), unsubscribe works, waitlist signup visible in admin,
   post publish → sitemap/RSS/SEO page updated (timed, recorded), backup ran, Matomo
   goal events firing (devtools network check screenshots), 404 + legal + all nav links
   spot-checked in fa+en. All recorded in LAUNCH-REPORT § "Day 1".

### 3.7 Final documentation pass (complete the master §8 tree — every file current)
1. `README.md` (final, **Persian section first**): what Emmett is, status, monorepo map,
   dev quickstart (`scripts/dev-up.sh`), API quickstart, content management pointer,
   deployment pointer, docs index, badges (CI status), license/private notice.
2. `docs/ARCHITECTURE.md` final: diagrams (system, data-flow, URL matrix, request
   lifecycle crawler-vs-user), ADR index (all implemented statuses), hosting envelope.
3. `docs/API.md` final: OpenAPI embedded/linked, Persian quickstart with real endpoints,
   error/throttle/honeypot semantics, example payloads (fa+en).
4. `docs/CONTENT_GUIDE.md` (Persian, operator-level, screenshot-illustrated): adding a
   post (fa+en, cover specs, gating a whitepaper, authors), case study, team member,
   testimonial, job opening; managing leads (workflow states, CSV export), waitlists
   (notifying, referral), newsletter (digest run), SiteConfig (contact block, budget
   ranges, maintenance mode); media rules (formats, sizes, alt text); publishing
   checklist per content type (including the cron render + sitemap timing).
5. `docs/DEPLOYMENT.md` final (fa+en): prerequisites, staging + production procedures
   (executed steps, with the actual commands), env var reference (full table), cron,
   SSL/DNS, rollback, off-server backup copy, "what to do when cPanel updates/changes".
6. `docs/RUNBOOK.md` (Persian, operator-level): daily/weekly/monthly ops (Matomo review,
   error logs, backups verification, lead triage, SEO watch), incident response
   (freeze, rollback, restore-from-backup with the tested commands, comms template),
   contact escalation (who, when), maintenance window procedure.
7. `docs/SECURITY.md` final (EN primary + fa summary): threat model summary, OWASP
   mapping table, secrets policy, CSP status (report-only → enforce plan), dependency
   process (audit cadence), data handling (leads/CVs: retention, access, deletion
   procedure — admin action + DB note, honest), vulnerability disclosure note.
8. `docs/I18N.md` / `docs/DESIGN.md` / `docs/AUDIT.md` — currentness pass (no drift vs
   code). `docs/ADRS/*` — statuses final. `docs/LAUNCH-REPORT.md`: Definition of Done
   (§9 of master) line-by-line with evidence (screenshots, CI run links, command
   outputs, timing records), open items (should be ≈ empty or owner+date), 30-day
   post-launch checklist (SEO watch, performance watch, content swap deadlines from
   B6, legal sign-off).
9. `CHANGELOG.md` → `v1.0.0 — Launch` entry; `docs/OPEN-ITEMS.md` → final state;
   `prompts/` untouched.

## 4. Explicitly NOT in this phase
- No feature work. Any new feature idea that surfaces → OPEN-ITEMS for v1.1 (with a one-
  line note), not code. No framework/stack changes (ADRs only). No marketing spend or
  outreach (the site ships; promotion is the team's).

## 5. Exit gates = master Definition of Done (§9), plus:

- [ ] **Every §9 line verified with evidence** (LAUNCH-REPORT.md) — this is the gate.
- [ ] Staging + production both deployed via `deploy.sh` (logs in report); rollback
      exercised once (redeploy previous release on staging).
- [ ] Restore-from-backup executed and recorded (DB + media).
- [ ] Matomo: config, events (7), goals, cookieless, no other third-party runtime pixels.
- [ ] Uptime + alert path proven with a test incident.
- [ ] Security: audits clean (or documented), headers verified on the live site
      (headers check output in report), CSP report-only running, secrets scan clean.
- [ ] SEO: sitemap/robots/JSON-LD/OG verified on the live site (report + captures).
- [ ] `[INPUT` grep gate green in production content + code; OPEN-ITEMS items all have
      owner+date (launch blockers: zero).
- [ ] Lighthouse staging numbers within budgets (or documented mitigation + re-measure).
- [ ] Full doc tree committed; README (fa-first) correct; `v1.0.0` tagged.
- [ ] 30-day checklist in LAUNCH-REPORT assigned.

## 6. Handoff (the program ends here)
The team receives: a live bilingual commercial website (Persian-first) on their own
infrastructure, a Django admin as the content engine, a lead/waitlist pipeline with
email, self-hosted analytics + monitoring + backups, and the full documentation tree to
run it without the original builder. v1.1 backlog = `docs/OPEN-ITEMS.md` + the P2
creative-ideas not implemented in Phase 3.
