import { describe, it, expect } from 'vitest';
import { toFeelRecord, feelStats, feelRating, takeaways, situations, type GradedLike } from '../src/engine/feel';

const base = (o: Partial<GradedLike>): GradedLike => ({
  values: [10, 6],
  up: 10,
  tc: 0,
  bet: 1,
  chosen: 'hit',
  chart: 'hit',
  index: 'hit',
  best: 'hit',
  evChosen: -0.52,
  evChart: -0.52,
  evBest: -0.52,
  ...o,
});

describe('feel scoring', () => {
  it('classifies chart, index and feel plays', () => {
    expect(toFeelRecord(base({})).kind).toBe('chart');
    expect(toFeelRecord(base({ chosen: 'stand', index: 'stand', tc: 1 })).kind).toBe('index');
    const r = toFeelRecord(base({ values: [1, 3], up: 4, chosen: 'double', chart: 'hit', index: 'hit', best: 'double', tc: 6 }));
    expect(r.kind).toBe('feel');
    expect(r.label).toBe('A,3 v 4');
    expect(r.sit).toBe('s14v4:double');
  });
  it('rating: 50 for pure chart play, 100 when every gain is captured, below 50 when departures cost', () => {
    const chartOnly = [toFeelRecord(base({}))];
    expect(feelStats(chartOnly).rating).toBe(50);
    const perfect = [toFeelRecord(base({ chosen: 'double', best: 'double', evChosen: 0.1, evBest: 0.1, evChart: 0.05 }))];
    expect(feelStats(perfect).rating).toBe(100);
    const leaky = [toFeelRecord(base({ chosen: 'split', best: 'hit', evChosen: -0.2, evBest: 0.05, evChart: 0.05 }))];
    expect(feelStats(leaky).rating).toBeLessThan(50);
    // missing an available gain (chart play when exact differs) does not move C but raises O
    const missed = [toFeelRecord(base({ best: 'stand', evBest: -0.5, evChart: -0.52, evChosen: -0.52 })), ...perfect];
    const s = feelStats(missed);
    expect(s.rating).toBeGreaterThan(50);
    expect(s.rating).toBeLessThan(100);
    expect(s.missedEV).toBeCloseTo(0.02, 10);
    expect(feelRating(0, 0, 0)).toBe(50);
  });
  it('takeaways in plain language', () => {
    const recs = [
      ...Array.from({ length: 8 }, () => toFeelRecord(base({ values: [1, 3], up: 4, tc: 5, chosen: 'double', chart: 'hit', best: 'double', evChosen: 0.12, evChart: 0.1, evBest: 0.12 }))),
      toFeelRecord(base({ values: [1, 3], up: 4, tc: 6, chosen: 'double', chart: 'hit', best: 'hit', evChosen: 0.09, evChart: 0.1, evBest: 0.1 })),
      ...Array.from({ length: 3 }, () => toFeelRecord(base({ values: [4, 4], up: 4, tc: 4, chosen: 'split', chart: 'hit', best: 'hit', evChosen: 0.0, evChart: 0.2, evBest: 0.2 }))),
    ];
    const t = takeaways(recs);
    expect(t[0]).toBe('Your A,3 doubles vs 4 at TC +5 and higher were right 8 of 9 times (+0.15 units vs the chart).');
    expect(t.some((x) => x.startsWith('Your 4,4 splits vs 4 cost 0.60 units'))).toBe(true);
    expect(situations(recs).length).toBe(2);
  });
});
