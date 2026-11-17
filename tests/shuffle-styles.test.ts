import { describe, it, expect, beforeAll } from 'vitest';
import { Table } from '../src/engine/game';
import { DEFAULT_RULES } from '../src/engine/rules';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import type { Chart } from '../src/engine/strategy/chart';
import { riffle, strip, dealerShuffle, pickupPile } from '../src/engine/handShuffle';
import { mulberry32 } from '../src/engine/rng';
import { mergeV2 } from '../src/v2/settings';

let chart: Chart;
beforeAll(() => {
  chart = generateBasicStrategy(DEFAULT_RULES).chart;
});
const sorted = (xs: number[]) => xs.slice().sort((a, b) => a - b);
const play = (t: Table) => {
  t.placeBet(1);
  let g = 0;
  while (t.phase !== 'settled' && g++ < 100) {
    if (t.phase === 'insurance') t.insure(false);
    else if (t.waitingForHuman && t.phase === 'play') t.act('stand');
    else t.step();
  }
};

describe("a dealer's hand shuffle", () => {
  it('only ever reorders the same cards', () => {
    const r = mulberry32(5);
    const two = Array.from({ length: 104 }, (_, i) => i % 52);
    const six = Array.from({ length: 312 }, (_, i) => i % 52);
    expect(sorted(riffle(two, r))).toEqual(sorted(two));
    expect(sorted(strip(two, r))).toEqual(sorted(two));
    expect(sorted(dealerShuffle(two, 2, r))).toEqual(sorted(two));
    expect(sorted(dealerShuffle(six, 6, r))).toEqual(sorted(six));
  });

  it('builds each new shoe from the last one: a full shoe, from the pile the dealer picked up', () => {
    const rules = { ...DEFAULT_RULES, decks: 2 as const };
    const t = new Table({ rules, seats: 3, humanSeat: 0, chart, seed: 7, granularity: 0.5, rounding: 'floor', shuffleStyle: 'hand' });
    let shoes = 0;
    while (shoes < 15) {
      if (t.needsShuffle) {
        const pile = pickupPile(t.shoe.burned, t.shoeRounds().map((r) => r.dealt), t.shoe.cards.slice(t.shoe.pos));
        expect(sorted(pile)).toEqual(sorted(t.shoe.cards));
        t.reshuffle();
        const counts = new Array(52).fill(0);
        for (const c of t.shoe.cards) counts[c]++;
        expect(counts.every((n) => n === 2)).toBe(true);
        expect(t.rc).toBe(0);
        shoes++;
      }
      play(t);
    }
  });
});

describe('settings', () => {
  it('shuffle by hand unless chosen otherwise', () => {
    expect(mergeV2(undefined).shuffle).toBe('hand');
    expect(mergeV2({ onboarded: true }).shuffle).toBe('hand');
    expect(mergeV2({ shuffle: 'machine' }).shuffle).toBe('machine');
    // an old saved continuous shuffler (removed) goes back to the hand shuffle
    expect(mergeV2({ shuffle: 'csm' as never }).shuffle).toBe('hand');
  });
});
