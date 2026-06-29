---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# Pass-Guarantee Replacement + Site-Wide Scrub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage pass-guarantee section with the approved "Walk in knowing" efficacy/credibility/diagnostic hook stack, and scrub every remaining pass-guarantee reference across the landing site (marketing, a functional account.js flow, and the legal Terms + Privacy pages).

**Architecture:** All edits are page-scoped: HTML/copy + inline `<style>` blocks in `landing/`. `styles.css` and `dg-system.css` are NOT touched, so **no `?v=` cache-bump is needed**. The homepage section keeps its scoped `.pgx-*` classes and brand-illustrative SVG symbols; only the `#pass-guarantee` id (and the element's class) is renamed to `#why-ready` so styles.css's legacy `.pass-guarantee` green-shield rules stop applying and the literal token leaves the markup. Terms §05 is deleted and §06-16 renumber to §05-15 (the existing §06 Refunds already contains the 14-day money-back policy that pricing now promises; anchors are name-based so they survive).

**Tech Stack:** Static HTML/CSS/JS (no framework, no build). Verification via grep + ecc Playwright MCP (`mcp__plugin_ecc_playwright__*`) in both themes; fallback `python3 -m http.server` + throwaway screenshot script.

**Brand constraints (from `brand/BRAND.md`):** never edit `styles.css`; OKLCH tokens both themes; Fraunces (display) + Inter (UI); no em-dashes (use `·`); no emoji as decoration (the `🛡` must go); one bronze fill per surface (the new CTA is a ghost/outline button, not a second fill); system easing.

**Source spec:** `docs/superpowers/specs/2026-06-01-pass-guarantee-replacement-design.md`

---

## File map

| File | Change | Category |
|---|---|---|
| `landing/index.html` | Rename + rewrite `#pass-guarantee`→`#why-ready` section; fix 2 comparison rows + 1 FAQ; fix stale "saves about a third" | Marketing |
| `landing/diagnostic/results-core.js` | 2 Pro-pitch copy edits (shared by all 6 results pages) | Marketing |
| `landing/diagnostic/index.html` | Trust-row bullet swap | Marketing |
| `landing/account.html` | Section-sub copy: drop eligibility clause | Marketing |
| `landing/lib/account.js` | Remove eligibility banner + dead "Apply for Pass Guarantee" button | Functional |
| `landing/terms.html` | Delete §05, renumber §06-16→§05-15, TOC, inline refs, meta, acceptable-use | Legal |
| `landing/privacy.html` | Remove "Pass-guarantee extension timestamp" data bullet | Legal |
| `landing/pricing.html` | Add founder trust line (scoped CSS + markup) | Marketing |

> **No "Coming soon" pill change needed:** the Full Exam Simulator (90Q timed) is real and shipped (`app.js:6054` `startExam()`), so `landing/pricing.html:527` is accurate. PBQs already carry the pill correctly.

---

## Task 1: Homepage — replace `#pass-guarantee` with the `#why-ready` hook section

**Files:**
- Modify: `landing/index.html` (CSS ~1750-1834, markup 1838-1929)

- [ ] **Step 1: Verify the section currently exists (baseline grep)**

Run: `grep -c "pass-guarantee" landing/index.html`
Expected: a non-zero count (the section + comparison + FAQ tokens are present).

- [ ] **Step 2: Rename all scoped CSS selectors and comment refs**

In `landing/index.html`, replace **all** occurrences of the string `#pass-guarantee` with `#why-ready` (this hits only the scoped CSS selectors at ~1750-1834, the `::before/::after` reset, and the two hero/FAQ layout comments — none of the comparison-table or FAQ *text*, which use the words "Pass guarantee" without a `#`).

Use Edit with `replace_all: true`, `old_string: "#pass-guarantee"`, `new_string: "#why-ready"`.

- [ ] **Step 3: Add scoped CSS for the new ghost CTA**

After the `#why-ready .pgx-steps-foot svg{...}` rule (was line ~1810), add a new rule block. Find the existing line:

```
  #why-ready .pgx-steps-foot svg{width:16px;height:16px;flex:none;color:var(--accent)}
```

Insert immediately after it:

```css
  #why-ready .pgx-cta{display:inline-flex;align-items:center;gap:9px;margin-top:6px;padding:11px 18px;border-radius:10px;font-family:Inter,sans-serif;font-size:14px;font-weight:650;color:var(--accent);border:1px solid color-mix(in oklab,var(--accent) 30%,var(--border));background:color-mix(in oklab,var(--accent) 6%,transparent);text-decoration:none;transition:transform 150ms var(--eo),background 150ms var(--eo)}
  @media (hover:hover){#why-ready .pgx-cta:hover{background:color-mix(in oklab,var(--accent) 12%,transparent)}}
  #why-ready .pgx-cta:active{transform:scale(0.97)}
```

- [ ] **Step 4: Replace the section opening tag**

Replace:

```html
<section class="pass-guarantee" id="pass-guarantee">
```

with:

```html
<section class="why-ready" id="why-ready">
```

- [ ] **Step 5: Replace the section body (the `.pgx-wrap` block)**

Replace the entire block from `<div class="pgx-wrap">` (was line 1874) through its closing `</div>` before `<script>` (was line 1917) with:

```html
  <div class="pgx-wrap">
    <div class="pgx-promise">
      <span class="pgx-eyebrow pgx-r" data-d="1">Why CertAnvil</span>
      <h2 class="pgx-title pgx-r" data-d="1">Walk in knowing.<span class="pgx-em">Not hoping.</span></h2>
      <p class="pgx-prose pgx-r" data-d="2">Most people book the exam on a gut feeling. CertAnvil tracks every objective on the blueprint until it's closed, then gives you one honest readiness score. You sit the test when it reads green, not when nerves say maybe.</p>
      <p class="pgx-finer pgx-r" data-d="2">Built by someone who sat N10-009 and passed at 767/900, then built the prep they wish they'd had.</p>
      <a class="pgx-cta pgx-r" data-d="2" href="/diagnostic">Take the free baseline diagnostic <span aria-hidden="true">→</span></a>
    </div>

    <div class="pgx-steps pgx-r" data-d="3">
      <div class="pgx-steps-h">How readiness works <span>3 steps</span></div>

      <div class="pgx-step">
        <span class="pgx-step-n">1</span>
        <span class="pgx-step-ic"><svg viewBox="0 0 128 128"><use href="#pgx-ic-streak"/></svg></span>
        <div class="pgx-step-body">
          <div class="pgx-step-name">Diagnose</div>
          <p class="pgx-step-desc">A free baseline diagnostic maps your weak spots across the full exam blueprint.</p>
        </div>
      </div>

      <div class="pgx-step">
        <span class="pgx-step-n">2</span>
        <span class="pgx-step-ic"><svg viewBox="0 0 128 128"><use href="#pgx-ic-voucher"/></svg></span>
        <div class="pgx-step-body">
          <div class="pgx-step-name">Close the gaps</div>
          <p class="pgx-step-desc">Targeted questions and an AI teacher work each weak objective until it holds.</p>
        </div>
      </div>

      <div class="pgx-step">
        <span class="pgx-step-n">3</span>
        <span class="pgx-step-ic"><svg viewBox="0 0 128 128"><use href="#pgx-ic-promise"/></svg></span>
        <div class="pgx-step-body">
          <div class="pgx-step-name">Know you're ready</div>
          <p class="pgx-step-desc">One readiness score tracks coverage to green, including a full timed mock exam.</p>
        </div>
      </div>

      <div class="pgx-steps-foot">
        <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#pgx-ic-check"/></svg>
        No guesswork. The blueprint, closed.
      </div>
    </div>
  </div>
```

> Note: the `<svg ...><defs>...</defs></svg>` symbol block (was 1839-1872) is left untouched — the `#pgx-ic-*` symbols are reused. The `.pgx-em` italic-accent, `.pgx-r` reveal, and `data-d` stagger all still apply (their CSS was renamed in Step 2).

- [ ] **Step 6: Retarget the IntersectionObserver**

Replace:

```javascript
      var s=document.getElementById('pass-guarantee');
```

with:

```javascript
      var s=document.getElementById('why-ready');
```

- [ ] **Step 7: Verify no `#pass-guarantee` / section token remains**

Run: `grep -nE "id=\"pass-guarantee\"|#pass-guarantee|getElementById\('pass-guarantee'\)" landing/index.html`
Expected: no matches.

- [ ] **Step 8: Commit**

```bash
git add landing/index.html
git commit -m "feat(landing): replace pass-guarantee section with Walk-in-knowing readiness hook"
```

---

## Task 2: Homepage — comparison tables, guarantee FAQ, stale discount figure

**Files:**
- Modify: `landing/index.html` (rows ~2367-2371 and ~2438-2442; FAQ ~2459-2468; foot ~2444)

- [ ] **Step 1: Fix the vs-competitor "If you fail" row**

Replace:

```html
            <div class="fqx-cmp-row">
              <div class="fqx-cmp-cell is-feat">If you fail</div>
              <div class="fqx-cmp-cell is-them">Tough luck</div>
              <div class="fqx-cmp-cell is-us">We extend your Pro access until you pass</div>
            </div>
```

with:

```html
            <div class="fqx-cmp-row">
              <div class="fqx-cmp-cell is-feat">Know when you're ready</div>
              <div class="fqx-cmp-cell is-them">A pile of questions, no signal</div>
              <div class="fqx-cmp-cell is-us">A readiness score that tracks every objective to green</div>
            </div>
```

- [ ] **Step 2: Fix the Free/Pro "Pass guarantee" row**

Replace:

```html
            <div class="fqx-cmp-row">
              <div class="fqx-cmp-cell is-feat">Pass guarantee</div>
              <div class="fqx-cmp-cell is-them">No</div>
              <div class="fqx-cmp-cell is-us">Yes</div>
            </div>
```

with:

```html
            <div class="fqx-cmp-row">
              <div class="fqx-cmp-cell is-feat">Blueprint readiness score</div>
              <div class="fqx-cmp-cell is-them">Basic</div>
              <div class="fqx-cmp-cell is-us">Full, with trend + timed mock</div>
            </div>
```

- [ ] **Step 3: Fix the stale discount figure in the Free/Pro foot**

Replace:

```html
          <p class="fqx-a-foot">Pro is $9.99/mo or $89/yr (saves about a third) and covers every cert in the lineup, not just one.</p>
```

with:

```html
          <p class="fqx-a-foot">Pro is $9.99/mo or $89/yr (saves ~26%) and covers every cert in the lineup, not just one.</p>
```

- [ ] **Step 4: Replace the guarantee FAQ with a readiness FAQ**

Replace:

```html
      <details class="fqx-item">
        <summary class="fqx-q">
          <span class="fqx-q-ic"><img src="assets/faq/pass-guarantee-badge.svg" alt=""></span>
          <span class="fqx-q-t">How does the pass guarantee work?</span>
          <span class="fqx-q-tog" aria-hidden="true"></span>
        </summary>
        <div class="fqx-a">
          <p>If you're on Pro, put the work in (30+ days actively studying, mock exam done, streak going), and still fail on your first sit, we keep your Pro access on until you pass. Send us the Pearson VUE booking and your score report and we'll sort it within a week.</p>
        </div>
      </details>
```

with:

```html
      <details class="fqx-item">
        <summary class="fqx-q">
          <span class="fqx-q-ic"><img src="assets/faq/confidence-crown.svg" alt=""></span>
          <span class="fqx-q-t">How do I know when I'm actually ready for the exam?</span>
          <span class="fqx-q-tog" aria-hidden="true"></span>
        </summary>
        <div class="fqx-a">
          <p>Your readiness score tracks coverage and accuracy across every exam objective, including a full timed mock exam. When it reads green you've shown consistent mastery of the whole blueprint. That's your signal to book, instead of guessing. If Pro isn't right for you, there's a 14-day money-back guarantee.</p>
        </div>
      </details>
```

> The `pass-guarantee-badge.svg` icon is swapped for the existing `confidence-crown.svg` (already used elsewhere in the FAQ). The badge asset becomes orphaned; leave the file in place (harmless) or remove in a later cleanup.

- [ ] **Step 5: Verify the FAQ/table tokens are gone**

Run: `grep -niE "pass guarantee|until you pass|saves about a third|pass-guarantee-badge" landing/index.html`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add landing/index.html
git commit -m "feat(landing): reframe comparison rows + FAQ from pass-guarantee to readiness"
```

---

## Task 3: Diagnostic results Pro pitch (shared renderer)

**Files:**
- Modify: `landing/diagnostic/results-core.js` (`:410`, `:443`)

> This file is the shared renderer for all 6 diagnostic results pages — editing it once covers every cert.

- [ ] **Step 1: Fix the subscribe-CTA sub-line**

Replace:

```javascript
                '<span class="dr-cta-sub">Unlimited AI · all certs · pass guarantee · $9.99/mo or $89/yr</span>' +
```

with:

```javascript
                '<span class="dr-cta-sub">Unlimited AI · all certs · 14-day money-back · $9.99/mo or $89/yr</span>' +
```

- [ ] **Step 2: Fix the launch-stub prose**

Replace:

```javascript
            '<p><strong>Pro launches soon</strong> with unlimited AI question generation, every cert, a pass guarantee, and the full Exam Simulator + practice modes.</p>' +
```

with:

```javascript
            '<p><strong>Pro launches soon</strong> with unlimited AI question generation, every cert, the full Exam Simulator, and advanced readiness analytics.</p>' +
```

- [ ] **Step 3: Verify**

Run: `grep -ni "pass guarantee" landing/diagnostic/results-core.js`
Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add landing/diagnostic/results-core.js
git commit -m "feat(landing): scrub pass-guarantee from diagnostic results Pro pitch"
```

---

## Task 4: Diagnostic landing trust-row bullet

**Files:**
- Modify: `landing/diagnostic/index.html:182`

- [ ] **Step 1: Swap the bullet**

The trust row advertises the diagnostic's low friction (free, no account, no card). A money-back line is irrelevant here (nothing is purchased), so swap to an outcome bullet that matches the new readiness hook.

Replace:

```html
  <span>✓ Pass guarantee</span>
```

with:

```html
  <span>✓ Instant readiness score</span>
```

- [ ] **Step 2: Verify**

Run: `grep -ni "pass guarantee" landing/diagnostic/index.html`
Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add landing/diagnostic/index.html
git commit -m "feat(landing): swap diagnostic trust bullet from pass-guarantee to readiness score"
```

---

## Task 5: Account page section copy

**Files:**
- Modify: `landing/account.html:452`

- [ ] **Step 1: Drop the eligibility clause**

Replace:

```html
          <p class="section-sub">Track your attempts at the real CompTIA / vendor exams. Marking a result unlocks the Passed badge on your cert tile + powers Pass-Guarantee eligibility. Always editable.</p>
```

with:

```html
          <p class="section-sub">Track your attempts at the real CompTIA / vendor exams. Marking a result unlocks the Passed badge on your cert tile. Always editable.</p>
```

- [ ] **Step 2: Verify**

Run: `grep -ni "pass-guarantee\|pass guarantee" landing/account.html`
Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add landing/account.html
git commit -m "feat(landing): drop pass-guarantee eligibility from account exam-results copy"
```

---

## Task 6: Remove the functional "Apply for Pass Guarantee" flow (account.js)

**Files:**
- Modify: `landing/lib/account.js:571-575`

> This is the failed-attempt result modal. It currently shows a `🛡` eligibility banner and an "Apply for Pass Guarantee →" button that links to `/pricing.html#pass-guarantee` — a now-deleted anchor (dead link), promising the removed guarantee, and using a decorative emoji (brand violation). Remove the banner and the apply button; **keep** the "Keep practicing" close button so the modal still has its dismiss action.

- [ ] **Step 1: Excise the banner and apply button**

Replace:

```javascript
        + '<div class="att-encourage">🛡 You\'re eligible for the <strong>Pass Guarantee</strong>. Submit your booking confirmation + score report on the page below — we\'ll review your case within 7 days and extend your access until you pass.</div>'
        + '<div class="confetti-actions">'
        +   '<a class="confetti-btn confetti-btn-primary" href="/pricing.html#pass-guarantee?attempt=' + encodeURIComponent(certId) + '&score=' + result.score + '">Apply for Pass Guarantee →</a>'
        +   '<button class="confetti-btn confetti-btn-secondary" data-erm-close>Keep practicing</button>'
        + '</div>';
```

with:

```javascript
        + '<div class="confetti-actions">'
        +   '<button class="confetti-btn confetti-btn-primary" data-erm-close>Keep practicing</button>'
        + '</div>';
```

> The remaining "Keep practicing" button is promoted from secondary to primary since it's now the only action. `certId` may become unused in this branch — if a linter flags it, that's expected; leave other usages intact.

- [ ] **Step 2: Verify no pass-guarantee reference or stray emoji remains**

Run: `grep -nE "Pass Guarantee|pass-guarantee|🛡" landing/lib/account.js`
Expected: no matches.

- [ ] **Step 3: Sanity-check the template still balances**

Run: `node -e "require('fs').readFileSync('landing/lib/account.js','utf8')" && echo OK`
Expected: `OK` (file reads; no syntax-breaking edit). For a deeper check, load `landing/account.html` locally (Task 10) and confirm no console error when an attempt modal renders.

- [ ] **Step 4: Commit**

```bash
git add landing/lib/account.js
git commit -m "feat(landing): remove dead Apply-for-Pass-Guarantee flow from exam-result modal"
```

---

## Task 7: Legal — delete Terms §05, renumber §06-16 → §05-15

**Files:**
- Modify: `landing/terms.html` (meta `:10`, TOC `:257-272`, billing `:306`, §05 body `325-357`, headings + cross-refs `359-461`, acceptable-use clauses)

> The existing §06 Refunds (§6.1) already states the 14-day money-back policy that pricing promises, so §05 Pass guarantee is deleted and everything below shifts up by one. Section **ids** (`#refunds`, `#cancellation`, …) are name-based and stay; only displayed numbers (`§ NN`, TOC `N.`, subsection `N.N`, and inline `§ NN` references) change. Apply edits top-to-bottom.

- [ ] **Step 1: Meta description — drop "pass guarantee,"**

Replace (line 10):

```html
<meta name="description" content="CertAnvil Terms of Service. Eligibility, account, subscriptions, pass guarantee, refunds, acceptable use, AI-generated content, governing law.">
```

with:

```html
<meta name="description" content="CertAnvil Terms of Service. Eligibility, account, subscriptions, refunds, acceptable use, AI-generated content, governing law.">
```

- [ ] **Step 2: Intro lead-in — drop the pass-guarantee mention**

Find (the legal-sub intro, ~line 247) and remove the "pass-guarantee" reference:

Replace:

```html
  <p class="legal-sub">Plain-English contract between you and CertAnvil. What you can do with the product, what we promise, what happens if you cancel, refund + pass-guarantee details, and the legal framework at the bottom.</p>
```

with:

```html
  <p class="legal-sub">Plain-English contract between you and CertAnvil. What you can do with the product, what we promise, what happens if you cancel, refund details, and the legal framework at the bottom.</p>
```

- [ ] **Step 3: Rewrite the TOC (lines 257-272)**

Replace:

```html
    <li><a href="#agreement">1. Agreement</a></li>
    <li><a href="#eligibility">2. Eligibility</a></li>
    <li><a href="#account">3. Your account</a></li>
    <li><a href="#subscriptions">4. Subscriptions + pricing</a></li>
    <li><a href="#pass-guarantee">5. Pass guarantee</a></li>
    <li><a href="#refunds">6. Refunds</a></li>
    <li><a href="#cancellation">7. Cancellation</a></li>
    <li><a href="#acceptable-use">8. Acceptable use</a></li>
    <li><a href="#ip">9. Intellectual property</a></li>
    <li><a href="#ai-content">10. AI-generated content</a></li>
    <li><a href="#service">11. Service availability</a></li>
    <li><a href="#liability">12. Limitation of liability</a></li>
    <li><a href="#termination">13. Termination by us</a></li>
    <li><a href="#disputes">14. Disputes + governing law</a></li>
    <li><a href="#changes">15. Changes to these terms</a></li>
    <li><a href="#contact">16. Contact</a></li>
```

with:

```html
    <li><a href="#agreement">1. Agreement</a></li>
    <li><a href="#eligibility">2. Eligibility</a></li>
    <li><a href="#account">3. Your account</a></li>
    <li><a href="#subscriptions">4. Subscriptions + pricing</a></li>
    <li><a href="#refunds">5. Refunds</a></li>
    <li><a href="#cancellation">6. Cancellation</a></li>
    <li><a href="#acceptable-use">7. Acceptable use</a></li>
    <li><a href="#ip">8. Intellectual property</a></li>
    <li><a href="#ai-content">9. AI-generated content</a></li>
    <li><a href="#service">10. Service availability</a></li>
    <li><a href="#liability">11. Limitation of liability</a></li>
    <li><a href="#termination">12. Termination by us</a></li>
    <li><a href="#disputes">13. Disputes + governing law</a></li>
    <li><a href="#changes">14. Changes to these terms</a></li>
    <li><a href="#contact">15. Contact</a></li>
```

- [ ] **Step 4: Fix the §04 billing paragraph reference (line 306)**

Replace:

```html
<p>Pro unlocks unlimited AI question generation across all certs, the Exam Simulator (90-Q timed), every Pro-only drill, advanced analytics (Knowledge Constellation, weak-spots, readiness trends, retention coaching), and the Pass Guarantee described in <a href="#pass-guarantee">§ 05</a>. Two billing periods are available at checkout:</p>
```

with:

```html
<p>Pro unlocks unlimited AI question generation across all certs, the Exam Simulator (90-Q timed), every Pro-only drill, and advanced analytics (Knowledge Constellation, weak-spots, readiness trends, retention coaching). Refunds are covered in <a href="#refunds">§ 05</a>. Two billing periods are available at checkout:</p>
```

- [ ] **Step 5: Delete the entire §05 Pass guarantee section**

Delete lines 325-358 inclusive — the `<h2 id="pass-guarantee">…§ 05…Pass guarantee</h2>` heading through the closing `</ul>` of §5.4 and the blank line before §06. Concretely, remove this block:

```html
<h2 id="pass-guarantee"><span class="legal-h2-num">§ 05</span>Pass guarantee</h2>
<div class="legal-callout">
  <strong>What it is</strong>
  If you study with Pro, follow the Pass Plan, and fail your first attempt at the relevant CompTIA exam, we extend your Pro subscription so you can prepare for the retake without paying more.
</div>

<h3>5.1 · Who qualifies</h3>
<ul>
  <li>You held an <strong>active Pro subscription</strong> for at least 30 consecutive days before your exam date.</li>
  <li>You completed the <strong>Baseline Diagnostic</strong> at least once.</li>
  <li>You followed the Pass Plan with a documented study pattern — at least 60% of recommended sessions completed (visible on your readiness dashboard).</li>
  <li>You scored below the official CompTIA passing threshold (e.g. 720/900 for Network+ N10-009) on your <strong>first attempt</strong> of the relevant exam.</li>
</ul>

<h3>5.2 · What you get</h3>
<p>Your Pro subscription is extended by <strong>at least 60 days</strong> at no additional charge so you can prepare for the retake. The exact extension is set during manual review depending on how far you were from passing and how much active study time you had.</p>

<h3>5.3 · How to claim</h3>
<p>Email <a href="mailto:support@certanvil.com">support@certanvil.com</a> within <strong>30 days</strong> of your unsuccessful attempt with:</p>
<ul>
  <li>The email address on your CertAnvil account.</li>
  <li>A copy of your CompTIA score report (PDF or photo) showing your exam date, attempt number, and final score.</li>
  <li>The exam name and version (e.g. "Network+ N10-009").</li>
</ul>
<p>We review claims manually within 7 days of receipt. We don't penalise you for low effort — the eligibility bar is "you tried and it didn't work", not "you nailed every drill".</p>

<h3>5.4 · What's not covered</h3>
<ul>
  <li>Subsequent attempts (the guarantee covers the first attempt only — though we may extend again in genuine special circumstances at our discretion).</li>
  <li>Exams you didn't actually take. The official CompTIA score report is required.</li>
  <li>Fraudulent claims (fake score reports, multiple accounts). We reserve the right to refuse and terminate the account.</li>
  <li>Beta exams or exam codes other than the ones the Pass Plan was authored for. Currently supported: <strong>N10-009</strong> (Network+), <strong>SY0-701</strong> (Security+). More to come.</li>
</ul>

```

(Note: the §05 body also contains em-dashes — fine, it's being deleted wholesale.)

- [ ] **Step 6: Renumber §06 Refunds → §05 (heading + subsections + internal refs)**

Replace:

```html
<h2 id="refunds"><span class="legal-h2-num">§ 06</span>Refunds</h2>

<h3>6.1 · 14-day refund window for first-time subscribers</h3>
```

with:

```html
<h2 id="refunds"><span class="legal-h2-num">§ 05</span>Refunds</h2>

<h3>5.1 · 14-day refund window for first-time subscribers</h3>
```

Then replace:

```html
<h3>6.2 · Beyond 14 days</h3>
<p>After the initial 14-day window, refunds are issued only in genuine special circumstances (e.g. service unavailable for an extended period, billed for a plan you didn't request). Cancel anytime to stop future charges — see <a href="#cancellation">§ 07</a>.</p>

<h3>6.3 · UK + EU consumer rights</h3>
<p>If you're a consumer in the UK or EU, you have statutory rights to refunds and cancellation under your local consumer-protection law (UK Consumer Rights Act, EU Consumer Rights Directive). These statutory rights apply alongside § 06.1 and are not affected by it. Note that by starting to use a digital subscription within the 14-day cooling-off window, you typically waive the right to cancel under the EU CRD; § 06.1 above is more generous than that minimum and applies anyway.</p>
```

with:

```html
<h3>5.2 · Beyond 14 days</h3>
<p>After the initial 14-day window, refunds are issued only in genuine special circumstances (e.g. service unavailable for an extended period, billed for a plan you didn't request). Cancel anytime to stop future charges, see <a href="#cancellation">§ 06</a>.</p>

<h3>5.3 · UK + EU consumer rights</h3>
<p>If you're a consumer in the UK or EU, you have statutory rights to refunds and cancellation under your local consumer-protection law (UK Consumer Rights Act, EU Consumer Rights Directive). These statutory rights apply alongside § 05.1 and are not affected by it. Note that by starting to use a digital subscription within the 14-day cooling-off window, you typically waive the right to cancel under the EU CRD; § 05.1 above is more generous than that minimum and applies anyway.</p>
```

(The §6.2 em-dash before "see" is also fixed to a comma, per the no-em-dash rule.)

- [ ] **Step 7: Renumber §07 Cancellation → §06**

Replace:

```html
<h2 id="cancellation"><span class="legal-h2-num">§ 07</span>Cancellation</h2>

<h3>7.1 · Cancel subscription (keep account)</h3>
```

with:

```html
<h2 id="cancellation"><span class="legal-h2-num">§ 06</span>Cancellation</h2>

<h3>6.1 · Cancel subscription (keep account)</h3>
```

Then replace `<h3>7.2 · Delete account (everything goes)</h3>` with `<h3>6.2 · Delete account (everything goes)</h3>`.

- [ ] **Step 8: Renumber §08 Acceptable use → §07 and fix the fraud clause**

Replace `<h2 id="acceptable-use"><span class="legal-h2-num">§ 08</span>Acceptable use</h2>` with `<h2 id="acceptable-use"><span class="legal-h2-num">§ 07</span>Acceptable use</h2>`.

Then fix both fraud clauses. Replace:

```html
  <li>Submit fraudulent pass-guarantee claims.</li>
```

with:

```html
  <li>Submit fraudulent refund claims.</li>
```

And replace:

```html
  <li>Submit fraudulent pass-guarantee claims, chargebacks for legitimate charges, or fake billing disputes.</li>
```

with:

```html
  <li>Submit fraudulent refund claims, chargebacks for legitimate charges, or fake billing disputes.</li>
```

> If `§ 08` is referenced inline anywhere as a cross-ref, Step 11's grep will catch it. Also fix any `8.1 ·`/`8.2 ·` subsection headers under acceptable-use the same way (→ `7.1 ·`/`7.2 ·`) if present.

- [ ] **Step 9: Renumber the remaining headings §09-16 → §08-15**

Apply these exact replacements (heading text + id unchanged, number only):

```
§ 09 → § 08   (<h2 id="ip">…Intellectual property)
§ 10 → § 09   (<h2 id="ai-content">…AI-generated content)
§ 11 → § 10   (<h2 id="service">…Service availability)
§ 12 → § 11   (<h2 id="liability">…Limitation of liability)
§ 13 → § 12   (<h2 id="termination">…Termination by us)
§ 14 → § 13   (<h2 id="disputes">…Disputes + governing law)
§ 15 → § 14   (<h2 id="changes">…Changes to these terms)
§ 16 → § 15   (<h2 id="contact">…Contact)
```

For each, replace the `<span class="legal-h2-num">§ NN</span>` value in that specific `<h2>` line. Also renumber any `N.M ·` subsection `<h3>` headers within these sections to `(N-1).M ·` (e.g. a `9.1 ·` becomes `8.1 ·`). Read each section's `<h3>`s before editing to catch them all.

- [ ] **Step 10: Renumber any inline `§ NN` cross-references in the body**

Run: `grep -nE "§ (0[5-9]|1[0-6])" landing/terms.html`
For every match that is an *inline reference* (not the headings/subsections already fixed), decrement the number by one (e.g. a clause that says "subject to § 12" becomes "§ 11"). Headings/TOC are already correct from Steps 3-9. Apply an Edit per remaining inline ref.

- [ ] **Step 11: Verify section integrity**

Run:
```bash
echo "--- remaining pass-guarantee tokens (expect none) ---"
grep -niE "pass[ -]guarantee" landing/terms.html
echo "--- section headings (expect contiguous § 01..§ 15) ---"
grep -oE "legal-h2-num\">§ [0-9]+" landing/terms.html
echo "--- TOC numbers (expect 1..15) ---"
grep -oE "\">[0-9]+\. " landing/terms.html
```
Expected: no pass-guarantee matches; headings read § 01 through § 15 with no gap and no duplicate; TOC reads 1 through 15.

- [ ] **Step 12: Commit**

```bash
git add landing/terms.html
git commit -m "feat(legal): remove Terms pass-guarantee clause, renumber sections, refunds now §05"
```

---

## Task 8: Legal — remove the Privacy extension-timestamp field

**Files:**
- Modify: `landing/privacy.html:302`

> The "Pass-guarantee extension timestamp" field no longer exists after Task 6 removes the flow, so the disclosure bullet is removed.

- [ ] **Step 1: Delete the bullet**

Replace:

```html
  <li><strong>Current period end</strong> — when your current billing window expires (used to surface "renews on" dates).</li>
  <li><strong>Pass-guarantee extension timestamp</strong> — set manually if you successfully claim a pass-guarantee extension.</li>
</ul>
```

with:

```html
  <li><strong>Current period end</strong> — when your current billing window expires (used to surface "renews on" dates).</li>
</ul>
```

- [ ] **Step 2: Verify**

Run: `grep -ni "pass-guarantee\|pass guarantee" landing/privacy.html`
Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add landing/privacy.html
git commit -m "feat(legal): remove pass-guarantee extension field from privacy policy"
```

---

## Task 9: Pricing — add the founder trust line

**Files:**
- Modify: `landing/pricing.html` (scoped `<style>` in `#pricing-v2` block; markup after `.pp-pro-foot` ~line 537)

> Adds hook #2 (anonymous founder credibility) as the pricing trust element, beneath the existing money-back line. Money-back line and the voucher value-anchor stay unchanged.

- [ ] **Step 1: Add a scoped style for the trust line**

In the `#pricing-v2` scoped `<style>` block, find the `.pp-pro-foot` rule (search for `#pricing-v2 .pp-pro-foot`) and add immediately after it:

```css
  #pricing-v2 .pp-pro-built{margin:10px 0 0;font-family:Inter,sans-serif;font-size:12.5px;line-height:1.5;color:var(--muted);text-align:center}
```

> If `.pp-pro-foot` has no standalone rule (it's only inline), instead place this rule next to the other `#pricing-v2 .pp-*` foot rules. The selector must stay `#pricing-v2`-scoped.

- [ ] **Step 2: Add the markup after the money-back foot**

Replace:

```html
        <div class="pp-pro-foot">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>
          <span>14-day money-back · cancel anytime.</span>
        </div>
      </div>
```

with:

```html
        <div class="pp-pro-foot">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>
          <span>14-day money-back · cancel anytime.</span>
        </div>
        <p class="pp-pro-built">Built by someone who sat N10-009 and passed (767/900).</p>
      </div>
```

- [ ] **Step 3: Verify markup present, no token regressions**

Run: `grep -n "pp-pro-built" landing/pricing.html` (expect 2 matches: the CSS rule + the markup) and `grep -ni "pass guarantee" landing/pricing.html` (expect none).

- [ ] **Step 4: Commit**

```bash
git add landing/pricing.html
git commit -m "feat(landing): add anonymous founder trust line to pricing Pro card"
```

---

## Task 10: Verification — token sweep + both-theme visual check

**Files:** none (verification only)

- [ ] **Step 1: Full landing-wide residual token sweep**

Run:
```bash
grep -rniE "pass[ -]guarantee|until you pass|🛡|saves about a third" landing/ --include="*.html" --include="*.js" | grep -v node_modules
```
Expected: **no matches.** (If `assets/faq/pass-guarantee-badge.svg` shows as a filename match anywhere it's still referenced, trace and remove that reference.)

- [ ] **Step 2: Start a local server**

Run: `cd landing && python3 -m http.server 4178` (background). Base URL `http://localhost:4178`.

- [ ] **Step 3: Both-theme visual check via ecc Playwright MCP**

For each surface below, load it, set theme, snapshot, and screenshot in **both** light and dark (set `localStorage.certanvil_theme` to `light` then `dark`, reload between). Use `mcp__plugin_ecc_playwright__browser_navigate` / `browser_evaluate` / `browser_take_screenshot` / `browser_console_messages`.

Surfaces:
- `/index.html` — the new `#why-ready` section (headline, founder line, ghost CTA, 3 steps, reveal animation fires on scroll) + the two reframed comparison rows + the readiness FAQ
- `/pricing.html` — the new `.pp-pro-built` founder line under money-back
- `/diagnostic/index.html` — the swapped trust bullet
- `/diagnostic/network-plus/results.html` (or any one results page) — Pro pitch copy
- `/account.html` — section copy (no eligibility clause)
- `/terms.html` — §05 is now Refunds; headings contiguous; TOC matches
- `/privacy.html` — no extension-timestamp bullet

For each: confirm **zero console errors**, correct OKLCH theming in both modes, no layout breakage, the ghost CTA is the only non-fill accent action on the homepage section (no second bronze fill).

> If the ecc Playwright MCP is unavailable, fall back to a throwaway `scripts/_verify-pages.cjs` using the project's `require('playwright')` `chromium.launch()` → screenshot PNG → view with Read (`export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`). Set theme via `addInitScript`. Delete the throwaway script + PNGs after.

- [ ] **Step 4: Rendered-DOM regex scan**

In the browser, on `/index.html`, `/pricing.html`, `/terms.html`, run via `browser_evaluate`:
```javascript
/pass[\s-]?guarantee/i.test(document.body.innerText)
```
Expected: `false` on every page.

- [ ] **Step 5: Stop the server**

Stop the background `http.server`.

---

## Self-review notes (author)

- **Spec coverage:** every spec §3 surface maps to a task — homepage section (T1), comparison+FAQ (T2), results-core.js (T3), diagnostic bullet (T4), account.html (T5), account.js functional (T6), terms §05 + meta + acceptable-use (T7), privacy (T8), pricing trust line (T9), MVP-accuracy (resolved in plan header — no pill change), verification both themes (T10). Founder anonymity + 767/900 reveal honored in T1 + T9. Money-back-already-covers-risk-reversal honored (no new guarantee added).
- **Bonus fixes folded in:** stale "saves about a third" → "saves ~26%" (T2 Step 3); two em-dashes in the retained Terms refund/cancellation copy fixed to commas (T7 Steps 6).
- **Out of scope (flag to founder, not in this plan):** the homepage still claims PBQs exist as present-tense features in the vs-competitor PBQ row (`:2360`) and the PBQ FAQ (`:2455` "we bake them in with a real CLI sim…"), while pricing marks PBQs "Coming soon." That's a separate MVP-accuracy inconsistency, not a pass-guarantee issue — worth a follow-up pass.
- **Ship:** deferred to founder (separate decision). Landing is fast-lane; `dg-system.css` untouched ⇒ no `?v=` bump.
