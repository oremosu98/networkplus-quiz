# CertAnvil Landing — Setup notes

Solo-builder reference. Covers the two configurable surfaces: notify-me email integration (Resend) and the manual deploy command if you ever bypass the GitHub Actions auto-deploy.

---

## Email integration (Resend) — your action

The notify-me modal POSTs to `/api/notify` (a Vercel serverless function at `landing/api/notify.js`). Without env vars set, the endpoint accepts the signup, logs it to Vercel logs, and returns 200 — so signups are never lost. To send the actual confirmation email (and admin notification), configure Resend:

### Step 1 — Create a Resend account (~3 min)

1. Open https://resend.com → Sign up (free tier covers 3000 emails/month, more than enough for early launch)
2. Verify your account
3. Generate an API key:
   - Resend dashboard → **API Keys** → **Create API Key**
   - Permissions: **Full access**
   - Copy the key (starts with `re_...`) — this is the only time you'll see it

### Step 2 — Verify the sending domain (~5 min, one-time)

1. Resend dashboard → **Domains** → **Add Domain** → enter `certanvil.com`
2. Resend gives you 3 DNS records (TXT for SPF + DKIM, MX for return-path)
3. Add them at Hostinger DNS:
   - Type: **TXT** · Name: as Resend specifies (often `@`, `resend._domainkey`, `_dmarc`) · Value: as Resend specifies
   - Type: **MX** · Name: `send` (or as Resend specifies) · Value: as Resend specifies · Priority: 10
4. Resend will verify automatically (~5-15 min). Status changes to "Verified" once DNS resolves.
5. Once verified you can send FROM addresses on certanvil.com (e.g., `notify@certanvil.com`)

### Step 3 — Configure Vercel env vars (~1 min)

1. Vercel dashboard → **certanvil-landing** project → **Settings** → **Environment Variables**
2. Add three variables (Production environment):

| Key | Value |
|---|---|
| `RESEND_API_KEY` | `re_...` (from Step 1) |
| `NOTIFY_FROM_EMAIL` | `notify@certanvil.com` (or any verified sender) |
| `NOTIFY_ADMIN_EMAIL` | your personal email (where signup notifications go) |

3. Click **Save**
4. Redeploy: from `landing/` directory: `vercel --prod --yes` (or push to main and let GitHub Actions auto-deploy)

### Step 4 — Verify it works

1. Open https://certanvil.com → click any "Coming soon" cert → "Notify me" button
2. Submit your email
3. You should receive:
   - Confirmation email at the address you entered (subject: "You're on the list — [cert] alerts")
   - Admin notification at `NOTIFY_ADMIN_EMAIL` (subject: "New CertAnvil signup: [cert] ...")
4. If neither arrives within 2 minutes, check:
   - Vercel logs (project → **Logs**) for `[certanvil-notify]` entries
   - Resend dashboard → **Logs** for delivery status
   - Spam folder

---

## Manual deploy (when you bypass GitHub Actions)

The GitHub Actions workflow at `.github/workflows/deploy-landing.yml` auto-deploys `landing/` on every push to main that touches files in that directory. If you ever need to manually deploy:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz/landing"
vercel --prod --yes
```

This deploys whatever's in `landing/` on disk (uncommitted changes included) to the certanvil-landing Vercel project. Useful for hotfixes or testing changes without the CI cycle.

---

## Architecture quick reference

| File | Purpose |
|---|---|
| `landing/index.html` | Page markup with full meta tags, inline OG/Twitter tags, M14 logo SVG |
| `landing/styles.css` | Both light + dark themes via `[data-theme]` selectors |
| `landing/script.js` | Theme toggle, builder mode detection, notify modal handlers |
| `landing/favicon.svg` | Browser tab icon (M14 logo) |
| `landing/og-image.svg` | Open Graph image (1200×630) for social shares |
| `landing/api/notify.js` | Vercel Edge function — POST receives signups, sends Resend emails |
| `landing/vercel.json` | Disables build commands (static), sets security headers |

Vercel project ID: `prj_7GatDO51SK9QtDFekOAPe1XG6kGt` (`certanvil-landing`).

---

## What's in localStorage

Landing-specific keys (separate from cert-app keys which are `nplus_*`):

| Key | Purpose |
|---|---|
| `certanvil_theme` | `'light'` or `'dark'` — persists theme toggle preference |
| `certanvil_builder_mode` | `'true'` reveals Security+ tile + builder pill |
| `certanvil_notify_signups` | Local backup of notify-me signups in case API call failed |

To reset everything:
```js
localStorage.removeItem('certanvil_theme');
localStorage.removeItem('certanvil_builder_mode');
localStorage.removeItem('certanvil_notify_signups');
```

---

## Pricing reality (rough cost projection)

For early-launch / pre-revenue:
- **Hostinger domain renewal**: ~£17/year (`.com`) + ~£10/year (`.co.uk`) = **~£27/year**
- **Vercel Hobby plan**: free for personal projects, limits hit only if you exceed 100GB bandwidth or 6000 minutes of edge function execution per month
- **Resend free tier**: 3000 emails/month, 1 verified domain — enough for early launch
- **GitHub Actions**: free for public repos
- **Total recurring**: ~£27/year + £0 month-to-month

Upgrade triggers (when to switch to paid tiers):
- **Vercel Pro ($20/mo)**: when bandwidth hits 100GB/month (real traction signal)
- **Resend Pro ($20/mo)**: when emails exceed 3000/month or you need multiple domains
- **GitHub Pro**: only if repo goes private + you need org features

Don't pre-pay for tiers you don't need yet.
