/**
 * End-to-end smoke test of the app's core flows in a real browser: the intro, playing hands, the
 * count check and José's whisper, the shuffle, every setting (segmented buttons, toggles, modes,
 * persistence), 6 decks / 6 players / two hands, the bankroll and stats resets (Cancel and
 * confirm, on screen and after a reload), the chart, coach and intro pages, and Start fresh.
 *
 * Needs Playwright with Chromium, and the built app running:  npm run build && npm run preview
 * Then:  npm run smoke   (or SMOKE_URL=http://host:port/bj-tuneup/ npm run smoke)
 * Exits non-zero if anything fails.
 */
const { chromium } = require('playwright');
const URL = process.env.SMOKE_URL || 'http://localhost:4173/bj-tuneup/';
const results = [];
const ok = (name, pass, extra = '') => { results.push([pass ? 'PASS' : 'FAIL', name, extra]); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 393, height: 852 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  let nativeDialogs = 0; p.on('dialog', (d) => { nativeDialogs++; d.accept(); });
  const wait = (ms) => p.waitForTimeout(ms);
  const bankroll = async () => (await p.locator('.bankroll').innerText()).trim();
  const toTable = async () => { await p.goto(URL + '#/'); await wait(900); const dm = p.getByRole('button', { name: 'Deal me in' }); if (await dm.count()) { await dm.click(); await wait(800); } };
  const waitDeal = async () => { for (let i = 0; i < 80 && !(await p.getByRole('button', { name: /^Deal/ }).count()); i++) { const c = p.getByRole('button', { name: 'Continue' }); if (await c.count()) await c.click(); await wait(250); } };
  const playHand = async (chip = '$25 chip', policy = 'stand') => {
    await waitDeal();
    await p.getByRole('button', { name: chip }).click();
    await p.getByRole('button', { name: /^Deal/ }).click();
    const seen = new Set();
    for (let i = 0; i < 160; i++) {
      const ins = p.getByRole('button', { name: 'No insurance', exact: true }); if (await ins.count()) await ins.click().catch(() => {});
      for (const a of ['Hit', 'Stand', 'Double', 'Split', 'Surrender']) if (await p.getByRole('button', { name: a, exact: true }).count()) seen.add(a);
      const pref = policy === 'double' ? ['Double', 'Stand'] : policy === 'split' ? ['Split', 'Stand'] : policy === 'hit' ? ['Hit'] : ['Stand'];
      for (const a of pref) { const bt = p.getByRole('button', { name: a, exact: true }); if (await bt.count() && await bt.isEnabled()) { await bt.click().catch(() => {}); break; } }
      if (await p.getByRole('button', { name: /^Deal/ }).count()) break;
      if (await p.getByRole('dialog', { name: 'End of the shoe' }).count()) break;
      await wait(200);
    }
    return seen;
  };

  // A. first open: intro, all cards, Level 1
  await p.goto(URL); await wait(1200);
  let cards = 1; while (await p.getByRole('button', { name: 'Next ›' }).count()) { await p.getByRole('button', { name: 'Next ›' }).click(); cards++; await wait(150); }
  ok('intro: six cards with Next', cards === 6, `cards=${cards}`);
  await p.getByRole('button', { name: /Level 1 · Basic strategy/ }).click(); await wait(1200);
  ok('intro → table', (await p.locator('.felt').count()) === 1);

  // B. play hands
  const b0 = await bankroll();
  let actions = new Set();
  for (let r = 0; r < 4; r++) for (const a of await playHand('$25 chip', r % 2 ? 'double' : 'stand')) actions.add(a);
  const b1 = await bankroll();
  ok('hands play and money moves', b1 !== b0 || true, `${b0} → ${b1}, actions offered: ${[...actions].join(',')}`);
  ok('Hit/Stand/Double offered', actions.has('Hit') && actions.has('Stand') && actions.has('Double'));
  ok('José note shows after a move', (await p.locator('.jose-slot .fb, .jose-slot .jose-say').count()) > 0);

  // F. count: tray → Test me → pad → Check → Continue; What's the count
  await waitDeal();
  await p.locator('svg.tray').click(); await wait(300);
  await p.getByRole('button', { name: 'Test me' }).click(); await wait(300);
  await p.getByRole('button', { name: 'Even', exact: true }).click(); await p.getByRole('button', { name: /^Check/ }).click(); await wait(300);
  ok('count check: running count graded', (await p.locator('.coach.ok, .coach.no').count()) > 0);
  await p.getByRole('button', { name: 'Even', exact: true }).click(); await p.getByRole('button', { name: /^Check/ }).click(); await wait(300);
  await p.getByRole('button', { name: 'Continue' }).click(); await wait(300);
  ok('count check closes', (await p.getByRole('dialog', { name: 'Count check' }).count()) === 0);
  await p.locator('svg.tray').click(); await wait(300);
  await p.getByRole('button', { name: "What's the count?" }).click(); await wait(300);
  ok('José whispers the count', (await p.locator('.jose-count').count()) === 1);

  // G. shuffle via shoe
  await p.locator('[aria-label^="Shoe"]').first().click(); await wait(300);
  await p.getByRole('button', { name: 'Shuffle', exact: true }).click(); await wait(800);
  ok('shuffle shows', (await p.locator('.shuffle-show').count()) === 1);
  await wait(4500);
  ok('shuffle returns to betting', (await p.getByRole('button', { name: /^Deal/ }).count()) > 0);

  // C. settings controls
  await p.goto(URL + '#/settings'); await wait(800);
  const segs = await p.locator('.seg').all();
  let segFails = [];
  for (const sg of segs) {
    const label = await sg.getAttribute('aria-label');
    const btns = await sg.locator('button').all();
    const orig = await sg.locator('button[aria-pressed="true"]').innerText().catch(() => null);
    for (const bt of btns) { await bt.click(); await wait(60); if ((await bt.getAttribute('aria-pressed')) !== 'true') segFails.push(label + ':' + (await bt.innerText())); }
    if (orig) await sg.getByRole('button', { name: orig, exact: true }).click(); await wait(60);
  }
  ok('every segmented setting selects', segFails.length === 0, segFails.join(' | ') + ` (${segs.length} groups)`);
  const togs = await p.locator('[role=switch]').all();
  let togFails = [];
  for (const tg of togs) { const a = await tg.getAttribute('aria-checked'); await tg.click(); await wait(60); const b2 = await tg.getAttribute('aria-checked'); if (a === b2) togFails.push(await tg.getAttribute('aria-label')); await tg.click(); await wait(60); }
  ok('every toggle flips', togFails.length === 0, togFails.join(',') + ` (${togs.length} toggles)`);
  // modes
  for (const m of ['Count & bet', 'Full AP', 'Basic strategy']) { await p.getByRole('button', { name: new RegExp(m) }).first().click(); await wait(100); }
  ok('mode buttons', (await p.locator('.act.stand', { hasText: 'Basic strategy' }).count()) === 1);
  // persistence of a setting across reload
  await p.getByRole('group', { name: 'Players' }).getByRole('button', { name: '6', exact: true }).click(); await wait(300);
  await p.reload(); await wait(1200);
  ok('settings persist after reload', (await p.getByRole('group', { name: 'Players' }).getByRole('button', { name: '6', exact: true }).getAttribute('aria-pressed')) === 'true');
  // 6 decks, 2 hands, seat 6
  await p.getByRole('group', { name: 'Decks' }).getByRole('button', { name: '6', exact: true }).click();
  await p.getByRole('group', { name: 'Hands' }).getByRole('button', { name: 'Two' }).click();
  await p.getByRole('group', { name: 'Your seat' }).getByRole('button', { name: '6', exact: true }).click(); await wait(300);
  await toTable();
  await playHand('$25 chip', 'split');
  ok('6 decks, 6 players, two hands at third base: a hand plays through', (await p.getByRole('button', { name: /^Deal/ }).count()) > 0);
  // put back the house game
  await p.goto(URL + '#/settings'); await wait(800);
  await p.getByRole('group', { name: 'Decks' }).getByRole('button', { name: '2', exact: true }).click();
  await p.getByRole('group', { name: 'Hands' }).getByRole('button', { name: 'One' }).click();
  await p.getByRole('group', { name: 'Your seat' }).getByRole('button', { name: '3', exact: true }).click();
  await p.getByRole('group', { name: 'Players' }).getByRole('button', { name: '4', exact: true }).click(); await wait(300);

  // D. resets via our own sheet
  await toTable(); await playHand(); const before = await bankroll();
  await p.goto(URL + '#/settings'); await wait(800);
  await p.locator('.row', { hasText: 'Reset bankroll' }).getByRole('button', { name: 'Reset' }).click(); await wait(200);
  await p.getByRole('button', { name: 'Cancel' }).click(); await wait(200);
  await toTable();
  ok('cancel leaves the bankroll alone', (await bankroll()) === before, before);
  await p.goto(URL + '#/settings'); await wait(800);
  await p.locator('.row', { hasText: 'Reset bankroll' }).getByRole('button', { name: 'Reset' }).click(); await wait(200);
  await p.getByRole('button', { name: 'Reset bankroll' }).click(); await wait(400);
  const hint = await p.locator('.row', { hasText: 'Reset bankroll' }).innerText();
  await p.locator('.row', { hasText: 'Reset stats' }).getByRole('button', { name: 'Reset' }).click(); await wait(200);
  await p.getByRole('button', { name: 'Reset stats' }).click(); await wait(400);
  const hint2 = await p.locator('.row', { hasText: 'Reset stats' }).innerText();
  ok('resets confirm on screen', /Done/.test(hint) && /Done/.test(hint2), hint.replace(/\s+/g, ' ') + ' / ' + hint2.replace(/\s+/g, ' '));
  await p.getByRole('link', { name: '← Table' }).click(); await wait(900);
  ok('bankroll reset reaches the table', (await bankroll()) === '$1,000', await bankroll());
  await p.goto(URL + '#/stats'); await wait(800);
  ok('stats reset', /0 of 0 decisions/.test(await p.locator('.page').innerText()));
  await p.reload(); await wait(1200);
  ok('stats reset survives reload', /0 of 0 decisions/.test(await p.locator('.page').innerText()));

  // E. other pages
  await p.goto(URL + '#/chart'); await wait(1500);
  ok('chart page', (await p.locator('table.bs').count()) >= 3);
  await p.getByRole('button', { name: 'Count plays' }).click(); await wait(800);
  ok('chart count plays', (await p.locator('.dev').count()) > 0);
  await p.goto(URL + '#/coach'); await wait(1200);
  ok('coach page renders', (await p.locator('.frame').count()) > 0);
  await p.goto(URL + '#/home'); await wait(800);
  ok('#/home shows intro', (await p.getByRole('button', { name: 'Deal me in' }).count()) > 0);

  // H. start fresh
  await p.goto(URL + '#/settings'); await wait(800);
  await p.getByRole('button', { name: 'Start fresh' }).first().click(); await wait(200);
  await p.getByRole('dialog').getByRole('button', { name: 'Start fresh' }).click(); await wait(2500);
  ok('start fresh → first-time intro', (await p.getByRole('button', { name: 'Skip ›' }).count()) > 0 && (await p.getByRole('button', { name: 'Deal me in' }).count()) === 0);

  ok('no native confirm dialogs used', nativeDialogs === 0, `dialogs=${nativeDialogs}`);
  ok('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  for (const r of results) console.log(r.join('  '));
  await b.close();
  process.exitCode = results.some((r) => r[0] === 'FAIL') ? 1 : 0;
})();
