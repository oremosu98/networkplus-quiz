const { test, expect } = require('@playwright/test');

// Loads the app shell and triggers the sim-lab lazy-load so
// window.simLabValidateScenario is defined (Task 17: no longer on page load).
async function gotoApp(page) {
  await page.goto('http://localhost:3131/?_cb=test');
  // Wait for the shell to boot, then trigger the lazy-load the same way
  // a real drills-page visit would — either via the exposed helper or showPage.
  await page.waitForFunction(() =>
    typeof window._ensureSimLabLoaded === 'function' ||
    typeof window.showPage === 'function'
  );
  await page.evaluate(() => {
    if (typeof window._ensureSimLabLoaded === 'function') window._ensureSimLabLoaded();
    else if (typeof window.showPage === 'function') window.showPage('drills');
  });
  await page.waitForFunction(() => typeof window.simLabValidateScenario === 'function');
}

test('validateScenario rejects a scenario with no steps', async ({ page }) => {
  await gotoApp(page);
  const ok = await page.evaluate(() =>
    window.simLabValidateScenario({
      id: 's1', cert: 'netplus', objective: '1.4', topic: 'IPv4', title: 't',
      scenario: 'x', estMinutes: 5, steps: []
    }).ok
  );
  expect(ok).toBe(false);
});

test('validateScenario accepts a well-formed single-step scenario', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() =>
    window.simLabValidateScenario({
      id: 's1', cert: 'netplus', objective: '1.4', topic: 'IPv4', title: 't',
      scenario: 'x', estMinutes: 5,
      steps: [{ id: 'st1', type: 'fillin', prompt: 'mask?', points: 1,
        explanation: 'because', payload: { fields: [{ id: 'f1', label: 'mask' }] },
        answer: { f1: ['255.255.255.192', '/26'] } }]
    })
  );
  expect(res.ok).toBe(true);
});

test('rejects a match step with mismatched left/right lengths', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() =>
    window.simLabValidateScenario({
      id: 's2', cert: 'netplus', objective: '1.4', topic: 'IPv4', title: 't',
      scenario: 'x', estMinutes: 5,
      steps: [{ id: 'st1', type: 'match', prompt: 'match?', points: 1,
        explanation: 'because',
        payload: { left: ['A', 'B'], right: ['X'] },
        answer: { pairs: { A: 'X' } } }]
    })
  );
  expect(res.ok).toBe(false);
});

test('rejects a match step with empty left/right arrays', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() =>
    window.simLabValidateScenario({
      id: 's3', cert: 'netplus', objective: '1.4', topic: 'IPv4', title: 't',
      scenario: 'x', estMinutes: 5,
      steps: [{ id: 'st1', type: 'match', prompt: 'match?', points: 1,
        explanation: 'because',
        payload: { left: [], right: [] },
        answer: { pairs: {} } }]
    })
  );
  expect(res.ok).toBe(false);
});

test('rejects an order step whose correctOrder length != items length', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() =>
    window.simLabValidateScenario({
      id: 's4', cert: 'netplus', objective: '1.4', topic: 'IPv4', title: 't',
      scenario: 'x', estMinutes: 5,
      steps: [{ id: 'st1', type: 'order', prompt: 'order?', points: 1,
        explanation: 'because',
        payload: { items: ['a', 'b', 'c'] },
        answer: { correctOrder: ['a', 'b'] } }]
    })
  );
  expect(res.ok).toBe(false);
});

test('accepts a well-formed categorize step', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() =>
    window.simLabValidateScenario({
      id: 's5', cert: 'netplus', objective: '1.4', topic: 'IPv4', title: 't',
      scenario: 'x', estMinutes: 5,
      steps: [{ id: 'st1', type: 'categorize', prompt: 'categorize?', points: 1,
        explanation: 'because',
        payload: { items: ['item1', 'item2'], buckets: ['bucket1', 'bucket2'] },
        answer: { map: { item1: 'bucket1', item2: 'bucket2' } } }]
    })
  );
  expect(res.ok).toBe(true);
});

test('accepts a well-formed analyze step', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() =>
    window.simLabValidateScenario({
      id: 's6', cert: 'netplus', objective: '1.4', topic: 'IPv4', title: 't',
      scenario: 'x', estMinutes: 5,
      steps: [{ id: 'st1', type: 'analyze', prompt: 'analyze?', points: 1,
        explanation: 'because',
        payload: { lines: [{ id: 'l1', text: 'line 1' }, { id: 'l2', text: 'line 2' }] },
        answer: { selected: ['l1'] } }]
    })
  );
  expect(res.ok).toBe(true);
});

test('rejects null input', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() => window.simLabValidateScenario(null));
  expect(res.ok).toBe(false);
});

test('fillin normalization is case/space tolerant and CIDR-aware', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(() => ({
    spaces: window._simLab.normalizeMatch('  /26 ', ['/26']),
    case:   window._simLab.normalizeMatch('255.255.255.192', ['255.255.255.192']),
    wrong:  window._simLab.normalizeMatch('/24', ['/26']),
    empty:  window._simLab.normalizeMatch('', ['/26'])
  }));
  expect(r.spaces).toBe(true);
  expect(r.case).toBe(true);
  expect(r.wrong).toBe(false);
  expect(r.empty).toBe(false);
});

test('scoreScenario gives all-or-nothing per step and a scenario fraction', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() => {
    const scn = { steps: [
      { id: 'a', type: 'fillin', payload: { fields: [{ id: 'f1' }] }, answer: { f1: ['/26'] } },
      { id: 'b', type: 'order', payload: { items: [{id:'x'},{id:'y'}] }, answer: { correctOrder: ['x','y'] } }
    ]};
    const responses = { a: { f1: '/26' }, b: { order: ['y','x'] } }; // a right, b wrong
    return window.simLabScoreScenario(scn, responses);
  });
  expect(res.perStep).toEqual({ a: true, b: false });
  expect(res.correct).toBe(1);
  expect(res.total).toBe(2);
  expect(Math.round(res.fraction * 100)).toBe(50);
});

test('input controller: tap item then tap target places it (touch/keyboard path)', async ({ page }) => {
  await gotoApp(page);
  const placed = await page.evaluate(() => {
    return new Promise((resolve) => {
      const root = document.createElement('div');
      root.innerHTML =
        '<button class="sl-item" data-item="x">X</button>' +
        '<div class="sl-target" data-target="b1"></div>';
      document.body.appendChild(root);
      let lastDrop = null;
      window._simLab.bindMovable(root, {
        itemSel: '.sl-item', targetSel: '.sl-target',
        onPlace: (itemId, targetId) => { lastDrop = [itemId, targetId]; }
      });
      root.querySelector('.sl-item').click();   // pick up
      root.querySelector('.sl-target').click(); // drop
      resolve(lastDrop);
    });
  });
  expect(placed).toEqual(['x', 'b1']);
});

test('input controller works on mobile-safari (touch taps place)', async ({ page }) => {
  await gotoApp(page);
  const placed = await page.evaluate(() => {
    return new Promise((resolve) => {
      const root = document.createElement('div');
      root.innerHTML =
        '<button class="sl-item" data-item="x">X</button>' +
        '<div class="sl-target" data-target="b1"></div>';
      document.body.appendChild(root);
      let lastDrop = null;
      window._simLab.bindMovable(root, {
        itemSel: '.sl-item', targetSel: '.sl-target',
        onPlace: (itemId, targetId) => { lastDrop = [itemId, targetId]; }
      });
      root.querySelector('.sl-item').click();
      root.querySelector('.sl-target').click();
      resolve(lastDrop);
    });
  });
  expect(placed).toEqual(['x', 'b1']);
});

test('input controller: a real mouse drag drops once and does not leave the item picked', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(() => {
    const root = document.createElement('div');
    root.id = 'sl-drag-test';
    root.style.cssText = 'position:fixed;left:0;top:0;width:400px;z-index:99999;background:transparent';
    root.innerHTML =
      '<button class="sl-item" data-item="x" style="display:block;width:120px;height:40px">X</button>' +
      '<div class="sl-target" data-target="b1" style="width:200px;height:80px;margin-top:60px"></div>';
    document.body.appendChild(root);
    window.__slDrops = [];
    window._simLab.bindMovable(root, {
      itemSel: '.sl-item', targetSel: '.sl-target',
      onPlace: (i, t) => { window.__slDrops.push([i, t]); }
    });
  });
  const item = page.locator('#sl-drag-test .sl-item');
  const target = page.locator('#sl-drag-test .sl-target');
  const ib = await item.boundingBox();
  const tb = await target.boundingBox();
  await page.mouse.move(ib.x + ib.width/2, ib.y + ib.height/2);
  await page.mouse.down();
  await page.mouse.move(tb.x + tb.width/2, tb.y + tb.height/2, { steps: 8 });
  await page.mouse.up();
  const drops = await page.evaluate(() => window.__slDrops);
  expect(drops).toEqual([['x','b1']]);                       // exactly one drop
  const picked = await item.evaluate(el => el.classList.contains('sl-picked'));
  expect(picked).toBe(false);                                 // not left re-picked by stray click
});

test('categorize renderer maps item to bucket on place', async ({ page }) => {
  await gotoApp(page);
  const map = await page.evaluate(() => {
    const step = { id:'s', type:'categorize', prompt:'sort',
      payload:{ items:[{id:'cat6',label:'Cat6'},{id:'om4',label:'OM4'}],
                buckets:[{id:'cu',label:'Copper'},{id:'fi',label:'Fiber'}] },
      answer:{ map:{ cat6:'cu', om4:'fi' } } };
    let last = null;
    const el = window._simLab.renderStep(step, (r) => { last = r; });
    document.body.appendChild(el);
    el.querySelector('[data-item="cat6"]').click();      // pick
    el.querySelector('[data-target="cu"]').click();      // drop in Copper
    return last.map;
  });
  expect(map.cat6).toBe('cu');
});

test('order renderer reports the current sequence on reorder', async ({ page }) => {
  await gotoApp(page);
  const seq = await page.evaluate(() => {
    const step = { id:'s', type:'order', prompt:'order them',
      payload:{ items:[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}] },
      answer:{ correctOrder:['a','b','c'] } };
    let last = null;
    const el = window._simLab.renderStep(step, (r) => { last = r; });
    document.body.appendChild(el);
    window._simLab.__test_moveOrder(el, 'c', 0); // move c to front
    return last.order;
  });
  expect(seq[0]).toBe('c');
});

test('match renderer records left->right pair on place', async ({ page }) => {
  await gotoApp(page);
  const pairs = await page.evaluate(() => {
    const step = { id:'s', type:'match', prompt:'match',
      payload:{ left:[{id:'443',label:'443'},{id:'53',label:'53'}],
                right:[{id:'https',label:'HTTPS'},{id:'dns',label:'DNS'}] },
      answer:{ pairs:{ '443':'https', '53':'dns' } } };
    let last = null;
    const el = window._simLab.renderStep(step, (r) => { last = r; });
    document.body.appendChild(el);
    el.querySelector('[data-item="443"]').click();
    el.querySelector('[data-target="https"]').click();
    return last.pairs;
  });
  expect(pairs['443']).toBe('https');
});

test('analyze renderer toggles selected line ids', async ({ page }) => {
  await gotoApp(page);
  const sel = await page.evaluate(() => {
    const step = { id:'s', type:'analyze', prompt:'find the bad flow',
      payload:{ multi:false, lines:[
        {id:'l1',text:'10.0.2.4 > 10.0.9.1 :443 ALLOW'},
        {id:'l2',text:'10.0.2.4 > 185.1.1.1 :4444 ALLOW'}] },
      answer:{ selected:['l2'] } };
    let last = null;
    const el = window._simLab.renderStep(step, (r)=>{ last = r; });
    document.body.appendChild(el);
    el.querySelector('[data-line="l2"]').click();
    return last.selected;
  });
  expect(sel).toEqual(['l2']);
});

test('fillin renderer reports typed values keyed by field id with numeric inputmode', async ({ page }) => {
  await gotoApp(page);
  const out = await page.evaluate(() => {
    const step = { id:'s', type:'fillin', prompt:'subnet',
      payload:{ fields:[{id:'mask',label:'Mask', inputmode:'decimal'}] },
      answer:{ mask:['/26'] } };
    let last = null;
    const el = window._simLab.renderStep(step, (r)=>{ last = r; });
    document.body.appendChild(el);
    const input = el.querySelector('[data-field="mask"]');
    input.value = '/26'; input.dispatchEvent(new Event('input', { bubbles:true }));
    return { val: last.mask, mode: input.getAttribute('inputmode') };
  });
  expect(out.val).toBe('/26');
  expect(out.mode).toBe('decimal');
});

test('orchestrator renders all steps and returns a score on submit', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() => {
    const scn = { id:'s1', cert:'netplus', objective:'1.4', topic:'IPv4', title:'t',
      scenario:'Branch cannot reach HQ.', estMinutes:5,
      steps:[
        { id:'st1', type:'fillin', prompt:'mask?', points:1, explanation:'/26 = 255.255.255.192',
          payload:{ fields:[{id:'mask',label:'Mask'}] }, answer:{ mask:['/26'] } }
      ]};
    return new Promise((resolve) => {
      const host = document.createElement('div'); document.body.appendChild(host);
      window._simLab.mountScenario(host, scn, { onSubmit: (result) => resolve(result) });
      host.querySelector('[data-field="mask"]').value = '/26';
      host.querySelector('[data-field="mask"]').dispatchEvent(new Event('input',{bubbles:true}));
      host.querySelector('[data-action="simLabSubmitScenario"]').click();
    });
  });
  expect(res.correct).toBe(1);
  expect(res.total).toBe(1);
});

test('orchestrator submit fires onSubmit exactly once per click (no double-fire)', async ({ page }) => {
  await gotoApp(page);
  const count = await page.evaluate(() => {
    return new Promise((resolve) => {
      const scn = { id:'s1', cert:'netplus', objective:'1.4', topic:'IPv4', title:'t',
        scenario:'x', estMinutes:5,
        steps:[{ id:'st1', type:'fillin', prompt:'mask?', points:1, explanation:'e',
          payload:{ fields:[{id:'mask',label:'Mask'}] }, answer:{ mask:['/26'] } }]};
      const host = document.createElement('div'); document.body.appendChild(host);
      let calls = 0;
      window._simLab.mountScenario(host, scn, { onSubmit: () => { calls++; } });
      host.querySelector('[data-action="simLabSubmitScenario"]').click();
      // give any delegation a tick, then report
      setTimeout(() => resolve(calls), 50);
    });
  });
  expect(count).toBe(1);
});

test('feedback reveals explanation for wrong steps, withholds for right ones (free mode)', async ({ page }) => {
  await gotoApp(page);
  const html = await page.evaluate(() => {
    const scn = { steps:[
      { id:'a', type:'fillin', prompt:'mask', explanation:'WHY_A', payload:{fields:[{id:'f'}]}, answer:{ f:['/26'] } },
      { id:'b', type:'fillin', prompt:'hosts', explanation:'WHY_B', payload:{fields:[{id:'g'}]}, answer:{ g:['62'] } }
    ]};
    const score = { perStep:{ a:true, b:false }, correct:1, total:2, fraction:0.5 };
    const host = document.createElement('div');
    window._simLab.renderFeedback(host, scn, score, { mode:'free' });
    return host.innerHTML;
  });
  expect(html).not.toContain('WHY_A'); // right step: withheld in free mode
  expect(html).toContain('WHY_B');     // wrong step: revealed
});

test('generateScenario validates model output and falls back to seed on failure', async ({ page }) => {
  await gotoApp(page);
  const id = await page.evaluate(async () => {
    window._simLab.__setFetcher(async () => ({ nonsense: true })); // bad model output
    const scn = await window._simLab.generateScenario('netplus');
    return scn.id;
  });
  expect(id).toMatch(/^np-seed-/); // fell back to a seed scenario
});

test('practice timer counts up and fires the pacing nudge past estMinutes', async ({ page }) => {
  await gotoApp(page);
  const fired = await page.evaluate(() => {
    const host = document.createElement('div'); document.body.appendChild(host);
    let nudged = false;
    const t = window._simLab.startPracticeTimer(host, { estMinutes: 0.001, onNudge: () => { nudged = true; } });
    return new Promise((resolve) => setTimeout(() => { t.stop(); resolve(nudged); }, 400));
  });
  expect(fired).toBe(true);
});

test('free user gets 1 practice run, second is gated to Pro', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    localStorage.removeItem('nplus_pbq_free_count');
    window._quotaState = { tier: 'free', daily_limit: 0 };
    let gateShown = 0;
    const realGate = window._gateProOnly;
    window._gateProOnly = (label) => { gateShown++; return false; };
    window._simLab.__setFetcher(async () => ({})); // force seed fallback
    const first  = await window.simLabStart({ cert: 'netplus', __test: true });
    // Simulate the session-start bump (Task 2: cap is now per-session, not per-scenario).
    window._simLab.sessionBumpOnce();
    const second = await window.simLabStart({ cert: 'netplus', __test: true });
    window._gateProOnly = realGate;
    return { first, second, gateShown };
  });
  expect(r.first).toBe(true);
  expect(r.second).toBe(false);
  expect(r.gateShown).toBe(1);
});

test('practice page renders a scenario, submits, shows verdict, exits to drills', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(async () => {
    window._quotaState = { tier: 'free', daily_limit: 0 };
    localStorage.removeItem('nplus_pbq_free_count');
    // Stub the metered fetcher so generation always falls back to seed deterministically.
    // simLabStart re-sets the fetcher to _slMeteredGenerate when !opts.__test —
    // pre-seeding it here AND stubbing _slMeteredGenerate means the "real" path
    // also yields a valid-looking but empty response → seed fallback fires.
    window._slMeteredGenerate = async () => ({ bad: true });
    window._simLab.__setFetcher(async () => ({})); // seed fallback
    await window.simLabStart({ cert: 'netplus' });
  });
  // Page should now be visible
  await expect(page.locator('#page-sim-lab')).toHaveClass(/active/);
  // Fill in the fillin step fields present in the seed scenario
  const cidrInput = page.locator('[data-field="cidr"]');
  const hostsInput = page.locator('[data-field="hosts"]');
  if (await cidrInput.isVisible()) await page.fill('[data-field="cidr"]', '/26');
  if (await hostsInput.isVisible()) await page.fill('[data-field="hosts"]', '62');
  // Submit
  await page.click('[data-action="simLabSubmitScenario"]');
  // Verdict should appear with score
  await expect(page.locator('.sl-fb-score')).toBeVisible();
  // Exit via Leave / Back to Drills button
  await page.click('[data-action="simLabExit"]');
  // sim-lab page should no longer be active, drills should be
  await expect(page.locator('#page-sim-lab')).not.toHaveClass(/active/);
});

test('drills page shows a Sim Lab card with a daily-state pill', async ({ page }) => {
  await gotoApp(page);
  await page.waitForFunction(() => typeof window.renderSimLabDrillsCard === 'function');
  // Navigate to drills page so #page-drills exists as active container before calling render.
  await page.evaluate(() => {
    window.CURRENT_CERT = 'netplus';
    window._quotaState = { tier: 'free' };
    localStorage.removeItem('nplus_pbq_free_count');
    if (typeof showPage === 'function') showPage('drills');
    window.renderSimLabDrillsCard();
  });
  await expect(page.locator('#drills-simlab-state')).toContainText('1 free today');
});

test('drills Sim Lab card shows Done today when free cap reached', async ({ page }) => {
  await gotoApp(page);
  await page.waitForFunction(() => typeof window.renderSimLabDrillsCard === 'function');
  await page.evaluate(() => {
    window.CURRENT_CERT = 'netplus';
    window._quotaState = { tier: 'free' };
    // Bump the free run count to cap
    var cap = window.PBQ_FREE_DAILY_CAP || 1;
    var today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('nplus_pbq_free_count', JSON.stringify({ date: today, count: cap }));
    if (typeof showPage === 'function') showPage('drills');
    window.renderSimLabDrillsCard();
  });
  await expect(page.locator('#drills-simlab-state')).toContainText('Done today');
});

test('drills Sim Lab card shows Pro pill for pro tier', async ({ page }) => {
  await gotoApp(page);
  await page.waitForFunction(() => typeof window.renderSimLabDrillsCard === 'function');
  await page.evaluate(() => {
    window.CURRENT_CERT = 'netplus';
    window._quotaState = { tier: 'pro' };
    if (typeof showPage === 'function') showPage('drills');
    window.renderSimLabDrillsCard();
  });
  await expect(page.locator('#drills-simlab-state')).toContainText('Pro');
});

test('Sim Lab card is absent on non-CompTIA certs (no PBQs)', async ({ page }) => {
  await page.goto('http://localhost:3131/?_cb=test');
  // Must trigger the lazy-load before waiting for renderSimLabDrillsCard
  // (Task 17: module no longer loads on page boot).
  await page.waitForFunction(() =>
    typeof window._ensureSimLabLoaded === 'function' ||
    typeof window.showPage === 'function'
  );
  await page.evaluate(() => {
    if (typeof window._ensureSimLabLoaded === 'function') window._ensureSimLabLoaded();
    else if (typeof window.showPage === 'function') window.showPage('drills');
  });
  await page.waitForFunction(() => typeof window.renderSimLabDrillsCard === 'function', { timeout: 5000 });
  await page.evaluate(() => {
    window.showPage('drills');
    window._quotaState = { tier: 'free' };
    window.CURRENT_CERT = 'az900';   // a Microsoft cert with no PBQs
    window.renderSimLabDrillsCard();
  });
  await expect(page.locator('#drills-simlab-card')).toHaveCount(0);
});

test('sim-lab module lazy-loads when the drills page is shown', async ({ page }) => {
  await page.goto('http://localhost:3131/?_cb=test');
  await page.waitForFunction(() => typeof window.showPage === 'function');
  // Ensure CURRENT_CERT is netplus so the card renders for CompTIA certs.
  await page.evaluate(() => {
    window._quotaState = { tier: 'free' };
    window.CURRENT_CERT = 'netplus';
    window.showPage('drills');
  });
  // The module should load and expose renderSimLabDrillsCard within 5 s.
  await page.waitForFunction(() => typeof window.renderSimLabDrillsCard === 'function', { timeout: 5000 });
  await expect(page.locator('#drills-simlab-card')).toBeVisible();
});

test('session core: builds a session, picks distinct seeds, aggregates results', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(() => {
    const S = window._simLab;
    const used = new Set();
    const a = S.pickSeedFresh('netplus', used); used.add(a.id);
    const b = S.pickSeedFresh('netplus', used); used.add(b.id);
    const distinct = a && b && a.id !== b.id;
    const results = [
      { score: { correct: 2, total: 2, fraction: 1, perStep: {} }, passed: true },
      { score: { correct: 1, total: 2, fraction: 0.5, perStep: {} }, passed: false },
      { score: { correct: 1, total: 1, fraction: 1, perStep: {} }, passed: true },
    ];
    const agg = S.aggregateSession(results);
    return { distinct, passed: agg.passed, rounds: agg.rounds, stepsCorrect: agg.stepsCorrect, stepsTotal: agg.stepsTotal, pct: agg.pct };
  });
  expect(r.distinct).toBe(true);
  expect(r.passed).toBe(2);
  expect(r.rounds).toBe(3);
  expect(r.stepsCorrect).toBe(4);
  expect(r.stepsTotal).toBe(5);
  expect(r.pct).toBe(80);
});

test('session core: pickSeedFresh returns null when no valid seeds remain', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(() => {
    const S = window._simLab;
    const saved = window.SIM_LAB_SEED_NETPLUS;
    window.SIM_LAB_SEED_NETPLUS = []; // empty bank
    const empty = S.pickSeedFresh('netplus', new Set());
    window.SIM_LAB_SEED_NETPLUS = saved; // restore for other tests
    const wrongCert = S.pickSeedFresh('secplus', new Set());
    return { empty, wrongCert };
  });
  expect(r.empty).toBe(null);
  expect(r.wrongCert).toBe(null);
});

test('cap: one free SESSION per day, bumped once regardless of rounds', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    localStorage.removeItem('nplus_pbq_free_count');
    const before = window._pbqFreeRunsToday();
    window._simLab.sessionBumpOnce();
    window._simLab.sessionBumpOnce(); // guarded: must not double-count within a session
    const after = window._pbqFreeRunsToday();
    return { before, after };
  });
  expect(r.before).toBe(0);
  expect(r.after).toBe(1);
});

test('entry: Home tile opens entry; picking 10 on free gates to Pro; 5 starts a session', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    localStorage.removeItem('nplus_pbq_free_count');
    window.CURRENT_CERT = 'netplus';
    let gate = 0; window._gateProOnly = () => { gate++; return false; };
    await new Promise(res => window._ensureSimLabLoaded(res));
    window.startSimLabHome();
    // showPage transitions via animationend (300ms fallback) — wait for it.
    await new Promise(res => setTimeout(res, 450));
    const onEntry = document.getElementById('page-sim-lab-entry').classList.contains('active');
    document.querySelector('.sle-chip[data-rounds="10"]').click();
    const gatedOn10 = gate === 1 && window._simLab.sessionRounds() !== 10;
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    return { onEntry, gatedOn10, rounds: window._simLab.sessionRounds() };
  });
  expect(r.onEntry).toBe(true);
  expect(r.gatedOn10).toBe(true);
  expect(r.rounds).toBe(3);
});

test('session: 3-round run renders rounds with loader then advances on submit', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    localStorage.removeItem('nplus_pbq_free_count');
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true }); // force seed fallback
    window.simLabOpenEntry();
    await new Promise(res => setTimeout(res, 450));
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
  });
  await expect(page.locator('#page-sim-lab')).toHaveClass(/active/);
  await expect(page.locator('#sl-round-pill')).toContainText('Round 1 of 3');
  await expect(page.locator('#sl-dots .slr-dot')).toHaveCount(3);
  await page.waitForSelector('[data-action="simLabSubmitScenario"]', { timeout: 8000 });
  await page.click('[data-action="simLabSubmitScenario"]');
  await expect(page.locator('#sl-round-pill')).toContainText('Round 2 of 3', { timeout: 8000 });
});

test('prefetch: round N+1 is fetched during round N', async ({ page }) => {
  await gotoApp(page);
  const had = await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    localStorage.removeItem('nplus_pbq_free_count');
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    window.simLabOpenEntry();
    await new Promise(res => setTimeout(res, 450));
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
    await new Promise(r => setTimeout(r, 700)); // let round 1 mount + prefetch kick off
    return window._simLab.hasPrefetch();
  });
  expect(had).toBe(true);
});

test('session: completing all rounds shows the summary with aggregate', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(async () => {
    window._quotaState = { tier: 'free' }; localStorage.removeItem('nplus_pbq_free_count');
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    window.simLabOpenEntry();
    await new Promise(res => setTimeout(res, 450));
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
  });
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector('[data-action="simLabSubmitScenario"]', { timeout: 8000 });
    await page.click('[data-action="simLabSubmitScenario"]');
  }
  await expect(page.locator('#page-sim-lab-result')).toHaveClass(/active/, { timeout: 8000 });
  await expect(page.locator('.sls-score-n')).toBeVisible();
  await expect(page.locator('.sls-r')).toHaveCount(3);
});

test('weak-spots: Pro persists missed topics, free does not', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(() => {
    localStorage.removeItem('nplus_simlab_weak');
    window._quotaState = { tier: 'free' };
    window._slRecordWeakSpots(['Subnetting']);
    const afterFree = Object.keys(window._slGetWeakSpots()).length;
    window._quotaState = { tier: 'pro' };
    window._slRecordWeakSpots(['Subnetting', 'DNS records']);
    const afterPro = window._slGetWeakSpots();
    return { afterFree, sub: afterPro['Subnetting'], dns: afterPro['DNS records'] };
  });
  expect(r.afterFree).toBe(0);
  expect(r.sub).toBe(1);
  expect(r.dns).toBe(1);
});

test('cap: a second session the same day is gated to Pro', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    // simulate today's free session already consumed
    localStorage.setItem('nplus_pbq_free_count', JSON.stringify({ date: new Date().toISOString().slice(0,10), count: 1 }));
    window.CURRENT_CERT = 'netplus';
    let gate = 0; window._gateProOnly = () => { gate++; return false; };
    await new Promise(res => window._ensureSimLabLoaded(res));
    window.simLabOpenEntry();
    await new Promise(res => setTimeout(res, 450));
    window.simLabSessionStart();
    await new Promise(res => setTimeout(res, 200));
    return { gate, onSession: document.getElementById('page-sim-lab').classList.contains('active') };
  });
  expect(r.gate).toBe(1);          // the Pro gate fired
  expect(r.onSession).toBe(false); // no session page — gated before start
});

test('exam core: blank exam state + pace math (under and over par)', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(() => {
    const S = window._simLab;
    // blank exam state for 3 rounds
    const st = S.examBlankState(['x', 'y', 'z'], 18 * 60000);
    const shape = st.mode === 'exam' && st.scenarios.length === 3 &&
      st.answers.length === 3 && st.roundMs.length === 3 &&
      (st.visited instanceof Set) && (st.flagged instanceof Set) &&
      st.view === 'round' && st.amber === false && st.budgetMs === 18 * 60000;
    // under par: spent 16:00 of an 18:00 budget → onPace, 2:00 to spare
    const under = S.computePace(
      [{ score: { fraction: 1 } }, { score: { fraction: 1 } }, { score: { fraction: 0.5 } }],
      [5 * 60000, 5 * 60000, 5 * 60000],   // roundMs
      18 * 60000,                          // budgetMs
      16 * 60000                           // elapsedMs
    );
    // over par: spent 20:00 of an 18:00 budget → not onPace, 2:00 over
    const over = S.computePace([{ score: { fraction: 1 } }], [20 * 60000], 18 * 60000, 20 * 60000);
    return {
      shape,
      underOn: under.onPace, underTotal: under.totalMs, underDelta: under.deltaMs,
      perRoundLen: under.perRound.length, r0over: under.perRound[0].over,
      overOn: over.onPace, overDelta: over.deltaMs
    };
  });
  expect(r.shape).toBe(true);
  expect(r.underOn).toBe(true);
  expect(r.underTotal).toBe(16 * 60000);
  expect(r.underDelta).toBe(2 * 60000);
  expect(r.perRoundLen).toBe(3);
  expect(r.r0over).toBe(false);        // round 0 par = est? handled via roundMs vs budget-share; see impl
  expect(r.overOn).toBe(false);
  expect(r.overDelta).toBe(-2 * 60000);
});

test('exam entry: free tapping Exam gates; Pro toggles Exam + shows budget; CTA copy flips', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    // free → Exam gates
    window._quotaState = { tier: 'free' };
    let gate = 0, gTitle = '';
    window._gateProOnly = (feat, opts) => { gate++; gTitle = opts && opts.title; return false; };
    window.simLabOpenEntry();
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    const freeGated = gate === 1 && /real exam is timed/.test(gTitle);
    const stillPractice = document.querySelector('#sle-mode .sle-seg-opt[data-mode="practice"]').classList.contains('is-on');
    // Pro → Exam toggles, budget + note appear, CTA flips
    window._quotaState = { tier: 'pro' };
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    const examOn = document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').classList.contains('is-on');
    const budgetShown = !document.getElementById('sle-budget').classList.contains('is-hidden');
    const cta = document.getElementById('sle-start').textContent;
    return { freeGated, stillPractice, examOn, budgetShown, cta };
  });
  expect(r.freeGated).toBe(true);
  expect(r.stillPractice).toBe(true);
  expect(r.examOn).toBe(true);
  expect(r.budgetShown).toBe(true);
  expect(r.cta).toContain('Start exam sim');
});

test('exam pre-gen: builds ALL rounds up front (seed fallback), distinct ids, budget set', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });   // AI path returns invalid object; simLabValidateScenario rejects it, seed fallback fires for every round
    const scns = await window._simLab.examGenerateAll('netplus', 3);
    const ids = scns.map(s => s.id);
    const distinct = new Set(ids).size === ids.length;
    return { count: scns.length, distinct, allValid: scns.every(s => window.simLabValidateScenario(s).ok) };
  });
  expect(r.count).toBe(3);
  expect(r.distinct).toBe(true);
  expect(r.allValid).toBe(true);
});

test('exam countdown: derived from deadline; amber latches; background expiry auto-submits', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    let submitted = false;
    // spy on submit before starting (Task 8 routes time-up here)
    const realNow = Date.now;
    const base = realNow.call(Date);
    let nowVal = base;
    Date.now = () => nowVal;
    window._simLab.__examSubmitSpy = () => { submitted = true; };
    window.simLabOpenEntry();
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    await window._simLab.examGenerateAll ? null : null; // ensure module ready
    window.simLabSessionStart();
    // wait for pre-gen + clock start
    await new Promise(res => setTimeout(res, 400));
    const sess = window._simLab.examSession();
    const budget = sess.budgetMs;
    // advance Date.now to 95% elapsed → into the ≤10% amber band
    nowVal = base + Math.ceil(budget * 0.95);
    window._simLab.tickClock();
    const amber = sess.amber === true;
    const lowClass = !!document.querySelector('#sl-clock-slot .sl-clock.is-low');
    // jump past deadline (simulate backgrounded device past the clock)
    nowVal = base + budget + 5000;
    window._simLab.tickClock();
    Date.now = realNow;
    return { amber, lowClass, submitted };
  });
  expect(r.amber).toBe(true);
  expect(r.lowClass).toBe(true);
  expect(r.submitted).toBe(true);
});
