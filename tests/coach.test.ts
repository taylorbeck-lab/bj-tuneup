import { describe, it, expect } from 'vitest';
import { gradeDecision, gradeInsurance, situationKey, handLabel } from '../src/v2/coach/grade';
import { whyBasic } from '../src/v2/coach/why';
import { gradeBet, recommendedUnits } from '../src/v2/count/bet';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import { DEFAULT_RULES } from '../src/engine/rules';
import { REFERENCE_INDICES } from '../src/engine/indices';
import type { DecisionSnapshot } from '../src/engine/game';

const chart = generateBasicStrategy({ ...DEFAULT_RULES, decks: 6 }).chart;
const snap = (values: number[], up: number, chosen: DecisionSnapshot['chosen'], tc = 0): DecisionSnapshot => ({
  round: 1, values, cards: [], up, upCard: 0, unseen: [], rc: 0, tcExact: tc, tc,
  avail: { canDouble: values.length === 2, canSplit: values.length === 2 && values[0] === values[1], canSurrender: false },
  splitHands: 1, chosen, handIndex: 0,
});

describe('V2 coach', () => {
  it('grades against the chart, and against count plays when deviations are on', () => {
    expect(gradeDecision(snap([10, 6], 10, 'hit'), chart, REFERENCE_INDICES, false).right).toBe(true);
    const v = gradeDecision(snap([10, 6], 10, 'hit', 2), chart, REFERENCE_INDICES, true);
    expect(v.right).toBe(false);
    expect(v.correct).toBe('stand');
    expect(v.countPlay?.id).toBe('16v10');
    expect(v.why).toMatch(/10s/);
    expect(gradeDecision(snap([8, 8], 10, 'split'), chart, REFERENCE_INDICES, false).why).toMatch(/16 is the worst/);
  });
  it('labels and keys', () => {
    expect(handLabel([1, 7], 9)).toBe('soft 18 vs 9');
    expect(situationKey([8, 8], 1)).toBe('p8v1');
    expect(whyBasic([5, 6], 6, 'double')).toMatch(/11/);
  });
  it('insurance: never by the chart; at +3 with count plays', () => {
    const unseen = [0, 20, 20, 20, 20, 20, 20, 20, 20, 20, 80];
    expect(gradeInsurance(true, unseen, 0, REFERENCE_INDICES, false).right).toBe(false);
    expect(gradeInsurance(true, unseen, 4, REFERENCE_INDICES, true).right).toBe(true);
  });
  it('bet coach spread', () => {
    expect(recommendedUnits(0)).toBe(1);
    expect(recommendedUnits(3.9)).toBe(4);
    expect(recommendedUnits(9)).toBe(8);
    expect(gradeBet(25, 25, -1).right).toBe(true);
    expect(gradeBet(200, 25, 0).right).toBe(false);
    expect(gradeBet(25, 25, 4).title).toBe('Bet bigger');
    expect(gradeBet(150, 25, 4).right).toBe(true);
  });
});
