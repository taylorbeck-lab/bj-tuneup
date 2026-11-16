import { describe, it, expect } from 'vitest';
import { initialBots, betweenHands, atShuffle, headsUpRounds, TRAFFIC_RANGE } from '../src/v2/table/traffic';
import { mulberry32 } from '../src/engine/rng';
import { mergeV2 } from '../src/v2/settings';

describe('table traffic', () => {
  it('keeps each kind of table within its range, never in your seats', () => {
    for (const traffic of ['quiet', 'normal', 'busy'] as const) {
      const r = mulberry32(3);
      const mine = [3];
      let bots = initialBots(traffic, mine, r);
      const sizes = new Set<number>();
      let moves = 0;
      for (let shoe = 0; shoe < 300; shoe++) {
        for (let h = 0; h < 6; h++) {
          const c = betweenHands(bots, traffic, mine, r);
          moves += c.joined + c.left;
          bots = c.bots;
        }
        const c = atShuffle(bots, traffic, mine, r);
        moves += c.joined + c.left;
        bots = c.bots;
        const n = bots.length + 1;
        sizes.add(n);
        const [lo, hi] = TRAFFIC_RANGE[traffic];
        expect(n).toBeGreaterThanOrEqual(lo);
        expect(n).toBeLessThanOrEqual(hi);
        expect(bots.some((b) => mine.includes(b))).toBe(false);
        expect(new Set(bots).size).toBe(bots.length);
      }
      expect(moves).toBeGreaterThan(50);
      expect(sizes.size).toBeGreaterThan(1);
    }
  });

  it('most of the coming and going happens at the shuffle', () => {
    const r = mulberry32(9);
    const mine = [4];
    let mid = 0;
    let shuffle = 0;
    let bots = initialBots('normal', mine, r);
    for (let shoe = 0; shoe < 300; shoe++) {
      for (let h = 0; h < 6; h++) {
        const c = betweenHands(bots, 'normal', mine, r);
        mid += c.joined + c.left;
        bots = c.bots;
      }
      const c = atShuffle(bots, 'normal', mine, r);
      shuffle += c.joined + c.left;
      bots = c.bots;
    }
    expect(shuffle).toBeGreaterThan(mid);
  });

  it('a busier table deals fewer rounds per shoe', () => {
    expect(headsUpRounds(6, 4)).toBeGreaterThanOrEqual(13);
    expect(headsUpRounds(10, 1)).toBe(10);
  });

  it('a player count chosen on purpose stays fixed; the default table has traffic', () => {
    expect(mergeV2({ players: 1, onboarded: true }).traffic).toBe('off');
    expect(mergeV2({ players: 4, onboarded: true }).traffic).toBe('normal');
    expect(mergeV2(undefined).traffic).toBe('normal');
  });
});
