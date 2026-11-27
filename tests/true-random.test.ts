import { describe, it, expect, beforeAll } from 'vitest';
import { cryptoRng, shuffle } from '../src/engine/rng';
import { Table } from '../src/engine/game';
import { DEFAULT_RULES } from '../src/engine/rules';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import type { Chart } from '../src/engine/strategy/chart';
import { addRound, EMPTY_CARDS, RECENT_HANDS } from '../src/v2/stats';

/**
 * The shoe at the table is shuffled from the device's own random source, and a hand that's been
 * dealt is never dealt again.
 */
const rules = { ...DEFAULT_RULES, decks: 2 as const, penetration: 0.65 };
let chart: Chart;
beforeAll(() => {
  chart = generateBasicStrategy(rules).chart;
});
const table = (o: object = {}) => new Table({ rules, seats: 3, humanSeat: 1, chart, seed: 5, granularity: 0.5, rounding: 'floor', cardPause: true, ...o });

describe('the device’s own random source', () => {
  it('gives numbers from 0 up to (not including) 1, evenly spread', () => {
    const r = cryptoRng();
    const n = 200000;
    const bins = new Array(20).fill(0);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      bins[Math.floor(x * 20)]++;
      sum += x;
    }
    expect(Math.abs(sum / n - 0.5)).toBeLessThan(0.004);
    // each twentieth of the range gets its share (within 4%)
    for (const b of bins) expect(Math.abs(b / (n / 20) - 1)).toBeLessThan(0.04);
  });
  it('shuffles so every card is as likely to land in every place', () => {
    const r = cryptoRng();
    const N = 26;
    const trials = 60000;
    const at = Array.from({ length: N }, () => new Array(N).fill(0));
    for (let t = 0; t < trials; t++) shuffle(Array.from({ length: N }, (_, i) => i), r).forEach((card, pos) => at[card][pos]++);
    // each card in each place 1 time in 26: chi-square over all 676 cells stays near its expected value
    const e = trials / N;
    let chi = 0;
    for (const row of at) for (const x of row) chi += (x - e) ** 2 / e;
    // 625 degrees of freedom: mean 625, sd about 35
    expect(chi).toBeGreaterThan(480);
    expect(chi).toBeLessThan(780);
  });
  it('the table shuffles from it: no two shoes alike, every shoe a full set of cards', () => {
    const a = table({ trueRandom: true });
    const b = table({ trueRandom: true }); // the same seed: ignored
    expect(a.shoe.cards.join()).not.toBe(b.shoe.cards.join());
    for (const t of [a, b]) {
      const counts = new Array(52).fill(0);
      for (const c of t.shoe.cards) counts[c]++;
      expect(t.shoe.cards.length).toBe(104);
      expect(counts.every((n) => n === 2)).toBe(true);
    }
    // a seeded table is still exactly repeatable (that's what the tests rely on)
    expect(table().shoe.cards.join()).toBe(table().shoe.cards.join());
  });
});

describe('a hand that has been dealt is never dealt again', () => {
  it('a shoe saved in the middle of a hand picks up after the cards already out', () => {
    const t = table();
    t.placeBet(1);
    while (t.phase === 'deal') t.step();
    const out = t.current!.dealt.map((d) => d.card);
    expect(out.length).toBe(8); // three players and the dealer, two cards each
    const saved = t.snapshotShoe(); // the page is closed here, mid-hand
    const again = table({ seed: 99 });
    expect(again.restoreShoe(saved)).toBe(true);
    // the next card out is the one after those, not the first card of the abandoned hand
    expect(again.shoe.pos).toBe(t.shoe.pos);
    again.placeBet(1);
    while (again.phase === 'deal') again.step();
    const next = again.current!.dealt.map((d) => d.card);
    expect(next).toEqual(t.shoe.cards.slice(saved.pos, saved.pos + 8));
    expect(next).not.toEqual(out);
    // and the count carries on from what had been seen (the hole card never was)
    expect(saved.rc).toBe(t.rc);
  });
  it('if that hand ran past the cut card, the shuffle comes next', () => {
    const t = table();
    t.placeBet(1);
    while (t.phase === 'deal') t.step();
    const saved = { ...t.snapshotShoe(), cutIndex: 4 };
    const again = table({ seed: 99 });
    expect(again.restoreShoe(saved)).toBe(true);
    expect(again.needsShuffle).toBe(true);
  });
});

describe('your last hands', () => {
  it('keeps the latest 60 in order', () => {
    const c = EMPTY_CARDS();
    const o = { bj: false, twenty: false, pair: false, split: false, tc: 0 };
    for (let i = 0; i < 70; i++) addRound(c, { ...o, net: i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0 });
    expect(c.recent!.length).toBe(RECENT_HANDS);
    expect(c.recent!.slice(-3)).toBe('WLP'.slice(0, 3).split('').map((_, k) => ['W', 'L', 'P'][(67 + k) % 3]).join(''));
    // thirteen losses in a row show as thirteen in a row
    for (let i = 0; i < 13; i++) addRound(c, { ...o, net: -1 });
    expect(c.recent!.endsWith('L'.repeat(13))).toBe(true);
    expect(c.maxRun).toBeGreaterThanOrEqual(13);
  });
});
