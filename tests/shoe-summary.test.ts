import { describe, it, expect } from 'vitest';
import { summariseShoe, shoeLine } from '../src/v2/count/shoe';
import type { RoundLog } from '../src/engine/game';

const r = (tc: number, units: number, net: number): RoundLog => ({ round: 0, bet: { round: 0, units, tc, tcExact: tc, rc: 0, unseen: [] }, decisions: [], dealt: [], dealer: [], playerHands: [], net, dealerBJ: false });

describe('end-of-shoe summary', () => {
  it('a hot shoe you pressed', () => {
    const s = summariseShoe([r(0, 10, -10), r(1, 10, 10), r(3, 40, 40), r(5, 80, 80), r(2, 20, -20)])!;
    expect(s.hands).toBe(5);
    expect(s.peakTc).toBe(5);
    expect(s.verdict).toBe('hot');
    expect(s.favoured).toBe(3);
    expect(s.bestEdge).toBeCloseTo(0.02, 5);
    expect(s.net).toBe(100);
    expect(shoeLine(s)).toMatch(/pressed it/);
  });
  it('a hot shoe bet flat', () => {
    const s = summariseShoe([r(0, 10, 0), r(3, 10, 10), r(4, 10, 10)])!;
    expect(s.verdict).toBe('hot');
    expect(shoeLine(s)).toMatch(/bet it flat/);
  });
  it('a shoe that peaked low and ended deep negative is not called hot', () => {
    const s = summariseShoe([r(0, 20, 0), r(2, 20, 20), r(1, 20, -20), r(-1, 20, -20), r(-4, 20, -20), r(-10, 20, 0)])!;
    expect(s.verdict).not.toBe('hot');
    expect(shoeLine(s)).toMatch(/good spots/);
  });
  it('a cold shoe', () => {
    const s = summariseShoe([r(-1, 10, -10), r(-3, 10, 10), r(0, 10, -10)])!;
    expect(s.verdict).toBe('cold');
    expect(s.favoured).toBe(0);
    expect(shoeLine(s)).toMatch(/Cold shoe/);
  });
  it('nothing played, nothing to say', () => {
    expect(summariseShoe([])).toBeNull();
  });
});
