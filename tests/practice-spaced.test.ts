import { describe, it, expect } from 'vitest';
import { nextSchedule, pickPractice, INTERVALS, FIRST_GAP, PRACTICE_GAP, type Schedule } from '../src/v2/practice';
import type { V2Stats } from '../src/v2/stats';

const rng = () => 0.5;
const stats = (sits: V2Stats['sits']): V2Stats => ({ decisions: 0, right: 0, deviations: { n: 0, right: 0 }, sits, count: { n: 0, rcRight: 0, tcRight: 0, recent: [] }, insurance: { n: 0, right: 0 }, bets: { n: 0, right: 0 }, days: {} });
const sit = (sched?: Schedule, recent: number[] = [0]) => ({ n: recent.length, right: recent.filter(Boolean).length, recent, label: 'A,7 vs 7', sched });

describe('spaced practice', () => {
  it('a miss comes back a few hands later, then about 30, then about 100, then it is learned', () => {
    let s = nextSchedule(undefined, false, 50, rng)!;
    expect(s.step).toBe(0);
    expect(s.due - 50).toBeGreaterThanOrEqual(FIRST_GAP[0]);
    expect(s.due - 50).toBeLessThanOrEqual(FIRST_GAP[1]);
    // right before it's due (it came up on its own): the date holds
    expect(nextSchedule(s, true, s.due - 1, rng)).toEqual(s);
    s = nextSchedule(s, true, s.due, rng)!;
    expect(s).toMatchObject({ step: 1 });
    expect(s.due).toBeGreaterThanOrEqual(50 + FIRST_GAP[0] + INTERVALS[0]);
    s = nextSchedule(s, true, s.due, rng)!;
    expect(s).toMatchObject({ step: 2 });
    expect(nextSchedule(s, true, s.due, rng)).toBeUndefined();
    // a miss on the way starts it over
    expect(nextSchedule({ step: 2, due: 300 }, false, 300, rng)).toMatchObject({ step: 0 });
    // a right play with nothing scheduled schedules nothing
    expect(nextSchedule(undefined, true, 10, rng)).toBeUndefined();
  });

  it('deals it only once it is due, never two practice hands close together, and tapers with the level', () => {
    const st = stats({ s18v7: sit({ step: 0, due: 60 }) });
    expect(pickPractice(st, rng, { hands: 55, lastPractice: -Infinity, level: 1 })).toBeNull();
    expect(pickPractice(st, rng, { hands: 60, lastPractice: -Infinity, level: 1 })).toMatchObject({ key: 's18v7', values: [1, 7], up: 7 });
    expect(pickPractice(st, rng, { hands: 61, lastPractice: 60, level: 1 })).toBeNull();
    expect(pickPractice(st, rng, { hands: 60 + PRACTICE_GAP[1], lastPractice: 60, level: 1 })).not.toBeNull();
    expect(pickPractice(st, rng, { hands: 65, lastPractice: 60, level: 2 })).toBeNull();
    expect(pickPractice(st, rng, { hands: 60 + PRACTICE_GAP[2], lastPractice: 60, level: 2 })).not.toBeNull();
    expect(pickPractice(st, rng, { hands: 10_000, lastPractice: -Infinity, level: 3 })).toBeNull();
  });

  it('never on a count in your favour, and at most one a shoe', () => {
    const st = stats({ s18v7: sit({ step: 0, due: 60 }) });
    const at = { hands: 100, lastPractice: -Infinity, level: 1 as const };
    expect(pickPractice(st, rng, { ...at, trueCount: 2 })).toBeNull();
    expect(pickPractice(st, rng, { ...at, trueCount: 1 })).toBeNull();
    expect(pickPractice(st, rng, { ...at, trueCount: 0 })).not.toBeNull();
    expect(pickPractice(st, rng, { ...at, trueCount: -3 })).not.toBeNull();
    expect(pickPractice(st, rng, { ...at, shoe: 7, lastPracticeShoe: 7 })).toBeNull();
    expect(pickPractice(st, rng, { ...at, shoe: 8, lastPracticeShoe: 7 })).not.toBeNull();
  });

  it('picks the most overdue first, and a miss saved before the schedule counts as due', () => {
    const st = stats({ h12v3: sit({ step: 1, due: 90 }), s18v7: sit({ step: 0, due: 70 }), p8v10: sit(undefined, [1, 0, 1]) });
    expect(pickPractice(st, rng, { hands: 100, lastPractice: -Infinity, level: 1 })!.key).toBe('p8v10');
    const st2 = stats({ h12v3: sit({ step: 1, due: 90 }), s18v7: sit({ step: 0, due: 70 }) });
    expect(pickPractice(st2, rng, { hands: 100, lastPractice: -Infinity, level: 1 })!.key).toBe('s18v7');
    expect(pickPractice(stats({ h12v3: sit(undefined, [1, 1, 1]) }), rng, { hands: 100, lastPractice: -Infinity, level: 1 })).toBeNull();
  });
});
