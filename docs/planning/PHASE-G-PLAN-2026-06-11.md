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
