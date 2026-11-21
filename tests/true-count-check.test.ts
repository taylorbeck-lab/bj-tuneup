import { describe, it, expect } from 'vitest';
import { trueCountCheck } from '../src/v2/count/trueCount';

describe('the true count check', () => {
  it('marks the answer the sheet works out as right (the reported case: up 6 with about one deck in the tray estimate)', () => {
    // 40 cards left: the tray reads about 1 deck left, so up 6 ÷ 1 = up 6; exact is 6 ÷ 0.77 ≈ 7.8
    const c = trueCountCheck(6, 40, 6);
    expect(c.decksLeft).toBe(1);
    expect(c.shown).toBe(6);
    expect(c.right).toBe(true);
  });
  it('accepts within one of the table method or of the exact value, and nothing further off', () => {
    expect(trueCountCheck(6, 40, 5).right).toBe(true);
    expect(trueCountCheck(6, 40, 8).right).toBe(true); // close to the exact 7.8
    expect(trueCountCheck(6, 40, 3).right).toBe(false);
    expect(trueCountCheck(6, 40, 10).right).toBe(false);
    expect(trueCountCheck(-4, 80, -3).right).toBe(true);
    expect(trueCountCheck(0, 60, 0).right).toBe(true);
    expect(trueCountCheck(6, 40, null).right).toBe(false);
  });
  it('whatever the cards left, the worked-out value is always marked right', () => {
    for (let unseen = 10; unseen <= 312; unseen += 7)
      for (let rc = -12; rc <= 12; rc++) {
        const c = trueCountCheck(rc, unseen);
        expect(trueCountCheck(rc, unseen, c.shown).right).toBe(true);
      }
  });
});
