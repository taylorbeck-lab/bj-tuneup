import { describe, it, expect, beforeAll } from 'vitest';
import { computeEdgeModel, edgeEOR, edgeHiLo, edgeHiLoAce, countsOf, kelly, type EdgeModel } from '../src/engine/edge';
import { DEFAULT_RULES, type Rules } from '../src/engine/rules';
import { roundEV } from '../src/engine/strategy/generate';
import { fullComp } from '../src/engine/shoe';
import { mulberry32 } from '../src/engine/rng';
import { compAtTrueCount } from '../src/engine/indexgen';

// Wizard of Odds Appendix 7: 6 decks, DAS, split once, strategy re-optimised (no surrender), % player EV per card removed.
const WIZ_S17 = [0, -0.094, 0.069, 0.082, 0.11, 0.141, 0.079, 0.041, -0.008, -0.04, -0.091];
const WIZ_H17 = [0, -0.084, 0.071, 0.086, 0.117, 0.143, 0.084, 0.038, -0.01, -0.045, -0.097];
const six = (h17: boolean): Rules => ({ ...DEFAULT_RULES, decks: 6, h17, das: true, maxSplitHands: 2, lateSurrender: false });

describe('effects of removal vs Wizard of Odds Appendix 7 (6D)', () => {
  for (const [h17, ref] of [
    [false, WIZ_S17],
    [true, WIZ_H17],
  ] as const) {
    it(`${h17 ? 'H17' : 'S17'}: same sign and ordering for every rank, each within 0.02%`, () => {
      const m = computeEdgeModel(six(h17));
      for (let r = 1; r <= 10; r++) {
        expect(Math.abs(m.eor[r] * 100 - ref[r]), `rank ${r}: ${(m.eor[r] * 100).toFixed(4)} vs ${ref[r]}`).toBeLessThan(0.02);
        if (Math.abs(ref[r]) > 0.02) expect(Math.sign(m.eor[r])).toBe(Math.sign(ref[r]));
      }
      const order = (xs: number[]) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].sort((a, b) => xs[a] - xs[b]).join(',');
      expect(order(m.eor)).toBe(order(ref));
      // classic Hi-Lo slope: about half a percent per true count
      expect(m.beta).toBeGreaterThan(0.004);
      expect(m.beta).toBeLessThan(0.007);
    });
  }
});

describe('edge model vs exact round EV on depleted 2-deck shoes', () => {
  let m: EdgeModel;
  beforeAll(() => {
    m = computeEdgeModel(DEFAULT_RULES);
  });
  it('at realistic counts (TC −6…+6) the linear EOR edge tracks the exact edge (mean abs error < 0.25%) and beats the plain Hi-Lo estimate', () => {
    const rng = mulberry32(17);
    let errEor = 0;
    let errHilo = 0;
    let errAce = 0;
    const shoes: number[][] = [];
    for (const d of [1, 1.4])
      for (const t of [-6, -4, -2, 0, 2, 4, 6]) {
        const c = compAtTrueCount(2, d, t);
        // perturb: move 3 random cards out and 3 others in, keeping the size (composition noise beyond the count)
        for (let i = 0; i < 3; i++) {
          let a = 1 + Math.floor(rng() * 10);
          while (c[a] === 0) a = 1 + Math.floor(rng() * 10);
          let b = 1 + Math.floor(rng() * 10);
          while (c[b] >= fullComp(2)[b]) b = 1 + Math.floor(rng() * 10);
          c[a]--;
          c[b]++;
        }
        shoes.push(c);
      }
    const n = shoes.length;
    for (const c of shoes) {
      const exact = roundEV(c, DEFAULT_RULES);
      const { tc, aceSurplusPerDeck, decksRemaining } = countsOf(m, c);
      errEor += Math.abs(edgeEOR(m, c) - exact);
      errHilo += Math.abs(edgeHiLo(m, tc, decksRemaining) - exact);
      errAce += Math.abs(edgeHiLoAce(m, tc, aceSurplusPerDeck, decksRemaining) - exact);
    }
    expect(errEor / n).toBeLessThan(0.0025);
    expect(errEor).toBeLessThan(errHilo);
    expect(errAce).toBeLessThan(errHilo);
  });
  it('kelly', () => {
    expect(kelly(10000, 0.0133).full).toBeCloseTo(100, 6);
    expect(kelly(10000, 0.0133).half).toBeCloseTo(50, 6);
    expect(kelly(10000, -0.01).full).toBe(0);
  });
});

describe('edge model verified by simulation', () => {
  it('2D H17: mean result of rounds dealt at TC >= +2 matches the model prediction within 3 SE', async () => {
    const { Table } = await import('../src/engine/game');
    const { generateBasicStrategy } = await import('../src/engine/strategy/generate');
    const { chartAction } = await import('../src/engine/strategy/chart');
    const { valueOf } = await import('../src/engine/cards');
    const rules = { ...DEFAULT_RULES, burn: 0 };
    const chart = generateBasicStrategy(rules).chart;
    const m = computeEdgeModel(rules, chart);
    const t = new Table({ rules, seats: 1, humanSeat: 0, chart, seed: 77, granularity: 0, rounding: 'floor' });
    let n = 0;
    let sum = 0;
    let sq = 0;
    let pred = 0;
    for (let i = 0; i < 1500000; i++) {
      const tcExact = t.needsShuffle ? 0 : t.tcExact();
      const unseen = t.unseen();
      t.placeBet(1);
      for (;;) {
        t.runToHuman();
        if (t.phase === 'insurance') {
          t.insure(false);
          continue;
        }
        if (t.phase !== 'play') break;
        const s = t.human;
        const h = s.hands[t.turn.hand];
        const a = chartAction(chart, h.cards.map(valueOf), valueOf(t.dealer[0]), t.availFor(h, s));
        t.act(t.legalActions().includes(a) ? a : 'stand');
      }
      const r = t.logs[t.logs.length - 1].net;
      t.logs.length = 0;
      if (tcExact >= 2 && t.current!.bet.unseen.reduce((a, b) => a + b, 0) === unseen.reduce((a, b) => a + b, 0)) {
        n++;
        sum += r;
        sq += r * r;
        pred += edgeEOR(m, unseen);
      }
    }
    const mean = sum / n;
    const se = Math.sqrt(sq / n - mean * mean) / Math.sqrt(n);
    expect(n).toBeGreaterThan(50000);
    expect(Math.abs(mean - pred / n)).toBeLessThan(3 * se);
    expect(mean).toBeGreaterThan(0);
  });
});
