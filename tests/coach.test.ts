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

describe('feedback that matches the level you play at', () => {
  // 34% of the cards left are 10s: a shoe where insurance pays
  const rich = [0, 20, 20, 20, 20, 20, 20, 20, 20, 20, 102];
  const poor = [0, 20, 20, 20, 20, 20, 20, 20, 20, 20, 60];
  const contradicts = (why: string) => /skip it/i.test(why) && /(34|35|36)% of the cards left are 10s/.test(why);

  it('counting (Level 2): a count play made at the right count is right, and the why agrees', () => {
    const ins = gradeInsurance(true, rich, 3, REFERENCE_INDICES, false, REFERENCE_INDICES);
    expect(ins.right).toBe(true);
    expect(ins.why).toMatch(/count play/i);
    expect(contradicts(ins.why)).toBe(false);
    // skipping is still fine at Level 2 (the basic play)
    expect(gradeInsurance(false, rich, 3, REFERENCE_INDICES, false, REFERENCE_INDICES).right).toBe(true);
    // taking it at a low count is still wrong
    expect(gradeInsurance(true, poor, 0, REFERENCE_INDICES, false, REFERENCE_INDICES).right).toBe(false);
    // a count play on a hand: standing on 16 vs 10 at +2 while counting
    const v = gradeDecision(snap([10, 6], 10, 'stand', 2), chart, REFERENCE_INDICES, false, 0, REFERENCE_INDICES);
    expect(v.right).toBe(true);
    expect(v.countPlay?.id).toBe('16v10');
    // made on your own, not held to it: it can't count toward a count-play grade that can only go up
    expect(v.accepted).toBe(true);
    expect(gradeDecision(snap([10, 6], 10, 'stand', 2), chart, REFERENCE_INDICES, true, 0, REFERENCE_INDICES).accepted).toBe(false);
    // ...but not below the count that calls for it
    expect(gradeDecision(snap([10, 6], 10, 'stand', -2), chart, REFERENCE_INDICES, false, 0, REFERENCE_INDICES).right).toBe(false);
  });

  it('not counting yet (Level 1): the chart play is right, and the why is honest about the count', () => {
    const ins = gradeInsurance(true, rich, 3, REFERENCE_INDICES, false);
    expect(ins.right).toBe(false);
    expect(ins.why).toMatch(/count play/i);
    expect(contradicts(ins.why)).toBe(false);
    expect(gradeDecision(snap([10, 6], 10, 'stand', 2), chart, REFERENCE_INDICES, false).right).toBe(false);
  });

  it('insurance whys never say skip it while saying the 10s are over a third', () => {
    for (const unseen of [rich, poor])
      for (const tc of [-2, 0, 1, 2, 3, 4, 6])
        for (const take of [true, false])
          for (const [dev, acc] of [[false, undefined], [false, REFERENCE_INDICES], [true, REFERENCE_INDICES]] as const) {
            const g = gradeInsurance(take, unseen, tc, REFERENCE_INDICES, dev, acc as never);
            expect(contradicts(g.why)).toBe(false);
            if (/skip it\.$/i.test(g.why)) expect(g.why).not.toMatch(/are 10s\)?\. .*Take it/);
          }
  });
});
