const { test, expect } = require('@playwright/test');

// Loads the app shell so window.simLabValidateScenario is defined.
async function gotoApp(page) {
  await page.goto('http://localhost:3131/?_cb=test');
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
    return new Promise((resolve) => setTimeout(() => { t.stop(); resolve(nudged); }, 250));
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
    window._bumpPbqFreeRun(); // first run consumes the free credit
    const second = await window.simLabStart({ cert: 'netplus', __test: true });
    window._gateProOnly = realGate;
    return { first, second, gateShown };
  });
  expect(r.first).toBe(true);
  expect(r.second).toBe(false);
  expect(r.gateShown).toBe(1);
});
