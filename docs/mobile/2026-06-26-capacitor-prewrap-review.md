---
type: mobile
status: active
cert: all
updated: 2026-06-29
tags: [mobile]
---
# Capacitor pre-wrap review — iOS WKWebView vs desktop flow (2026-06-26)

**What this is:** an agent-council review of the iOS Capacitor WKWebView flow vs the real desktop web view, run before wrapping CertAnvil (static HTML/JS/CSS web app) as a native iOS app via Capacitor (bundle `com.certanvil.app`). **Review only — no fixes here. Fixes/features happen in a later session** (see the handoff).

**How it was produced:** council member (codex) inspected the repo + the `docs/mobile/*` docs; the external model spent its budget exploring and did not emit a clean final write-up, so this is the chair's synthesis grounded in the concrete code facts it surfaced + the existing mobile docs + Capacitor specifics. Treat the file/line citations as verified-from-source; treat the Capacitor config recommendations as "confirm against current Capacitor docs at build time."

---

## 🔴 #1 BLOCKER TO RESOLVE FIRST — the origin/auth/storage model

The app assumes it runs **on `certanvil.com`**. A Capacitor app defaults to a fake internal origin (`capacitor://localhost`). That single mismatch breaks three things at once:

1. **Login/session.** The Supabase session is stored in a **cookie scoped to `Domain=.certanvil.com`** (`lib/supabase.js`: `cookieDomain = '.certanvil.com'`, `document.cookie … ; Domain=.certanvil.com`, `authOptions.cookieOptions = { domain: '.certanvil.com' }`). On a `capacitor://localhost` origin that cookie write **fails** (wrong domain, not https) and silently falls back to localStorage — the cross-subdomain session model stops working as designed.
2. **Sign-in flow.** Sign-in **navigates the whole window to the website** (`app.js:8123` → `window.location.href = 'https://certanvil.com/?action=signin&return=…'`; also `app.js:5665` `window.buildSignInUrl()`). In a wrapped app that means "leave the app, load the website."
3. **Cert switcher + account menu.** Full navigations to `certanvil.com` subdomains: `auth-state.js:233` (`https://aplus.certanvil.com/?exam=…`), `auth-state.js:251` (`https://<targetHost>/`), and the account-dropdown links `auth-state.js:334/340/343/346/350` (`/account`, `/?modal=my-certs`, `/?modal=analytics`, `/`, `/admin`).

**The clean lever (decide this first):** Capacitor exposes `server.hostname` + `server.iosScheme` (and `server.url`). If the webview is configured to serve as **`https://certanvil.com`** (matching scheme + hostname), the origin *matches* and the cookie auth, cross-origin `certanvil.com/api/*` calls, and most of those navigations keep working largely as-is.

> **DECISION REQUIRED:** (A) configure Capacitor to run on the real `https://certanvil.com` origin (cheapest — reuses the existing cookie auth + API model), **vs** (B) re-architect auth for a native in-app flow (Supabase session stored in-webview, in-app OAuth via the native plugin, no cross-subdomain cookie). Everything below depends on this.

---

## 🟠 Other high-risk flow differences

- **Service worker.** `sw.js` does stale-while-revalidate + auto-reload-on-deploy. `docs/mobile/MOBILE_OPTIMIZATION_PLAN.md` §1B already flags it **CRITICAL** on iOS Safari (stale code, flaky `controllerchange`). In a native build the model is wrong — assets are bundled, updates ship via the App Store. **Likely action: disable/neuter the SW inside the Capacitor build.**
- **"Everything points to certanvil.com."** Beyond sign-in: Go-Pro CTAs (`index.html:1588/1610`, `app.js:611/682/837/939/4686` — also the 3.1.1 IAP issue tracked separately), the sidebar brand link (`app.js:19987`), the cert switcher, and the account menu. Each is seamless on desktop but a flow break in a wrapped app. **Action: audit each — keep in-app vs open external Safari deliberately.**
- **`navigator.share`** (`app.js:1326/1366`) — works in WKWebView but pops the native share sheet; confirm behaviour.
- **External-link policy.** Decide global rule for `target="_blank"` / `window.open` inside the webview (GitHub issue links, fonts, etc. — fonts are loaded from `fonts.googleapis.com`, fine; verify nothing critical depends on a popup).

---

## 🟢 Already covered (not starting cold)

`docs/mobile/*` already handles the Safari-rendering layer: SW deploy-propagation diagnosed (MOBILE_OPTIMIZATION_PLAN), 44pt touch targets + 16px inputs (no zoom) + `100dvh` + no-hover + standalone PWA in the baseline, WebKit Playwright testing, and `IPHONE_SMOKE.md` manual device walkthrough. The **gap** is the origin/auth/SW *architecture* above — those docs were about mobile **Safari**, not a **wrapped** app.

Strategic note already on record (`APP_STORE_DISTRIBUTION.md`): "ship App Store as a discovery + trust amplifier, NOT the primary purchase path; web pricing remains cheaper." Reinforces the **web-first** launch sequencing.

---

## Simulator-vs-real-device blind spots (the Simulator will NOT catch)

- **In-app purchases** — don't work in the Simulator; need a real device + sandbox Apple ID.
- **Push notifications, biometric/Face ID, camera** — not fully exercisable in the Simulator.
- **Real safe-area insets** — notch / Dynamic Island / home-indicator render differently on hardware.
- **Performance** — Simulator uses the Mac's power; a real iPhone on cellular is the honest test (`app.js` ~2MB).
- **Cookie/origin behaviour** — verify on a real device, not just the Simulator.

---

## Pre-wrap review checklist (for the fix session)

1. **Decide the Capacitor origin** (serve as `https://certanvil.com` vs native re-auth) — *everything hangs on this*.
2. Audit every `window.location.href = 'https://…certanvil.com'` + external `<a>`/`window.open` — keep in-app vs open Safari.
3. Decide SW behaviour in the native build (likely disable).
4. Confirm safe-area / keyboard / `100dvh` hold *inside WKWebView* (not just mobile Safari).
5. Pick the ≥1 native plugin for Guideline 4.2 (status bar / splash / push).
6. Plan real-device testing for IAP + push + safe areas (Simulator can't).

**Bottom line:** before wrapping, settle "what origin does the app run on" — it decides whether login, payments-routing, and cert-switching keep working or need rework. Everything else is smaller and well-scoped.
