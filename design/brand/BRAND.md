# CertAnvil · Brand & Design System

> **Forged-bronze editorial.** The locked design language across the cert-app (`networkplus.certanvil.com`), the landing site (`certanvil.com`), and the diagnostic flow. Codified across the v4.99.65 → v5.5.12 rebrand sprint (60+ ships).

This is the source-of-truth spec. The visual showcase lives at [`brand/index.html`](./index.html). The list of surfaces still to redesign lives at [`brand/REDESIGN-TODO.md`](./REDESIGN-TODO.md).

---

## 1 · Philosophy

The system has three commitments:

1. **Editorial, not SaaS-generic.** Hairlines over soft-shadow cards. Type does the lifting. One accent, one focal action per surface. The dashboards-anti-slop rule: every component must drive an action or carry real data — no filler-card spam.
2. **Forged bronze, not purple.** The previous AI-tell — `#5b4fdb` / `#7c6ff7` purple — is dead. Replaced with a single OKLCH bronze accent that adapts per theme (deep on light, bright on dark).
3. **Restraint with purpose.** When motion exists, it earns its place (emil-design-eng); when an icon appears, it's monoline or the brand-illustrative set, never emoji decoration. When in doubt, take it out.

The locked rule: **never edit `styles.css`** for editorial reskins. Add scoped `html[data-theme] body` overrides in `dg-system.css` so the v4.54.x css-guard tests stay green (no UAT migration). Pattern proven across v5.5.2 → v5.5.12.

---

## 2 · Logo · the C/A monogram

The brand mark: a stylised **C** upper-left, a diagonal **slash** through the centre, an **A** lower-right. **Stroke-only**, theme-adaptive.

- **Source-of-truth**: `brand/logo.svg` (standalone) and the inline `brandSvg` in `app.js`'s `renderSidebar()` (the runtime mark).
- **Concept**: `mockups/certanvil-ca-monogram-concept.html` (v5.0.2 ship).
- **Recommended sizes**: 28–40px (sidebar/topbar), 48–96px (auth/onboarding), 200px+ (marketing hero only).
- **Colors**: `stroke-width:7` on the C and A; `stroke-width:5` on the slash. The slash uses `opacity:0.55` (or a separate text-dim stroke) so it reads as a quiet connector, not a third focal element.
- **Theme adaptation**: strokes inherit `currentColor` by default. CSS classes `.sb-brand-c` / `.sb-brand-slash` / `.sb-brand-a` (in `dg-system.css`) override per-theme — both currently resolve to the accent bronze.

**Don'ts:**

- Never fill the strokes (the mark is stroke-only).
- Never on purple, gradient, or rainbow backgrounds.
- Never with drop-shadow or glow effects.
- Never recolor the C or A independently of the system (they always match each other; only the slash can be quietened).

---

## 3 · Color palette

All tokens are **OKLCH** for perceptual uniformity. Light is the **founder's primary theme**; both themes must be verified in every ship (the v4.99.63 dark-only-miss lesson, inverted).

### Light theme

```
--bg:            oklch(0.975 0.007 85);   /* warm ivory paper */
--surface:       oklch(0.992 0.004 85);   /* card surface */
--surface-2:     oklch(0.965 0.010 84);   /* deeper surface (gradient depth) */
--ink:           oklch(0.22  0.015 280);  /* primary text · also --text */
--ink-soft:      oklch(0.36  0.014 280);  /* secondary text · also --text-mid */
--muted:         oklch(0.50  0.013 280);  /* tertiary · also --text-dim */
--border:        oklch(0.86  0.008 85);   /* hairline */
--border-soft:   oklch(0.91  0.006 85);   /* softer hairline (interior dividers) */
--accent:        oklch(0.50  0.155 55);   /* DEEP BRONZE · the single accent */
--accent-bright: oklch(0.80  0.155 64);   /* used in dark; light edge cases */
--accent-deep:   oklch(0.42  0.150 52);   /* button borders on filled bronze */
--on-accent:     oklch(0.985 0.010 85);   /* ivory text on bronze */
--pass:          oklch(0.52  0.13 150);   /* green · success / passing */
--warn:          oklch(0.62  0.14 70);    /* amber · caution */
```

### Dark theme

```
--bg:            oklch(0.16  0.009 275);  /* deep charcoal-blue */
--surface:       oklch(0.205 0.009 275);
--surface-2:     oklch(0.185 0.009 275);
--ink:           oklch(0.96  0.006 275);  /* near-white */
--ink-soft:      oklch(0.78  0.010 275);
--muted:         oklch(0.60  0.013 275);
--border:        oklch(0.30  0.008 275);
--border-soft:   oklch(0.26  0.008 275);
--accent:        oklch(0.80  0.155 64);   /* BRIGHT BRONZE · pops on dark */
--accent-bright: oklch(0.86  0.140 70);
--accent-deep:   oklch(0.70  0.150 62);
--on-accent:     oklch(0.18  0.020 275);  /* dark text on bright bronze */
--pass:          oklch(0.74  0.150 152);
--warn:          oklch(0.80  0.130 75);
```

### Tinting (the canonical pattern)

For accent-tinted backgrounds, borders, and shadows — use `color-mix()` so the tint adapts with the token:

```css
background: color-mix(in oklab, var(--accent) 9%,  transparent);     /* a tinted chip */
border:     1px solid color-mix(in oklab, var(--accent) 22%, var(--border));
box-shadow: 0 18px 40px -16px color-mix(in oklab, var(--text) 22%, transparent);
```

Never hardcode hex for chrome (gradients, borders, shadows, tints). Hardcoded hex is allowed only for **brand-illustrative SVG fills** (the orange flame / sync gradients in `design/svg-icons/`) where the brand identity is the point.

### Source-of-truth files

- Light + dark token blocks: `dg-system.css` (top of file, ~lines 22-83)
- Tokens are redefined per surface where needed (e.g., `#page-setup` has its own type-scale + easing token block at line ~118)

---

## 4 · Typography

Two faces. Each has a specific job.

### Fraunces · the editorial display

- **Variable**: `opsz 9..144`, `wght 500/600/700`
- **Source**: Google Fonts CDN (`<link>` in `index.html` head ~line 36)
- **Used for**: hero greetings, score figures, card titles in `#page-setup`/Analytics/Quiz/Results, the "OUT OF 900" caption is **not** Fraunces — it's Inter.
- **Weights**: `600` for nearly everything (the locked weight); `500` for the readiness suffix; `700` is reserved for very rare emphasis.
- **Tracking**: tight — typically `letter-spacing: -0.01em` to `-0.03em` for display.

### Inter · the UI workhorse

- **Variable / static**: `wght 400, 500, 550, 600, 650, 700, 800`
- **Used for**: every UI element, button, chip, eyebrow label, body copy, caption.
- **UPPERCASE labels** (eyebrows, section labels): `font-size:10-11px`, `font-weight:800`, `letter-spacing:0.08em` to `0.14em` — never use Fraunces for these.

### The type scale (`--t-*`)

Defined on `#page-setup` in `dg-system.css` (line ~118):

| Token  | Value | Use |
|--------|-------|-----|
| `--t-1` | 12px | Caption / small body |
| `--t0`  | 14px | Default body |
| `--t1`  | 18px | Card title |
| `--t2`  | 23px | Section title |
| `--t3`  | 30px | Page title |
| `--t4`  | 42px | Hero display |

These are `#page-setup`-scoped (the v5.5.4 lesson). For elements on `<body>` directly (toasts, modals portaled to body), declare them inline or use literal values.

### Numerals · the v5.5.12 lining-nums rule

Any **Fraunces hero number** MUST explicitly request **lining-nums**:

```css
font-variant-numeric: lining-nums tabular-nums;  /* modern CSS */
font-feature-settings: "lnum", "tnum";           /* belt-and-suspenders for older engines */
```

**Why**: Fraunces ships with **old-style figures** (`onum`) as a default in some contexts — `5/7/9/3` are full-height with descenders, while `1/2/0` sit at x-height. A score like `522` then renders as tall-5 + short-2-2. **`lining-nums` forces uniform cap-height** so every digit is the same height regardless of which digits appear.

`tabular-nums` only normalises **width**, not figure-style — they're independent axes. **Always set both.**

### Line-height · the v5.5.11 rule

Display numerals stacked above a caption MUST have `line-height >= 1.0`. A sub-1 line-height (e.g. `0.92`) tightens the line-box BELOW the glyph's natural ink extent — the descender curve of "5" or "9" overflows the line-box and overlaps whatever sits beneath (the v5.5.11 hero overlap incident).

- **Block-stacked hero numbers + caption below**: `line-height: 1.0`.
- **Inline baseline-flex numbers** (single-line, no element below): `line-height: 0.92` is safe.

### Hero numerals · the readiness pattern (v5.5.10–12)

The readiness score is the canonical example:

```css
.readiness-score{
  display:flex; flex-direction:column; align-items:baseline; gap:0;
  font-variant-numeric: tabular-nums;
}
#rc-v2-num{
  display:block;
  font-family:'Fraunces',Georgia,serif;
  font-weight:600;
  font-size:clamp(94px, 11.5vw, 140px);     /* desktop 140 / mobile 94 */
  line-height:1;
  letter-spacing:-0.03em;
  color:var(--text);
  font-variant-numeric: lining-nums tabular-nums;
  font-feature-settings: "lnum", "tnum";
}
.readiness-score span:not(#rc-v2-num){      /* the caption below */
  display:block;
  margin-top:14px;                          /* breathing room from the glyph base */
  font-family:Inter,sans-serif;
  font-weight:600;
  font-size:13.5px;
  letter-spacing:0.08em;
  text-transform:uppercase;
  color:var(--text-dim);
}
```

Reuse this pattern for any hero figure across the system (e.g., the dashboard summary numbers in Analytics).

---

## 5 · Spacing, radius, shadow

### Radius

| Use | Value |
|-----|-------|
| Card | `14-20px` |
| Modal / large panel | `18-22px` |
| Chip / button | `7-11px` |
| Pill (banner, status) | `999px` (fully rounded) |

### Card padding

`clamp(20px, 2.6vw, 30px)` for hero cards (Readiness, NBM, Continue anchor); tighter for chips (`9-13px` vertical, `14-18px` horizontal).

### Hairlines

`1px solid var(--border)` for primary dividers; `1px solid var(--border-soft)` for interior softer dividers.

### Shadows

Restrained and **theme-adaptive** via `color-mix()`:

```css
/* hero card */
box-shadow:
  0 1px 0 color-mix(in oklab, var(--text) 4%, transparent),
  0 18px 40px -16px color-mix(in oklab, var(--text) 22%, transparent);

/* toast */
box-shadow:
  0 1px 0 color-mix(in oklab, var(--text) 4%, transparent),
  0 18px 40px -16px color-mix(in oklab, var(--text) 24%, transparent);
```

Never use `rgba(0,0,0, .35)` style hex/rgba shadows on chrome (they don't adapt to dark theme cleanly).

---

## 6 · Motion · emil-design-eng

The locked motion principles:

- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` — the system curve (`--dgh-ease` on `#page-setup`). For elements on `<body>` directly (toasts, modals portaled), use the **literal** curve, not `var(--dgh-ease)` — a non-ancestor `var()` invalidates the whole declaration (the v5.5.4 portal lesson).
- **Properties**: `transform` + `opacity` only (GPU). Never animate width/height/colour for entrances.
- **Never `scale(0)`**: entrances start at `scale(0.96-0.98)`. Scale-from-zero feels jarring at any size.
- **Press feedback**: `:active{ transform: scale(0.97) }` on every clickable. Crisp and tactile.
- **Hover gating**: `@media (hover:hover) and (pointer:fine) { ... }` — touch taps shouldn't fire hover.
- **Reduced-motion**: respect `@media (prefers-reduced-motion:reduce)` — collapse to fade-only, no transform.

### Duration table

| Element | Duration | Why |
|---------|----------|-----|
| Button hover/press | `150-160ms` | Tight; UI responsiveness |
| Card lift / arrow nudge | `200-220ms` | Visible without lagging |
| Toast entrance | `340-380ms` | Toast must announce itself |
| Card reveal (entrance IIFE) | `520-560ms` | First-paint stagger |
| Bar fill / chart sweep | `800-1100ms` | Data motion (instrument-like) |

Never exceed `~600ms` for UI motion. Bar/chart sweeps are the exception (they carry data information, so the duration justifies itself).

### The reveal stagger (entrance)

Cards on `#page-setup` use a per-element `--d` index multiplied by 60ms:

```css
.reveal { opacity:0; transform:translateY(15px); transition: opacity .55s var(--dgh-ease), transform .55s var(--dgh-ease); }
.reveal.visible { opacity:1; transform:none; }
```

```html
<div class="card readiness-card reveal" style="--d:1" id="readiness-card-v2">...</div>
<div class="card nbm-card reveal" style="--d:2" id="hero-v2-cta">...</div>
```

An IntersectionObserver IIFE in `index.html` adds `.visible` when each enters viewport; a 1.6s safety net unconditionally un-hides any `.reveal` still hidden (so a `display:none → shown` element can never stick invisible). This IIFE is what every new `.reveal` element rides; no JS hook needed per element.

---

## 7 · Iconography

Two distinct icon vocabularies — never mix.

### A · Monoline UI icons

For sidebar nav, topbar buttons, card-eyebrow glyphs, chevrons, common UI affordances.

- **Style**: stroke-only SVG, `stroke="currentColor"`, `stroke-width: 1.8-2` at 16-24px render size.
- **Size**: 13-22px depending on slot.
- **Source**: defined inline in `app.js` via `_sbNavIcon()` (sidebar), `_ctsLineIcon()` (CTS), `tbPaletteLineIcon()` (TB palette).
- **Color**: inherits `currentColor` — adapts to theme + active state automatically.

### B · Brand-illustrative icons

For specific brand moments where character is the point. Used sparingly — never for routine UI.

- **Source**: `design/svg-icons/Transparanet svgs/` (198 files; the founder's brand library).
- **Style**: cream/orange/ink illustrative with gradients + optional drop-shadow.
- **Used in**:
  - **Streak flame** (sidebar) — `07_study_streak.svg` (v5.5.8)
  - **SW update banner** — `18_sync_arrows.svg` (v5.5.9)
- **Inlining rules** (the v5.5.8 lesson):
  - **Trim aggressively** for inline use: drop `<title>`/`<desc>`, drop `<filter>` (invisible at small sizes), drop `<style>` blocks (they leak page-globally — CRITICAL).
  - **Namespace gradient ids** to avoid collision (`caOrange` → `swSyncOrange`).
  - Switch dark stroke colors to `currentColor` so the outline adapts per theme; keep the orange gradient on a single accent path for brand identity.
- **Don't** use the unmodified asset file inline (the `<style>` blocks and the dark `#202932` stroke break theme adaptation).

---

## 8 · Components — the locked set

### Cards

- **De-carded** by default in the editorial system — chrome is hairline borders + restrained shadows, NOT soft-shadow filled pills.
- The bronze-filled fill is reserved for the **single focal NBM card** per surface (the "Take the Baseline Diagnostic" / "Next Best Move" pattern).
- All other cards: `background: var(--surface)`, `border: 1px solid var(--border)`, optional accent-tinted variant via `color-mix`.

### Buttons

| Variant | Visual | Use |
|---------|--------|-----|
| **`btn-primary`** | Solid bronze (`var(--accent)` bg + `var(--bg)`/`--on-accent` text) | The single focal action per surface |
| **`btn-ghost`** | Accent-outline (`color: var(--accent)`, `border: 1px solid color-mix(... 30%)`) | Secondary actions, dismissals |
| **`btn-white`** | Ivory + accent text | Used INSIDE the bronze NBM card only (contrast against the filled background) |
| **`cc-action`** (Continue anchor) | Subtle accent-tint bg + accent-outline | Quiet primary inside a rail card |

Press feedback (`:active{ scale(0.97) }`) on all variants. Hover lift (`translateY(-1px)` or brightness bump) on the primary; gated to fine pointers.

### Chips

- Default: `var(--surface)` bg, `1px solid var(--border)`, `color: var(--text-mid)`.
- `.on` / `.is-active`: accent-tinted bg (`color-mix(in oklab, var(--accent) 12-14%, transparent)`), accent border, accent text.
- Used for: topic chips, difficulty pills, focus pickers, count chips.

### Eyebrows (section labels)

```css
font-family: Inter, sans-serif;
font-size: 10-11px;
font-weight: 800;
letter-spacing: 0.13em - 0.14em;
text-transform: uppercase;
color: var(--accent);        /* bronze · for focal eyebrows */
/* OR */
color: var(--text-dim);      /* neutral · for secondary eyebrows */
```

### Bars / instruments

The readiness bar pattern: thin (4-12px) hairline track with an accent-gradient fill; optional inline tick (the `PASS 720` notch) with a small uppercase label above. Width animates via JS-driven `style.width`; the CSS transition (`width 1.1s var(--dgh-ease)`) carries the sweep.

---

## 9 · Anti-slop (the stop-slop applied rules)

The locked do-not list:

- ❌ **No emoji as decorative icons.** Use SVG (monoline or brand-illustrative). The only emoji that survive the rebrand are **semantic verdict marks** (`✓` / `✗` / `→`) where they're functional, not decorative.
- ❌ **No purple.** `#5b4fdb` / `#7c6ff7` / `#a99df9` / `#3d3870` are dead. The accent is bronze, the suffix-as-fallback `var(--accent2, #5b4fdb)` is the AI-tell — eliminate.
- ❌ **No card-spam.** A grid of 4+ identical soft-shadow cards is the editorial-premium AI-tell. De-card to hairline rows or replace with a real data-viz.
- ❌ **No em-dashes** (`—`). Use middle-dot (`·`) or the Inter natural punctuation.
- ❌ **No throat-clearing copy.** "Here's what..." / "It's worth noting..." → cut. State directly.
- ❌ **No vague declaratives.** "The implications are significant" → name the specific implication.
- ❌ **No gradient backgrounds on chrome.** Surfaces are `var(--surface)`; gradients are reserved for the single bronze NBM fill + the readiness-bar fill.
- ❌ **No hardcoded hex** in component CSS (except brand-illustrative SVG fills). Use tokens + `color-mix`.
- ❌ **No drop-shadows on the C/A monogram** or any brand element.
- ❌ **No descriptive-only Analytics cards.** Every card must drive an action. The v4.45.0 "Prescriptive over Descriptive" rule.
- ❌ **No animation on data without a data role.** Bar fills, score count-ups, FLIP reranks earn their motion. A spinning gradient does not.

### Class-of-bug-grep lesson (re-occurs)

When fixing a class-of-bug, grep the **pattern** (shape), not the specific function name. A literal token in a CODE COMMENT can trip a UAT regex (the `:root`, `col-side-card`, `is-hidden`-in-comment incidents). When this happens, **reword the comment, never weaken the guard**.

---

## 10 · Implementation files

- **Tokens**: `dg-system.css` (top of file, both theme blocks; `#page-setup`-scoped extras at ~line 118)
- **Cert-app**: `index.html` + `app.js` + `styles.css` (legacy, never edit for reskins) + `dg-system.css` (editorial overlay, loaded AFTER styles.css)
- **Landing**: `landing/index.html` + `landing/dg-system.css` (separate Vercel project)
- **Logo**: `brand/logo.svg` (standalone) + inline `brandSvg` in `app.js renderSidebar()`
- **Mockups**: `mockups/*-concept.html` (every feature/redesign is mockup-first)
- **Mockup starter tokens**: [`brand/mockup-starter-tokens.css`](./mockup-starter-tokens.css) — copy-paste this token block into every new mockup's `<style>`. Never freehand a hex token block (the 2026-06-12 Gauntlet-mockup lesson: eyeballed hexes pulled the accent toward gold and imported Tailwind greens).
- **Concept-mockup-first workflow**: see [`feedback_concept_mockup_first`](../docs/feedback_concept_mockup_first.md) memory — approved across 14+ ships with zero revision rounds.

### Versioning

- Cache-bust query on `dg-system.css?v=X.X.X` MUST be hand-bumped on any dg-system.css change (the documented gotcha — bump-version doesn't touch the `?v` query). Failing to bump means stale CSS via the SW cache.
- Every ship gets a CLAUDE.md row in the version history table — see existing rows for the expected structure (root cause, lesson if applicable, structural sanity, UAT count, Playwright result, contract preservation, `dg-system.css?v` bump).

---

**Last updated**: 2026-06-12 (mockup starter token block) · prior v5.5.12 · 2026-05-19
