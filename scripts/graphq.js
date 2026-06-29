#!/usr/bin/env node
/**
 * graphq — query the graphify code map (graphify-out/graph.json) from the CLI.
 *
 * The point: answer "where do I go next / what does editing X affect" faster and
 * far cheaper (token-wise) than reading the ~19K-line app.js. Consult this BEFORE
 * grepping app.js. No dependencies — pure Node over the node-link JSON graphify emits.
 *
 * Usage:
 *   node scripts/graphq.js find <query>              # fuzzy-match nodes
 *   node scripts/graphq.js inspect <query>           # full panel for best match
 *   node scripts/graphq.js callers <query> [--depth N]
 *   node scripts/graphq.js callees <query> [--depth N]
 *   node scripts/graphq.js impact  <query> [--depth N]   # transitive upstream — what breaks if you change it
 *   node scripts/graphq.js community <name|id>       # list a community's nodes + hubs
 *   node scripts/graphq.js file <path>               # symbols defined in a file
 *   node scripts/graphq.js path <a> <b>              # shortest call path a → b
 *   node scripts/graphq.js stale                     # freshness check (exit 1 if stale)
 *
 * Flags: --json (machine output) · --depth N · --graph <path to graph.json> · --limit N
 *
 * graph.json schema (graphify):
 *   node: { id, label, norm_label, file_type(code|rationale), source_file, source_location(Lnn),
 *           community(int), community_name }
 *   link: { source, target, relation(contains|calls|rationale_for), confidence, confidence_score,
 *           weight, source_file, source_location }
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── arg parsing ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { _: [], json: false, depth: null, limit: null, graph: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a === '--depth') out.depth = parseInt(argv[++i], 10);
    else if (a === '--limit') out.limit = parseInt(argv[++i], 10);
    else if (a === '--graph') out.graph = argv[++i];
    else out._.push(a);
  }
  return out;
}

// ── graph loading ────────────────────────────────────────────────────────────
function findGraphPath(explicit) {
  if (explicit) return path.resolve(explicit);
  if (process.env.GRAPHIFY_GRAPH) return path.resolve(process.env.GRAPHIFY_GRAPH);
  // Walk up from cwd, then from this script, looking for graphify-out/graph.json.
  const starts = [process.cwd(), __dirname];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      const cand = path.join(dir, 'graphify-out', 'graph.json');
      if (fs.existsSync(cand)) return cand;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

function loadGraph(explicit) {
  const gp = findGraphPath(explicit);
  if (!gp) {
    fail('graph.json not found. Run `graphify .` to build the code map, or pass --graph <path>.');
  }
  let raw;
  try { raw = JSON.parse(fs.readFileSync(gp, 'utf8')); }
  catch (e) { fail(`could not parse ${gp}: ${e.message}`); }
  return buildIndex(raw, gp);
}

// ── index ────────────────────────────────────────────────────────────────────
function buildIndex(g, graphPath) {
  const nodes = g.nodes || [];
  const links = g.links || [];
  const byId = new Map();
  for (const n of nodes) byId.set(n.id, n);

  const callsOut = new Map();   // id -> Set(callee ids)
  const callsIn = new Map();    // id -> Set(caller ids)
  const containsParent = new Map(); // symbol id -> file node id
  const rationaleFor = new Map();   // code id -> [rationale node ids]
  const add = (m, k, v) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(v); };

  for (const l of links) {
    if (!byId.has(l.source) || !byId.has(l.target)) continue;
    if (l.relation === 'calls') {
      add(callsOut, l.source, l.target);
      add(callsIn, l.target, l.source);
    } else if (l.relation === 'contains') {
      containsParent.set(l.target, l.source);
    } else if (l.relation === 'rationale_for') {
      if (!rationaleFor.has(l.target)) rationaleFor.set(l.target, []);
      rationaleFor.get(l.target).push(l.source);
    }
  }

  const byCommunity = new Map();
  const byFile = new Map();
  for (const n of nodes) {
    if (!byCommunity.has(n.community)) byCommunity.set(n.community, []);
    byCommunity.get(n.community).push(n);
    if (!byFile.has(n.source_file)) byFile.set(n.source_file, []);
    byFile.get(n.source_file).push(n);
  }

  const degree = (id) => (callsIn.get(id)?.size || 0) + (callsOut.get(id)?.size || 0);

  return {
    raw: g, graphPath, nodes, links, byId, callsOut, callsIn,
    containsParent, rationaleFor, byCommunity, byFile, degree,
  };
}

// ── resolution: query token → node(s) ────────────────────────────────────────
const TEST_RE = /(^|\/)tests?\//i;
const isTestNode = (n) => !!n && (TEST_RE.test(n.source_file || '') || /\.(test|spec)\./i.test(n.source_file || '') || /\buat\b/i.test(n.source_file || ''));

function norm(s) { return String(s || '').toLowerCase().replace(/\(\)$/, '').trim(); }

function matchNodes(idx, query) {
  const q = norm(query);
  if (idx.byId.has(query)) return [idx.byId.get(query)];
  const exact = [], prefix = [], substr = [];
  for (const n of idx.nodes) {
    if (n.file_type !== 'code') continue;
    const nl = norm(n.norm_label || n.label);
    const id = String(n.id).toLowerCase();
    if (nl === q || id === q) exact.push(n);
    else if (nl.startsWith(q) || id.startsWith(q)) prefix.push(n);
    else if (nl.includes(q) || id.includes(q)) substr.push(n);
  }
  const seen = new Set();
  const ranked = [...exact, ...prefix, ...substr].filter((n) => {
    if (seen.has(n.id)) return false; seen.add(n.id); return true;
  });
  ranked.sort((a, b) => idx.degree(b.id) - idx.degree(a.id));
  return ranked;
}

function resolveOne(idx, query) {
  const m = matchNodes(idx, query);
  if (!m.length) fail(`no node matches "${query}". Try: node scripts/graphq.js find ${query}`);
  return m[0];
}

// ── traversal ────────────────────────────────────────────────────────────────
function walk(idx, startId, dir, maxDepth) {
  // dir: 'in' (callers/upstream) or 'out' (callees/downstream). Returns Map(id -> depth).
  const map = dir === 'in' ? idx.callsIn : idx.callsOut;
  const seen = new Map();
  let frontier = [startId];
  for (let d = 1; d <= maxDepth; d++) {
    const next = [];
    for (const id of frontier) {
      for (const nb of (map.get(id) || [])) {
        if (!seen.has(nb)) { seen.set(nb, d); next.push(nb); }
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return seen;
}

function shortestPath(idx, aId, bId) {
  const prev = new Map([[aId, null]]);
  const queue = [aId];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === bId) break;
    for (const nb of (idx.callsOut.get(cur) || [])) {
      if (!prev.has(nb)) { prev.set(nb, cur); queue.push(nb); }
    }
  }
  if (!prev.has(bId)) return null;
  const out = [];
  for (let cur = bId; cur != null; cur = prev.get(cur)) out.unshift(cur);
  return out;
}

// ── formatting ───────────────────────────────────────────────────────────────
function loc(n) { return `${n.source_file}:${n.source_location}`; }
// a community name is "generic"/missing when graphify fell back to placeholders or dropped it
function isGenericName(s) { return !s || s === 'undefined' || /^Community \d+$/i.test(s); }
// community label, robust to the post-structure-rebuild "unlabeled" state (restored by graphify-enhance)
function cname(n) {
  return !isGenericName(n.community_name) ? n.community_name : `#${n.community} (unlabeled)`;
}
function nodeLine(idx, n, extra) {
  const deg = idx.degree(n.id);
  const why = idx.rationaleFor.has(n.id) ? ' · ⚖ has-rationale' : '';
  return `- \`${n.label}\`  ${loc(n)}  · ${cname(n)} · deg ${deg}${why}${extra ? ' · ' + extra : ''}`;
}
function out(s) { process.stdout.write(s + '\n'); }
function fail(msg) { process.stderr.write(`graphq: ${msg}\n`); process.exit(2); }

// ── git helpers ──────────────────────────────────────────────────────────────
function headCommit() {
  try { return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return null; }
}
function readLabelsCommit(graphPath) {
  // GRAPH_REPORT.md carries: "- Built from commit: `xxxxxxx`"
  const report = path.join(path.dirname(graphPath), 'GRAPH_REPORT.md');
  if (!fs.existsSync(report)) return null;
  const m = fs.readFileSync(report, 'utf8').match(/Built from commit:\s*`?([0-9a-f]{7,40})`?/i);
  return m ? m[1] : null;
}

// ── commands ─────────────────────────────────────────────────────────────────
function cmdFind(idx, args) {
  const q = args._.slice(1).join(' ');
  if (!q) fail('usage: graphq find <query>');
  const m = matchNodes(idx, q);
  const limit = args.limit || 20;
  if (args.json) return out(JSON.stringify(m.slice(0, limit), null, 2));
  if (!m.length) return out(`No matches for "${q}".`);
  out(`### ${m.length} match(es) for "${q}"${m.length > limit ? ` (showing ${limit})` : ''}`);
  m.slice(0, limit).forEach((n) => out(nodeLine(idx, n)));
}

function cmdInspect(idx, args) {
  const q = args._.slice(1).join(' ');
  if (!q) fail('usage: graphq inspect <query>');
  const n = resolveOne(idx, q);
  const callers = [...(idx.callsIn.get(n.id) || [])].map((id) => idx.byId.get(id));
  const callees = [...(idx.callsOut.get(n.id) || [])].map((id) => idx.byId.get(id));
  const rats = (idx.rationaleFor.get(n.id) || []).map((id) => idx.byId.get(id)).filter(Boolean);
  const tests = [...callers, ...callees].filter(isTestNode);
  if (args.json) {
    return out(JSON.stringify({
      node: n, callers, callees, rationale: rats, nearby_tests: tests,
      degree: idx.degree(n.id),
    }, null, 2));
  }
  out(`## \`${n.label}\`  (${n.id})`);
  out(`- **Location:** ${loc(n)}`);
  out(`- **Community:** ${cname(n)} (#${n.community})`);
  out(`- **Degree:** ${idx.degree(n.id)}  (${callers.length} in / ${callees.length} out)`);
  out(`\n### Callers (who calls this) — ${callers.length}`);
  callers.sort((a, b) => idx.degree(b.id) - idx.degree(a.id)).slice(0, 25).forEach((c) => out(nodeLine(idx, c)));
  if (!callers.length) out('- (none — entry point or only called dynamically)');
  out(`\n### Callees (what this calls) — ${callees.length}`);
  callees.sort((a, b) => idx.degree(b.id) - idx.degree(a.id)).slice(0, 25).forEach((c) => out(nodeLine(idx, c)));
  if (!callees.length) out('- (none — leaf)');
  if (rats.length) {
    out(`\n### ⚖ Why (rationale) — ${rats.length}`);
    rats.forEach((r) => out(`- ${r.label} — ${loc(r)}`));
  }
  if (tests.length) {
    out(`\n### Nearby tests — ${tests.length}`);
    [...new Set(tests.map((t) => t.source_file))].slice(0, 10).forEach((f) => out(`- ${f}`));
  }
}

function cmdReach(idx, args, dir, label) {
  const q = args._.slice(1).join(' ');
  if (!q) fail(`usage: graphq ${args._[0]} <query> [--depth N]`);
  const n = resolveOne(idx, q);
  const depth = args.depth || (args._[0] === 'impact' ? 3 : 2);
  const reached = walk(idx, n.id, dir, depth);
  const rows = [...reached.entries()]
    .map(([id, d]) => ({ n: idx.byId.get(id), d }))
    .filter((r) => r.n)
    .sort((a, b) => a.d - b.d || idx.degree(b.n.id) - idx.degree(a.n.id));
  if (args.json) return out(JSON.stringify(rows.map((r) => ({ depth: r.d, ...r.n })), null, 2));
  out(`## ${label} of \`${n.label}\` (depth ${depth}) — ${rows.length} node(s)`);
  if (args._[0] === 'impact') {
    const tests = rows.filter((r) => isTestNode(r.n));
    out(`_Editing \`${n.label}\` can affect these ${rows.length} upstream caller(s)._`);
    if (tests.length) out(`_Suggested tests: ${[...new Set(tests.map((t) => t.n.source_file))].join(', ')}_`);
    out('');
  }
  let lastDepth = 0;
  for (const r of rows) {
    if (r.d !== lastDepth) { out(`\n**depth ${r.d}**`); lastDepth = r.d; }
    out(nodeLine(idx, r.n));
  }
  if (!rows.length) out('- (none)');
}

function cmdCommunity(idx, args) {
  const q = args._.slice(1).join(' ');
  if (!q) fail('usage: graphq community <name|id>');
  let members = null;
  if (/^\d+$/.test(q) && idx.byCommunity.has(Number(q))) {
    members = idx.byCommunity.get(Number(q));
  } else {
    const ql = q.toLowerCase();
    for (const [, arr] of idx.byCommunity) {
      if ((arr[0]?.community_name || '').toLowerCase().includes(ql)) { members = arr; break; }
    }
  }
  if (!members) fail(`no community matches "${q}".`);
  const code = members.filter((n) => n.file_type === 'code');
  code.sort((a, b) => idx.degree(b.id) - idx.degree(a.id));
  const files = [...new Set(code.map((n) => n.source_file))];
  const label = cname(members[0]);
  if (args.json) return out(JSON.stringify({ community_name: label, community: members[0].community, files, nodes: code }, null, 2));
  out(`## Community: ${label} (#${members[0].community}) — ${code.length} symbols across ${files.length} file(s)`);
  out(`\n### Files\n${files.map((f) => `- ${f}`).join('\n')}`);
  out(`\n### Top hubs`);
  code.slice(0, 15).forEach((n) => out(nodeLine(idx, n)));
}

function cmdFile(idx, args) {
  const q = args._.slice(1).join(' ');
  if (!q) fail('usage: graphq file <path>');
  let hit = idx.byFile.get(q);
  if (!hit) {
    const ql = q.toLowerCase();
    const key = [...idx.byFile.keys()].find((f) => f.toLowerCase().endsWith(ql) || f.toLowerCase().includes(ql));
    hit = key ? idx.byFile.get(key) : null;
  }
  if (!hit) fail(`no file matches "${q}".`);
  const code = hit.filter((n) => n.file_type === 'code').sort((a, b) => idx.degree(b.id) - idx.degree(a.id));
  if (args.json) return out(JSON.stringify(code, null, 2));
  out(`## ${hit[0].source_file} — ${code.length} symbol(s)`);
  code.slice(0, args.limit || 60).forEach((n) => out(nodeLine(idx, n)));
}

function cmdPath(idx, args) {
  const a = args._[1], b = args._[2];
  if (!a || !b) fail('usage: graphq path <from> <to>');
  const na = resolveOne(idx, a), nb = resolveOne(idx, b);
  const p = shortestPath(idx, na.id, nb.id);
  if (args.json) return out(JSON.stringify({ from: na.id, to: nb.id, path: p }, null, 2));
  if (!p) return out(`No call path from \`${na.label}\` to \`${nb.label}\`.`);
  out(`## Call path \`${na.label}\` → \`${nb.label}\` (${p.length - 1} hop(s))`);
  p.forEach((id, i) => { const n = idx.byId.get(id); out(`${i === 0 ? '' : '  → '}\`${n.label}\`  ${loc(n)}`); });
}

function cmdStale(idx, args) {
  const head = headCommit();
  const structure = idx.raw.built_at_commit || null;
  const short = (c) => (c ? c.slice(0, 8) : '?');
  const eq = (a, b) => a && b && (a.startsWith(b.slice(0, 12)) || b.startsWith(a.slice(0, 12)));
  const structureStale = !!(head && structure && !eq(head, structure));
  // Labels are judged by ACTUAL name presence in graph.json — graphify-enhance restores
  // names from cache after each structure rebuild, so the report commit is not the signal.
  const unlabeled = idx.nodes.filter((n) => isGenericName(n.community_name)).length;
  const unlabeledPct = Math.round((unlabeled / Math.max(1, idx.nodes.length)) * 100);
  const labelsStale = unlabeledPct > 10;
  const result = {
    head: short(head),
    structure_commit: short(structure),
    structure_stale: structureStale,
    unlabeled,
    unlabeled_pct: unlabeledPct,
    labels_stale: labelsStale,
  };
  if (args.json) out(JSON.stringify(result, null, 2));
  else {
    out(`## graphify freshness`);
    out(`- repo HEAD:        ${result.head}`);
    out(`- structure built:  ${result.structure_commit}  ${structureStale ? '⚠ STALE — run `graphify .`' : '✓ fresh'}`);
    out(`- labels (names):   ${unlabeledPct}% unlabeled  ${labelsStale ? '⚠ run `ANTHROPIC_API_KEY=… graphify label . --backend claude --model claude-sonnet-4-6` (new code needs naming; persisted names auto-restore otherwise)' : '✓ named'}`);
    if (!structureStale && !labelsStale) out(`\nGraph is fully current.`);
  }
  process.exit(structureStale || labelsStale ? 1 : 0);
}

// ── dispatch ─────────────────────────────────────────────────────────────────
const COMMANDS = {
  find: cmdFind,
  inspect: cmdInspect,
  callers: (i, a) => cmdReach(i, a, 'in', 'Callers'),
  callees: (i, a) => cmdReach(i, a, 'out', 'Callees'),
  impact: (i, a) => cmdReach(i, a, 'in', 'Impact (upstream callers)'),
  community: cmdCommunity,
  file: cmdFile,
  path: cmdPath,
  stale: cmdStale,
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    out(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 26).join('\n').replace(/^ \* ?/gm, ''));
    process.exit(cmd ? 0 : 1);
  }
  if (!COMMANDS[cmd]) fail(`unknown command "${cmd}". Run: node scripts/graphq.js help`);
  const idx = loadGraph(args.graph);
  COMMANDS[cmd](idx, args);
}

// Run as CLI when invoked directly; expose the engine as a library otherwise.
if (require.main === module) main();
module.exports = {
  findGraphPath, loadGraph, buildIndex, walk, shortestPath, matchNodes,
  resolveOne, isTestNode, isGenericName, norm, cname, loc, headCommit, readLabelsCommit,
};
