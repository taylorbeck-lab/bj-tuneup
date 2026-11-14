import { describe, it, expect } from 'vitest';
import { GoalSolver, roundOutcomeDist, goalDP, goalProbAfter, mean, expect as ex, type Dist } from '../src/engine/goal';
import { EvEngine, handActionEVs } from '../src/engine/ev/engine';
import { fullComp } from '../src/engine/shoe';
import { DEFAULT_RULES } from '../src/engine/rules';
import { roundEV } from '../src/engine/strategy/generate';

const rules2 = { ...DEFAULT_RULES, maxSplitHands: 2 };
const sum = (d: Dist) => [...d.values()].reduce((a, b) => a + b, 0);

describe('goal mode', () => {
  it('with utility = net, outcome distributions reproduce the exact EVs', () => {
    for (const [hand, up] of [[[10, 6], 10], [[5, 6], 1], [[1, 7], 9], [[8, 8], 10], [[2, 2], 5], [[1, 1], 6]] as [number[], number][]) {
      const base = fullComp(2);
      base[up]--;
      const eng = new EvEngine(base, up, rules2);
      const evs = handActionEVs(eng, hand, { canDouble: true, canSplit: true, canSurrender: false });
      const gs = new GoalSolver(new EvEngine(base, up, rules2), (n) => n);
      const d = gs.actions(hand, { canDouble: true, canSplit: true, canSurrender: false });
      for (const a of ['stand', 'hit', 'double', 'split'] as const) {
        if (evs[a] === undefined) continue;
        expect(sum(d[a]!)).toBeCloseTo(1, 10);
        expect(mean(d[a]!), `${hand} v ${up} ${a}`).toBeCloseTo(evs[a]!, 9);
      }
    }
  });
  it('maximising P(win) never does worse than max-EV play at that goal', () => {
    const base = fullComp(2);
    base[10]--;
    const win = (n: number) => (n > 0 ? 1 : 0);
    for (const hand of [[10, 2], [9, 7], [10, 7], [1, 6], [4, 4]]) {
      const g = new GoalSolver(new EvEngine(base, 10, rules2), win).actions(hand, { canDouble: true, canSplit: false, canSurrender: false });
      const e = new GoalSolver(new EvEngine(base, 10, rules2), (n) => n).actions(hand, { canDouble: true, canSplit: false, canSurrender: false });
      if (g.hit) expect(ex(g.hit, win)).toBeGreaterThanOrEqual(ex(e.hit!, win) - 1e-12);
    }
  });
  it('round outcome distribution sums to 1 and its mean equals the exact round EV', () => {
    const c = fullComp(2);
    const d = roundOutcomeDist(c, rules2);
    expect(sum(d)).toBeCloseTo(1, 9);
    expect(mean(d)).toBeCloseTo(roundEV(c, rules2), 9);
    expect(d.get(1.5)! > 0.04 && d.get(1.5)! < 0.05).toBe(true);
  });
  it('bankroll DP: fair coin, and bold play when the game is unfavourable', () => {
    const coin: Dist = new Map([[-1, 0.5], [1, 0.5]]);
    const dp = goalDP(coin, 2, 1, 1, 2);
    expect(dp.V[1][2]).toBeCloseTo(0.5, 12); // bankroll 1 (half-units: 2) -> 2 in one flip
    const bad: Dist = new Map([[-1, 0.52], [1, 0.48]]);
    const dp2 = goalDP(bad, 20, 30, 1, 20);
    expect(dp2.bestBet[30][20]).toBe(10); // bankroll 10, target 20: bet it all
    expect(dp2.V[30][20]).toBeCloseTo(0.48, 9);
    // and timid play is worse
    expect(goalProbAfter(dp2, 10, 1, bad, 29)).toBeLessThan(0.48);
  });
});

describe('strike scenarios', () => {
  it('last hand: the goal-optimal bet is big enough to reach the target with one win; dealing is consistent', async () => {
    const { SCENARIOS, scenarioComp, dealFrom } = await import('../src/engine/strike');
    const s = SCENARIOS.find((x) => x.id === 'last-hand')!;
    const comp = scenarioComp(s, 2);
    const dist = roundOutcomeDist(comp, rules2);
    const dp = goalDP(dist, s.target, s.hands, s.minBet, s.maxBet, s.sitOut);
    const best = dp.bestBet[1][s.bankroll * 2];
    expect(best).toBeGreaterThanOrEqual(8);
    expect(goalProbAfter(dp, s.bankroll, best, dist, 0)).toBeGreaterThan(goalProbAfter(dp, s.bankroll, 1, dist, 0));
    const d = dealFrom(comp, 42);
    expect(d.unseen.reduce((a, b) => a + b, 0)).toBe(comp.reduce((a, b) => a + b, 0) - 3);
  });
});
