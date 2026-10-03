# EMMETT GROUP — PRODUCT DESIGN SPECIFICATION
## Complete UX/UI System for Figma AI
### Version 2.0 — Design Director Expansion

---

## HOW TO USE THIS DOCUMENT

This is not a mood board. This is an executable specification. Every section below defines the same fourteen dimensions so that Figma AI (or a human design team) can generate consistent, production-grade screens without guessing:

`Purpose → User Psychology → Layout → Visual Hierarchy → Component Structure → Motion → Micro-interactions → Hover Behavior → Scroll Behavior → Entry/Exit Animation → Loading & Empty States → Responsive Behavior → Accessibility → Glassmorphism/Color/Type/Spacing Rules`

Read the **Foundation** chapter first — it defines the design tokens every section inherits. Then move section by section in the order defined in the Information Architecture.

---

# PART 1 — FOUNDATION (DESIGN SYSTEM LAYER)

The original prompt described a visual mood. A production system needs tokens, scales, and rules that don't drift page to page. This is the layer Figma AI should build first, as a shared library, before touching a single page.

## 1.1 Design Principles (expanded from Core Values)

| Principle | What it means in pixels |
|---|---|
| Engineering Excellence | No decorative element exists without a functional justification. If a glow doesn't communicate state, remove it. |
| Research Driven | Data visualizations are real-looking, not generic bar charts — use topology maps, scatter fields, waveform traces. |
| Security by Design | Cybersecurity-adjacent UI (badges, scan animations, shield motifs) must look technically credible, not stock-icon generic. |
| AI Native | Motion should feel *responsive to intelligence* — content that reacts, predicts, and adapts (hover previews, live counters) rather than static reveals. |
| Human Centered | Despite the technical tone, tap targets, contrast, and reading rhythm must remain comfortable — coldness is aesthetic, not functional. |
| Scalable Architecture | Every component must have documented variants (default/hover/active/disabled/loading/error) before it ships. |
| Continuous Innovation | Reserve one "experimental" motion pattern per major release the team can swap without redesigning the page. |
| Minimalism with Precision | Every spacing value must map to the 8pt scale. No arbitrary padding. |

## 1.2 Color System (expanded)

The original spec named colors but not their *system*. Colors need semantic roles, not just hex values, or engineers will misuse them.

**Base surfaces (dark mode only, true black avoided for OLED comfort and depth):**
- `--bg-primary`: #070709 (Deep Obsidian) — page background
- `--bg-elevated-1`: #0D0F12 (Slate Graphite) — first elevation (cards resting state)
- `--bg-elevated-2`: #14171B (Dark Titanium) — second elevation (modals, nav bar)
- `--bg-glass`: rgba(20, 23, 27, 0.55) with backdrop-blur(20px) — Charcoal Glass surfaces
- `--border-hairline`: rgba(255, 255, 255, 0.08) — default card border
- `--border-glow`: rgba(16, 185, 129, 0.35) — active/hover border (division-dependent, see below)

**Accent system — each is tied to a division, not used decoratively elsewhere:**
- AI Systems → Emerald Mint `#10B981` (primary brand accent, used for primary CTAs globally)
- Cybersecurity → Electric Cyan `#22D3EE`
- Creative Technology → Indigo/Violet `#818CF8`
- Warning → Amber `#F59E0B` (system status only, never decorative)
- Error → Crimson `#EF4444` (system status only, never decorative)
- Success (new, missing from original) → same Emerald Mint, functionally distinct usage (form validation, deploy success)

**Text colors:**
- `--text-primary`: #F5F6F7 (94% white — never pure #FFFFFF, which vibrates against #070709)
- `--text-secondary`: rgba(245, 246, 247, 0.64)
- `--text-tertiary`: rgba(245, 246, 247, 0.38) — captions, metadata, timestamps
- `--text-disabled`: rgba(245, 246, 247, 0.22)

**Contrast rule:** every text/background pairing must clear WCAG AA (4.5:1 body, 3:1 large text 24px+). Emerald Mint on Obsidian Black passes for large text/icons only — never use accent color for body copy.

## 1.3 Typography Scale

The original names three typefaces but no scale. A cinematic feel requires a *deliberately extreme* type ramp, not just "big headlines."

**Fonts:** Space Grotesk (display/headlines), Inter (body, UI labels), JetBrains Mono (new addition — for code snippets, terminal overlays, metrics, timestamps — reinforces the "engineered" feel far more than SF Pro would in a cross-platform web context).

| Token | Size (desktop) | Size (mobile) | Weight | Line-height | Usage |
|---|---|---|---|---|---|
| Display-01 | 128px | 56px | 500 | 0.95 | Hero headline only |
| Display-02 | 88px | 44px | 500 | 1.0 | Section title (chapter openers) |
| Heading-01 | 56px | 32px | 500 | 1.1 | Sub-section titles |
| Heading-02 | 40px | 26px | 500 | 1.15 | Card group titles |
| Heading-03 | 28px | 22px | 600 | 1.2 | Card titles |
| Body-L | 20px | 18px | 400 | 1.6 | Subheadings, intro paragraphs |
| Body-M | 16px | 16px | 400 | 1.6 | Standard body copy |
| Body-S | 14px | 14px | 400 | 1.5 | Captions, metadata |
| Mono-M | 14px | 13px | 400 | 1.5 | Code, terminal, tech-stack tags |
| Label | 12px | 12px | 600 | 1.0, tracked +8% | Eyebrow labels, badges (uppercase) |

**Rule:** never more than 2 heading levels visible in a single viewport. Editorial cinematic type only works with aggressive negative space around it — pair Display-01 with 40%+ empty canvas.

## 1.4 Spacing & Grid

- Base unit: 8px. All padding/margin/gap values are multiples of 8 (4px allowed only for icon-to-label micro-gaps).
- Desktop grid: 12 columns, 88px outer margin, 24px gutter, max content width 1440px (page can bleed background beyond this, content does not).
- Section vertical rhythm: 160px padding-top/bottom between chapters on desktop, 96px on mobile — this pacing is what makes scroll feel cinematic rather than cramped.
- Card internal padding: 32px desktop / 20px mobile.

## 1.5 Elevation & Glassmorphism Rules

Glassmorphism is easy to overdo. Codify it so it stays premium, not "2021 dribbble trend":

- Blur radius: 20px standard, 32px for modal/overlay surfaces only.
- Opacity: surface fill never exceeds 60% opacity — below that, "glass" becomes "gray box."
- Border: always 1px hairline, never a hard 2px+ border — thickness reads as cheap.
- Glow border only appears on **hover/active/selected** states, never as a resting decoration on every card (this is the single biggest culprit of "AI generated template" look — resting glow on everything reads as noise, not premium).
- Shadow: layered, never single. Use a tight near-shadow (0 2px 8px rgba(0,0,0,0.4)) + a diffuse far-shadow (0 24px 64px rgba(0,0,0,0.5)) for cards that lift on hover.
- Noise texture: 2–3% opacity fractal noise overlay on hero/dark backgrounds only, to prevent banding on the black gradient — never on cards.

## 1.6 Motion Tokens

Motion described as "everything moves" in the original needs actual timing rules or it becomes chaotic.

| Token | Duration | Easing | Usage |
|---|---|---|---|
| micro | 120ms | ease-out | icon/button state changes |
| fast | 200ms | cubic-bezier(0.4, 0, 0.2, 1) | hover states, tooltips |
| base | 350ms | cubic-bezier(0.16, 1, 0.3, 1) | card reveals, modal open |
| slow | 600ms | cubic-bezier(0.16, 1, 0.3, 1) | section transitions, hero elements |
| cinematic | 900–1200ms | cubic-bezier(0.22, 1, 0.36, 1) | full chapter transitions, 3D hero object settle |

**Rule of restraint:** only one "hero-level" cinematic animation per viewport at a time. Stacking cinematic-tier motion (parallax + glitch + particles + magnetic cursor simultaneously) is what makes AI-generated sites feel unstable rather than premium — Apple/Linear/Stripe all pick ONE dominant motion idea per section and let everything else stay quiet.

## 1.7 Iconography

- Style: 1.5px stroke, rounded joins, 24px base grid (Phosphor Icons or a custom-drawn equivalent — never mixed icon families).
- Icons never carry color alone as a status signal — always paired with a label for accessibility.
- Division icons (AI, Security, Cloud, etc.) are custom line-art, not generic Font Awesome equivalents — this is a major "template vs. bespoke" tell.

## 1.8 Accessibility Baseline (missing entirely from original)

- All interactive elements: minimum 44×44px tap target, even inside dense dashboards.
- Focus states: 2px Emerald Mint outline with 2px offset, visible on keyboard nav (`:focus-visible`), never removed for aesthetics.
- Motion: respect `prefers-reduced-motion` — all parallax, particle, and 3D hero elements must have a static fallback (freeze on first frame, no auto-play).
- Color is never the sole indicator of state (error fields get icon + text, not just red border).
- All decorative WebGL/particle canvases marked `aria-hidden`; all functional icons have accessible labels.
- Minimum body text 16px on mobile to avoid iOS auto-zoom on inputs.

---

# PART 2 — INFORMATION ARCHITECTURE (REVISED)

The original 13-chapter scroll story is strong but front-loads too much narrative before the visitor can act, and buries conversion opportunities until "Contact" at the very end. Award-winning sites (Linear, Stripe, Vercel) let visitors convert or explore *at any depth*, not just at the end.

**Revised flow — same story, but with two structural additions:**

1. **Sticky Command Bar** (new) — persistent minimal nav + live CTA, present from scroll position zero, styled as an OS menu bar, not a typical navbar.
2. **Conversion checkpoints** — a lightweight CTA reappears after chapters 03, 06, and 09, not only at the end — visitors who are convinced early shouldn't have to scroll through 8 more chapters to act.

```
00 — Command Bar (persistent, not a chapter)
01 — Hero: Who We Are
02 — Why We Exist (manifesto)
03 — Engineering Philosophy         → [soft CTA: Explore Ecosystem]
04 — Core Divisions
05 — Solutions
06 — Case Studies                   → [soft CTA: See Case Studies]
07 — Products
08 — Research Lab
09 — Technology Ecosystem           → [soft CTA: Talk to Engineering]
10 — Elite Team
11 — Engineering Workflow
12 — Trust & Credibility (elevated from buried "Trust Section")
13 — Future Roadmap
14 — Contact (primary conversion)
15 — Footer / Mission Control
```

Trust signals move earlier in psychology terms too — visitors decide "credible or not" within the first 2–3 scrolls, so a compact trust strip (metrics only, not the full section) is duplicated as a thin bar directly under the hero, with the full Trust section remaining later for depth.

---

# PART 3 — SECTION SPECIFICATIONS

## 00 — Command Bar (Persistent Navigation)

**Purpose:** Give visitors constant orientation and a constant path to convert, without interrupting the cinematic scroll.

**User Psychology:** Visitors exploring long-form narrative sites lose their place. A persistent, unobtrusive anchor reduces anxiety ("can I get back / can I skip ahead") without breaking immersion — this is why it must look like an OS menu bar, not a heavy corporate navbar.

**Layout:** Fixed top, full width, 64px height. Left: wordmark + small division-color dot that shifts color to match whichever section is currently in view (reinforces "living system" feel). Center: five condensed jump-links (Solutions / Products / Research / Team / Contact). Right: single primary CTA button "Start a Project" + a terminal icon that opens the command palette (`/security`, `/team`, `/projects`, `/about` from the original spec, formalized here as a real Cmd+K style palette).

**Visual Hierarchy:** Bar background transparent over hero (text has a subtle scrim), transitions to `--bg-glass` with blur once scrolled past hero — single most important micro-detail for feeling "engineered."

**Component Structure:** Logo lockup / NavLink (5 variants: default, hover, active-section) / Primary Button / Command Palette trigger / Command Palette modal (search + fuzzy match + keyboard-first).

**Motion:** Bar background fades from transparent to glass over 200ms tied to scroll position, not a hard breakpoint. Active nav-link indicator slides (not fades) between links, 250ms cubic-bezier base token.

**Micro-interactions:** Hovering a nav link shows a 1px underline that draws left-to-right in 150ms. Command palette opens with a 200ms scale+blur-in from 96% to 100%.

**Hover Behavior:** Primary CTA brightens 8% and gains a 0 0 24px glow in Emerald Mint on hover; no layout shift.

**Scroll Behavior:** Bar hides on scroll-down after 400px (to maximize immersion), reappears instantly on any scroll-up — standard "smart hide" pattern used by Linear and Vercel docs.

**Entry Animation:** Fades/slides down 12px on page load, 400ms, 300ms delay after hero content starts.

**Loading State:** Wordmark renders instantly (no FOUC); nav links skeleton for max 200ms if async.

**Empty State:** N/A.

**Responsive Behavior:** Below 960px, center links collapse into the command palette trigger only; hamburger opens full-screen nav overlay with large tap targets (56px height rows) rather than a dropdown.

**Accessibility:** Full keyboard nav, `Cmd/Ctrl+K` opens palette, `Esc` closes, focus trapped inside modal, all links reachable via Tab in logical order.

**Glassmorphism:** Only the scrolled state uses glass; hero state is transparent with a `rgba(7,7,9,0.2)` gradient scrim so white text stays legible over the 3D object.

---

## 01 — Hero: Who We Are

**Purpose:** Deliver the "these people engineer intelligent systems" impression in under 3 seconds, and give the visitor two clear next actions.

**User Psychology:** First impression is almost entirely visual + kinetic before it's verbal. The 3D object needs to *feel alive* before the visitor reads a word — motion signals sophistication faster than copy does. But the headline must resolve the ambiguity the visuals create ("what do they actually do") within the same viewport.

**Layout:** Asymmetric 60/40 split desktop (content left, object right) — never dead-center hero, which reads as generic. Eyebrow label above headline: `ENGINEERING COLLECTIVE` in Label token, Emerald Mint, letter-spaced. Headline in Display-01. Subheading Body-L, max 46 characters per line (cinematic headlines need short line lengths). Two buttons, primary filled + secondary ghost, 16px gap, left-aligned under copy. Compact trust strip (logos-as-metrics, e.g., "40+ Systems Shipped · 12 Countries · 99.98% Uptime") sits below the fold trigger, small Body-S row.

**Visual Hierarchy:** Object is visually dominant in area but headline is dominant in contrast (brightest text on darkest background) — eye goes headline → object → subheading → CTAs, in that order, following an F-pattern adapted for split layouts.

**Component Structure:** Eyebrow label / Display headline / Subheading / Button-Primary / Button-Secondary / Trust-strip row / WebGL Canvas (Neural-Quantum-Shield composite object) / Scroll-cue indicator (bottom-center, animated chevron or "scroll" mono-label with a slowly pulsing line).

**Motion:** Object auto-rotates slowly (0.05 rad/s idle) and reacts to cursor position with elastic lag (spring physics, not linear tracking — linear tracking feels robotic, spring feels intelligent). Aurora background drifts continuously via shader-based gradient animation, 40s loop, imperceptible as a "loop."

**Micro-interactions:** Buttons emit a soft light bloom on hover (150ms). Scroll cue nudges down 4px and back in a 1.4s ease-in-out infinite loop — subtle enough not to be distracting after 10 seconds of viewing.

**Hover Behavior:** Hovering the 3D object itself (not just moving mouse nearby) intensifies particle density around cursor point by ~15% — rewards curiosity without becoming a game.

**Scroll Behavior:** Object scales down and fades to 40% opacity as user scrolls past hero (parallax depth cue that it's "receding" into the next chapter), headline text moves up faster than the object (differing parallax speeds create depth).

**Entry Animation:** Staged reveal — eyebrow label (0ms), headline (100ms, characters or words fade+rise, not letter-by-letter which feels gimmicky), subheading (250ms), buttons (350ms), object fades/scales in from 90%→100% opacity+scale over 900ms starting at 0ms (runs concurrent with text so object is already alive by the time text finishes).

**Exit Animation:** Cross-fade + upward parallax exit as chapter 02 enters, 600ms.

**Loading State:** WebGL canvas shows a low-poly/wireframe placeholder of the object for first paint (under 300ms budget) before full shader loads, so hero never shows a blank right column.

**Empty State:** N/A (static hero).

**Responsive Behavior:** Mobile stacks vertically: headline/subhead/buttons first, object becomes a smaller, non-interactive (tap-to-nudge only) canvas below, or a pre-rendered looping video/lottie fallback if WebGL performance budget is a concern on mid-tier phones. Display-01 drops to 56px per type scale.

**Accessibility:** Headline is a real `<h1>`. 3D canvas `aria-hidden="true"` with a text-equivalent hidden summary for screen readers ("3D animated visualization of AI and security systems"). Respect `prefers-reduced-motion`: object stops auto-rotating and shows single static frame; aurora background becomes static gradient.

**Glassmorphism:** Buttons only — primary is solid Emerald Mint fill (no glass, needs max contrast for conversion), secondary is glass/ghost with hairline border.

**Color Usage:** Emerald Mint reserved for primary CTA + eyebrow label only in this section — don't let cyan/violet compete with the AI-brand-accent in the very first thing visitors see.

---

## 02 — Why We Exist (Manifesto)

**Purpose:** Establish emotional/intellectual conviction before any sales content — this is the "philosophy" beat that separates an engineering collective from a vendor.

**User Psychology:** After the kinetic hero, the brain needs a deliberate *slow down* — pacing contrast is itself a design tool. A manifesto section with generous whitespace signals confidence ("we don't need to sell you immediately").

**Layout:** Centered single column, max-width 760px, large quiet negative space around it (this is the "calm" beat of the "Bold. Calm." personality pairing). No cards, no grid — pure editorial typography.

**Visual Hierarchy:** One Heading-01 statement (the "mission" line), followed by 2–3 short Body-L paragraphs, each separated by generous 48px gaps, occasional single words set in Emerald Mint for emphasis (used sparingly — 1–2 per section max).

**Component Structure:** Section eyebrow / Statement headline / Paragraph block / optional inline stat callouts (e.g., a large mono-font number breaking up the text, like a magazine pull-quote).

**Motion:** Text reveals line-by-line as it enters viewport (staggered 60ms per line, translateY 12px→0, opacity 0→1) — restrained, editorial, not particle-heavy; this section should feel like the "breath" between kinetic chapters.

**Micro-interactions:** Emphasized words (Emerald Mint) have a very subtle underline-draw on scroll-into-view, not on hover.

**Hover Behavior:** None — this section is intentionally non-interactive to reinforce its editorial, statement-like tone.

**Scroll Behavior:** Background subtly shifts from Obsidian to a 2%-lighter tone as this section centers in viewport, then back — a "spotlight" feeling without literal spotlight graphics.

**Entry/Exit Animation:** Entry as described above; exit is a simple fade to 60% opacity as next section's content begins overlapping, 400ms.

**Loading/Empty State:** N/A — static text content, no data dependency.

**Responsive Behavior:** Max-width drops to 92% viewport, Heading-01 becomes Heading-02 scale, line-stagger animation reduces to whole-paragraph fade (staggering per-line on mobile scroll feels janky at typical scroll velocity).

**Accessibility:** Real semantic paragraph tags, sufficient line-height (1.6) for readability, contrast-checked Body-L against background.

---

## 03 — Engineering Philosophy

**Purpose:** Translate abstract values (Core Values list from the brief) into something visually systemized — proof the "engineering-first" claim isn't just a tagline.

**User Psychology:** Numbered/systemized content (not bullet lists) reads as more rigorous and intentional — visitors subconsciously trust a "principle 01–08" structure more than a loose list.

**Layout:** Horizontal scroll-snap row of principle cards on desktop (8 cards, Core Values from brief), OR a 4×2 grid with hover-expand — recommend scroll-snap for the "OS-like" feel described in the brief, with a thin progress indicator bar showing position (like Stripe's docs carousels).

**Visual Hierarchy:** Each card: large mono index number (01–08) top-left, Heading-03 principle title, Body-M 1-sentence explanation, subtle division-relevant accent line at card base.

**Component Structure:** Card-Principle (index, title, description, accent underline) × 8, horizontal scroll container, progress indicator dots/bar, optional drag-to-scroll cursor affordance.

**Motion:** Cards drift in with slight scale (0.96→1) and stagger (80ms) as row enters viewport. Active/centered card (if scroll-snap) gets +2% scale and full-opacity border while off-center cards sit at 80% opacity — creates a natural focal read order.

**Micro-interactions:** Hovering a card lifts it 4px with the two-layer shadow token, index number brightens from tertiary to primary text color.

**Hover Behavior:** Desktop only — mobile relies on scroll-snap centering instead of hover for the "active" state, since hover doesn't exist on touch.

**Scroll Behavior:** Horizontal scroll is driven by vertical page scroll (scroll-jacking pattern used by Apple product pages) OR by native horizontal swipe/drag — specify native drag + scroll-snap points for accessibility/performance reasons over full scroll-jacking, which frequently breaks trackpad/accessibility expectations.

**Entry Animation:** Section title reveals first (rise+fade, 400ms), then card row drifts in as described.

**Exit Animation:** Simple opacity fade as next section begins, no exaggerated exit — exits should generally be quieter than entries throughout the whole site (asymmetric motion budget keeps things calm).

**Loading State:** N/A, static content.

**Responsive Behavior:** Mobile: vertical stack, one principle per row, no horizontal scroll (horizontal scroll-jacking on mobile is a major usability failure point in award-site clones — avoid entirely below 768px).

**Accessibility:** Scroll-snap container is a real list (`<ul>`/`<li>` semantics), arrow-key navigation supported when focused, drag affordance also operable via visible next/prev buttons for non-pointer users.

**[Soft CTA checkpoint]** — small inline text link below this section: "See how this becomes real work → Case Studies" — low-commitment, anchor-scroll, styled as text link not a button (button fatigue if every section repeats a full CTA).

---

## 04 — Core Divisions

**Purpose:** Show organizational depth/credibility — "this isn't 3 people with a website," it's structured engineering teams.

**User Psychology:** Enterprise buyers specifically look for organizational maturity signals before trusting a vendor with security/AI work — named divisions with distinct ownership read as far more credible than a flat "our services" list.

**Layout:** Asymmetric bento grid, 7 divisions (per brief), largest cell for AI Systems (flagship), remaining six in varied sizes — never a uniform grid, which is the single most common "template" tell.

**Visual Hierarchy:** Each cell: division icon (custom line art), division name Heading-03, one-line description Body-S, own accent color per Section 1.2, own micro-visualization (tiny animated chart/graph unique to what that division does — e.g., AI shows a small live-updating waveform, Security shows a scanning sweep line, Cloud shows a node-map pulse).

**Component Structure:** Card-Division (icon, name, description, mini-visualization, accent border) × 7, grid container with defined bento spans.

**Motion:** Mini-visualizations animate continuously at low intensity (ambient motion, not attention-grabbing) — this is what makes the grid feel "alive" as an operating system dashboard rather than static marketing cards.

**Micro-interactions:** On hover, card's mini-visualization intensifies (e.g., waveform amplitude increases, scan line speeds up) and a "View Division →" ghost button fades in at card base.

**Hover Behavior:** Non-hovered cards dim to 85% opacity when one card is hovered — directs focus, standard "spotlight grid" pattern.

**Scroll Behavior:** Bento cells reveal in a staggered grid-wipe (not uniform fade) — top-left to bottom-right stagger, 60ms delay per cell, respects natural reading order.

**Entry Animation:** As above; Exit Animation: simple fade, 300ms.

**Loading State:** Mini-visualizations use lightweight CSS/SVG animation, not heavy canvas, so there's no loading delay — if a division uses live data (future roadmap item), show a skeleton pulse on the chart area only, not the whole card.

**Empty State:** If a division has no active public case studies yet, "View Division" leads to a "Division overview coming soon" state rather than a broken/empty page — never link to nothing.

**Responsive Behavior:** Bento collapses to single column, mini-visualizations remain but simplify (reduce data points/complexity to protect mobile GPU/battery).

**Accessibility:** Each mini-visualization has an `aria-label` describing what it represents; grid uses semantic list markup; color is never the only differentiator between divisions (icon + name always present).

---

## 05 — Solutions

**Purpose:** Convert visitors evaluating specific technical needs (the brief's 13 solution types) by making each feel like a mini case for that capability, not a generic feature list.

**User Psychology:** Technical buyers scan for their specific need (e.g., "Computer Vision") — the section must support fast scanning AND reward deeper reading for the 2–3 solutions closest to visitor intent. This argues for a filterable/expandable format, not 13 equal-weight blocks.

**Layout:** Filterable tag bar at top (AI / Security / Infra / Data / Automation groupings collapse the 13 items into 5 filter categories), below it a responsive card grid that re-flows on filter. Each card is collapsed by default (icon, title, one-line problem statement); clicking/expanding reveals the full Problem → Solution → Architecture → Tech Stack → Impact structure from the brief in an inline accordion or slide-over panel.

**Visual Hierarchy:** Collapsed state: icon + Heading-03 + Body-S problem statement + accent tag. Expanded state: five clearly labeled micro-sections (mono-label headers: `PROBLEM` `SOLUTION` `ARCHITECTURE` `STACK` `IMPACT`), architecture shown as a simplified diagram (not paragraph text), stack shown as tag chips, impact shown as 1–3 large stat numbers.

**Component Structure:** FilterTabBar / Card-Solution (collapsed + expanded variants) / Diagram-Mini (architecture visual) / TechStackChips / ImpactStat / CTA-Inline ("Discuss this solution").

**Motion:** Filter changes trigger a FLIP-style re-flow animation (cards that stay smoothly reposition, cards leaving fade+shrink, cards entering fade+grow) rather than a hard re-render — this single detail is what separates "engineered interface" from "template with a filter."

**Micro-interactions:** Expand/collapse uses height-auto animation (350ms base token) with content cross-fading in, not popping. Tech stack chips have a subtle hover tooltip showing why that technology was chosen (adds depth for technical evaluators).

**Hover Behavior:** Collapsed cards lift 2px + border brightens to that solution's parent-division accent color on hover.

**Scroll Behavior:** Filter bar becomes sticky (below the global command bar) once this section is in view, so filtering remains available while scrolling a long result set.

**Entry Animation:** Standard staggered grid reveal (60–80ms per card); expanded panel entry uses the height-auto + cross-fade described above.

**Exit Animation:** N/A section-level beyond standard fade; expand→collapse reverses the entry motion.

**Loading State:** If solution content is CMS-driven, show skeleton cards (shimmer on title/description blocks) rather than a spinner, matching final layout dimensions to avoid layout shift.

**Empty State:** If a filter combination returns zero results (shouldn't happen with fixed categories, but future-proof it) — show a calm empty message with a "Clear filters" action, styled consistently with the rest of the system (not a generic browser-default look).

**Responsive Behavior:** Filter bar becomes horizontally scrollable pill row on mobile; expanded solution content stacks its five micro-sections vertically with full-width diagram.

**Accessibility:** Filter tabs are real buttons with `aria-pressed` state; expand/collapse uses `aria-expanded` + `aria-controls`; diagrams have text alternatives summarizing the architecture for screen readers.

**[Soft CTA checkpoint]** — after the grid, a slim horizontal banner: "Not sure which solution fits? Talk to an engineer" + button — this is the first full-weight CTA repeat since hero, appropriately spaced.

---

## 06 — Case Studies

**Purpose:** Provide concrete proof — the single highest-trust content type on the whole site — via genuinely interactive project deep-dives rather than static portfolio cards, as specified in the brief.

**User Psychology:** Skeptical technical buyers discount marketing copy but trust specifics (real metrics, real architecture, real challenges/tradeoffs admitted openly) — admitting a challenge or tradeoff is itself a credibility signal, so the format must have room for "what was hard," not just "what we won."

**Layout:** Featured case study (largest, full-bleed, first) followed by a horizontal or grid list of remaining studies. Featured study opens as an immersive full-section takeover (not a modal) when selected: left rail sticky navigation (Timeline / Architecture / Challenge / Solution / Performance), right scrolling content area.

**Visual Hierarchy:** Case header: client/project name Heading-01, one-line outcome statement Body-L, 3 hero metrics in large mono numerals (e.g., "340% faster inference," "12M requests/day," "SOC2 in 6 weeks"). Below: sectioned content per the left-rail categories, each with its own visual (timeline = horizontal stepper, architecture = interactive node diagram, performance = animated line/area chart).

**Component Structure:** Card-CaseStudy-Featured / Card-CaseStudy-Compact (list items) / StickyRailNav / MetricCallout / Timeline-Component / ArchitectureDiagram-Interactive / PerformanceChart / CodePreview-Snippet (syntax highlighted, read-only, from brief's "Code Preview").

**Motion:** Metrics count up from 0 to final value on scroll-into-view (900ms ease-out, using the "cinematic" motion token) — a widely proven high-impact micro-interaction for credibility sections. Architecture diagram nodes draw their connecting lines sequentially (path-drawing SVG animation) rather than appearing instantly.

**Micro-interactions:** Hovering an architecture node shows a tooltip with that component's role; code preview has a subtle "copy" affordance on hover even though it's primarily illustrative.

**Hover Behavior:** Compact case study cards in the list show a background image/screenshot crossfade on hover (project mockup fades in behind the text) for a preview without navigating.

**Scroll Behavior:** Left rail nav highlights the currently-scrolled category (scrollspy pattern), clicking a rail item smooth-scrolls to that content block.

**Entry Animation:** Featured study entry uses the cinematic token (900–1200ms) given its role as the trust-anchor of the whole page. Compact cards use standard staggered grid reveal.

**Exit Animation:** If using a full takeover pattern, closing it should animate back to the grid position it was opened from (shared-element transition) rather than a generic modal-close — reinforces spatial continuity.

**Loading State:** Charts/diagrams show a skeleton/wireframe state (matching final shape) while data loads, never a generic spinner given the brief's emphasis on feeling data-native.

**Empty State:** If fewer than 3 case studies exist at launch, do not pad with placeholder studies — instead show 1–2 real ones generously sized plus a "More case studies published quarterly" note, maintaining premium perception over fake volume.

**Responsive Behavior:** Sticky rail nav collapses to a horizontal scrollable tab bar pinned under the command bar on mobile; architecture diagrams simplify to a vertical flow instead of a free-form node map.

**Accessibility:** Count-up numeric animations also render final value as real text content immediately in DOM (not purely visual) so screen readers get the number without waiting for animation; charts include a data-table fallback toggle for screen reader / low-vision users.

**[Soft CTA checkpoint]** — end of section: "See case studies →" already satisfied by being in the section; add "Start your own" ghost button instead, avoiding CTA repetition fatigue.

---

## 07 — Products

**Purpose:** Present owned products (AI Security Scanner, Smart User Analytics, Learning Intelligence Platform, Internal AI Assistant) as premium SaaS offerings with enough interactivity to feel like real software, not marketing mockups, per brief.

**User Psychology:** "Show, don't tell" is critical here — buyers trust a product they can partially interact with far more than a static screenshot; even a limited interactive demo dramatically increases perceived legitimacy.

**Layout:** Full-width alternating rows (image/demo left-copy right, then reversed next row) — classic high-converting SaaS-showcase pattern, but each "image" slot is an interactive embedded mini-dashboard rather than a static image.

**Visual Hierarchy:** Product name Heading-01 + one-line value prop Body-L + 3 feature bullets (icon+text, not paragraph) + primary CTA ("Explore Product") + status badge (Live / Beta / Coming Soon per brief) top-left of copy block.

**Component Structure:** Row-ProductShowcase (alternating layout variant) / StatusBadge (Live/Beta/ComingSoon variants) / InteractiveDashboard-Mini (draggable panel, hoverable data points, live-feeling but sandboxed/fake data) / ArchitectureDiagram-Mini / PricingPlaceholder (styled as "Request Access" rather than fake pricing if pricing isn't final).

**Motion:** Dashboard mockups have ambient data motion (numbers ticking slightly, a chart line inching forward) even at rest — reinforces "this is live software," a key premium-feeling cue per requirements.

**Micro-interactions:** Hovering a dashboard data point shows a real-feeling tooltip; draggable dashboard panels (if scoped) snap back with spring physics after drag, demonstrating polish without needing real backend logic.

**Hover Behavior:** Feature bullets get a subtle icon-fill animation on hover (outline → filled) as a satisfying, low-cost interaction.

**Scroll Behavior:** Each product row's dashboard element has a subtle parallax (moves slightly slower than copy) reinforcing depth as established in hero.

**Entry Animation:** Row enters as copy fades/rises first (it's the "why"), dashboard visual fades/scales in 150ms after (it's the "proof") — sequencing supports message-then-evidence reading order.

**Exit Animation:** Simple fade, no exaggerated motion — later sections should generally quiet down motion intensity vs. hero/case-studies to avoid visitor fatigue by this scroll depth.

**Loading State:** Interactive dashboard mock loads with skeleton chart shapes before ambient animation begins, under 300ms budget.

**Empty State:** "Coming Soon" products (per brief's Future Products) use a distinctly quieter treatment — grayscale/desaturated dashboard mock, badge in Amber, CTA reads "Get notified" (email capture) instead of "Explore" — clear visual demotion vs. live products so visitors aren't confused about what's actually usable today.

**Responsive Behavior:** Alternating rows stack copy-then-visual always (never visual-first on mobile, since copy needs to set context first at narrow widths); dashboard mocks scale down but remain interactive where feasible, static screenshot fallback if performance requires it.

**Accessibility:** Interactive dashboard demos are supplementary, not required to understand the product — value prop and feature bullets fully convey the offering in text alone for assistive tech users.

---

## 08 — Research Lab

**Purpose:** Signal R&D depth and intellectual credibility — per brief, "every card should feel like a classified research project," a distinct tonal register from the Products section (speculative/exploratory vs. shipped/commercial).

**User Psychology:** Scarcity and restriction cues (redacted text, classification-style badges, "internal" framing) increase perceived value and curiosity — this section should feel slightly harder to fully access than Products, rewarding attention.

**Layout:** Dense grid of compact "dossier" cards (11 research areas per brief), darker/more restrained palette than rest of site (near-monochrome with single accent flashes), classification-style header bar per card.

**Visual Hierarchy:** Card header: mono-font project codename + classification-style badge (e.g., "STATUS: ACTIVE" / "STATUS: EXPERIMENTAL"), research area name Heading-03, 1–2 line abstract Body-S partially truncated with a fade-to-transparent bottom edge (suggests more depth than is shown, appropriate to the "classified" tone), tiny field tags (mono chips).

**Component Structure:** Card-ResearchProject (codename, status badge, abstract, field tags, fade-mask) / StatusBadge-Research (Active/Experimental/Archived variants) / DetailPanel (slide-over on click, if deeper content exists) or "Request Access" gate if content is intentionally limited.

**Motion:** Subtle scanline animation across card backgrounds at rest (very low opacity, 3–4s loop) — reinforces classified/lab aesthetic without being gimmicky if kept extremely subtle (under 5% visual weight).

**Micro-interactions:** On hover, the truncated abstract's fade-mask lifts slightly to reveal one additional line, rewarding hover without fully committing to a click — teases depth.

**Hover Behavior:** Card border shifts from hairline to a thin animated "scan" border that traces the card perimeter once on hover (400ms), rather than a static glow — ties back to the security/research tone specifically (distinct from the AI-division's ambient glow used elsewhere).

**Scroll Behavior:** Grid reveals with a slight "decode" effect — cards fade in from a subtly scrambled/blurred initial state to sharp focus (150ms blur transition) — a restrained nod to the brief's "Glitch Intro" idea, used here specifically rather than site-wide, respecting the "one dominant motion idea per section" rule.

**Entry/Exit Animation:** As above; exit is a plain fade, 300ms.

**Loading State:** N/A for static cards; if a project detail panel loads async content, use a mono-font "DECRYPTING…" style skeleton label consistent with tone (playful but not overdone).

**Empty State:** Research areas without public detail yet show status "CLASSIFIED" with no click-through, rather than a broken/empty link — turns a content gap into an on-brand design moment.

**Responsive Behavior:** Grid becomes 2-column then 1-column; scanline/decode motion reduces to simple opacity fade on mobile for performance.

**Accessibility:** Classification/status language is decorative flavor, not the only way status is conveyed — always paired with plain-language equivalent in alt text/aria-label ("Experimental research project, early stage").

---

## 09 — Technology Ecosystem

**Purpose:** Demonstrate technical stack depth/currency (brief's Technology Wall) in a way that itself feels like a piece of engineered software, not a logo soup.

**User Psychology:** Technical evaluators specifically hunt for stack familiarity/compatibility signals — an interactive, "alive" tech map is far more memorable and credible than a static logo grid, and directly demonstrates the "AI Native" / "neural" positioning literally.

**Layout:** Full-width interactive node-graph/network visualization (canvas/SVG-based), technology logos as nodes, animated connecting lines between related technologies, organized in loose clusters by domain (Languages / Frameworks / Infra / Data) without rigid grid boundaries — the organic clustering itself communicates "ecosystem" vs. "list."

**Visual Hierarchy:** No single node dominates — hierarchy instead comes from node size correlating to how central that technology is to the stack (e.g., Python/React larger than a supporting tool), plus opacity depth (foreground nodes 100%, background/tertiary tech 60%).

**Component Structure:** NetworkGraph-Canvas / Node-Technology (logo, label, size variant) / ConnectionLine-Animated / ClusterLabel (domain group labels, subtle, background layer) / Legend (small, collapsible, explains node-size meaning).

**Motion:** Connection lines have a slow traveling-light pulse animation along their paths (like data packets), continuous but low-intensity ambient motion — this is the section's "one dominant motion idea," per the restraint principle in 1.6.

**Micro-interactions:** Hovering a node highlights its direct connections (other nodes dim to 30%, connected ones stay bright, connecting lines brighten and pulse faster) — classic, highly satisfying network-graph interaction pattern that rewards exploration.

**Hover Behavior:** As above; clicking a node (optional depth) could open a tiny tooltip/panel: "Used for: [specific solution/product]" tying the stack back to concrete outcomes rather than being decorative only.

**Scroll Behavior:** Graph is inert/paused until fully in viewport (performance + reduces motion sickness risk from an always-animating canvas below the fold), then activates its idle ambient motion once centered.

**Entry Animation:** Nodes fade/scale in from center outward in a soft radial stagger (not left-to-right, matching the network's organic topology), connections draw in after nodes settle.

**Exit Animation:** Graph decelerates/freezes as it leaves viewport rather than abruptly stopping (graceful degradation of ambient motion).

**Loading State:** Static node layout renders immediately (position data is lightweight); connection-line animations layer in once canvas is ready, so there's never a blank section.

**Empty State:** N/A — stack list is static/curated content.

**Responsive Behavior:** On mobile, full free-form graph interaction is replaced with a simpler, pre-arranged clustered grid of logos (grouped by domain header) — real-time physics-driven graphs are both a performance risk and a poor touch-interaction fit on small screens; this is an explicit graceful-degradation decision, not a missing feature.

**Accessibility:** Full stack list also exists as a plain, categorized text list (visually hidden or in a "view as list" toggle) so the information isn't locked behind an inaccessible canvas visualization.

**[Soft CTA checkpoint]** — "Talk to Engineering" button appears here per revised IA, styled as a natural continuation ("Curious how these pieces fit your project?").

---

## 10 — Elite Team

**Purpose:** Humanize the "collective" positioning with credible expert profiles, balancing the site's otherwise cold/technical tone with real trust in real people, per brief's minimalist/technical team card direction.

**User Psychology:** For elite technical services, credibility comes from *specificity* (named research interests, real affiliations) far more than generic "our amazing team" copy — specificity signals substance.

**Layout:** Grid of minimalist portrait cards (per brief), 3–4 columns desktop, dark cards with terminal-style overlay text.

**Visual Hierarchy:** Portrait (desaturated/duotone treatment matching brand palette, not full color — keeps team section tonally consistent with the rest of the dark UI) fills card top 70%, terminal-style info bar at bottom 30%: name (Heading-03, mono accent for title), role, 1–2 research/specialty tags.

**Component Structure:** Card-TeamMember (portrait, terminal-overlay info bar, hover-detail panel) / DetailPanel-Team (research interests, affiliation, specialty fields — revealed on hover/click per brief's "holographic hover").

**Motion:** On hover, portrait desaturation lifts slightly (subtle "power on" feeling) and terminal overlay expands upward revealing 2–3 additional lines (research interests, affiliation) in a monospace typing-style reveal (very brief, 200–300ms, not a literal slow typewriter effect which would feel dated at this frequency).

**Micro-interactions:** A thin scanline sweeps once across the portrait on hover-enter (ties back to the "holographic" description in brief), single pass only, never looping (looping would be distracting on a grid of many cards).

**Hover Behavior:** As above; non-hovered cards do not dim (unlike the Divisions grid) — team members should read as equally prominent, no visual hierarchy competition between colleagues.

**Scroll Behavior:** Standard staggered grid reveal, 60ms stagger.

**Entry/Exit Animation:** Entry as above; exit simple fade.

**Loading State:** Portraits lazy-load with a low-res blur-up placeholder (LQIP pattern) matching card aspect ratio, avoiding layout shift.

**Empty State:** N/A — team roster is static/curated.

**Responsive Behavior:** Grid drops to 2-column then 1-column; hover-reveal detail becomes tap-to-reveal on touch devices, with a visible "+" affordance indicating expandability so it's discoverable without a hover hint.

**Accessibility:** Portraits have descriptive alt text; expandable detail content is in the DOM (not hover-only injected content) so it's available to screen readers via a visible/focusable trigger, not solely mouse-hover.

---

## 11 — Engineering Workflow

**Purpose:** Make the abstract engineering process (Research → Architecture → Prototype → Development → Security Review → AI Integration → Testing → Deployment → Optimization → Monitoring, per brief) tangible and reassuring — this is where risk-averse enterprise buyers get comfort that engagements are structured, not improvised.

**User Psychology:** A visible, named process reduces perceived risk of hiring an "elite collective" that might otherwise seem opaque or bespoke-to-a-fault; buyers want to know what working together actually looks like week to week.

**Layout:** Horizontal timeline/stepper (10 stages per brief), desktop shows full timeline with connecting progress line; each stage is a node that expands on interaction to reveal what happens at that stage, deliverables, and typical duration.

**Visual Hierarchy:** Timeline progress line runs through vertical/horizontal center, stage nodes as numbered circles (mono numerals) along it, stage name Heading-03 above/below alternating (classic zigzag timeline layout to avoid a monotonous single-row read), expanded detail in a card below/above the node.

**Component Structure:** Timeline-Stepper (10 nodes) / Node-Stage (number, icon, connecting-line segment) / DetailCard-Stage (description, deliverables list, duration estimate) / ProgressIndicator (shows overall position if user is scroll-driven through stages).

**Motion:** Progress line fills/draws (SVG stroke-dashoffset animation) as user scrolls through the section, tightly coupled to scroll position — gives concrete, satisfying feedback that reinforces the "process" metaphor literally.

**Micro-interactions:** Clicking/hovering a stage node highlights it (fills from outline to solid) and its detail card lifts into focus while adjacent cards recede to 70% opacity.

**Hover Behavior:** As above, desktop-only refinement; touch relies on tap-to-expand.

**Scroll Behavior:** As stages scroll into view, each node "activates" (fills in) sequentially, tied to the drawing progress line — this section is the clearest justified use of scroll-driven animation on the page given its literal timeline subject matter.

**Entry Animation:** Section title standard reveal; timeline draws in from the first node onward as described.

**Exit Animation:** Simple fade; the drawn progress line does not reverse/undraw on scroll-back-up (state persists) to avoid a distracting flicker if the visitor scrolls up and down while reading.

**Loading State:** N/A, static content.

**Empty State:** N/A.

**Responsive Behavior:** Timeline switches from horizontal zigzag to a single vertical line with nodes on the left and detail cards to the right, standard mobile-timeline pattern; scroll-driven line-fill still works naturally in a vertical orientation.

**Accessibility:** Timeline marked up as an ordered list; each stage's expanded detail is reachable via keyboard (Enter/Space to toggle) with proper `aria-expanded`; progress-line animation purely decorative, `aria-hidden`.

---

## 12 — Trust & Credibility (elevated section)

**Purpose:** Consolidate credibility metrics (brief's Trust Section: Research Driven, Award Winning, AI Native, Security Focused, Open Standards, Scalable Systems, Innovation First) into a section with enough weight to function as a genuine trust anchor, not an afterthought strip — and reinforce the compact trust-strip already teased under the hero.

**User Psychology:** Repetition with escalation (a compact preview early, a fuller version here) reinforces credibility claims without feeling repetitive, because the second instance adds depth/proof rather than just repeating the same claim.

**Layout:** A hybrid of stat-metrics (large mono numerals, e.g., years active, systems deployed, uptime %) and qualitative credibility pillars (the 7 items from brief, styled as a compact icon+label row, not full cards — this section should feel efficient/confident, not padded).

**Visual Hierarchy:** Large stat row first (3–4 hero numbers, biggest visual weight in this section), qualitative pillar row second (smaller, secondary), optional single testimonial-style quote if available (kept short, no more than 2 lines, attributed simply).

**Component Structure:** StatMetric-Large (number count-up, label) / CredibilityPillar (icon, label) row / Quote-Compact (optional).

**Motion:** Stat numbers count up on scroll-into-view (same pattern as Case Studies metrics, for consistency); pillar row reveals with a simple staggered fade, no exaggerated motion — this section should read as confidently quiet, letting the numbers do the work.

**Micro-interactions:** Hovering a credibility pillar shows a one-line elaboration tooltip (e.g., hovering "Award Winning" could show which awards, if any exist yet — omit the pillar entirely rather than show an empty/aspirational tooltip if no real award exists yet).

**Hover Behavior:** As above; minimal otherwise.

**Scroll Behavior:** Standard reveal, no parallax needed — this section's power is in restraint and clarity, not motion.

**Entry/Exit Animation:** Entry as above; exit simple fade.

**Loading State:** N/A.

**Empty State:** Any pillar without genuine backing content (e.g., "Award Winning" before any award is won) should be replaced with an honest equivalent claim (e.g., "Award-Caliber Craft" or removed outright) — fabricated trust signals are a significant credibility risk if discovered, and this spec explicitly flags that copy must be truthful before this section ships.

**Responsive Behavior:** Stat row stacks 2×2 then 1-column; pillar row becomes a wrapped flex row.

**Accessibility:** Count-up numbers have real final-value text in DOM immediately; icons paired with text labels always.

---

## 13 — Future Roadmap

**Purpose:** Signal momentum and forward motion — per brief, reinforce "Continuous Innovation" as a lived value, not just a listed one, and give returning visitors a reason to come back.

**User Psychology:** A visible, dated roadmap (even directionally, e.g., "Q3 2026") signals a company that is actively building rather than static — particularly important paired with the "classified research" tone of section 08, this section is the more "public-facing," confident counterpart.

**Layout:** Horizontal quarter-based timeline (distinct visual language from Section 11's process timeline, to avoid the two timelines feeling redundant — this one uses a lighter, more optimistic tone with less "engineering process" rigidity and more "vision" framing), roadmap items as small cards along a quarter-marked axis.

**Visual Hierarchy:** Quarter labels (mono, tertiary text color) as axis markers, roadmap item cards above/below axis, each with a status tag (Planned / In Progress / Shipped) and short 1-line description — deliberately terse, this section should not over-promise detail on unshipped work.

**Component Structure:** RoadmapAxis / QuarterMarker / Card-RoadmapItem (title, status tag, one-liner) / StatusTag (Planned/InProgress/Shipped variants, color-coded to Warning/Cyan/Success tokens respectively).

**Motion:** Cards along the axis fade/rise in as the timeline scrolls into view, left-to-right stagger following the natural time-reading direction.

**Micro-interactions:** Hovering a roadmap card slightly lifts it and reveals a tiny expand icon if more detail exists (optional slide-over with more context, consistent with the DetailPanel pattern used elsewhere for consistency).

**Hover Behavior:** As above.

**Scroll Behavior:** Standard vertical-triggered reveal; horizontal axis itself does not require scroll-jacking, keep it simple given this is a lower-stakes, lighter section by design.

**Entry/Exit Animation:** Entry as above; exit simple fade.

**Loading State:** N/A.

**Empty State:** If future items are sparse, show fewer, more meaningful items rather than padding the roadmap — an honest 3-item roadmap reads better than a padded 8-item one with vague filler.

**Responsive Behavior:** Axis becomes vertical, quarter markers stack as section dividers, cards stack beneath each.

**Accessibility:** Status conveyed via icon+text+color together, never color alone; roadmap marked up as a semantically ordered list by date.

---

## 14 — Contact (Primary Conversion)

**Purpose:** This is the section every other checkpoint has been funneling toward — it must convert with minimum friction while maintaining the premium, engineered tone (a generic contact form here would undercut everything built above it).

**User Psychology:** By this point in the scroll, visitors are either ready to act or need one final, low-friction nudge — the form must feel fast and considered, not like a generic lead-gen form; a multi-step "smart form" that adapts based on answers feels more like using software (on-brand) than filling out paperwork.

**Layout:** Two-column: left side reinforcement copy (short headline + reassurance points — "Typical response time: 24h," "NDA available on request," "Free technical scoping call") + a direct alternative contact (email, styled prominently as a mono-font address, and/or a "Book a call" calendar-embed option); right side the actual form, presented as a "terminal" or "system input" styled card matching the site's OS aesthetic, not a plain white-adjacent form card.

**Visual Hierarchy:** Form fields styled with mono-font labels (`> NAME`, `> COMPANY`, `> PROJECT TYPE`, `> MESSAGE`) reinforcing the terminal/OS metaphor established site-wide, floating/animated labels, generous field height (56px, comfortable large tap targets), single clear primary submit button, full width.

**Component Structure:** ContactReassurance (headline, bullet list, direct-contact block) / Form-MultiStep (optional: Step 1 basic info, Step 2 project type selection as visual cards rather than a dropdown — e.g., selecting "AI Systems" vs "Cybersecurity" as clickable icon-cards ties back to the Divisions section, reinforcing IA coherence) / Input-Terminal (styled text/textarea fields) / Select-VisualCard (project type picker) / Button-Submit / ConfirmationState.

**Motion:** Form fields have a focus-state animation — label shrinks/rises with a 150ms ease, input border transitions to Emerald Mint glow — consistent with the "everything reacts intelligently" motion philosophy from the brief, applied functionally here rather than decoratively.

**Micro-interactions:** Project-type visual cards (if multi-step) behave like the Divisions cards (lift + accent border on hover/select) for system consistency. Submit button shows a brief loading state (spinner replaced by a subtle progress-bar-fill matching brand motion language, not a generic spinner) then transitions to a success state in place.

**Hover Behavior:** Standard input/button hover states per global design system; direct-contact email address underlines on hover, copies to clipboard on click with a small "Copied" toast confirmation (small but meaningful convenience detail).

**Scroll Behavior:** Section is generally the scroll terminus for the main flow; no special scroll-driven effects needed here — this section should feel stable/calm/trustworthy, the opposite of kinetic, by deliberate contrast with the hero.

**Entry Animation:** Standard fade/rise, slightly slower/calmer than earlier sections (500ms vs. 350ms base) to reinforce the "settling down" feeling appropriate to a conversion moment.

**Exit/Success Animation:** On successful submission, form content cross-fades to a confirmation state in the same card footprint (no layout jump, no modal) — confirmation includes a clear next-step expectation ("We'll respond within 24 hours" + calendar-booking alternative if they want to skip the wait).

**Loading State:** Submit button shows inline progress (disabled state + fill animation), not a full-page loading overlay — keeps the rest of the page interactive/stable.

**Empty State/Error State:** Field-level validation errors appear inline, icon + short text (never color-only), non-blocking (don't validate on every keystroke — validate on blur, per standard usability best practice) — this is a notable *addition* the original brief entirely omitted and is essential for a real production form.

**Responsive Behavior:** Two-column collapses to single column, reassurance block first (sets expectations) then form; multi-step project-type cards become a simple 2-column tap grid.

**Accessibility:** All fields properly labeled (not placeholder-only labels, which disappear on input and harm usability/accessibility), real `<label>` elements, error messages linked via `aria-describedby`, logical tab order, submit button disabled state clearly communicated to assistive tech (`aria-disabled`, not just visual dimming).

---

## 15 — Footer / Mission Control

**Purpose:** Close the experience with the "mission control" premium feeling described in brief, while still functioning as genuinely useful wayfinding (not just decorative).

**User Psychology:** Footers are where visitors go when they didn't convert but aren't ready to leave — it should offer clear alternate paths (sitemap, social, careers) without feeling like a consolation prize; the "mission control" framing turns a traditionally boring page area into one more on-brand moment.

**Layout:** Full-width dark section, subtle animated starfield/particle background (per brief), organized in clear columns: Company (About, Careers, Contact) / Work (Solutions, Products, Case Studies, Research) / Connect (social links, newsletter signup) / Legal (Privacy, Terms, Security disclosures). Large wordmark treatment at the very bottom, oversized and slightly faded — a common premium-footer pattern (Stripe/Linear both do this) that reinforces brand memorability as the last thing seen.

**Visual Hierarchy:** Column headers in Label token (uppercase, tertiary color), links in Body-M secondary color brightening to primary on hover, newsletter input styled consistent with the terminal-input pattern from Contact section, large wordmark at the very base in extremely low-opacity (8–12%) as a textural/brand close rather than a loud final statement.

**Component Structure:** FooterColumn (header + link list) × 4 / NewsletterInput-Terminal / SocialIconRow / LegalBar (bottom-most row: copyright, legal links, small system-status indicator e.g., "All systems operational" with a live green dot — a nice on-brand touch that reinforces "engineering collective" even in the footer) / Starfield-Background (ambient canvas).

**Motion:** Starfield particles drift extremely slowly (this is background texture, not a feature — must never distract), occasional (every 8–12s) single particle "shooting star" streak as a rare delight-moment, not a loop that draws constant attention.

**Micro-interactions:** Newsletter submit uses the same inline success pattern as the Contact form for consistency. Social icons have a subtle lift+glow on hover matching global icon hover token.

**Hover Behavior:** Standard link hover (secondary→primary text color, 150ms).

**Scroll Behavior:** Starfield is the final ambient element on the page — could very subtly intensify (slightly more particles/brightness) as the visitor reaches true page-bottom, a small "you've arrived" cue.

**Entry Animation:** Footer content fades/rises in as it enters viewport, same base token as other sections — no special treatment needed, footer's premium feeling comes from the starfield/wordmark texture, not from motion.

**Exit Animation:** N/A (page terminus).

**Loading State:** N/A.

**Empty State:** "All systems operational" status indicator must reflect a real/maintained state if implemented literally (e.g., tied to an actual status page) — if no real monitoring exists yet, use an honest equivalent instead ("Engineering team online") rather than a fabricated live-status claim, consistent with the truthful-signals principle established in Section 12.

**Responsive Behavior:** Four columns collapse to a 2×2 grid then single accordion-style stack on small mobile (column headers become tappable accordion triggers to keep footer height manageable on small screens).

**Accessibility:** Footer is a real `<footer>` landmark; starfield canvas `aria-hidden`; newsletter form has full label/error handling matching Contact section standards; link list uses real nav landmarks for screen-reader footer navigation shortcuts.

---

# PART 4 — CROSS-CUTTING SYSTEMS

## 4.1 Command Palette (`/security`, `/team`, `/projects`, `/about`)

Formalizing the brief's terminal-command idea into a real, usable component rather than an easter egg:

- Triggered by `Cmd/Ctrl+K` or the terminal icon in the Command Bar.
- Fuzzy-searchable list of destinations: sections, solutions, case studies, and the four documented slash-commands as quick-jump shortcuts.
- Modal styled as `--bg-elevated-2` glass, 32px blur, centered, max-width 560px, with a mono-font input at top and grouped, keyboard-navigable results below.
- Full keyboard operability required: arrow keys to navigate, Enter to select, Esc to close.
- This component alone contributes significantly to the "operating system, not website" feeling requested in the brief — it should be considered a signature, not a minor add-on.

## 4.2 Loading / Page-Transition State (missing from original brief entirely)

A site this motion-heavy needs a defined initial load sequence or first impressions will feel broken on slower connections:

- Initial page load: brief branded loading state (wordmark + thin progress bar or subtle animated mark, max 1.5s budget, skippable/interruptible by any user interaction) rather than a blank white/black flash.
- WebGL hero object loads progressively (wireframe → shaded, as noted in Section 01) so the loading state never blocks perceived readiness.
- No full-page loaders between in-page section scrolls — only the true initial load and the Contact form submission get dedicated loading treatment; everything else should feel instantaneous via skeleton states, per each section's spec above.

## 4.3 Error & Offline States (missing from original brief entirely)

- 404 page: maintains full brand system (not a generic error page) — styled as a "system fault" screen with the OS metaphor (e.g., "ERROR 404 — ROUTE NOT FOUND" in mono font, a subtle glitch-in animation used sparingly here, exactly the kind of moment that justifies the brief's "Glitch Intro" idea rather than using it site-wide), with a clear path back to the homepage or command palette.
- Offline/connection-lost state (for the interactive dashboard demos, WebGL, or form submission): calm inline message, retry action, no punitive tone.

## 4.4 Dark Mode Only — Confirmed Rationale

The brief specifies dark-mode only, which this spec preserves, but flags one accessibility note: ensure a "reduce brightness/glow intensity" toggle is considered for future roadmap (not required at launch) since some visually-sensitive users find high-glow dark UIs uncomfortable for extended reading — this is a note for the roadmap, not a blocker for v1.

## 4.5 Performance Budget (missing from original brief entirely)

Given the density of WebGL/canvas/particle effects requested, define budgets so the "engineered" feeling doesn't collapse into a laggy experience, which would undermine the entire premise:

- Largest Contentful Paint target: under 2.0s on a throttled 4G profile.
- Hero WebGL object: under 3MB total asset budget, degrades to a lighter particle/gradient treatment on lower-end GPUs (detected via a lightweight capability check, not user-agent sniffing).
- All ambient/looping animations pause when their section is out of viewport (Intersection Observer pattern) to conserve battery/CPU — this should be a global rule, not per-section afterthought.
- Total custom font weight budget: max 4 font files loaded (variable fonts preferred over multiple static weights) to protect load time despite the large type scale.

---

# PART 5 — COMPONENT LIBRARY INDEX

For Figma AI to build a consistent system, the following components should exist once in a shared library and be reused (never redrawn per-page) across all sections above:

**Navigation:** CommandBar, NavLink, CommandPalette, MobileNavOverlay

**Buttons:** Button-Primary, Button-Secondary/Ghost, Button-Text-Link, IconButton

**Cards:** Card-Principle, Card-Division, Card-Solution (collapsed/expanded), Card-CaseStudy (featured/compact), Row-ProductShowcase, Card-ResearchProject, Card-TeamMember, Card-RoadmapItem

**Data Display:** StatMetric-Large (count-up), MetricCallout, TechStackChips, StatusBadge (all variant sets: Live/Beta/ComingSoon, Planned/InProgress/Shipped, Active/Experimental/Archived), CredibilityPillar

**Diagrams/Visualizations:** ArchitectureDiagram (mini + interactive), NetworkGraph-Canvas, Timeline-Stepper, RoadmapAxis, PerformanceChart, InteractiveDashboard-Mini

**Forms:** Input-Terminal, Select-VisualCard, NewsletterInput-Terminal, Form-MultiStep, ValidationMessage

**Feedback/State:** Skeleton (all content-shape variants), Toast-Confirmation, ConfirmationState, EmptyState, ErrorState-404

**Footer:** FooterColumn, SocialIconRow, LegalBar, Starfield-Background

Each should be built with the full variant set (default/hover/active/focus/disabled/loading/error where applicable) before any page assembly begins — this is what makes the system "scalable architecture," per the brand's own stated value, rather than a one-off page.

---

# PART 6 — WHAT THIS SPEC DELIBERATELY CHANGED FROM V1 AND WHY

1. **Added conversion checkpoints mid-scroll** — the original only converted at the very end; award-winning sites let intent-ready visitors act early.
2. **Elevated Trust content earlier (compact strip) while keeping full Trust section later** — psychology research on trust formation happens in the first few scrolls, not at scroll depth 12.
3. **Constrained motion per-section to one dominant idea** — the original's "everything moves" instruction, taken literally across every section, is the most common reason AI-assisted designs read as chaotic rather than premium; restraint is what actually reads as "engineered."
4. **Added accessibility, error states, loading states, and performance budgets** — entirely absent from the original, but non-negotiable for a real production spec, not just a mood board.
5. **Replaced generic hover-glow-on-everything with contextual, state-triggered glow only** — resting-state glow on every card is the single strongest "AI template" tell; premium references (Linear, Stripe) reserve glow for meaningful state changes only.
6. **Added a formal Command Palette spec** — turns the brief's throwaway slash-command idea into the site's actual signature interaction, which does more to earn the "operating system, not website" impression than any visual treatment alone.
7. **Flagged truthful-content requirements in Trust and Footer sections** — fabricated credibility signals (awards not yet won, fake live-status) are a real reputational risk once noticed, and the fix costs nothing at spec stage.
8. **Explicit graceful-degradation rules for WebGL/canvas-heavy sections on mobile** — rather than leaving mobile behavior undefined, each complex section names its specific mobile fallback so nothing is quietly dropped or, worse, shipped broken.

---

*End of specification. This document is structured for direct section-by-section ingestion into Figma AI — build Part 1 (Foundation) as a shared library first, then generate Part 3 sections in IA order, applying Part 4 cross-cutting systems and Part 5 component reuse throughout.*