import { describe, it, expect } from 'vitest';
import { planSession, rampUnits, verdict } from '../src/engine/plan';
import { computeEdgeModel } from '../src/engine/edge';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import { DEFAULT_RULES, type Rules } from '../src/engine/rules';

const game = (o: Partial<Rules>) => {
  const rules = { ...DEFAULT_RULES, h17: true, das: true, ...o };
  const chart = generateBasicStrategy(rules).chart;
  return { rules, model: computeEdgeModel(rules, chart) };
};

describe('planning a session', () => {
  it('ramps from 1 unit to the top bet by the true count', () => {
    expect(rampUnits(0, 8, 2)).toBe(1);
    expect(rampUnits(1.9, 8, 2)).toBe(1);
    expect(rampUnits(4, 8, 2)).toBe(8);
    expect(rampUnits(9, 8, 2)).toBe(8);
    expect(rampUnits(5, 12, 6)).toBe(12);
    expect(rampUnits(3, 12, 6)).toBeLessThan(12);
  });

  it('a deep double deck with a real spread is a strike game; a shallow six-deck shoe with 1-3 loses', () => {
    const dd = game({ decks: 2, penetration: 0.75 });
    const p = planSession({ ...dd, players: 4, minutes: 60, unit: 25, buyIn: 1000, winGoal: 1000 }, [1, 8]);
    const flat = p.spreads[0];
    const wide = p.spreads[1];
    // a flat bettor gets the edge off the top
    expect(Math.abs(flat.edge - dd.model.base)).toBeLessThan(0.001);
    expect(wide.edge).toBeGreaterThan(0.007);
    expect(wide.perHour).toBeGreaterThan(0);
    expect(verdict(dd.rules, wide).tone).not.toBe('walk');

    const six = game({ decks: 6, penetration: 0.7 });
    const q = planSession({ ...six, players: 4, minutes: 60, unit: 25, buyIn: 1000, winGoal: null }, [3]);
    expect(q.spreads[0].edge).toBeLessThan(0.002);
    expect(p.favourable).toBeGreaterThan(q.favourable);
  }, 120000);

  it('6:5 is a walk-away whatever the count says', () => {
    const g = game({ decks: 2, penetration: 0.75, bjPayout: 1.2 });
    const p = planSession({ ...g, players: 2, minutes: 60, unit: 10, buyIn: 500, winGoal: null }, [8]);
    expect(verdict(g.rules, p.spreads[0]).tone).toBe('walk');
  }, 120000);

  it('sessions stop at the win goal or when the buy-in is gone, and the chances add up', () => {
    const dd = game({ decks: 2, penetration: 0.75 });
    const p = planSession({ ...dd, players: 1, minutes: 60, unit: 25, buyIn: 500, winGoal: 500 }, [8]);
    const s = p.spreads[0];
    expect(s.pGoal + s.pBust).toBeLessThanOrEqual(1);
    expect(s.pGoal).toBeGreaterThan(0.05);
    expect(s.pBust).toBeGreaterThan(0.01);
    expect(p.hands).toBe(200);
  }, 120000);
});
