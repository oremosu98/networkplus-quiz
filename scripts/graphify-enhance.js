#!/usr/bin/env node
/**
 * graphify-enhance — post-build enrichment of the graphify code map.
 *
 * Runs AFTER `graphify .` (wired into .githooks/post-commit). Reads
 * graphify-out/graph.json and emits, all into the gitignored graphify-out/:
 *
 *   FRESHNESS.md            — two-clock freshness (structure vs labels vs HEAD)   [council #2]
 *   CHANGE_IMPACT.md        — what changed since the last build + who it affects  [council #3]
 *   graph-plus.html         — enhanced impact-explorer viewer (search/impact/URL)  [council #4]
 *   obsidian/_COMMUNITY_*.md — one navigable note per community                    [council #5]
 *   decision-links.json     — code↔decision bridge from `graphify:touches` docs    [council #5]
 *
 * Decision-link convention (in any docs/**.md or root *.md): add either
 *   frontmatter:  graphify:\n    touches: [getMilestones, evaluateMilestones]
 *   or inline:    <!-- graphify:touches getMilestones evaluateMilestones -->
 * and this script links that doc to those code nodes (Why panel + Obsidian backlinks).
 *
 * Pure Node, no deps. Reuses scripts/graphq.js as the graph engine. Never throws
 * into the hook — best-effort, logs and exits 0 on any single-section failure.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const gq = require('./graphq.js');

const REPO = (() => {
  try { return require('child_process').execSync('git rev-parse --show-toplevel').toString().trim(); }
  catch { return process.cwd(); }
})();
const OUT = path.join(REPO, 'graphify-out');
const OBS = path.join(OUT, 'obsidian');

function safe(label, fn) {
  try { fn(); } catch (e) { process.stderr.write(`graphify-enhance: ${label} failed — ${e.message}\n`); }
}
function write(rel, content) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

// ── decision links: scan docs for the graphify:touches convention ─────────────
function collectDocFiles(dir, acc) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'graphify-out') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) collectDocFiles(full, acc);
    else if (e.name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

function parseTouches(text) {
  const tokens = new Set();
  // inline:  <!-- graphify:touches a b c -->
  for (const m of text.matchAll(/<!--\s*graphify:touches\s+([^>]+?)\s*-->/gi)) {
    m[1].split(/[\s,]+/).filter(Boolean).forEach((t) => tokens.add(t));
  }
  // frontmatter:  graphify:\n  touches: [a, b]   OR   touches:\n    - a\n    - b
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    const block = fm[1];
    const inline = block.match(/touches:\s*\[([^\]]*)\]/i);
    if (inline) inline[1].split(/[\s,]+/).filter(Boolean).forEach((t) => tokens.add(t.replace(/['"]/g, '')));
    const listHdr = block.match(/touches:\s*\n((?:\s*-\s*.+\n?)+)/i);
    if (listHdr) for (const lm of listHdr[1].matchAll(/-\s*(.+)/g)) tokens.add(lm[1].trim().replace(/['"]/g, ''));
  }
  return [...tokens];
}

function buildDecisionLinks(idx) {
  const files = collectDocFiles(REPO, []);
  const byNode = new Map(); // nodeId -> [{title, path}]
  for (const f of files) {
    let text; try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (!/graphify:touches|graphify:\s*\n\s*touches/i.test(text)) continue;
    const tokens = parseTouches(text);
    if (!tokens.length) continue;
    const rel = path.relative(REPO, f);
    const title = (text.match(/^#\s+(.+)/m) || [, path.basename(f, '.md')])[1];
    for (const tok of tokens) {
      const m = gq.matchNodes(idx, tok);
      if (!m.length) continue;
      const id = m[0].id;
      if (!byNode.has(id)) byNode.set(id, []);
      if (!byNode.get(id).some((d) => d.path === rel)) byNode.get(id).push({ title, path: rel });
    }
  }
  return byNode;
}

// ── label persistence (durable names across structure rebuilds) ───────────────
// Every `graphify .` re-clusters and drops/genericizes community names. Without
// this, names vanish on every commit until a paid `graphify label` re-run. We cache
// each descriptive name BY NODE-ID (stable across re-clustering) and, after a rebuild,
// restore each community's name by majority vote of its members' remembered names.
// Net effect: names survive every commit with zero API calls; a keyed `graphify label`
// is only needed when genuinely new code forms a community with no cached members.
const LABEL_CACHE = path.join(OUT, '.graphq-label-cache.json');

function persistLabels(idx) {
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(LABEL_CACHE, 'utf8')); } catch { /* first run */ }

  // 1. LEARN — record any descriptive names currently in the graph, keyed by node id.
  let learned = 0;
  for (const n of idx.nodes) {
    if (!gq.isGenericName(n.community_name) && cache[n.id] !== n.community_name) {
      cache[n.id] = n.community_name; learned++;
    }
  }

  // 2. RESTORE — for each community still generic/blank, majority-vote a name from cache.
  let restored = 0, restoredComms = 0;
  for (const [, members] of idx.byCommunity) {
    if (members.some((m) => !gq.isGenericName(m.community_name))) continue; // already named
    const votes = new Map();
    for (const m of members) { const c = cache[m.id]; if (c) votes.set(c, (votes.get(c) || 0) + 1); }
    if (!votes.size) continue; // wholly new community — needs a keyed label run
    const winner = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    for (const m of members) { m.community_name = winner; restored++; }
    restoredComms++;
  }

  // 3. prune cache to live node ids, persist.
  const live = new Set(idx.nodes.map((n) => n.id));
  for (const k of Object.keys(cache)) if (!live.has(k)) delete cache[k];
  fs.writeFileSync(LABEL_CACHE, JSON.stringify(cache));

  // 4. if we restored any names, write them back into graph.json so `graphq` (which reads
  //    the file directly) sees them too. idx.nodes are the same objects as idx.raw.nodes.
  if (restored) fs.writeFileSync(idx.graphPath, JSON.stringify(idx.raw));
  return { learned, restored, restoredComms, cacheSize: Object.keys(cache).length };
}

// ── freshness (council #2) ────────────────────────────────────────────────────
function freshness(idx) {
  const head = gq.headCommit();
  const structure = idx.raw.built_at_commit || null;
  const labels = gq.readLabelsCommit(idx.graphPath);
  const eq = (a, b) => a && b && (a.startsWith(b) || b.startsWith(a));
  const structureStale = !!(head && structure && !eq(head, structure));
  // Labels judged by actual name presence (names auto-restore from cache after rebuilds).
  const unlabeled = idx.nodes.filter((n) => gq.isGenericName(n.community_name)).length;
  const unlabeledPct = Math.round((unlabeled / Math.max(1, idx.nodes.length)) * 100);
  const labelsStale = unlabeledPct > 10;
  return { head, structure, labels, structureStale, labelsStale, unlabeled, unlabeledPct };
}

function writeFreshness(f, lp) {
  const s = (c) => (c ? c.slice(0, 8) : '?');
  const lines = [
    '# Graphify Freshness',
    '',
    `> **Structure** (\`graph.json\`) rebuilds every commit (post-commit hook, free). **Labels** (community names) are now durable: descriptive names are cached per node-id and auto-restored after each rebuild — so a re-clustering can no longer wipe them. A keyed \`graphify label\` is only needed when NEW code forms a community with no cached members.`,
    '',
    `| Clock | State |`,
    '|---|---|',
    `| Structure (graph.json) | built \`${s(f.structure)}\` vs HEAD \`${s(f.head)}\` — ${f.structureStale ? '⚠️ STALE, run `graphify .`' : '✅ fresh'} |`,
    `| Labels (names) | ${f.unlabeledPct}% unlabeled — ${f.labelsStale ? '⚠️ needs a keyed `graphify label` pass' : '✅ named'} |`,
    `| Label cache | ${lp.cacheSize} names remembered${lp.restored ? ` · restored ${lp.restoredComms} communities (${lp.restored} nodes) this build` : ''} |`,
    '',
    f.labelsStale
      ? 'Some communities have no cached name (genuinely new code). **Refresh with a real key present:**\n```\nexport ANTHROPIC_API_KEY="sk-ant-…"   # must be set in THIS shell\ngraphify label . --backend claude --model claude-sonnet-4-6\n```\nWatch for "using Community N placeholders" — that means the key was NOT set.'
      : 'All communities are named (cache-restored where needed). No action required.',
    `\n_Generated ${new Date().toISOString().slice(0, 10)}._  ·  Check anytime: \`node scripts/graphq.js stale\``,
  ];
  write('FRESHNESS.md', lines.join('\n') + '\n');
}

// ── change-impact (council #3) ────────────────────────────────────────────────
const SNAP = path.join(OUT, '.graphq-snapshot.json');

function snapshot(idx) {
  const snap = {};
  for (const n of idx.nodes) {
    if (n.file_type !== 'code') continue;
    snap[n.id] = {
      label: n.label, file: n.source_file, loc: n.source_location,
      out: [...(idx.callsOut.get(n.id) || [])].sort(),
    };
  }
  return snap;
}

function writeChangeImpact(idx, f) {
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(SNAP, 'utf8')); } catch { /* first run */ }
  const cur = snapshot(idx);
  fs.writeFileSync(SNAP, JSON.stringify(cur));

  if (!prev) {
    write('CHANGE_IMPACT.md', `# Change Impact\n\n_Baseline snapshot established at \`${(f.head || '').slice(0, 8)}\`. The next commit will diff against this._\n`);
    return;
  }
  const added = [], removed = [], edgeChanged = [];
  for (const id of Object.keys(cur)) {
    if (!prev[id]) added.push(id);
    else if (JSON.stringify(prev[id].out) !== JSON.stringify(cur[id].out)) edgeChanged.push(id);
  }
  for (const id of Object.keys(prev)) if (!cur[id]) removed.push(id);

  const touched = [...new Set([...added, ...edgeChanged])];
  // affected upstream hubs across all touched nodes (depth 2), ranked by degree
  const affected = new Map();
  for (const id of touched) {
    for (const [up] of gq.walk(idx, id, 'in', 2)) {
      affected.set(up, (affected.get(up) || 0) + 1);
    }
  }
  const hubs = [...affected.keys()].map((id) => idx.byId.get(id)).filter(Boolean)
    .sort((a, b) => idx.degree(b.id) - idx.degree(a.id)).slice(0, 12);
  const tests = [...new Set(touched.concat([...affected.keys()])
    .map((id) => idx.byId.get(id)).filter((n) => n && gq.isTestNode(n)).map((n) => n.source_file))];

  const fmt = (id) => { const n = idx.byId.get(id) || prev[id]; return n ? `\`${n.label}\`  ${n.file || n.source_file}:${n.loc || n.source_location}` : id; };
  const L = [`# Change Impact`, '', `_Diff vs previous build. Generated for \`${(f.head || '').slice(0, 8)}\`._`, ''];
  if (!touched.length && !removed.length) L.push('No code-graph changes since the last build.');
  else {
    if (added.length) { L.push(`## ➕ Added symbols (${added.length})`); added.slice(0, 30).forEach((id) => L.push(`- ${fmt(id)}`)); L.push(''); }
    if (removed.length) { L.push(`## ➖ Removed symbols (${removed.length})`); removed.slice(0, 30).forEach((id) => L.push(`- ${fmt(id)}`)); L.push(''); }
    if (edgeChanged.length) { L.push(`## 🔀 Call-edges changed (${edgeChanged.length})`); edgeChanged.slice(0, 30).forEach((id) => L.push(`- ${fmt(id)}`)); L.push(''); }
    if (hubs.length) { L.push(`## 🎯 Affected upstream hubs (review these)`); hubs.forEach((n) => L.push(`- \`${n.label}\`  ${n.source_file}:${n.source_location} · deg ${idx.degree(n.id)}`)); L.push(''); }
    if (tests.length) L.push(`## 🧪 Suggested tests\n${tests.map((t) => `- ${t}`).join('\n')}`);
  }
  write('CHANGE_IMPACT.md', L.join('\n') + '\n');
}

// ── Obsidian community notes (council #5) ──────────────────────────────────────
function writeObsidianNotes(idx, decisions) {
  // clear stale notes
  try { for (const f of fs.readdirSync(OBS)) if (f.startsWith('_COMMUNITY_')) fs.unlinkSync(path.join(OBS, f)); } catch { /* none */ }
  const named = [...idx.byCommunity.entries()].filter(([, arr]) => arr.some((n) => n.community_name && n.community_name !== 'undefined'));
  for (const [cid, arr] of named) {
    const code = arr.filter((n) => n.file_type === 'code').sort((a, b) => idx.degree(b.id) - idx.degree(a.id));
    if (!code.length) continue;
    const name = gq.cname(code[0]);
    const files = [...new Set(code.map((n) => n.source_file))];
    const hubs = code.slice(0, 10);
    const relatedDocs = new Map();
    for (const n of code) for (const d of (decisions.get(n.id) || [])) relatedDocs.set(d.path, d.title);
    const safeName = name.replace(/[\/\\:]/g, '-');
    const L = [
      '---', 'type: code-map', `tags: [graphify, community]`, '---',
      `# ${name}`, '',
      `> Auto-generated code-map note (graphify community #${cid}). HOW the code runs; pair with the WHY notes below.`, '',
      `- **Symbols:** ${code.length}  ·  **Files:** ${files.length}`,
      `- **Open in viewer:** \`graphify-out/graph-plus.html#community=${cid}\``,
      `- **Query:** \`node scripts/graphq.js community ${cid}\``, '',
      `## Files`, ...files.map((f) => `- \`${f}\``), '',
      `## Top hubs`, ...hubs.map((n) => `- \`${n.label}\` — \`${n.source_file}:${n.source_location}\` · deg ${idx.degree(n.id)}`),
    ];
    if (relatedDocs.size) {
      L.push('', '## ⚖ Related decisions');
      for (const [p, t] of relatedDocs) L.push(`- [[${path.basename(p, '.md')}|${t}]]`);
    }
    write(path.join('obsidian', `_COMMUNITY_${safeName}.md`), L.join('\n') + '\n');
  }
  // index note
  const idxNote = ['---', 'type: code-map', 'tags: [graphify, moc]', '---', '# Code Map — Communities (graphify)', '',
    '> HOW the code runs, by community. Auto-generated. Pair with the decision vault for WHY.', '',
    ...named.map(([cid, arr]) => {
      const c = arr.find((n) => n.community_name && n.community_name !== 'undefined');
      return `- [[_COMMUNITY_${gq.cname(c).replace(/[\/\\:]/g, '-')}|${gq.cname(c)}]] (#${cid})`;
    })];
  write(path.join('obsidian', '_CODE_MAP.md'), idxNote.join('\n') + '\n');
}

// ── enhanced viewer (council #4) ──────────────────────────────────────────────
function buildViewerData(idx, f, decisions) {
  const codeNodes = idx.nodes.filter((n) => n.file_type === 'code');
  const indexOf = new Map(codeNodes.map((n, i) => [n.id, i]));
  const nodes = codeNodes.map((n) => ({
    id: n.id, label: n.label, file: n.source_file, loc: n.source_location,
    comm: n.community, cname: gq.cname(n), deg: idx.degree(n.id),
  }));
  const callsOut = codeNodes.map((n) => [...(idx.callsOut.get(n.id) || [])].map((id) => indexOf.get(id)).filter((x) => x != null));
  const callsIn = codeNodes.map((n) => [...(idx.callsIn.get(n.id) || [])].map((id) => indexOf.get(id)).filter((x) => x != null));
  const rationale = {};
  for (const [id, rats] of idx.rationaleFor) { const i = indexOf.get(id); if (i != null) rationale[i] = rats.map((r) => { const rn = idx.byId.get(r); return rn ? { label: rn.label, loc: `${rn.source_file}:${rn.source_location}` } : null; }).filter(Boolean); }
  const dec = {};
  for (const [id, docs] of decisions) { const i = indexOf.get(id); if (i != null) dec[i] = docs; }
  const comms = {};
  for (const n of nodes) { if (!comms[n.comm]) comms[n.comm] = { id: n.comm, name: n.cname, count: 0 }; comms[n.comm].count++; }
  return {
    meta: { head: (f.head || '').slice(0, 8), structure: (f.structure || '').slice(0, 8), labels: (f.labels || '').slice(0, 8), structureStale: f.structureStale, labelsStale: f.labelsStale, unlabeledPct: f.unlabeledPct, generated: new Date().toISOString().slice(0, 10) },
    nodes, callsOut, callsIn, rationale, decisions: dec, communities: Object.values(comms),
  };
}

function writeViewer(data) {
  write('graph-plus.html', VIEWER_HTML.replace('/*__DATA__*/', JSON.stringify(data)));
}

// ── main ──────────────────────────────────────────────────────────────────────
function main() {
  let idx;
  try { idx = gq.loadGraph(path.join(OUT, 'graph.json')); }
  catch (e) { process.stderr.write(`graphify-enhance: no graph to enhance (${e.message})\n`); process.exit(0); }
  fs.mkdirSync(OBS, { recursive: true });
  // Restore descriptive names BEFORE anything reads them (durable across rebuilds).
  let lp = { learned: 0, restored: 0, restoredComms: 0, cacheSize: 0 };
  safe('label-persistence', () => { lp = persistLabels(idx); });
  if (lp.restored) process.stderr.write(`graphify-enhance: restored ${lp.restoredComms} community name(s) from cache (${lp.restored} nodes)\n`);
  const f = freshness(idx);
  const decisions = buildDecisionLinks(idx);
  safe('freshness', () => writeFreshness(f, lp));
  safe('change-impact', () => writeChangeImpact(idx, f));
  safe('obsidian', () => writeObsidianNotes(idx, decisions));
  safe('decision-links', () => write('decision-links.json', JSON.stringify([...decisions], null, 2)));
  safe('viewer', () => writeViewer(buildViewerData(idx, f, decisions)));
  process.exit(0);
}

// ── viewer template (self-contained, no external libs) ────────────────────────
const VIEWER_HTML = String.raw`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>graph+ · code-map impact explorer</title>
<style>
:root{--bg:#0f1115;--panel:#171a21;--line:#262b35;--text:#e6e9ef;--muted:#8b93a3;--accent:#c9913f;--in:#5aa9e6;--out:#6fcf97;--warn:#e0654f}
*{box-sizing:border-box}body{margin:0;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--bg);color:var(--text)}
header{padding:10px 14px;border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:center;flex-wrap:wrap}
header h1{font-size:14px;margin:0;color:var(--accent);font-weight:600}
.badge{font-size:11px;padding:2px 7px;border-radius:10px;border:1px solid var(--line);color:var(--muted)}
.badge.warn{color:var(--warn);border-color:var(--warn)}
#search{flex:1;min-width:200px;background:var(--panel);border:1px solid var(--line);color:var(--text);padding:7px 10px;border-radius:7px;font:inherit}
main{display:grid;grid-template-columns:340px 1fr;height:calc(100vh - 49px)}
#list{overflow:auto;border-right:1px solid var(--line)}
.row{padding:7px 12px;border-bottom:1px solid var(--line);cursor:pointer}
.row:hover,.row.sel{background:var(--panel)}
.row .lab{color:var(--text)}.row .meta{color:var(--muted);font-size:11px}
#detail{overflow:auto;padding:16px;position:relative}
.tabs{display:flex;gap:4px;margin:10px 0;flex-wrap:wrap}
.tab{padding:4px 11px;border:1px solid var(--line);border-radius:7px;cursor:pointer;color:var(--muted);font-size:12px}
.tab.on{color:var(--accent);border-color:var(--accent)}
.depth{margin-left:auto;display:flex;gap:4px;align-items:center;color:var(--muted);font-size:12px}
.depth b{cursor:pointer;padding:2px 7px;border:1px solid var(--line);border-radius:6px}
.depth b.on{color:var(--accent);border-color:var(--accent)}
.item{padding:4px 0;border-bottom:1px solid var(--line)}
.item a{color:var(--in);text-decoration:none;cursor:pointer}.item .f{color:var(--muted);font-size:11px}
h2{font-size:16px;margin:0 0 2px}.loc{color:var(--muted);font-size:12px}
svg{width:100%;height:360px;background:var(--panel);border:1px solid var(--line);border-radius:8px;margin-top:8px}
.hint{color:var(--muted);font-size:12px;padding:24px}
text{font:10px ui-monospace,monospace}
kbd{background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:1px 5px;font-size:11px}
</style></head><body>
<header>
  <h1>graph+</h1>
  <input id="search" placeholder="Search functions / files / communities …  ( / to focus )" autocomplete="off">
  <span class="badge" id="b-head"></span><span class="badge" id="b-fresh"></span>
</header>
<main>
  <div id="list"></div>
  <div id="detail"><div class="hint">Pick a node, or jump via URL: <kbd>#node=app_getmilestones</kbd> · <kbd>#community=36</kbd> · <kbd>#impact=app_finish&depth=2</kbd> · <kbd>#file=app.js</kbd></div></div>
</main>
<script>
const D=/*__DATA__*/;
const idOf=new Map(D.nodes.map((n,i)=>[n.id,i]));
const $=s=>document.querySelector(s);
document.title='graph+ · '+D.nodes.length+' nodes';
$('#b-head').textContent='HEAD '+D.meta.head;
const fb=$('#b-fresh');
if(D.meta.labelsStale||D.meta.unlabeledPct>10){fb.className='badge warn';fb.textContent='labels stale ('+D.meta.unlabeledPct+'% unlabeled)';}
else fb.textContent='fresh';

let state={node:null,tab:'Overview',depth:1,query:'',community:null};

function score(n,q){const l=(n.label||'').toLowerCase(),id=n.id.toLowerCase(),f=(n.file||'').toLowerCase(),c=(n.cname||'').toLowerCase();
  if(l===q||id===q)return 0;if(l.startsWith(q)||id.startsWith(q))return 1;if(l.includes(q)||id.includes(q))return 2;if(f.includes(q)||c.includes(q))return 3;return 99;}
function search(q){q=q.trim().toLowerCase();
  let r=D.nodes.map((n,i)=>({n,i,s:q?score(n,q):(99-Math.min(n.deg,98))})).filter(x=>q?x.s<99:true);
  r.sort((a,b)=>a.s-b.s||b.n.deg-a.n.deg);return r.slice(0,200);}
function renderList(){let r;
  if(state.community!=null){r=D.nodes.map((n,i)=>({n,i})).filter(x=>x.n.comm===state.community).sort((a,b)=>b.n.deg-a.n.deg);}
  else r=search(state.query);
  $('#list').innerHTML=r.map(({n,i})=>'<div class="row'+(i===state.node?' sel':'')+'" data-i="'+i+'"><div class="lab">'+esc(n.label)+'</div><div class="meta">'+esc(n.file)+':'+n.loc+' · '+esc(n.cname)+' · deg '+n.deg+'</div></div>').join('')||'<div class="hint">no matches</div>';}
function esc(s){return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}

function neighbors(i,dir,depth){const map=dir==='in'?D.callsIn:D.callsOut;const seen=new Map();let fr=[i];
  for(let d=1;d<=depth;d++){const nx=[];for(const x of fr)for(const nb of (map[x]||[]))if(!seen.has(nb)&&nb!==i){seen.set(nb,d);nx.push(nb);}fr=nx;if(!fr.length)break;}return seen;}

function itemRow(j){const n=D.nodes[j];return '<div class="item"><a data-i="'+j+'">'+esc(n.label)+'</a> <span class="f">'+esc(n.file)+':'+n.loc+' · deg '+n.deg+'</span></div>';}

function renderDetail(){const i=state.node;if(i==null){return;}const n=D.nodes[i];
  const inN=(D.callsIn[i]||[]),outN=(D.callsOut[i]||[]);
  const tabs=['Overview','Callers','Callees','Impact','Why'];
  let body='';
  if(state.tab==='Overview'){body='<div class="item">Community: '+esc(n.cname)+' (#'+n.comm+')</div><div class="item">Degree: '+n.deg+' ('+inN.length+' in / '+outN.length+' out)</div>'+egoSVG(i);}
  else if(state.tab==='Callers'){body=inN.length?inN.map(itemRow).join(''):'<div class="hint">no callers (entry point)</div>';}
  else if(state.tab==='Callees'){body=outN.length?outN.map(itemRow).join(''):'<div class="hint">leaf — calls nothing</div>';}
  else if(state.tab==='Impact'){const m=neighbors(i,'in',state.depth);const rows=[...m.entries()].sort((a,b)=>a[1]-b[1]||D.nodes[b[0]].deg-D.nodes[a[0]].deg);
    body='<div class="hint">Editing <b>'+esc(n.label)+'</b> can affect '+rows.length+' upstream caller(s).</div>'+rows.map(([j,d])=>itemRow(j)).join('')+egoSVG(i);}
  else if(state.tab==='Why'){const rat=D.rationale[i]||[],dec=D.decisions[i]||[];
    body=(rat.length?'<h3>Rationale (code comments)</h3>'+rat.map(r=>'<div class="item">'+esc(r.label)+' <span class="f">'+esc(r.loc)+'</span></div>').join(''):'')
      +(dec.length?'<h3>Decisions (vault)</h3>'+dec.map(d=>'<div class="item">'+esc(d.title)+' <span class="f">'+esc(d.path)+'</span></div>').join(''):'')
      ||'<div class="hint">No linked rationale. Tag a decision doc with <kbd>&lt;!-- graphify:touches '+esc(n.id)+' --&gt;</kbd> to bridge it here.</div>';}
  $('#detail').innerHTML='<h2>'+esc(n.label)+'</h2><div class="loc">'+esc(n.file)+':'+n.loc+' · '+esc(n.id)+'</div>'
    +'<div class="tabs">'+tabs.map(t=>'<span class="tab'+(t===state.tab?' on':'')+'" data-tab="'+t+'">'+t+'</span>').join('')
    +(state.tab==='Impact'?'<span class="depth">depth '+[1,2,3].map(d=>'<b class="'+(d===state.depth?'on':'')+'" data-depth="'+d+'">'+d+'</b>').join('')+'</span>':'')
    +'</div>'+body;}

function egoSVG(i){const W=700,H=360,cx=W/2,cy=H/2;const inN=(D.callsIn[i]||[]).slice(0,10),outN=(D.callsOut[i]||[]).slice(0,10);
  const place=(arr,x)=>arr.map((j,k)=>({j,x,y:40+(H-80)*(arr.length>1?k/(arr.length-1):0.5)}));
  const L=place(inN,90),R=place(outN,W-90);let s='<svg viewBox="0 0 '+W+' '+H+'">';
  [...L,...R].forEach(p=>{const c=p.x<cx?'var(--in)':'var(--out)';s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+p.x+'" y2="'+p.y+'" stroke="'+c+'" stroke-opacity=".35"/>';});
  const dot=(x,y,lab,c,j)=>'<g style="cursor:pointer" data-i="'+(j==null?'':j)+'"><circle cx="'+x+'" cy="'+y+'" r="'+(j==null?9:5)+'" fill="'+c+'"/><text x="'+x+'" y="'+(y-9)+'" fill="var(--text)" text-anchor="middle">'+esc(lab.slice(0,18))+'</text></g>';
  L.forEach(p=>s+=dot(p.x,p.y,D.nodes[p.j].label,'var(--in)',p.j));
  R.forEach(p=>s+=dot(p.x,p.y,D.nodes[p.j].label,'var(--out)',p.j));
  s+=dot(cx,cy,D.nodes[i].label,'var(--accent)',null);
  s+='<text x="90" y="20" fill="var(--in)" text-anchor="middle">callers</text><text x="'+(W-90)+'" y="20" fill="var(--out)" text-anchor="middle">callees</text></svg>';return s;}

function select(i,push){state.node=i;if(state.tab==='Why'||state.tab==='Impact'){}renderList();renderDetail();
  if(push!==false)location.hash='node='+D.nodes[i].id;}
function go(){const h=decodeURIComponent(location.hash.slice(1));if(!h)return;
  const p=new URLSearchParams(h);
  if(p.has('node')){const i=idOf.get(p.get('node'));if(i!=null){state.tab='Overview';select(i,false);}}
  else if(p.has('impact')){const i=idOf.get(p.get('impact'));if(i!=null){state.tab='Impact';state.depth=+(p.get('depth')||1);select(i,false);}}
  else if(p.has('community')){const c=+p.get('community');state.community=c;state.query='';$('#search').value='#'+c;renderList();
    const first=D.nodes.findIndex(n=>n.comm===c);if(first>=0){state.tab='Overview';select(first,false);}}
  else if(p.has('file')){const f=p.get('file').toLowerCase();state.community=null;$('#search').value=f;state.query=f;renderList();}}

$('#search').addEventListener('input',e=>{state.community=null;state.query=e.target.value;renderList();});
document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement!==$('#search')){e.preventDefault();$('#search').focus();}if(e.key==='Escape')$('#search').blur();});
document.body.addEventListener('click',e=>{const r=e.target.closest('[data-i]');if(r&&r.dataset.i!==''){select(+r.dataset.i);return;}
  const t=e.target.closest('[data-tab]');if(t){state.tab=t.dataset.tab;renderDetail();return;}
  const d=e.target.closest('[data-depth]');if(d){state.depth=+d.dataset.depth;renderDetail();}});
window.addEventListener('hashchange',go);
renderList();go();
</script></body></html>`;

main();
