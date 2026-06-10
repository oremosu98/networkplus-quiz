// Point the iOS wrap at the LIVE prod app (real auth, cloud sync, AI quizzes).
// Injects server.url into the GENERATED ios/App/App/capacitor.config.json
// (gitignored; rewritten by every `cap sync`), so the tracked
// capacitor.config.json keeps serving the bundled mockup demo by default.
// Use via `npm run ios:real` — it must run AFTER sync and BEFORE `cap run --no-sync`.
const fs = require('fs');
const p = 'ios/App/App/capacitor.config.json';
const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
cfg.server = { url: 'https://networkplus.certanvil.com' };
fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + '\n');
console.log('[ios:real] WKWebView now points at ' + cfg.server.url);
