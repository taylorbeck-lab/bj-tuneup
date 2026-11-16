import { describe, it, expect } from 'vitest';
import { thinkFactor, thinkMs, personality } from '../src/v2/table/pace';
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
    expect(Math.min(...times)).toBeGreaterThanOrEqual(700 * 0.45);
    expect(Math.max(...times)).toBeLessThanOrEqual(700 * 7);
    expect(new Set(times).size).toBeGreaterThan(500);
    const avg = (pace: number) => Array.from({ length: 2000 }, () => thinkMs(700, 1.5, pace, r)).reduce((a, b) => a + b) / 2000;
    expect(avg(1.4)).toBeGreaterThan(avg(0.7) * 1.6);
    const p = Array.from({ length: 500 }, () => personality(r));
    expect(Math.min(...p)).toBeGreaterThanOrEqual(0.65);
    expect(Math.max(...p)).toBeLessThanOrEqual(1.5);
  });
});
