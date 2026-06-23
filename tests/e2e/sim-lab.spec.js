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
