import { describe, it, expect } from 'vitest';
import { planTuneUp, tuneUpVerdict, type StageOutcome } from '../src/engine/tuneup';
import { update, weight, MASTERED_BOX } from '../src/store/srs';

const targets = { countdownSecPerDeck: 25, accuracyPct: 95, evLostPer100: 2 };

describe('tune-up', () => {
  it('plans more work on weak spots and adds BS only when leaking', () => {
    const base = planTuneUp({}, targets);
    expect(base.map((s) => s.id)).toEqual(['countdown', 'running', 'truecount', 'dev', 'sim']);
    const weak = planTuneUp({ 'drill:truecount': 0.8, 'drill:bs': 0.9 }, targets);
    expect(weak.find((s) => s.id === 'truecount')!.n).toBeGreaterThan(base.find((s) => s.id === 'truecount')!.n);
    expect(weak.some((s) => s.id === 'bs')).toBe(true);
  });
  it('verdict: READY only when every target is met; top 3 most costly mistakes', () => {
    const good: StageOutcome[] = [
      { id: 'countdown', total: 1, correct: 1, avgMs: 20000, evLost: 0, mistakes: [], metrics: { secPerDeck: 22 } },
      { id: 'dev', total: 20, correct: 20, avgMs: 1500, evLost: 0, mistakes: [] },
      { id: 'sim', total: 60, correct: 59, avgMs: 0, evLost: 0.5, mistakes: [{ key: 'a', label: 'x', detail: '', evLost: 0.5 }], metrics: { hands: 30 } },
    ];
    const v = tuneUpVerdict(good, targets);
    expect(v.ready).toBe(true);
    expect(v.evLostPer100).toBeCloseTo(100 * 0.5 / 30, 10);
    const bad = good.map((o) => (o.id === 'countdown' ? { ...o, metrics: { secPerDeck: 31 } } : o));
    bad.push({ id: 'truecount', total: 3, correct: 0, avgMs: 3000, evLost: 0, mistakes: [
      { key: 't', label: 'tc1', detail: '' }, { key: 't', label: 'tc2', detail: '' }, { key: 't', label: 'tc1', detail: '' }] });
    const v2 = tuneUpVerdict(bad, targets);
    expect(v2.ready).toBe(false);
    expect(v2.checks.find((c) => c.name === 'Countdown speed')!.pass).toBe(false);
    expect(v2.top3.map((m) => m.label)).toEqual(['x', 'tc1', 'tc2']);
  });
});

describe('spaced repetition', () => {
  it('misses reset to box 0 and weigh most; hits climb to mastered', () => {
    let it = update(undefined, 'k', false, 0);
    expect(it.box).toBe(0);
    expect(weight(it, 0)).toBeGreaterThan(weight(undefined, 0));
    for (let i = 0; i < 5; i++) it = update(it, 'k', true, 1000 * i);
    expect(it.box).toBeGreaterThanOrEqual(MASTERED_BOX);
    expect(weight(it, 0)).toBeLessThan(weight(undefined, 0));
    expect(it.hits).toBe(5);
    expect(it.misses).toBe(1);
  });
});
