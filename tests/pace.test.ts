import { describe, it, expect } from 'vitest';
import { thinkFactor, thinkMs, personality, THINK_MIN, THINK_MAX, holeTurnMs, lingerMs, BLACKJACK_HOLD_MS, READ_PER_HAND_MS } from '../src/v2/table/pace';
import { SPEEDS } from '../src/v2/settings';
import { mulberry32 } from '../src/engine/rng';

describe('other players take realistic time', () => {
  it('snap decisions are quick, tough ones are slow', () => {
    expect(thinkFactor([10, 10], 10, true)).toBeLessThan(1);
    expect(thinkFactor([10, 9], 6, true)).toBeLessThan(1);
    expect(thinkFactor([5, 2], 9, true)).toBeLessThan(1);
    expect(thinkFactor([10, 6], 10, true)).toBeGreaterThan(2);
    expect(thinkFactor([10, 6], 7, true)).toBeGreaterThan(1.5);
    expect(thinkFactor([10, 2], 2, true)).toBeGreaterThan(1.5);
    expect(thinkFactor([1, 7], 9, true)).toBeGreaterThan(1.5);
    expect(thinkFactor([10, 6], 10, true)).toBeGreaterThan(thinkFactor([10, 7], 10, true) * 3);
  });
  it('hits after the first decision come a little quicker', () => {
    expect(thinkFactor([10, 2, 3], 10, false)).toBeLessThan(thinkFactor([10, 5], 10, true));
  });
  it('times vary, stay within bounds, and a slow player is slower on average', () => {
    const r = mulberry32(3);
    const times = Array.from({ length: 2000 }, () => thinkMs(700, 1, 1, r));
    expect(Math.min(...times)).toBeGreaterThanOrEqual(THINK_MIN);
    expect(Math.max(...times)).toBeLessThanOrEqual(THINK_MAX);
    expect(new Set(times).size).toBeGreaterThan(500);
    const avg = (pace: number) => Array.from({ length: 2000 }, () => thinkMs(700, 1.5, pace, r)).reduce((a, b) => a + b) / 2000;
    expect(avg(1.4)).toBeGreaterThan(avg(0.7) * 1.6);
    const p = Array.from({ length: 500 }, () => personality(r));
    expect(Math.min(...p)).toBeGreaterThanOrEqual(0.6);
    expect(Math.max(...p)).toBeLessThanOrEqual(1.8);
    // more quick players than slow ones, but both sit down
    expect(p.filter((x) => x < 1).length).toBeGreaterThan(p.filter((x) => x > 1.4).length);
    expect(p.filter((x) => x > 1.4).length).toBeGreaterThan(20);
  });
});

describe('table time: the pauses that belong to people stay real at every dealing speed', () => {
  const speed = (id: string) => SPEEDS.find((x) => x.id === id)!;
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const think = (id: string, factor: number) => { const r = mulberry32(7); return median(Array.from({ length: 4000 }, () => thinkMs(speed(id).card, factor, 1, r))); };

  it('the dealer deals faster, the other players do not decide in a blink', () => {
    for (const s of SPEEDS) {
      const r = mulberry32(5);
      const times = Array.from({ length: 4000 }, () => thinkMs(s.card, 0.55, 0.65, r)); // the snappiest player on the easiest hand
      expect(Math.min(...times)).toBeGreaterThanOrEqual(THINK_MIN);
    }
    // an ordinary decision takes as long at Extra fast as at Average (within a tenth), though the cards come 2.4 times as fast
    expect(think('xfast', 1.1) / think('average', 1.1)).toBeGreaterThan(0.9);
    expect(think('xfast', 1.1) / think('slow', 1.1)).toBeGreaterThan(0.85);
    expect(speed('average').card / speed('xfast').card).toBeGreaterThan(2);
    // and a tough one still takes a moment
    expect(think('xfast', 2.6)).toBeGreaterThan(2000);
    expect(think('xfast', 1.1)).toBeGreaterThan(900);
  });
  it('no two players, and no two hands, take the same time', () => {
    const r = mulberry32(11);
    const times = Array.from({ length: 6000 }, () => thinkMs(300, 1.1, personality(r), r)).sort((a, b) => a - b);
    const at = (q: number) => times[Math.floor(times.length * q)];
    // the slow end of ordinary decisions is well over twice the quick end
    expect(at(0.9) / at(0.1)).toBeGreaterThan(2.8);
    // one decision in ten keeps the table waiting two seconds or more; one in fifty, four
    expect(at(0.9)).toBeGreaterThan(2000);
    expect(at(0.98)).toBeGreaterThan(3500);
    expect(at(0.999)).toBeLessThanOrEqual(THINK_MAX);
  });
  it('a beat before the dealer turns his hole card, at any speed', () => {
    for (const s of SPEEDS) expect(holeTurnMs(s.card)).toBeGreaterThanOrEqual(650);
    expect(holeTurnMs(1050)).toBe(1050);
    expect(holeTurnMs(300, 1)).toBeGreaterThan(holeTurnMs(300, 0));
    expect(holeTurnMs(300, 1)).toBeLessThanOrEqual(950);
  });
  it('the finished round stays down long enough to read: longer with more hands on the table', () => {
    for (const s of SPEEDS) {
      expect(lingerMs(s, 1, false)).toBeGreaterThanOrEqual(1500);
      expect(lingerMs(s, 6, false)).toBeGreaterThanOrEqual(3200);
      // never shorter than the speed's own pause, and never shorter with more hands
      expect(lingerMs(s, 1, false)).toBeGreaterThanOrEqual(s.linger);
      for (let h = 1; h < 10; h++) expect(lingerMs(s, h + 1, false)).toBeGreaterThanOrEqual(lingerMs(s, h, false));
      // split hands count as hands
      expect(lingerMs(s, 10, false)).toBeGreaterThan(lingerMs(s, 6, false));
    }
    // at Extra fast, a third of a second for each hand the dealer pays or takes
    expect(lingerMs(speed('xfast'), 5, false) - lingerMs(speed('xfast'), 4, false)).toBe(READ_PER_HAND_MS);
    expect(READ_PER_HAND_MS).toBeGreaterThanOrEqual(400);
    // it varies a little, and only ever upward
    expect(lingerMs(speed('xfast'), 5, false, 1)).toBeGreaterThan(lingerMs(speed('xfast'), 5, false, 0));
    // a slower speed that already waits longer isn't slowed further at a normal table
    expect(lingerMs(speed('slow'), 4, false)).toBe(speed('slow').linger);
  });
  it('a dealer blackjack is shown before the table is cleared: three seconds at the very least', () => {
    for (const s of SPEEDS) {
      expect(lingerMs(s, 1, true)).toBeGreaterThanOrEqual(3000);
      expect(lingerMs(s, 5, true) - lingerMs(s, 5, false)).toBe(BLACKJACK_HOLD_MS);
      expect(lingerMs(s, 5, true)).toBeGreaterThanOrEqual(4500);
    }
  });
});
