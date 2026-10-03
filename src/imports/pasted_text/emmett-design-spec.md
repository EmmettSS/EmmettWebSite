# EMMETT GROUP — Master Design Specification
### Creative Direction → Design System → UX Architecture → Figma Implementation

---

# PART A — CREATIVE DIRECTION

**Brand idea:** Emmett is an engineering studio that solves difficult, systems-level problems — software, AI/ML, security, product, infrastructure — with the same rigor an architecture practice brings to a building. AI is one instrument in the toolkit, never the headline.

**Visual concept:** *An engineering architecture drawing brought to life.* Not a control-room, not a dashboard, not a neural network diagram — a studio's technical drafting table rendered in a warm, editorial, tonally rich digital language. The site should look like it was art-directed by people who also design physical spaces: precise grids, real materials (implied through layered surfaces and soft shadow, not glass and glow), and confident typography that doesn't need decoration to feel important.

**Emotional goal, section by section:**
- Hero → *"These people are serious."*
- Capabilities → *"They understand the whole system, not just one layer."*
- Product feature → *"They ship real things."*
- Selected work → *"They've actually built this before."*
- Library → *"They know what they're talking about."*
- Academy → *"They can develop talent, not just deploy it."*
- About → *"There are real people behind this."*
- Contact → *"I could actually start something with them."*

**What makes Emmett different:** Most engineering/AI studios default to one of two modes — sterile SaaS (light, generic, interchangeable) or AI-hype (dark, neon, interchangeable in a different way). Emmett sits in a third space: **dark-and-warm, technical-and-editorial, restrained-and-confident.** The tonal alternation (dark ↔ light) and the strict separation between Pentestor's contained intensity and CRM's calm productivity are the two structural decisions that make the system legible as *considered*, not templated.

**Why the design avoids AI clichés:** Every AI-startup visual cliché (neural nets, glowing orbs, particle fields, purple-cyan gradients, floating 3D shapes) borrows drama instead of earning it. Emmett earns visual interest through typographic scale, real photography, real product screenshots, and technical diagrams that could actually appear in an engineering document. If a visual can't be explained as "this is how we'd actually document this system," it doesn't belong on the site.

---

# PART B — DESIGN SYSTEM

## B1. Color Tokens

**Dark surfaces**
| Token | Hex |
|---|---|
| `color/bg/obsidian` | #0B0C0E |
| `color/bg/graphite` | #131417 |
| `color/bg/slate` | #1A1C20 |
| `color/surface/charcoal` | #202226 |
| `color/surface/charcoal-elevated` | #2A2C31 |

**Light surfaces**
| Token | Hex |
|---|---|
| `color/bg/warm-white` | #F6F4F0 |
| `color/bg/ivory` | #EFEBE4 |
| `color/surface/soft-gray` | #E7E5E1 |

**Text**
| Token | Hex |
|---|---|
| `color/text/dark-primary` | #F2F1EE |
| `color/text/dark-secondary` | #A7A9AE |
| `color/text/dark-tertiary` | #6E7075 |
| `color/text/light-primary` | #16171A |
| `color/text/light-secondary` | #4A4B4F |

**Accents (semantic, not decorative)**
| Token | Hex | Meaning | Where it's allowed |
|---|---|---|---|
| `color/accent/indigo` | #5B62E0 | Interaction / navigation / primary CTA | Global |
| `color/accent/emerald` | #1FAE6E | Growth / build / success | Academy, CRM, positive states |
| `color/accent/muted-blue` | #4C6E91 | Engineering / systems | Services, architecture diagrams |
| `color/accent/cyan` | #4FD1D9 | Security / active state | Pentestor only |

**Borders**
| Token | Hex |
|---|---|
| `color/border/hairline-dark` | #2E3034 |
| `color/border/hairline-light` | #DAD7D1 |
| `color/border/accent` | #5B62E0 @ 40% opacity |

**Rule embedded in tokens:** one dominant accent per section, maximum. No gradient tokens exist in the system except `effect/gradient-subtle` (135°, ≤12% luminance shift, surfaces only — never applied to text).

## B2. Typography Tokens

Typefaces: **Grotesque Sans** (UI/display — e.g. Inter/Neue Montreal-class), **Editorial Serif** (long-form headlines — e.g. Newsreader/Fraunces-class), **Mono** (technical/data — e.g. JetBrains Mono/IBM Plex Mono-class).

| Token | Face | Size | Weight | Line-height |
|---|---|---|---|---|
| `type/hero` | Grotesque | 88–120px | 500 | 1.02 |
| `type/display` | Grotesque | 56–72px | 500 | 1.05 |
| `type/h1` | Grotesque | 40–48px | 500 | 1.1 |
| `type/h2` | Grotesque | 28–32px | 500 | 1.2 |
| `type/h3` | Grotesque | 20–24px | 500 | 1.25 |
| `type/editorial-headline` | Serif | 40–64px | 400–500 | 1.15 |
| `type/body-lg` | Grotesque | 18px | 400 | 1.5 |
| `type/body` | Grotesque | 16px | 400 | 1.5 |
| `type/small` | Grotesque | 14px | 400 | 1.4 |
| `type/metadata` | Grotesque | 12–13px | 500, +4% tracking, uppercase | 1.3 |
| `type/technical` | Mono | 13–14px | 400 | 1.4 |

Rule: one `hero`/`display` treatment max per page above the fold.

## B3. Spacing, Grid, Radius, Shadow, Motion Tokens

**Spacing scale (4/8pt base):** `space/4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128`

**Grid:** 12-column, max content width 1280–1360px, desktop margin 64–80px, gutter 24px.

**Radius:** `radius/sm 4px` (inputs, tags) · `radius/md 8px` (cards, buttons) · `radius/lg 16px` (large panels, product frames) · `radius/none 0px` (editorial/full-bleed blocks — used deliberately to contrast with rounded product UI).

**Shadow (real, soft — never colored glow as default):**
- `shadow/sm` — 0 1px 2px rgba(0,0,0,0.24)
- `shadow/md` — 0 4px 16px rgba(0,0,0,0.28)
- `shadow/lg` — 0 12px 32px rgba(0,0,0,0.32)
- `shadow/glow-cta` — 0 0 24px `indigo @ 30%` (primary CTA hover only)
- `shadow/glow-pentestor` — 0 0 20px `cyan @ 35%` (active nodes only)

**Motion tokens:** `motion/fast 150ms` · `motion/base 250ms` · `motion/slow 400ms` · easing `ease-out-standard cubic-bezier(0.16,1,0.3,1)`.

**Breakpoint tokens:** `bp/xl 1440` · `bp/lg 1280` · `bp/md 1024` · `bp/sm 768` · `bp/xs 390` · `bp/xxs 375`.

---

# PART C — Information Architecture

```
Home
├── Services — Software Engineering / AI-ML / Cybersecurity / Product Engineering / Infrastructure
├── Products
│   ├── Pentestor (sub-brand: Security Engineering)
│   └── CRM / Business Systems (sub-brand: Business Products)
├── Projects — case study index → individual case study
├── Library — article index → article detail
├── Academy — path index → course detail
├── About
└── Contact
```

**Primary nav:** Home · Services · Products · Projects · Library · Academy · About — CTA: **Start a Project**

**Products mega-menu:** two visually distinct tiles — Pentestor (dark/cyan preview) and CRM (light/emerald preview) — signaling the personality split before the user even clicks through.

**Core user flows:**
1. Prospective client: Home → Services or Products → Projects (proof) → Contact
2. Security buyer: Home/Products → Pentestor → Contact
3. Learner/candidate: Home → Academy → course detail → sign up
4. Researcher/peer: Home → Library → article

---

# PART D — Homepage Blueprint (section-by-section)

## D1. Hero
- **Purpose:** establish identity and credibility in 3 seconds.
- **Background:** Obsidian.
- **Height:** 100vh (min 720px), min-height clamp for short viewports.
- **Grid:** 12-col, asymmetric 7/5 split (text left, visual right).
- **Layout:** Left-aligned text block, right-side system-architecture visualization.
- **Content hierarchy:** Eyebrow `EMMETT GROUP / ENGINEERING STUDIO` (metadata style) → Headline "We engineer systems for difficult problems." (`type/hero`) → supporting line (`type/body-lg`, secondary text) → Primary CTA "Explore our work" + Secondary "Start a project" (ghost button).
- **Visual:** node/connection/layer diagram with technical labels — explicitly not a brain, orb, or particle field.
- **Components:** Primary button, ghost button, eyebrow label, diagram frame.
- **Interaction:** magnetic pull (max 6px) on primary CTA only; diagram has subtle idle micro-motion (node pulse, ≤1.5s loop, no color shift).
- **Motion:** headline/subtext fade + 12px translate-up on load, staggered 60ms; diagram fades in 400ms after text.
- **Desktop:** 7/5 split as above.
- **Tablet (768):** stack — text first, diagram below at 80% scale.
- **Mobile (390):** diagram simplified to a static/lightly-animated flat graphic below the fold trigger; text remains full width.
- **Accessibility:** headline is a real `h1`; diagram is decorative (aria-hidden) with an equivalent text description available.
- **Transition to next section:** hard cut from Obsidian → Warm White (no gradient bridge) — this contrast is intentional and signals rhythm from the first scroll.

## D2. Capabilities
- **Purpose:** show the breadth of engineering disciplines.
- **Background:** Warm White.
- **Height:** auto (content-driven).
- **Grid:** single column, full 12-col width, each row full-bleed within max content width.
- **Layout:** Editorial technical index — NOT five cards. Each row: number (`01`–`05`, mono) · title (`h2`) · description (`body`) · arrow icon, separated by hairline-light dividers.
- **Content:** 01 Software Engineering, 02 AI/ML, 03 Cybersecurity, 04 Product Engineering, 05 Infrastructure.
- **Components:** editorial row, hairline divider.
- **Interaction:** hover reveals a small technical visual (schematic thumbnail) sliding in from the right + row background tints to soft-gray.
- **Motion:** row content fades/translates in on scroll, staggered 60ms per row.
- **Desktop:** full row layout with hover-reveal visual.
- **Tablet:** hover-reveal visual removed (no hover on touch); tap expands a short detail instead.
- **Mobile:** stacked rows, no arrow-hover behavior, tap-to-expand.
- **Accessibility:** rows are real list items; expand state is keyboard-operable.
- **Transition:** Warm White → Obsidian (hard cut).

## D3. Product Feature (Pentestor)
- **Purpose:** prove Emmett builds real, serious products.
- **Background:** Obsidian → near-black gradient toward panel edge (subtle, ≤12%).
- **Height:** auto, generous (min 720px desktop).
- **Grid:** 6/6 split — text+CTA left, large product interface right.
- **Layout:** left: eyebrow "FEATURED PRODUCT" → headline "Security systems built for real environments." → 2–3 line description → CTA "Explore Pentestor". Right: large realistic product screenshot in a clean frame with soft shadow, cyan used only inside the screenshot content itself (UI chrome around it stays neutral).
- **Components:** product frame, tag row (tech stack), primary button.
- **Interaction:** hover on product frame = subtle 1.02 scale + shadow deepen.
- **Motion:** 400ms fade/translate on scroll-into-view.
- **Desktop:** 6/6 split. **Tablet:** stack, text first. **Mobile:** stack, screenshot cropped to top portion with "view full" affordance.
- **Accessibility:** screenshot has descriptive alt text.
- **Transition:** Obsidian → Warm White.

## D4. Selected Work
- **Purpose:** proof via real case studies.
- **Background:** Warm White.
- **Layout:** editorial case-study composition — large image, project number (mono), project title (serif `editorial-headline`, smaller size ~40px), one-line problem/approach/outcome in a 3-column metadata row beneath.
- **Components:** editorial project module (not a card — no border/shadow container).
- **Interaction:** image has subtle parallax/scale on hover (desktop only).
- **Motion:** 400ms fade-up on scroll.
- **Tablet/Mobile:** image full width, metadata stacks vertically.
- **Transition:** Warm White → Slate (dark, technical mood next).

## D5. Engineering Proof
- **Purpose:** demonstrate technical depth visually.
- **Background:** Slate.
- **Layout:** full-width technical diagram — architecture/system relationship visualization with thin muted-blue lines, mono labels, coordinate-style annotations.
- **Components:** architecture-diagram frame.
- **Interaction:** minimal — optional hover tooltips on diagram nodes showing technical detail.
- **Motion:** diagram draws in (stroke-dashoffset animation, 800ms) on scroll-into-view, once only.
- **Mobile:** diagram simplifies to a vertical/linear version.
- **Transition:** Slate → Ivory.

## D6. Library Preview
- **Background:** Ivory. **Layout:** magazine-style editorial rows (category · title · description · author/date/read-time), 3 items, "View Library" text link beneath. **Motion:** staggered fade-up. **Mobile:** stacked rows, condensed metadata line.

## D7. Academy Teaser
- **Background:** Graphite (dark but warmer — slightly desaturated toward warm gray vs. Obsidian's cool black). **Layout:** 2–3 learning-path modules with emerald progress indicators, headline "Learn by building." **Motion:** progress bar fills on scroll-into-view once. **Mobile:** stacked, single column.

## D8. About Teaser
- **Background:** Warm White. **Layout:** large photography + short serif pull-quote from a team member + "Meet the team" link. Minimal chrome. **Mobile:** photo full width, quote beneath.

## D9. Contact / Closing CTA
- **Purpose:** confident, spacious close.
- **Background:** lightest surface (Warm White, extra padding — this section should feel like exhaling).
- **Layout:** centered, generous whitespace, headline "Have a difficult problem?" (`display`) → subtext "Tell us what you're building." → primary CTA "Start a conversation".
- **Motion:** simple fade-in, no scale/parallax — the restraint here is deliberate, it's the resting note.
- **Mobile:** full-width stacked, CTA full-width button.

---

# PART E — Page-by-Page Blueprint

### Services — *Engineering Architecture*
Dominant accent: Muted Blue. Layout: numbered technical grid (echoes Capabilities but expanded). Each service = problem space → what we build → approach → technology → 1–2 selected work links. Background alternates Graphite (index) → Warm White (per-service detail rows) for rhythm within the page itself.

### Products (index) — *Product Laboratory*
Dominant accent: Indigo (neutral, since it hosts two sub-brands). Two large feature blocks — Pentestor (dark preview) and CRM (light preview) — placed as full-width alternating sections so the personality contrast is visible immediately, followed by a shared "how we build products" editorial section.

### Pentestor — *Serious Security Engineering*
Dominant accent: Cyan (contained). Background: near-black (`Obsidian`/custom deeper variant). Hero: attack-surface/network-topology diagram, technical nodes + status indicators + mono metadata. Controlled glow (`shadow/glow-pentestor`) only on active/live nodes. Sections: Overview → Capabilities (scanning, reporting, monitoring — whatever applies) → Architecture → Technology → CTA. No skulls, no matrix rain, no hacker-hoodie imagery — technical credibility only.

### CRM / Business Systems — *Structured & Trustworthy*
Dominant accents: Emerald + Indigo. Background: Warm White/Ivory leaning, even within product screenshots. Sections: Overview → real dashboard/table/workflow screenshots → automation & analytics highlights → CTA. Zero dark hero, zero mono/terminal type.

### Projects — *Engineering Publication*
Index: editorial list (not grid) — large image, number, title, one-line outcome. Detail template (fixed): 01 Overview · 02 Challenge · 03 Approach · 04 Architecture · 05 Technology · 06 Implementation · 07 Result. Desktop: persistent left side-rail nav (sticky) tracking scroll position. Mobile: sticky top section-picker (horizontal scroll chips). Architecture diagrams rendered as real assets, not screenshots-of-screenshots.

### Library — *Editorial Publishing*
Background: Warm White/Ivory. List/row layout (title serif, category+date+read-time in metadata mono/caption style). Search bar minimal, filter chips beneath. Article detail page: generous margins, serif body option for long reads, pull-quotes in serif at 32–40px.

### Academy — *Learning Environment*
Background: Graphite (dark, warm-leaning). Emerald as growth accent. Path index → course detail (curriculum list, instructor, duration, difficulty tag, "what you'll build" outcome statement). Progress shown as a clean horizontal bar, not badges/streak-gamification.

### About — *Human & Culture*
Background: Warm White, almost entirely photography-led. Sections: opening statement (large serif) → team photography grid (real, candid-style, not headshot wall) → values (short editorial rows, not icon cards) → timeline (simple vertical rule + milestone markers, mono dates) → closing culture quote. Minimal UI chrome throughout — this page should look printable.

### Contact — *Spacious Close*
Background: Warm White, maximal whitespace. Conversational single-column form: "What are you building?" (textarea) → Project type (select) → Timeline (select) → Description → Contact info. Submit button full-width on mobile, inline on desktop. No sidebar, no marketing copy competing with the form.

---

# PART F — Component System

For each component: purpose · anatomy · variants · states · spacing · typography · behavior · responsive note.

### Button
- **Purpose:** primary interaction trigger.
- **Anatomy:** label + optional icon, padding `space/16` horizontal / `space/12` vertical, `radius/md`.
- **Variants:** Primary (indigo fill, light text), Secondary (hairline outline, transparent fill), Ghost (text + underline on hover), Icon-only (square, `radius/sm`).
- **States:** Default / Hover (`shadow/glow-cta` on Primary only, others get border-color shift) / Active (scale 0.98) / Focus (`2px indigo outline`, offset 2px) / Disabled (40% opacity, no pointer events) / Loading (label replaced by inline spinner, fixed width preserved).
- **Typography:** `type/body`, 500 weight, letter-spacing +1%.
- **Responsive:** min touch target 44×44px on mobile; Primary CTA becomes full-width in mobile forms/closing sections only.

### Navigation Bar
- **Anatomy:** logo (left) · nav links (center-left or right per breakpoint) · CTA button (right).
- **Variants:** Transparent-over-hero, Solid-scrolled (Graphite + blur + hairline bottom border).
- **States:** link Default/Hover(color shift to primary text)/Active(2px indigo underline, animated width)/Focus(outline).
- **Behavior:** transitions Transparent→Solid at ~80px scroll, 200ms ease-out.
- **Responsive:** collapses to hamburger + full-screen drawer below 1024px.

### Mega-Menu (Products)
- **Anatomy:** two large tiles (Pentestor, CRM), each with mini-preview image, name, one-line descriptor.
- **Behavior:** opens on hover/click of "Products" nav item, closes on outside click/escape.
- **Responsive:** on mobile, becomes an expandable accordion within the drawer.

### Card family (Product / Project / Service / Course / Article / Team)
- **Purpose:** used only where content genuinely benefits from a bounded container (e.g., Course card in a grid index) — not the default content wrapper.
- **Anatomy:** image/visual (16:9 or 4:3 depending on type) · metadata row · title · one-line description · optional CTA link.
- **States:** Default / Hover (1.02 image scale + `shadow/md`) / Focus (outline) / Loading (skeleton matching exact geometry).
- **Responsive:** grid collapses 3→2→1 columns across breakpoints; card internal padding reduces from `space/24` to `space/16` on mobile.

### Editorial Row
- **Purpose:** primary content pattern replacing cards for Capabilities, Library, Selected Work.
- **Anatomy:** number/category (mono) · title · description · metadata/arrow, full-width, hairline divider below.
- **States:** Default / Hover (background tint + optional visual reveal, desktop only) / Focus (outline on interactive rows).
- **Responsive:** metadata wraps beneath title on mobile; hover-reveal visuals removed on touch.

### Architecture Diagram Frame
- **Purpose:** houses technical/system diagrams consistently.
- **Anatomy:** frame with hairline border, mono caption/label row beneath, optional legend.
- **States:** static / animated-draw-in (scroll-triggered, once) / node-hover-tooltip (desktop).
- **Responsive:** complex diagrams have a simplified/linear mobile variant — not just a scaled-down version.

### Form Inputs (text, select, textarea)
- **Anatomy:** label above field, `radius/sm`, hairline border, focus = indigo border + subtle background shift.
- **States:** Default / Focus / Filled / Error (red-adjacent muted tone, not saturated red) / Disabled.

### Timeline (About)
- **Anatomy:** vertical hairline rule, milestone markers (small filled circle), mono date label, short description.
- **Responsive:** remains vertical at all breakpoints; spacing compresses on mobile.

### Tabs / Accordion / Breadcrumb / Modal / Toast / Footer
Standard construction, all consuming the token system (spacing, radius, color, motion) rather than one-off values; all include Default/Hover/Focus/Disabled states at minimum, Loading where content is async.

---

# PART G — Responsive System

| Breakpoint | Behavior |
|---|---|
| **1440** | Full editorial layout, max content width 1360px, generous margins (80px), all hover states active. |
| **1280** | Margins reduce to 64px, asymmetric splits (7/5, 6/6) retained, diagram complexity retained. |
| **1024** | Nav collapses to drawer; multi-column editorial layouts (e.g., Capabilities hover-reveal) simplify — hover visuals removed, replaced with tap-to-expand; hero splits begin to compress (60/40 → still side-by-side but tighter). |
| **768** | Full stacking begins: hero text-then-diagram, product feature text-then-screenshot, case studies full-width image-then-metadata; grid drops to single/2-column; side-rails (Projects detail) convert to sticky horizontal chip nav. |
| **390** | Mobile-first recomposition, not scaled desktop: typography scale reduces ~35–40% from desktop hero/display sizes, line-height increases slightly for readability; all CTAs in closing/contact sections go full-width; complex diagrams swap to simplified linear mobile variants; horizontal galleries become native swipe. |
| **375** | Same structure as 390 with tighter internal padding (`space/16` base instead of `space/24`) to preserve margins on the smallest supported width. |

**Cross-cutting rule:** whitespace ratio is preserved proportionally at every breakpoint — mobile should still feel spacious, not cramped, even though absolute pixel values shrink.

---

# PART H — Motion System

| Trigger | Animation | Duration | Easing | Purpose |
|---|---|---|---|---|
| Nav scroll threshold | Background fade + blur increase | 200ms | ease-out-standard | Signal state change without distraction |
| Section scroll-into-view | Fade + 12px translate-up, staggered 60ms/element | 400ms | ease-out-standard | Reveal content with clear reading order |
| Card/module hover | 1.02 scale + elevation shadow | 250ms | ease-out-standard | Affordance, spatial feedback |
| Primary CTA hover | Glow shadow + 6px magnetic pull | spring (low stiffness) | — | Draw attention to the one critical action |
| Diagram draw-in | Stroke-dashoffset reveal, once | 800ms | ease-out-standard | Communicate systems/technical credibility |
| Route/page transition | Cross-fade + 8px vertical settle | 300ms | ease-in-out | Continuity between pages |
| Pentestor active node | Opacity/glow pulse loop | 1.5s loop | ease-in-out | Signal "live" state, contained to product only |
| Progress bar (Academy) | Width fill, once, on scroll-into-view | 600ms | ease-out-standard | Show growth/progress metaphor |

**Explicitly excluded:** scroll-hijacking, continuous parallax, particle systems, 3D rotation, ambient glow loops on backgrounds, auto-playing decorative animation with no state meaning.

---

# PART I — Content Direction

**Voice:** precise, confident, unhurried. No exclamation points. No "supercharge," "unlock," "revolutionize," "seamless," "cutting-edge." Sentences read like something an engineer would actually say to a client.

**Headlines (examples, adapt per final copy review):**
- Hero: "We engineer systems for difficult problems."
- Capabilities: "Engineering across the entire system."
- Pentestor feature: "Security systems built for real environments."
- Library: "Ideas worth building on."
- Academy: "Learn by building."
- About: "The people behind the systems."
- Contact: "Have a difficult problem?"

**Microcopy tone:** short, declarative — "Tell us what you're building." not "We'd love to hear about your exciting project!"

**CTA language:** Explore our work · Start a project · Explore Pentestor · View case study · Start a conversation · View Library · Explore Academy — always a verb + concrete object, never "Learn more" alone.

**Navigation labels:** Home · Services · Products · Projects · Library · Academy · About — no cute renaming ("Playground," "Universe," etc.).

**Metadata language (mono/caption style):** `ENGINEERING STUDIO` / `CASE STUDY №04` / `8 MIN READ` / `LEVEL: INTERMEDIATE` / `EST. TIMELINE: 3–6 WEEKS` — precise, information-dense, never decorative filler.

---

# PART J — Figma Implementation Specification

## J1. Global Figma Setup
- **Variables:** create Figma Variables for every color, spacing, and radius token in Part B (collections: `Color/Dark`, `Color/Light`, `Color/Accent`, `Space`, `Radius`). Bind all component fills/paddings to variables — no hardcoded hex/px in instances.
- **Text Styles:** one style per typography token in Part B2 (11 styles total).
- **Effect Styles:** `shadow/sm`, `shadow/md`, `shadow/lg`, `shadow/glow-cta`, `shadow/glow-pentestor`.
- **Grid Styles:** `Grid/Desktop-12col` (1360 max width, 80px margin, 24px gutter), `Grid/Tablet-8col` (768, 32px margin, 16px gutter), `Grid/Mobile-4col` (390, 24px margin, 16px gutter).

## J2. Page: 00 — Cover & Guidelines
Frame 1600×900. Contains brand statement, token swatches, and a short "how to use this file" note for other designers.

## J3. Page: 01 — Design System
- **Section "Colors":** Auto Layout frame, wrap, each swatch 120×120 with token name label beneath (`type/metadata`).
- **Section "Typography":** vertical Auto Layout, each style shown at real size with token name.
- **Section "Components":** one Auto Layout frame per component (Button, Nav, Cards, Editorial Row, Diagram Frame, Inputs, Timeline, Tabs, Accordion, Breadcrumb, Modal, Toast, Footer), each built as a Figma **Component Set** with **Variants** for state (Default/Hover/Active/Focus/Disabled/Loading) and, where relevant, size/type variant properties.

## J4. Page: 02 — Home
- **Frame:** 1440×auto (desktop), Auto Layout vertical, gap 0 (sections are full-bleed, internal padding handles spacing), no fixed page padding — each section frame manages its own.
- **Per section (Hero, Capabilities, Product Feature, Selected Work, Engineering Proof, Library Preview, Academy Teaser, About Teaser, Contact):** own Auto Layout frame, direction per Part D spec (Hero: horizontal 7/5; Capabilities: vertical stack of row components; etc.), padding `space/80` desktop / `space/64` at 1280 / `space/48` at 1024 / `space/24` at 768 & below.
- **Constraints:** text blocks `Left & Right` (fill), imagery/diagrams `Scale`, CTAs `Left, Bottom` where applicable.
- **Layer hierarchy example (Hero):**
  ```
  Section/Hero (Auto Layout, horizontal)
  ├── Content/Left (Auto Layout, vertical)
  │   ├── Eyebrow (text)
  │   ├── Headline (text, type/hero)
  │   ├── Subtext (text, type/body-lg)
  │   └── CTA Group (Auto Layout, horizontal)
  │       ├── Button/Primary (instance)
  │       └── Button/Ghost (instance)
  └── Visual/Diagram (frame, Diagram Frame component instance)
  ```

## J5. Pages: 03–11 (Services, Products, Pentestor, CRM, Projects, Library, Academy, About, Contact)
Each follows the same structural rule: one top-level Auto Layout frame per page, one child Auto Layout frame per section, all typography/color/spacing bound to Variables/Styles, all repeating elements built as Component instances (never duplicated raw shapes/text). Page-specific notes:
- **Pentestor:** separate local color variable mode/override for near-black + cyan (still referencing the base Variable collection, not new hardcoded values) so the sub-brand stays token-driven.
- **CRM:** uses Light collection as default background mode for its sections, distinguishing it structurally from every other dark-default page.
- **Projects (detail template):** build as a single Component with a side-rail nav bound to named sections below, so new case studies are produced by duplicating one master component, not rebuilding layout.

## J6. Page: 12 — Responsive
For each of Home, Services, Pentestor, Projects-detail (representative sample, not every page): frames at 1280 / 1024 / 768 / 390 widths, each using the same section components with breakpoint-specific Auto Layout direction/padding overrides (Figma "swap" via responsive Auto Layout resizing + component property overrides where structural change is needed, e.g., Hero split → stack).

## J7. Page: 13 — Components Playground
A sandbox frame per component showing all variants/states side by side for QA — not part of the shipped design, but required for design-system integrity checks before handoff.

---

# PART K — Final Quality Audit

| # | Question | Assessment |
|---|---|---|
| 1 | Is the website too dark? | No — rhythm is enforced structurally (max 2 consecutive same-register sections; Homepage alternates every 1–2 sections). |
| 2 | Is the website too generic? | No — editorial rows replace default card grids as the primary content pattern; layouts are asymmetric by default. |
| 3 | Does it look like an AI startup? | No — no neural/brain/orb/particle imagery anywhere in the spec; accent palette explicitly excludes purple and restricts cyan to one product. |
| 4 | Are cards overused? | No — Part D/E explicitly specify editorial rows/full-bleed modules for Capabilities, Selected Work, Library; cards reserved for index grids (Projects index thumbnails excepted, Courses, Articles-as-grid alt view). |
| 5 | Are gradients overused? | No — single `effect/gradient-subtle` token, ≤12% shift, surfaces only, never on text. |
| 6 | Is there enough whitespace? | Yes — 64–80px desktop margins, explicit "don't fill every empty region" principle carried into every section spec. |
| 7 | Does the visual rhythm change? | Yes — homepage tonal sequence explicitly mapped in Part D; each page alternates internally too (e.g., Services: Graphite→Warm White). |
| 8 | Does each page have its own personality? | Yes — Part E assigns a distinct dominant accent + mood per page while sharing the token system. |
| 9 | Is Pentestor visually distinct? | Yes — only page using cyan/near-black/mono-dominant/contained glow. |
| 10 | Is CRM visually distinct? | Yes — only page defaulting to light backgrounds even in hero/product sections. |
| 11 | Does the website feel human? | Yes — About is photography-first with minimal chrome; team quotes in serif; no UI effects. |
| 12 | Does it communicate engineering competence? | Yes — architecture diagrams are first-class assets on Home, Services, Pentestor, and every Project detail page. |
| 13 | Is the mobile experience intentionally designed? | Yes — Part G specifies recomposition (not scaling) at every breakpoint, including diagram-simplification rules. |
| 14 | Could a premium engineering studio realistically ship this? | Yes — restraint (one accent/section, limited glow, real shadows, real photography) is enforced as a system rule, not a suggestion. |

**Result: PASS.** With the logo removed, the dominant signals — technical diagrams as content, editorial typography, tonal rhythm, and the Pentestor/CRM personality split — read as a studio with a distinct point of view rather than an interchangeable AI-startup template.

---

*This specification is designed to be handed to a designer or Figma AI directly. Part J is written in Figma-native terminology (Variables, Auto Layout, Component Sets, Variants, Constraints) so it can be executed with minimal reinterpretation.*
