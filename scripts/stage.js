#!/usr/bin/env node
// ══════════════════════════════════════════
// One-command staging: branch → commit → push → PR → preview deploy
//
// Usage:
//   npm run stage                          → auto-generates branch name
//   npm run stage -- "my feature desc"     → custom description
//   node scripts/stage.js "my feature"     → same
//
// What it does:
//   1. Creates a branch from current changes (staging/YYYY-MM-DD-description)
//   2. Stages & commits all changes
//   3. Pushes to remote
//   4. Opens a PR via GitHub API
//   5. CI runs tests → deploys preview → comments URL on PR
// ══════════════════════════════════════════

const { execSync } = require('child_process');
const https = require('https');

const desc = process.argv.slice(2).join(' ') || 'staging-preview';
const date = new Date().toISOString().slice(0, 10);
const slug = desc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const branch = `staging/${date}-${slug}`;

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts }).trim();
  } catch (e) {
    if (opts.safe) return '';
    console.error(`\x1b[31mFailed: ${cmd}\x1b[0m`);
    process.exit(1);
  }
}

function githubApi(method, path, body) {
  return new Promise((resolve, reject) => {
    // Get token from git credential
    const remote = run('git config --get remote.origin.url', { silent: true });
    const tokenMatch = remote.match(/https:\/\/([^@]+)@github\.com/);
    let token = '';
    if (tokenMatch) {
      token = tokenMatch[1];
    } else {
      // Try gh auth
      token = run('gh auth token 2>/dev/null || echo ""', { silent: true, safe: true });
    }

    if (!token) {
      reject(new Error('Could not find GitHub token. Set up git credentials.'));
      return;
    }

    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'networkplus-quiz-stage',
        'Accept': 'application/vnd.github.v3+json',
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 400) reject(new Error(json.message || `HTTP ${res.statusCode}`));
          else resolve(json);
        } catch { resolve(body); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log(`\n\x1b[1m🚀 Staging Pipeline\x1b[0m\n`);

  // Check for changes
  const status = run('git status --porcelain', { silent: true });
  if (!status) {
    console.log('\x1b[33mNo changes to stage. Make some changes first!\x1b[0m');
    process.exit(0);
  }

  // Get repo info
  const remote = run('git config --get remote.origin.url', { silent: true });
  const repoMatch = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (!repoMatch) { console.error('Could not detect GitHub repo'); process.exit(1); }
  const repo = repoMatch[1];

  // 1. Create branch
  console.log(`\x1b[36m1.\x1b[0m Creating branch: \x1b[1m${branch}\x1b[0m`);
  run(`git checkout -b ${branch}`);

  // 2. Stage & commit
  console.log(`\x1b[36m2.\x1b[0m Staging & committing changes`);
  run('git add -A');
  const commitMsg = `staging: ${desc}`;
  run(`git commit --no-verify -m "${commitMsg}"`);

  // 3. Push
  console.log(`\x1b[36m3.\x1b[0m Pushing to remote`);
  run(`git push -u origin ${branch}`);

  // 4. Open PR
  console.log(`\x1b[36m4.\x1b[0m Opening pull request`);
  try {
    const pr = await githubApi('POST', `/repos/${repo}/pulls`, {
      title: `[Preview] ${desc}`,
      body: `## Staging Preview\n\nThis PR was auto-created by \`npm run stage\`.\n\nCI will run tests and deploy a preview URL.\n\n---\n_Once reviewed, merge to deploy to production._`,
      head: branch,
      base: 'main',
    });
    console.log(`\n\x1b[32m\x1b[1m  ✓ PR created: ${pr.html_url}\x1b[0m`);
    console.log(`\n  CI is now running tests and deploying a preview.`);
    console.log(`  Watch it at: https://github.com/${repo}/actions\n`);
    console.log(`  Once you're happy with the preview:`);
    console.log(`    → Merge the PR to auto-deploy to production`);
    console.log(`    → Or close it to discard\n`);
  } catch (e) {
    console.log(`\x1b[33m  PR creation failed: ${e.message}\x1b[0m`);
    console.log(`  Branch pushed — create the PR manually at:`);
    console.log(`  https://github.com/${repo}/compare/main...${branch}\n`);
  }

  // Switch back to main
  console.log(`\x1b[36m5.\x1b[0m Switching back to main`);
  run('git checkout main');
  console.log(`\n\x1b[32mDone! You're back on main.\x1b[0m\n`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
