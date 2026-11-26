import { describe, it, expect, beforeAll } from 'vitest';
import { Table } from '../src/engine/game';
import { DEFAULT_RULES, type Rules } from '../src/engine/rules';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import { makeCard, type CardId } from '../src/engine/cards';
import type { Chart } from '../src/engine/strategy/chart';

// With cardPause the dealer puts down a double's card, and each split hand's second card, one step at a time.
const C = (v: number, suit = 0): CardId => makeCard(v === 1 ? 0 : v === 10 ? 12 : v - 1, suit);
let chart: Chart;
beforeAll(() => {
  chart = generateBasicStrategy(DEFAULT_RULES).chart;
});
function table(stack: number[], rules: Partial<Rules> = {}, cardPause = true) {
  const t = new Table({ rules: { ...DEFAULT_RULES, burn: 0, ...rules }, seats: 1, humanSeat: 0, chart, seed: 1, granularity: 0, rounding: 'floor', cardPause });
  const used = new Map<number, number>();
  t.shoe.stack(
    stack.map((v) => {
      const n = used.get(v) ?? 0;
      used.set(v, n + 1);
      return C(v, n % 4);
    }),
  );
  return t;
}
const sizes = (t: Table) => t.human.hands.map((h) => h.cards.length);

describe('one card at a time after a split or double (cardPause)', () => {
  it('split, double the first hand: the double card, then the second hand’s card, each its own step', () => {
    // P 8, D 6, P 8, hole 10 | split: hand 1 gets 3 (11), double gets 10; hand 2 gets 10 (18)
    const t = table([8, 6, 8, 10, 3, 10, 10, 10]);
    t.placeBet(1);
    t.runToHuman();
    t.act('split');
    // the cards are separated; nothing dealt yet
    expect(sizes(t)).toEqual([1, 1]);
    expect(t.owesCard).toBe('split');
    expect(t.waitingForHuman).toBe(false);
    expect(t.legalActions()).toEqual([]);
    t.step();
    expect(sizes(t)).toEqual([2, 1]);
    expect(t.waitingForHuman).toBe(true);
    t.act('double');
    // chips down, the card not yet
    expect(sizes(t)).toEqual([2, 1]);
    expect(t.owesCard).toBe('double');
    expect(() => t.act('stand')).toThrow();
    t.step();
    expect(sizes(t)).toEqual([3, 1]);
    // the second hand's card is the next step, not the same instant
    expect(t.owesCard).toBe('split');
    t.step();
    expect(sizes(t)).toEqual([3, 2]);
    expect(t.waitingForHuman).toBe(true);
    t.act('stand');
    t.runToHuman();
    expect(t.phase).toBe('settled');
    expect(t.logs[0].net).toBe(3);
  });
  it('split aces: one card each, dealt one at a time', () => {
    const t = table([1, 7, 1, 10, 10, 9, 10]);
    t.placeBet(1);
    t.runToHuman();
    t.act('split');
    expect(sizes(t)).toEqual([1, 1]);
    t.step();
    expect(sizes(t)).toEqual([2, 1]);
    t.step();
    expect(sizes(t)).toEqual([2, 2]);
    t.runToHuman();
    expect(t.phase).toBe('settled');
    expect(t.logs[0].net).toBe(2);
  });
  it('a plain double: the card is a step after the chips', () => {
    const t = table([6, 6, 5, 10, 10, 10]);
    t.placeBet(1);
    t.runToHuman();
    t.act('double');
    expect(sizes(t)).toEqual([2]);
    t.step();
    expect(sizes(t)).toEqual([3]);
    t.runToHuman();
    // 6,5 doubles to 21; the dealer's 16 draws a ten and busts
    expect(t.logs[0].net).toBe(2);
  });
  it('same cards and results with or without the pause', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const run = (cardPause: boolean) => {
        const t = new Table({ rules: { ...DEFAULT_RULES }, seats: 3, humanSeat: 1, chart, seed, granularity: 0.5, rounding: 'floor', cardPause });
        const out: number[] = [];
        for (let r = 0; r < 30; r++) {
          t.placeBet(1);
          for (let i = 0; i < 500 && t.phase !== 'settled'; i++) {
            if (t.waitingForHuman && t.phase === 'play') {
              const legal = t.legalActions();
              t.act(legal.includes('split') ? 'split' : legal.includes('double') ? 'double' : 'stand');
            } else if (t.waitingForHuman && t.phase === 'insurance') t.insure(false);
            else t.step();
          }
          out.push(t.logs[t.logs.length - 1].net);
        }
        return out;
      };
      expect(run(true)).toEqual(run(false));
    }
  });
});
