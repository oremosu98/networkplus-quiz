# Phase G — Payments + Auth Expansion (the road to go-live)

**Decided by Simi, 2026-06-11 (end of the tier-logic day, v7.46.1).**
This is the complete remaining work list before iOS handover + go-live.
Forge has these as committed decisions; this doc is the executable plan.

## Decisions (locked)
1. **Apple in-app purchase (StoreKit) WILL be integrated in the iOS app** for Pro — not the web-only workaround.
2. **Sign in with Apple on all three platforms** (iOS app, Mobile Safari, desktop web). Account sync across platforms already exists via the shared Supabase account + cross-subdomain cookie — Apple/Google sign-in are additional doors into the same account, not a new sync system.
3. **Auth beyond Apple everywhere**: add **Google OAuth**; keep the existing **email magic link**. (Correction of record: current prod auth is magic-link only; "Google" was never built — the account page's Linked Accounts row is aspirational copy.)
4. Apple guideline 4.8 makes Sign in with Apple **mandatory** once Google login exists — Simi's instinct, now a compliance fact.
5. **Supersedes** the earlier locked design decision that the auth modal stays magic-link-only. The modal gains "Continue with Apple" / "Continue with Google" above the magic-link field. Retired consciously, not forgotten.
6. **Pro "unlimited" AI is backed by a soft fair-use cap — 150 AI actions/user/day** (down from the 500/day abuse ceiling), agreed 2026-06-14. Rationale: the 500/day limit guards against scripted abuse, not your own Anthropic bill. 150/day sits well above any real studier (heaviest genuine use ≈ 60–100/day ≈ up to ~6 mock exams or ~20 quizzes) while cutting worst-case per-user spend ~70%. It is a **soft** cap — a friendly "you've studied hard today, fresh questions unlock at midnight" message, never an error — and Pro is still marketed as "unlimited". Re-evaluate after the **20 June cost-measurement session**: raise it back up if heavy users prove cheap. An "AI action" = one AI call (quiz / drill / exam generation, or an answer explanation). The existing 200/hour ceiling becomes redundant under a 150/day cap.
7. **Price parity across web and iOS — $9.99/mo, $89/yr everywhere**, agreed 2026-06-14. Stripe (web) and StoreKit (iOS) charge the same sticker price; we absorb Apple's cut (15% small-business rate ≈ ~$8.50 net/mo on iOS) rather than charging iOS users more. Reason: one honest price builds trust and avoids juggling two price points, the margin hit is small at the 15% rate, and the cost side is already protected by the 150/day cap.
8. **Purchase-time "already Pro" double-check** on both Stripe and StoreKit "Subscribe" actions, agreed 2026-06-14. Before starting any payment, read the shared-account Pro flag; if the account is already Pro, show "You're already Pro ✓" instead of charging. Guards against accidental double-billing (e.g. web subscription + a second iOS subscription on the same account). Cheap to build because web and iOS are **one shared Supabase account** (decision 2) and login is a prerequisite to purchase — so the Pro flag is always readable at the moment of Subscribe, on either platform. This is in addition to the existing gates already hiding the upsell from Pro users.
9. **Email is the identity — same email = one account**, agreed 2026-06-14. When any login method (magic link / Google / Apple) presents an email already tied to an account, link it into that single account rather than creating a duplicate — so Pro status and study history never split across login methods. Safe to match by email here because all three methods deliver a *verified* email (magic link verifies inherently; Google and Apple return verified addresses). **Edge resolved in decision 10.**
10. **Apple "Hide My Email" — link primarily while logged in, manual merge fallback**, agreed 2026-06-14. The main path to add a second login method is from inside an already-signed-in session (link by current session, not by email matching), which lands on the correct account regardless of the relay address Apple returns. The rarer case — a fresh Apple-hidden sign-up by someone who *also* has a pre-existing magic-link account — is accepted as a rare split, handled by a manual "contact us to merge accounts" support path. Full auto-merge of every hidden-email case is **explicitly out of scope pre-launch** (rejected as overkill before there are users).

**Account-linking priority (reconciles decisions 9 & 10 — implement in this order):**
1. **Signed in + adds a method** → link by current session. (Always correct; the primary path.)
2. **Fresh sign-in whose verified *real* email matches an existing account** → link by email. (Convenience for the common case.)
3. **Neither** (e.g. Apple "Hide My Email", no active session) → may create a separate account → manual "merge accounts" on request.

So "email = identity" (decision 9) is the *user-facing principle*; the *implementation* tries session-link first, email-match second, manual-merge last.
11. **Apple App Store Server Notifications (V2) added to G-3**, agreed 2026-06-14. The iOS equivalent of the Stripe webhook: Apple pings our server on every renewal, cancellation, billing-retry/grace, and refund, so the shared Pro flag stays accurate for iPhone subscribers — not just at first purchase. Without it, an iOS user who cancels keeps Pro indefinitely and the "drop to Free on lapse" notice (TIER-LOGIC-SWEEP P1) cannot fire on iOS. Endpoint follows gated-lane rules (signature-verified, graceful-503 on missing env vars).
12. **"Restore Purchases" button in the iOS app**, agreed 2026-06-14. Hard Apple review requirement for any subscription app — its absence is a common rejection. Lets a user on a new device / fresh install re-activate Pro from Apple's record. Largely redundant with the shared-account login (re-logging in already restores Pro from the flag), but **required for App Store approval** and serves as the fallback when Apple's record and the Pro flag disagree. Lives in iOS Settings; part of G-3/G-4.
13. **No separate free trial — the existing Free tier IS the trial**, agreed 2026-06-14. The forever-free 15-questions/day tier already provides "try before you buy". A time-limited full-Pro trial is **rejected** because it would burn AI spend on non-payers and invite trial-farming (new account each week for free Pro) — the exact risk decisions 6–7 protect against. If a trial is ever revisited, it must be **card-required** (filters farmers, converts better) and only after real conversion data exists. A no-card free trial is explicitly off the table.

## Build order (agreed)
| # | Piece | Lane | Needs from Simi |
|---|---|---|---|
| G-1 | **Stripe** — checkout on certanvil.com, webhook → `tier='pro'` in Supabase (all v7.40–v7.46 gates already read this flag and light up automatically) | GATED (api/stripe, entitlements) | Stripe account + keys |
| G-2 | **Apple + Google sign-in** — Supabase Auth providers, auth modal + landing auth.js + iOS wrapper flow | GATED (auth-state.js, lib/supabase.js, landing auth) | Apple Developer portal: App ID + Services ID + key (guided session). Google Cloud Console: OAuth client (guided session) |
| G-3 | **StoreKit IAP** — App Store Connect subscription products, native purchase flow in the Capacitor wrapper, server receipt validation → same `tier='pro'` flag | GATED | App Store Connect: create Pro subscription products ($9.99/mo, $89/yr) |
| G-4 | **Launch flips** — `app_config.onboarding_enabled=true` SQL, store listing (screenshots/description/privacy), final simulator E2E (`npm run ios:real`), unpark P1–P3 (pro-expired notice, purchase wiring, plan switching — all unblocked once G-1/G-3 exist) | mixed | Listing copy approvals |

## Already-scheduled prerequisites (do NOT duplicate)
- **Sat 20 June 2026, 9:00** — scheduled task `certanvil-api-key-setup-day`: Anthropic workspace + $20/mo cap + API key → Vercel; paste `supabase/migrations/20260611_free_tier_15_questions.sql` in the SQL Editor; simulator E2E sign-off; read real per-session costs. Blocks App Store submission. The Apple Developer portal steps for G-2/G-3 can bundle into this same sitting.

## Context that makes this cheap
- Every tier gate shipped this week (daily-limit pre-block, Settings locks, cross-cert gate, log-result gate, hard Pro gates, the polished upsell modal) reads `tier` from `get_daily_quota_usage` / `profiles.role`. **G-1's webhook flipping that flag is the only thing between today's app and a working paid product.**
- Account deletion (Apple's #1 rejection reason) shipped in v7.45.0.
- The upsell modal (v7.46.1) already points at /pricing — G-1 makes that page real.

## House rules reminder for the G work
- All four G pieces are **gated lane** (PR + preview smoke + squash-merge): they touch api/stripe, auth files, entitlements.
- Migrations need `-- ROLLBACK:` blocks; endpoints must graceful-503 on missing env vars.
- The four polish passes apply to every user-facing surface (design-taste → emil → humanizer → **marketing-psychology** for upsell surfaces — Simi's updated rotation).

---

## Council review addendum (2026-06-26)

An agent-council critique of this plan + the G1 Stripe plan (`docs/superpowers/plans/2026-06-16-g1-stripe-entitlements.md`) surfaced two must-fix-before-launch gaps and a set of follow-ups. **Do when ready — all gated lane, blocked on the G0 Stripe setup (account/keys/webhook). Nothing here changes live behaviour today (the `subscriptions` table is empty; Stripe never activated).**

### Two P0 fixes — folded into G-1 (plan written, parked)
Both are captured in **`docs/superpowers/plans/2026-06-26-g1-hardening-webhook-and-multiprovider-schema.md`** and **supersede G1 Stripe Tasks 1–2's `subscriptions`-shaped webhook + schema.** When G-1 is built, build the hardening plan as its foundation, then continue G1 Tasks 3–5 (portal, client wiring, ship) unchanged.

1. **"Paid-but-no-Pro" webhook bug** — the webhook can mark an event handled *before* the entitlement write succeeds, permanently dropping a paid upgrade on a failed write + retry. Fix = one transactional Postgres RPC (`apply_provider_subscription_event`) that claims the event AND writes the entitlement together (all-or-nothing); failures commit nothing and Stripe retries. Bonus folded in: refund/chargeback → revoke, and an out-of-order-event guard.
2. **One-row Stripe-shaped entitlement table can't hold Apple** — replace `subscriptions` (one row/user, Stripe columns) with `provider_subscriptions` (one row per provider sub) + a rewritten `is_pro()` that aggregates across providers + a `user_entitlements` view. Apple-ready fields baked in (`original_transaction_id`, `environment`, `revoked_at`). Zero data migration (table is empty pre-launch).

**Can the foundation go in before Stripe?** The *database* half (table + `is_pro()` + RPC) is pure Postgres and could ship early, risk-free (everyone stays Free until a real payment writes in). The *webhook* half can be written but only works/tested once Stripe exists. Decision: **do the whole fix in one trip when Stripe G0 is done** — no benefit to splitting.

### Remaining follow-ups (the "attack the rest" batch — not yet planned)
- [x] **DRAFTED (G-3 plan): Purchase coordinator (App Store blocker).** Every in-app "Go Pro" CTA currently hardcodes a web pricing link (`app.js` ~611/682/939) — Apple Guideline 3.1.1 forbids that in a native app. Build ONE chokepoint behind `_gateProOnly()`: `web→Stripe`, `ios-native→IAP`, `already-Pro→"You're already Pro"`, `signed-out→sign-in`. G-1 should introduce the seam (web branch only) so G-3 *adds* the iOS branch instead of ripping out links. (Tracked task chip already filed.)
- [x] **DECIDED (2026-06-26): RevenueCat** — resolves the doc contradiction (this doc's "StoreKit + server receipt validation" vs the G1 doc's "RevenueCat"). G-3 implements Apple IAP **via RevenueCat as the managed layer** (StoreKit under the hood), not hand-rolled receipt validation. Rationale: solo-founder time >> the ~1% fee (which only applies past ~$2.5k/mo app-store revenue), and RevenueCat becomes the cross-store entitlement source of truth the new `provider_subscriptions` schema is built to receive (RevenueCat webhook → `apply_provider_subscription_event`). This refines decision 1 / build-order G-3.
- [x] **DRAFTED (ai-proxy plan): Server-side entitlement enforcement.** The AI proxy (`landing/api/ai`) must check `is_pro()` + the daily cap on every call — client gates (`_gateProOnly`, `_quotaState`) are UX only and bypassable. This is what actually protects the AI-cost margin (decisions 6–7).
- [ ] **Checkout-time "already Pro" guard (decision 8) — server-side.** `create-checkout-session` must call `is_pro()` before creating a session; it currently doesn't.
- [ ] **Restore Purchases hardening.** Server-validate the restore (never let the client grant Pro); add network-error / Ask-to-Buy / deferred states (the restore design spec admits these are missing).
- [x] **DRAFTED (account-merge plan): Account-merge support tooling before launch.** D10's manual-merge fallback is only safe with a lookup tool (by Apple `original_transaction_id` / Stripe customer / relay email) that can move entitlement + history. Doesn't exist yet.
- [ ] **Checkout→webhook race UX.** The single 2.5s retry on return-from-checkout can leave a just-paid user seeing "Free". Poll a few times or use a realtime subscription.
- [ ] **Unit-economics gate (business, not code).** Before locking iOS pricing: (a) confirm real heavy-user AI cost at the **20 June cost-measurement session**, and (b) confirm enrolment in **Apple's Small Business Program** — the 15% rate in decision 7 is NOT automatic; without it Apple takes 30% (≈ halves iOS margin).

### Status synthesis (2026-06-26) — the ball is in the founder's court, not in more planning

**Decided & captured (no further decisions needed):** the 2 P0 fixes (parked plan); iPhone payments = RevenueCat; free caps stay per-drill.

**Build-when-ready (no decisions left, just blocked on accounts existing):** purchase coordinator, server-side enforcement, already-Pro guard, restore hardening, account-merge tool, refund handling. Plans get written to sit on the shelf; they can't be *built/tested* until the founder-action items below exist.

**🔴 Founder-only actions that unblock everything (only Simi can do these):**
1. **Stripe setup** — account + 2 products ($9.99/mo, $89/yr) + webhook keys → unblocks the 2 P0 fixes + web payments (G-1).
2. **RevenueCat + App Store Connect** — RevenueCat account, App Store Connect subscription products, link the two, copy RC API keys → unblocks iPhone payments (G-3).
3. **20 June AI-cost measurement** — know the real per-user margin before locking price.
4. **Apple Small Business Program enrolment** — secures the 15% rate (else 30%, ≈ halves iOS margin).

**Shelf plans (written, parked, build when the accounts above exist):**
- `docs/superpowers/plans/2026-06-26-g1-hardening-webhook-and-multiprovider-schema.md` — the 2 P0 fixes (G-1 foundation): atomic webhook + multi-provider `provider_subscriptions`.
- `docs/superpowers/plans/2026-06-26-g2-apple-google-signin.md` — **G-2** Apple + Google sign-in (extends the landing-owned auth modal; account-linking priority; Apple 4.8 compliance). Note found during drafting: the quiz app has no modal of its own — it redirects to the `landing/` modal, which already ships a disabled "Continue with Google" button.
- `docs/superpowers/plans/2026-06-26-g3-ios-revenuecat-purchase-coordinator.md` — **G-3** iPhone payments via RevenueCat + the Go-Pro purchase coordinator that fixes the App Store 3.1.1 blocker.
- `docs/superpowers/plans/2026-06-26-ai-proxy-server-enforcement.md` — server-side AI quota/entitlement enforcement (the metered `/api/ai/generate` proxy + Pro 150/day soft cap). Note found during drafting: the client (`_claudeFetch`) already routes signed-in users to `/api/ai/generate`; the endpoint itself was never built.
- `docs/superpowers/plans/2026-06-26-account-merge-support-tool.md` — admin-only lookup + merge RPCs for the Apple Hide-My-Email split (the manual "contact us to merge" path).

### Launch sequencing — DECIDED (2026-06-26)

Build in **three stages** (this refines the G-1…G-4 build order; the iOS app is NOT first — it slots in the middle):

1. **Web Phase G (no iOS app needed).** G-1 Stripe web payments (built on the hardening foundation) + G-2 Apple/Google sign-in (web) + the AI-proxy server enforcement. **Outcome: a fully working PAID product on the web** — could launch here ("web-first"), Stripe-only, no Apple cut.
2. **Build the iOS app — the Capacitor wrapper.** A thin native WKWebView shell around the *existing* site (~half a day; `docs/mobile/APP_STORE_DISTRIBUTION.md` Phase B: `npx cap init CertAnvil com.certanvil.app`, icons/splash, wire ≥1 native plugin). **This wrapper IS the "iOS view" already previewed in the iOS Simulator** (the `npm run ios:real` / simulator workflow) — the simulator was already rendering this exact WKWebView. Building the wrapper just turns that previewed view into a real installable app and adds the native plugins (incl. RevenueCat). It is NOT a from-scratch native rebuild.
3. **iOS Phase G.** G-3 RevenueCat IAP + the Go-Pro coordinator's iOS branch + G-4 launch flips + App Store submission.

**Why this order:** the web half needs no iOS app at all; the Capacitor wrapper is a hard prerequisite ONLY for G-3 (you cannot add the RevenueCat plugin or test an Apple purchase without it). So the wrapper sits *after* web payments and *before* iPhone payments — never at the very start.
