---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# Homepage Feature-Honesty Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the homepage honestly represent the quiz-only MVP — rebuild the `#proof-of-product` showcase around the real AI engine + 8 live certs, and scrub every claim for features that no longer exist.

**Architecture:** All edits are page-scoped in `landing/index.html` (scoped `.pp-*` `<style>` + markup) plus a small dead-code removal in `landing/script.js`. `styles.css` / `dg-system.css` untouched → no `?v=` bump. The section keeps `id="proof-of-product"`, its scoped CSS kit, and its IntersectionObserver reveal; only the per-cert tab model is replaced (the engine is uniform across certs) with one static feature grid + a cert-coverage chip strip.

**Tech Stack:** Static HTML/CSS/JS. Verify via grep + ecc Playwright MCP both themes.

**Source spec:** `docs/superpowers/specs/2026-06-01-homepage-feature-honesty-design.md`

**Skills applied (founder request):**
- **marketing-psychology** — lead with the real differentiator (the adaptive engine = Jobs-to-be-Done: "tell me what to study and when I'm ready"); use **8-cert breadth as an authority/competence signal**; free diagnostic CTA = reciprocity + zero-price + low activation energy; readiness score = the confidence payoff (ties to the live "Walk in knowing" hook).
- **stop-slop** — all copy below is active-voice, specific, em-dash-free, no rule-of-three padding, no "not X / but Y" contrasts, "you" voice.
- **ui-ux-pro-max** — `cursor-pointer` + non-layout-shifting hover; visible `:focus-visible`; alt/aria on icon SVGs; both-theme OKLCH contrast; 44px+ touch targets; no emoji.
- **emil-design-eng** — reuse the existing reveal stagger (40/110ms) + `.pp-feature/.pp-roster` entrance; `:active{scale(0.97)}` on the CTA; hover via color/bg only; transform+opacity; reduced-motion already handled by the scoped block.

**Brand constraints:** never edit `styles.css`; OKLCH tokens both themes; Fraunces + Inter; no em-dashes (`·`); no emoji decoration; one bronze fill per surface (the hero feature CTA is the focal bronze; cert chips + roster are hairline/tinted, not filled).

---

## File map

| File | Change |
|---|---|
| `landing/index.html` | Rebuild `#proof-of-product` (add `.pp-certs` scoped CSS; replace cert tabs + 4 panels with one feature grid + cert strip; reword 2 comment blocks). Scrub cert-desc + 2 comparison tables + 2 FAQs. |
| `landing/script.js` | Remove the now-dead `initProofOfProductPanel` IIFE (tabs/auto-rotate/cert-notify no longer exist). |

---

## Task 1: Rebuild the `#proof-of-product` showcase (index.html)

**Files:** Modify `landing/index.html` (comment blocks ~1364-1389; scoped CSS ~1449-1494; markup ~1603-1718)

- [ ] **Step 1: Baseline grep**

Run: `grep -cE "Topology Builder|Acronym Blitz|Packet Trace|Try the topology lab|data-pp-tab" landing/index.html`
Expected: non-zero (the old showcase is present).

- [ ] **Step 2: Reword the two stale comment blocks**

Replace the block from `<!-- ══════════════════════════════════════════` containing `PROOF OF PRODUCT — "What you'll actually use" panel (v4.92.0)` through the closing `══════════════════════════════════════════ -->` of the SECOND comment block (the one ending `#certs above + #why-ready below untouched.`) with this single block:

```html
<!-- ══════════════════════════════════════════
     PROOF OF PRODUCT v3 · "What you'll actually use".
     Honest rebuild: the engine is uniform across certs, so the old
     per-cert feature tabs are replaced by one feature grid (the AI
     question engine + a roster of real surfaces) and a cert-coverage
     chip strip (8 live + CCNA in development + PBQs coming soon).
     FULLY SCOPED under #proof-of-product (the id is the anchor +
     scoping root). Reuses production .pp-* class names so the scoped
     reset below still applies. The inline script only adds the .pp-in
     entrance trigger; the old script.js tab machine is removed.
     [data-theme="dark"] matches prod. #certs above + #why-ready below.
══════════════════════════════════════════ -->
```

- [ ] **Step 3: Add scoped CSS for the cert-coverage strip**

Find the `.pp-roster-foot` rule:
```
  #proof-of-product .pp-roster-foot{margin-top:auto;padding:16px 20px;border-top:1px solid var(--border);font-size:12.5px;color:var(--muted);line-height:1.5}
```
Insert immediately after it:
```css
  #proof-of-product .pp-certs{margin-top:clamp(20px,2.6vw,34px);border:1px solid var(--border);border-radius:20px;background:linear-gradient(180deg,var(--surface),var(--surface-2));padding:clamp(20px,2.4vw,28px)}
  #proof-of-product .pp-certs-h{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:15px}
  #proof-of-product .pp-cert-list{display:flex;flex-flow:row wrap;gap:9px}
  #proof-of-product .pp-cert-chip{display:inline-flex;flex-direction:row;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--ink-soft);background:var(--surface-2);border:1px solid var(--border);border-radius:999px;padding:8px 14px}
  #proof-of-product .pp-cert-chip .pp-cert-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);flex:none}
  #proof-of-product .pp-cert-chip.is-soon{color:var(--muted)}
  #proof-of-product .pp-cert-chip.is-soon .pp-cert-dot{background:none;border:1.5px solid var(--muted)}
  #proof-of-product .pp-certs-foot{margin-top:14px;font-size:12.5px;line-height:1.55;color:var(--muted)}
```

- [ ] **Step 4: Replace the `.pp-tabs` block (remove cert tabs)**

Replace:
```html
      <div class="pp-tabs pp-r" data-d="2" role="tablist" id="pp-tabs">
        <button class="pp-tab is-active" role="tab" data-pp-tab="netplus" aria-selected="true"><span class="pp-tab-dot live"></span>Network+</button>
        <button class="pp-tab" role="tab" data-pp-tab="secplus" aria-selected="false"><span class="pp-tab-dot active"></span>Security+</button>
        <button class="pp-tab is-soon" role="tab" data-pp-tab="az900" aria-selected="false"><span class="pp-tab-dot soon"></span>AZ-900</button>
        <button class="pp-tab is-soon" role="tab" data-pp-tab="ccna" aria-selected="false"><span class="pp-tab-dot soon"></span>CCNA</button>
      </div>
```
with: (nothing — delete the entire `.pp-tabs` block)

- [ ] **Step 5: Update the head sub-copy**

Replace:
```html
        <p class="pp-sub pp-r" data-d="2" id="pp-sub">These run in your browser, no signup. The same surfaces you'll drill with every day.</p>
```
with:
```html
        <p class="pp-sub pp-r" data-d="2" id="pp-sub">One adaptive question engine, the same across every cert we cover.</p>
```

- [ ] **Step 6: Replace all four `.pp-content` panels with one honest content block**

Replace the entire run of four panels — from `<!-- ── Network+ panel ── -->` / `<div class="pp-content is-active" data-pp-content="netplus">` through the closing `</div>` of the CCNA panel (`<!-- ── CCNA (in the forge) ── -->` ... its final `</div>`), i.e. everything between the (now-deleted) tabs and the `<script>` tag — with:

```html
    <div class="pp-content is-active">
      <div class="pp-grid">
        <div class="pp-feature">
          <div class="pp-screen">
            <svg viewBox="0 0 128 128" role="img" aria-label="AI question engine"><use href="#pp-ic-quiz"/></svg>
            <span class="pp-screen-pill is-live">Live</span>
          </div>
          <div class="pp-feature-body">
            <div class="pp-feature-label">The engine</div>
            <div class="pp-feature-name">AI questions that adapt to you</div>
            <p class="pp-feature-desc">Every session generates fresh questions across the full blueprint, each with an explanation that teaches the reasoning behind the right answer. The more you practise, the harder it leans on your weak spots.</p>
            <div class="pp-feature-foot">
              <span class="pp-foot-prose">Free covers 20 a day. Pro removes the cap.</span>
              <a class="pp-cta-btn" href="/diagnostic">Start the free diagnostic <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
        <div class="pp-roster">
          <div class="pp-roster-h">In every workspace</div>
          <div class="pp-row">
            <span class="pp-row-ic"><svg viewBox="0 0 128 128" role="img" aria-label="Readiness score"><use href="#pp-ic-brain"/></svg></span>
            <div class="pp-row-body">
              <div class="pp-row-name">Readiness score</div>
              <p class="pp-row-desc">One number tracks your coverage and accuracy across the blueprint. When it reads green, you book.</p>
            </div>
          </div>
          <div class="pp-row">
            <span class="pp-row-ic"><svg viewBox="0 0 128 128" role="img" aria-label="Exam simulator"><use href="#pp-ic-badge"/></svg></span>
            <div class="pp-row-body">
              <div class="pp-row-name">Full Exam Simulator <span class="pp-row-tag is-live">Pro</span></div>
              <p class="pp-row-desc">A 90-question, 90-minute exam scored 100-900, built to mirror the real CompTIA sitting.</p>
            </div>
          </div>
          <div class="pp-row">
            <span class="pp-row-ic"><svg viewBox="0 0 128 128" role="img" aria-label="Spaced repetition"><use href="#pp-ic-quiz"/></svg></span>
            <div class="pp-row-body">
              <div class="pp-row-name">Weak-spots + spaced repetition</div>
              <p class="pp-row-desc">Your weak objectives resurface on a spaced-repetition schedule until they hold.</p>
            </div>
          </div>
          <div class="pp-roster-foot">The diagnostic runs free in your browser, no signup.</div>
        </div>
      </div>

      <div class="pp-certs pp-r" data-d="2">
        <div class="pp-certs-h">Eight certs live, one engine</div>
        <div class="pp-cert-list">
          <span class="pp-cert-chip"><span class="pp-cert-dot"></span>Network+ (N10-009)</span>
          <span class="pp-cert-chip"><span class="pp-cert-dot"></span>Security+ (SY0-701)</span>
          <span class="pp-cert-chip"><span class="pp-cert-dot"></span>A+ Core 1</span>
          <span class="pp-cert-chip"><span class="pp-cert-dot"></span>A+ Core 2</span>
          <span class="pp-cert-chip"><span class="pp-cert-dot"></span>AZ-900</span>
          <span class="pp-cert-chip"><span class="pp-cert-dot"></span>AI-900</span>
          <span class="pp-cert-chip"><span class="pp-cert-dot"></span>SC-900</span>
          <span class="pp-cert-chip"><span class="pp-cert-dot"></span>CLF-C02</span>
          <span class="pp-cert-chip is-soon"><span class="pp-cert-dot"></span>CCNA · in development</span>
        </div>
        <p class="pp-certs-foot">Performance-based questions (CLI sim, topology builder, ACL builder) are coming to Pro.</p>
      </div>
    </div>
```

> Notes: `.pp-feature` and `.pp-roster` carry NO `.pp-r` class — they reveal via the dedicated `#proof-of-product.pp-in .pp-content.is-active .pp-feature/.pp-roster` rule (kept intact by keeping the `.pp-content.is-active` wrapper). `.pp-certs` reveals via the `.pp-r` rule. The `<svg><defs>` symbol block is left untouched (pp-ic-quiz / pp-ic-brain / pp-ic-badge are reused; pp-ic-tb / pp-ic-trace / pp-ic-fw / pp-ic-map become unused but harmless).

- [ ] **Step 7: Reword the inline-script comment**

In the section's inline `<script>`, replace the comment:
```
    /* Scoped entrance trigger ONLY. The production script.js
       initProofOfProductPanel owns the tab state machine + 6s auto-rotate
       + [data-cert-notify] wiring against the preserved .pp-tab /
       .pp-content / [data-cert-notify] hooks — this adds no tab JS so it
       cannot double-bind. script.js never touches .pp-in. */
```
with:
```
    /* Scoped entrance trigger ONLY: adds .pp-in when the section scrolls
       into view so the .pp-r / .pp-feature / .pp-roster reveals fire.
       The old script.js tab machine has been removed (no tabs remain). */
```

- [ ] **Step 8: Verify no live-feature lies remain in the section**

Run:
```bash
grep -nE "data-pp-tab|Try the topology lab|Try Acronym Blitz|being built|in the forge|pp-locked" landing/index.html
grep -nE "Eight certs live|AI questions that adapt|pp-certs" landing/index.html
```
Expected: first grep → no matches; second → matches present.

- [ ] **Step 9: Commit**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
git add landing/index.html
git commit -m "feat(landing): rebuild proof-of-product around the real engine + 8 live certs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Scrub cert-desc, comparison tables, and FAQs (index.html)

**Files:** Modify `landing/index.html` (~1177; comparison rows ~2358-2361, ~2423-2437; FAQs ~2390-2391, ~2451-2456)

- [ ] **Step 1: Fix the Network+ cert-desc**

Replace:
```html
        <div class="cert-desc">All five N10-009 domains. Hand-curated questions, an interactive topology lab, a packet-trace simulator, and an exam mode that mirrors the real 90-question test.</div>
```
with:
```html
        <div class="cert-desc">All five N10-009 domains. AI-generated questions with teaching explanations, a baseline diagnostic, and an exam mode that mirrors the real 90-question test.</div>
```

- [ ] **Step 2: Replace the vs-competitor PBQ row with a real differentiator**

Replace:
```html
            <div class="fqx-cmp-row">
              <div class="fqx-cmp-cell is-feat">Hands-on questions (PBQs)</div>
              <div class="fqx-cmp-cell is-them">Drag-and-drop, if anything</div>
              <div class="fqx-cmp-cell is-us">Real CLI sim, topology builder, ACL lab</div>
            </div>
```
with:
```html
            <div class="fqx-cmp-row">
              <div class="fqx-cmp-cell is-feat">Why each answer is right</div>
              <div class="fqx-cmp-cell is-them">Rarely explained</div>
              <div class="fqx-cmp-cell is-us">Every answer teaches the reasoning</div>
            </div>
```

- [ ] **Step 3: Remove the three fake Free/Pro feature rows and add a real one**

Replace:
```html
            <div class="fqx-cmp-row">
              <div class="fqx-cmp-cell is-feat">Drills (Acronym Blitz, Port Drill, OSI, Cable ID)</div>
              <div class="fqx-cmp-cell is-them">No</div>
              <div class="fqx-cmp-cell is-us">Yes</div>
            </div>
            <div class="fqx-cmp-row">
              <div class="fqx-cmp-cell is-feat">Subnet Trainer + Network Builder + ACL Lab</div>
              <div class="fqx-cmp-cell is-them">No</div>
              <div class="fqx-cmp-cell is-us">Yes</div>
            </div>
            <div class="fqx-cmp-row">
              <div class="fqx-cmp-cell is-feat">Sec+ flagships (IR War Room, Phishing Triage)</div>
              <div class="fqx-cmp-cell is-them">No</div>
              <div class="fqx-cmp-cell is-us">Yes</div>
            </div>
```
with:
```html
            <div class="fqx-cmp-row">
              <div class="fqx-cmp-cell is-feat">Full Exam Simulator (90Q)</div>
              <div class="fqx-cmp-cell is-them">No</div>
              <div class="fqx-cmp-cell is-us">Yes</div>
            </div>
```

- [ ] **Step 4: Rewrite the "study for free" FAQ second paragraph**

Replace:
```html
          <p>The drills and labs (Acronym Blitz, Subnet Trainer, the topology and ACL labs, the Sec+ war room and phishing simulator) are Pro: the heavier interactive bits, where the cost adds up. When 20 a day stops being enough, or you want unlimited drills, that's when most people upgrade.</p>
```
with:
```html
          <p>Unlimited questions, the Full Exam Simulator, and advanced analytics are Pro. When 20 a day stops being enough, or you want to sit full timed mock exams, that's when most people upgrade.</p>
```

- [ ] **Step 5: Reframe the PBQ FAQ to an honest roadmap**

Replace:
```html
          <p>PBQs are the hands-on parts of the exam: configuring a topology, typing CLI commands, sorting things into the right place. They're worth roughly 40% of your score, and most people fail because they didn't practise them. We bake them in with a real CLI sim, a topology builder, and an ACL lab, not a drag-and-drop pretending to be one. They sit in Pro because they're the heaviest features to run.</p>
```
with:
```html
          <p>PBQs are the hands-on parts of the exam: configuring a topology, typing CLI commands, sorting items into the right place. They're worth roughly 40% of your score. They're the next thing we're building, a CLI sim, a topology builder, and an ACL builder, all landing in Pro. For now, the question engine and its explanations cover the concepts each PBQ tests.</p>
```

- [ ] **Step 6: Verify the scrub**

Run:
```bash
grep -niE "topology lab|packet-trace|Acronym Blitz|Subnet Trainer|Network Builder|ACL Lab|War Room|Phishing Triage|Port Drill|OSI Sorter|Cable ID|Hand-curated" landing/index.html
```
Expected: no matches. (PBQ-as-roadmap text in the FAQ is allowed; it names CLI sim/topology builder/ACL builder only as "the next thing we're building".)

- [ ] **Step 7: Commit**

```bash
git add landing/index.html
git commit -m "feat(landing): scrub dead-feature claims from cert-desc, comparison, FAQs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Remove the dead tab machine (script.js)

**Files:** Modify `landing/script.js` (the `initProofOfProductPanel` IIFE, ~218-292)

- [ ] **Step 1: Read the IIFE bounds**

Read `landing/script.js` around lines 215-295 to find the exact start `(function initProofOfProductPanel() {` and its matching close `})();`.

- [ ] **Step 2: Remove the entire IIFE**

Delete the whole `(function initProofOfProductPanel() { ... })();` block (it owns the cert-tab state machine, 6s auto-rotate, and `[data-cert-notify]` wiring — all of which no longer exist after Task 1). Do not remove anything else. If there is a leading comment line directly introducing this IIFE, remove it too.

- [ ] **Step 3: Verify the file still parses and the hooks are gone**

Run:
```bash
node --check landing/script.js && echo "parses OK"
grep -nE "initProofOfProductPanel|data-pp-tab|pp-content" landing/script.js
```
Expected: `parses OK`; second grep → no matches.

- [ ] **Step 4: Commit**

```bash
git add landing/script.js
git commit -m "chore(landing): remove dead proof-of-product tab machine from script.js

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Verification — both themes + dead-feature sweep

**Files:** none (verification only). Coordinator runs this (views screenshots).

- [ ] **Step 1: Homepage-wide dead-feature sweep**

Run:
```bash
grep -rniE "topology builder|topology lab|3d explorer|packet trace|acronym blitz|subnet trainer|network builder|ACL lab|war room|phishing triage|port drill|OSI sorter|cable id|CLI sim|being built|in the forge|Try the topology|Try Acronym" landing/index.html
```
Expected: **no matches** (the only allowed survivors are the PBQ-roadmap FAQ naming "CLI sim, a topology builder, and an ACL builder" as coming, and the cert-strip foot naming them as "coming to Pro" — neither claims them as live).

- [ ] **Step 2: Start a local server**

`cd landing && python3 -m http.server 4178` (background).

- [ ] **Step 3: Both-theme Playwright on the homepage**

Via ecc Playwright MCP: load `http://localhost:4178/index.html`, set `localStorage.certanvil_theme` to `light` then `dark` (reload between), scroll to `#proof-of-product`. For each theme confirm: the rebuilt feature card + roster + cert strip render; the 8 cert chips show with a filled bronze dot and CCNA shows a hollow-dot "in development" chip; **no cert tabs, no "Try the topology lab", no "Acronym Blitz"**; the CTA has press feedback; 0 console errors (especially no error from the removed tab machine). Screenshot both themes.

- [ ] **Step 4: Rendered-DOM scan**

In the browser on `/index.html`, via `browser_evaluate`:
```javascript
({ deadClaims: /(topology builder|packet trace|acronym blitz|subnet trainer|war room|phishing triage|3d explorer)/i.test(document.body.innerText),
   tabsGone: document.querySelectorAll('.pp-tab[data-pp-tab]').length === 0,
   certChips: document.querySelectorAll('#proof-of-product .pp-cert-chip').length })
```
Expected: `deadClaims:false`, `tabsGone:true`, `certChips:9` (8 live + CCNA).

- [ ] **Step 5: Stop the server.**

---

## Self-review (author)

- **Spec coverage:** showcase rebuild (T1), cert-desc + comparison + FAQs (T2), script.js trim (T3), both-theme verification (T4), comment-block reword (T1 Step 2 + Step 7). PBQs kept only as "coming soon"; CCNA kept as one honest "in development" chip (no fake date/lab); all 8 live certs surfaced. Matches spec §3-§4.
- **Placeholder scan:** none.
- **Consistency:** `.pp-certs` / `.pp-cert-chip` / `.pp-cert-dot` / `.is-soon` class names used identically in CSS (T1 Step 3) and markup (T1 Step 6). `.pp-content.is-active` wrapper preserved so the existing reveal rule still fires. CTA `href="/diagnostic"` matches the live `#why-ready` CTA.
- **Skills:** copy ran through stop-slop (active, specific, no em-dash, no triads-as-padding); layout/motion reuse the emil-compliant `.pp-*` kit; a11y per ui-ux-pro-max (aria-label on icon SVGs, focus-visible inherited, 44px row icons, no emoji); positioning per marketing-psychology (engine + breadth + free-diagnostic CTA).
- **Out of scope:** no styles.css; no new features; the unused `pp-ic-*` symbols left in place (harmless); pre-existing em-dashes elsewhere in index.html remain a separate follow-up.
