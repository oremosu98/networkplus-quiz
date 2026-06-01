# Cert Lettermark Icons (Phase 1: landing) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Render every cert on the landing site as the approved two-tone Fraunces lettermark (prefix ink, last glyph bronze; A+ Core 1/2 get a ¹/² superscript), fixing the 6 blank cert-library tiles and unifying the cert mark across the My Certs modal, exam-result modal, account entitlements/results, and cross-cert analytics.

**Architecture:** Pure CSS + text (no image assets). A tiny `certGlyphHTML(glyph, glyphClass)` helper produces the two-tone markup; it is defined inline in each JS render file (account.js, auth.js, cross-cert-analytics.js — matching the codebase's existing per-file cert-metadata duplication, avoiding a new shared-script include + load-order risk). The hardcoded cert-library tiles get the markup inline. The 5 stale PNGs are deleted.

**Tech Stack:** Static HTML/CSS/JS. Verify via grep + ecc Playwright (both themes).

**Spec:** `docs/superpowers/specs/2026-06-01-cert-lettermark-icons-design.md`

**Lettermark contract (identical everywhere):**
- Markup: `<prefix><span class="cg-ac">LAST</span>` plus, for A+ only, `<span class="cg-sup">1</span>`/`2`.
- The helper:
```js
function certGlyphHTML(glyph, glyphClass){
  var g = String(glyph || '');
  var sup = glyphClass === 'aplus-core1' ? '1' : glyphClass === 'aplus-core2' ? '2' : '';
  var esc = function(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  if (!g) return '';
  var head = esc(g.slice(0, -1)), last = esc(g.slice(-1));
  return head + '<span class="cg-ac">' + last + '</span>' + (sup ? '<span class="cg-sup">' + sup + '</span>' : '');
}
```
- CSS tokens: prefix ink `oklch(0.24 0.018 280)` (or the surface's existing ink), accent `var(--accent)` / `oklch(0.50 0.155 55)`, font `'Fraunces',Georgia,serif` weight 600. `.cg-sup{font-size:.5em;vertical-align:super;color:var(--accent);font-weight:700;margin-left:.5px}`.

---

## Task CI1: Cert-library tiles (the visible fix) — `landing/index.html`

**Files:** Modify `landing/index.html` (glyph CSS ~1097-1122; tile markup 1172-1333). Delete 5 PNGs.

- [ ] **Step 1: Replace the live-tile glyph CSS**

Replace:
```
  #certs .cert-tile.is-live .cert-glyph,#certs .cert-tile.is-private .cert-glyph{width:84px;height:84px;flex:none;font-size:0;background-color:#FFFBF3;border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-soft);background-size:62px 62px;background-position:center;background-repeat:no-repeat}
  #certs .cert-glyph-netplus{background-image:url('assets/certs/cert-netplus.png')}
  #certs .cert-glyph-secplus{background-image:url('assets/certs/cert-secplus.png')}
```
with:
```
  #certs .cert-tile.is-live .cert-glyph,#certs .cert-tile.is-private .cert-glyph{width:84px;height:84px;flex:none;background-color:#FFFBF3;border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-soft);display:grid;place-items:center;font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:34px;line-height:1;letter-spacing:-.02em;color:oklch(0.24 0.018 280)}
  #certs .cert-glyph .cg-ac{color:var(--accent)}
  #certs .cert-glyph .cg-sup{font-size:15px;vertical-align:super;color:var(--accent);font-weight:700;margin-left:1px}
```

- [ ] **Step 2: Replace the roster (is-soon) glyph CSS**

Replace:
```
  #certs .cert-tile.is-soon .cert-glyph{width:46px;height:46px;font-size:0;background-color:#FFFBF3;border:1px solid var(--border);border-radius:13px;background-size:34px 34px;background-position:center;background-repeat:no-repeat}
  #certs .cert-tile.is-soon .cert-glyph-secplus{background-image:url('assets/certs/cert-secplus.png')}
  #certs .cert-tile.is-soon .cert-glyph-az900,#certs .cert-tile.is-soon .cert-glyph-az104{background-image:url('assets/certs/cert-az.png')}
  #certs .cert-tile.is-soon .cert-glyph-ccna{background-image:url('assets/certs/cert-ccna.png')}
  #certs .cert-tile.is-soon .cert-glyph-aws{background-image:url('assets/certs/cert-aws.png')}
```
with:
```
  #certs .cert-tile.is-soon .cert-glyph{width:46px;height:46px;background-color:#FFFBF3;border:1px solid var(--border);border-radius:13px;display:grid;place-items:center;font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:19px;line-height:1;letter-spacing:-.02em;color:oklch(0.24 0.018 280)}
```
(The `.cg-ac`/`.cg-sup` rules from Step 1 also apply to soon tiles since they target `#certs .cert-glyph .cg-ac`.)

- [ ] **Step 3: Update the 11 tile glyph divs to two-tone markup**

Apply these exact inner-HTML changes (each `<div class="cert-glyph cert-glyph-X">...</div>`):
- `cert-glyph-netplus`: `N+` → `N<span class="cg-ac">+</span>`
- `cert-glyph-secplus`: `S+` → `S<span class="cg-ac">+</span>`
- `cert-glyph-az900`: `AZ` → `A<span class="cg-ac">Z</span>`
- `cert-glyph-ai900`: `AI` → `A<span class="cg-ac">I</span>`
- `cert-glyph-aplus` (FIRST, Core 1, line ~1234): `A+` → `A<span class="cg-ac">+</span><span class="cg-sup">1</span>`
- `cert-glyph-aplus` (SECOND, Core 2, line ~1250): `A+` → `A<span class="cg-ac">+</span><span class="cg-sup">2</span>`
- `cert-glyph-sc900`: `SC` → `S<span class="cg-ac">C</span>`
- `cert-glyph-clfc02`: `AWS` → `AW<span class="cg-ac">S</span>`
- `cert-glyph-ccna` (roster): `CC` → `C<span class="cg-ac">C</span>`
- `cert-glyph-aws` (roster): `AW` → `A<span class="cg-ac">W</span>`
- `cert-glyph-az104` (roster): `AZ` → `A<span class="cg-ac">Z</span>`

The two `cert-glyph-aplus` are identical strings; edit by reading lines ~1234 and ~1250 and replacing each occurrence in order (Core 1 → ¹, Core 2 → ²). For the 3-letter `clfc02` (AWS), also add `font-size:27px` via a scoped rule if it overflows: `#certs .cert-tile.is-live .cert-glyph-clfc02{font-size:27px;letter-spacing:-.03em}`.

- [ ] **Step 4: Delete the stale PNGs**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
git rm landing/assets/certs/cert-netplus.png landing/assets/certs/cert-secplus.png landing/assets/certs/cert-az.png landing/assets/certs/cert-ccna.png landing/assets/certs/cert-aws.png
```

- [ ] **Step 5: Verify**

```bash
grep -nE "assets/certs/cert-.*\.png|font-size:0" landing/index.html   # expect none in #certs glyph rules
grep -c "cg-ac" landing/index.html                                    # expect 11 (one per tile)
```

- [ ] **Step 6: Commit**

```bash
git add landing/index.html landing/assets/certs/
git commit -m "feat(landing): cert-library tiles use two-tone Fraunces lettermarks (all 8 live, no blanks)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task CI2: account.js glyph renders (entitlements, exam results, confetti modal)

**Files:** Modify `landing/lib/account.js` (helper + 6 render sites: `:292` ent-glyph, `:337/:355/:371` er-glyph, `:543/:562` confetti-cert-glyph); `landing/account.html` (CSS for `.ent-glyph`/`.er-glyph` ~209/224) + the confetti modal CSS scope.

- [ ] **Step 1: Add the helper to account.js**

Near the top of the module (after the existing `escapeHtml`/IIFE open), add the `certGlyphHTML` function (verbatim from the contract above).

- [ ] **Step 2: Swap the 6 render sites**

In each of the 6 lines, replace `escapeHtml(cert.glyph)` (or `escapeHtml(c.glyph)`) with `certGlyphHTML(cert.glyph, cert.glyphClass)` (use the matching variable name — `c` at the entitlements site `:292`, `cert` at the others). Example (`:337`):
`'<div class="er-glyph ' + cert.glyphClass + '">' + escapeHtml(cert.glyph) + '</div>'`
→ `'<div class="er-glyph ' + cert.glyphClass + '">' + certGlyphHTML(cert.glyph, cert.glyphClass) + '</div>'`

- [ ] **Step 3: Restyle the chips to the two-tone Fraunces mark (account.html)**

Replace the `.ent-glyph` and `.er-glyph` rules (lines ~209, ~224) — change `font:800 12px var(--mono);color:var(--accent-deep)` to a Fraunces ink mark with bronze accent, keeping the chip container:
```
  #account-page .ent-glyph{width:38px;height:38px;border-radius:10px;flex:none;display:grid;place-items:center;font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:15px;line-height:1;letter-spacing:-.02em;color:var(--ink);background:color-mix(in oklab,var(--accent) 9%,transparent);border:1px solid color-mix(in oklab,var(--accent) 22%,transparent)}
  #account-page .er-glyph{width:38px;height:38px;border-radius:10px;flex:none;display:grid;place-items:center;font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:15px;line-height:1;letter-spacing:-.02em;color:var(--ink);background:color-mix(in oklab,var(--accent) 9%,transparent);border:1px solid color-mix(in oklab,var(--accent) 22%,transparent)}
  #account-page .ent-glyph .cg-ac,#account-page .er-glyph .cg-ac{color:var(--accent)}
  #account-page .ent-glyph .cg-sup,#account-page .er-glyph .cg-sup{font-size:.55em;vertical-align:super;color:var(--accent);font-weight:700}
```

- [ ] **Step 4: Confetti modal CSS** — find the `.confetti-cert-glyph` rule (search `landing/lib/account.js` and `landing/index.html` / injected styles). Add matching `.confetti-cert-glyph{font-family:'Fraunces',...;color:var(--ink)}` + `.confetti-cert-glyph .cg-ac{color:var(--accent)}` + `.cg-sup` in whatever scope styles it. If the confetti styles are injected by account.js, add the rules there.

- [ ] **Step 5: Verify + commit**

```bash
node --check landing/lib/account.js && echo OK
grep -c "certGlyphHTML(" landing/lib/account.js   # expect 7 (1 def + 6 calls)
git add landing/lib/account.js landing/account.html
git commit -m "feat(landing): account entitlements + exam-result glyphs use the cert lettermark

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task CI3: My Certs modal (auth.js) + cross-cert analytics

**Files:** `landing/lib/auth.js` (`renderMyCertsList()` → `.my-cert-glyph`); `landing/lib/cross-cert-analytics.js` (helper + `:281` cca-pr-glyph, `:612/:614` cca-so-pair-glyph); CSS in `landing/index.html` (`#my-certs-modal .my-cert-glyph` ~2661) + `landing/dg-system.css` (`.cca-pr-glyph`/`.cca-so-pair-glyph` ~600/641).

- [ ] **Step 1: auth.js** — locate `renderMyCertsList()`, add the `certGlyphHTML` helper, and swap its `.my-cert-glyph` glyph render to `certGlyphHTML(cert.glyph, cert.glyphClass)`. Read the function first to get the exact line.

- [ ] **Step 2: cross-cert-analytics.js** — add the helper; swap the 3 sites (`:281`, `:612`, `:614`) `escapeHtml(<x>.glyph)` → `certGlyphHTML(<x>.glyph, <x>.glyphClass)`.

- [ ] **Step 3: CSS** — `#my-certs-modal .my-cert-glyph` (index.html ~2661): set Fraunces + ink, add `.my-cert-glyph .cg-ac{color:var(--accent)}`/`.cg-sup`. In `landing/dg-system.css` (~600, ~641): set `.cca-pr-glyph`/`.cca-so-pair-glyph` to Fraunces ink, add `.cca-pr-glyph .cg-ac,.cca-so-pair-glyph .cg-ac{color:var(--dg-accent)}` + `.cg-sup`.

- [ ] **Step 4: dg-system.css cache-bump** — because `landing/dg-system.css` changed, bump its `?v=` query in every landing page that references it (grep `dg-system.css?v=` across `landing/*.html`) to a new value. This is the documented gotcha.

- [ ] **Step 5: Verify + commit**

```bash
node --check landing/lib/auth.js && node --check landing/lib/cross-cert-analytics.js && echo OK
git add landing/lib/auth.js landing/lib/cross-cert-analytics.js landing/index.html landing/dg-system.css landing/*.html
git commit -m "feat(landing): My Certs modal + cross-cert analytics use the cert lettermark; dg-system ?v bump

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task CI4: Verification — both themes, all surfaces

**Files:** none.

- [ ] **Step 1: Asset + reference sweep**

```bash
grep -rnE "assets/certs/cert-.*\.png" landing/ --include=*.html --include=*.css --include=*.js   # expect none
ls landing/assets/certs/   # expect empty / dir gone
```

- [ ] **Step 2: Both-theme Playwright (ecc MCP; fallback = throwaway headless script per the handoff)**

Serve `landing/` on :4178. In light + dark verify:
- `/index.html` `#certs`: all **8 live tiles show a lettermark** (none blank), A+ Core 1 shows ¹ and Core 2 shows ², roster tiles (CC/AW/AZ) render; bronze accent on the last glyph; cream tile both themes; 0 console errors.
- `/account.html`: entitlements + exam-result rows show the two-tone mark in their chips.
- My Certs modal (open from the account dropdown if reachable locally) + an exam-result modal state if triggerable; else confirm the rendered markup via `browser_evaluate` (`document.querySelector('.er-glyph .cg-ac')`).
- Cross-cert analytics surface if reachable.
- Rendered-DOM check: `document.querySelectorAll('#certs .cert-glyph .cg-ac').length === 11`.

- [ ] **Step 3: Screenshots** of the cert library in both themes for the owner. Stop the server; delete any throwaway artifacts.

---

## Self-review (author)
- Spec coverage: cert library (CI1), account ent/er/confetti (CI2), My Certs modal + cross-cert (CI3), verification (CI4). All 4 spec surfaces + the discovered ent-glyph + My Certs covered. Intake pills excluded (text eyebrows). Cert app = Phase 2.
- Helper duplicated per JS file (account.js, auth.js, cross-cert-analytics.js) — matches existing cert-metadata duplication; avoids a shared-include load-order risk. `cg-ac`/`cg-sup` styled per-scope.
- Cache-bump flagged for the one dg-system.css change (CI3 Step 4).
- Ship order: CI1 is the visible win and self-contained (index.html + PNG delete) — can ship alone if desired.
- Out of scope: metadata de-duplication; styles.css; cert app.
