import { describe, it, expect } from 'vitest';
import { Table } from '../src/engine/game';
import { DEFAULT_RULES } from '../src/engine/rules';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import { analyzeDecision } from '../src/engine/ev/analyze';
import { gradeDecision, gradeInsurance } from '../src/engine/grade';
import { REFERENCE_INDICES } from '../src/engine/indices';
import { makeCard } from '../src/engine/cards';
import { insuranceEV } from '../src/engine/ev/engine';

const C = (v: number, s = 0) => makeCard(v === 1 ? 0 : v === 10 ? 12 : v - 1, s);
const chart = generateBasicStrategy(DEFAULT_RULES).chart;

describe('grading', () => {
  it('a wrong stand on 9 v T is an error that costs EV; analyzer EVs come from the unseen cards', () => {
    const t = new Table({ rules: { ...DEFAULT_RULES, burn: 0 }, seats: 1, humanSeat: 0, chart, seed: 5, granularity: 0, rounding: 'floor' });
    t.shoe.stack([C(2), C(10), C(7, 1), C(9)]);
    t.placeBet(1);
    t.runToHuman();
    const snap = t.act('stand');
    expect(snap.unseen.reduce((a, b) => a + b, 0)).toBe(104 - 3);
    const evs = analyzeDecision(snap.unseen, snap.values, snap.up, t.rules, snap.avail, 1);
    const g = gradeDecision(snap, evs, chart, REFERENCE_INDICES);
    expect(g.chart).toBe('hit');
    expect(g.error).toBe(true);
    expect(g.lostVsIndex).toBeGreaterThan(0.2);
    expect(g.lostVsBest).toBeCloseTo(g.evBest - g.evChosen, 12);
  });
  it('insurance grading uses the exact ten density', () => {
    const unseen = [0, 7, 8, 8, 8, 8, 8, 8, 8, 8, 32]; // ten-rich: 32/103
    const g = gradeInsurance({ round: 1, unseen, tc: 4, tcExact: 4, take: true, evenMoney: false }, REFERENCE_INDICES);
    expect(g.ev).toBeCloseTo(insuranceEV(unseen), 12);
    expect(g.shouldTake).toBe(true);
    expect(g.error).toBe(false);
    const g2 = gradeInsurance({ round: 1, unseen, tc: 1, tcExact: 1, take: true, evenMoney: false }, REFERENCE_INDICES);
    expect(g2.error).toBe(true);
  });
});
