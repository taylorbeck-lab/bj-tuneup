import { describe, it, expect } from 'vitest';
import { Shoe, fullComp, compTotal } from '../src/engine/shoe';
import { hiLoTag, runningCount, trueCount, estimateDecks, roundTc, aceSideCount, Counter } from '../src/engine/count';
import { valueOf, makeCard } from '../src/engine/cards';

describe('shoe', () => {
  it('contains exactly decks x 52 cards and tracks composition', () => {
    const s = new Shoe(2, 0.65, 1, 123);
    expect(s.size).toBe(104);
    expect(s.burned.length).toBe(1);
    expect(compTotal(s.remainingByValue)).toBe(103);
    expect(compTotal(s.unseenByValue())).toBe(104);
    const counts = new Array(52).fill(0);
    for (const c of s.cards) counts[c]++;
    expect(counts.every((n) => n === 2)).toBe(true);
    const drawn = [];
    while (!s.cutReached) drawn.push(s.draw());
    expect(s.dealt).toBe(Math.round(104 * 0.65));
    // remaining composition equals full minus burned minus drawn
    const exp = fullComp(2);
    for (const c of [...s.burned, ...drawn]) exp[valueOf(c)]--;
    expect(s.remainingByValue).toEqual(exp);
    const byCard = s.remainingByCard.reduce((a, b) => a + b, 0);
    expect(byCard).toBe(s.remaining);
  });
  it('is deterministic for a seed and different across seeds', () => {
    expect(new Shoe(6, 0.75, 1, 42).cards).toEqual(new Shoe(6, 0.75, 1, 42).cards);
    expect(new Shoe(6, 0.75, 1, 42).cards).not.toEqual(new Shoe(6, 0.75, 1, 43).cards);
  });
  it('shuffle is roughly uniform (first-position rank frequency)', () => {
    const freq = new Array(13).fill(0);
    for (let i = 0; i < 13000; i++) freq[new Shoe(1, 0.7, 0, i + 1).cards[0] % 13]++;
    for (const f of freq) expect(Math.abs(f - 1000)).toBeLessThan(150);
  });
  it('can stack cards', () => {
    const s = new Shoe(1, 0.7, 0, 5);
    s.stack([makeCard(0, 0), makeCard(12, 1)]);
    expect(s.draw()).toBe(makeCard(0, 0));
    expect(s.draw()).toBe(makeCard(12, 1));
  });
  it('a full shoe counts to zero (balanced Hi-Lo)', () => {
    const s = new Shoe(8, 0.9, 0, 9);
    expect(runningCount(s.cards)).toBe(0);
  });
});

describe('count', () => {
  it('Hi-Lo tags', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(hiLoTag)).toEqual([-1, 1, 1, 1, 1, 1, 0, 0, 0, -1]);
  });
  it('deck estimation granularity', () => {
    expect(estimateDecks(78, 0.5)).toBe(1.5);
    expect(estimateDecks(70, 0.5)).toBe(1.5); // 1.346 -> nearest half = 1.5
    expect(estimateDecks(60, 1)).toBe(1);
    expect(estimateDecks(10, 0.5)).toBe(0.5); // never below one step
    expect(estimateDecks(65, 0.25)).toBe(1.25);
    expect(estimateDecks(52, 0)).toBe(1);
  });
  it('true count and rounding', () => {
    expect(trueCount(6, 78, 0.5)).toBe(4);
    expect(trueCount(7, 104, 0)).toBe(3.5);
    expect(roundTc(3.5, 'floor')).toBe(3);
    expect(roundTc(-1.5, 'floor')).toBe(-2);
    expect(roundTc(-1.5, 'trunc')).toBe(-1);
    expect(roundTc(2.5, 'round')).toBe(3);
    expect(Object.is(roundTc(-0.4, 'trunc'), -0)).toBe(false);
  });
  it('ace side count', () => {
    // 2 decks, 52 cards seen, 1 ace seen: 3 aces short of expectation -> 7 aces in 52 remaining
    const a = aceSideCount(1, 52, 2);
    expect(a.expectedSeen).toBe(4);
    expect(a.surplus).toBe(3);
    expect(a.acesRemaining).toBe(7);
    expect(a.perDeck).toBe(3);
  });
  it('counter tracks rc, aces and key cards', () => {
    const ks = makeCard(12, 0);
    const c = new Counter(2, [ks]);
    for (const card of [makeCard(1, 0), makeCard(0, 2), ks, makeCard(4, 1), ks]) c.see(card);
    expect(c.rc).toBe(1 - 1 - 1 + 1 - 1);
    expect(c.aces).toBe(1);
    expect(c.keyRemaining(ks)).toBe(0);
    expect(c.tc(0)).toBeCloseTo(-1 / (99 / 52), 10);
  });
});
