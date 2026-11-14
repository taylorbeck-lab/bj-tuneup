import { describe, it, expect } from 'vitest';
import { countdownDeck, tcAnswer, discardDecks, rampBet, kellyBet, bsItems, devItem, devCorrect, dealCountRound, hardComposition, bsItemKey } from '../src/engine/drills';
import { mulberry32 } from '../src/engine/rng';
import { hiLoCard } from '../src/engine/count';
import { DEFAULT_RULES, BUILT_IN_PRESETS } from '../src/engine/rules';
import { Shoe } from '../src/engine/shoe';
import { REFERENCE_INDICES, ILLUSTRIOUS_18, FAB_4, indexAction } from '../src/engine/indices';
import { generateBasicStrategy } from '../src/engine/strategy/generate';

const chart6 = generateBasicStrategy(BUILT_IN_PRESETS.find((p) => p.id === '6d-s17-ls')!.rules).chart;
const all = { canDouble: true, canSplit: true, canSurrender: true };

describe('drill logic', () => {
  it('countdown answer is minus the tags of removed cards', () => {
    const rng = mulberry32(1);
    for (let k = 0; k <= 3; k++) {
      const d = countdownDeck(rng, k);
      expect(d.cards.length).toBe(52 - k);
      expect(d.answer).toBe(0 - d.removed.reduce((s, c) => s + hiLoCard(c), 0) + 0);
    }
  });
  it('true count answers', () => {
    expect(tcAnswer(9, 78, 0.5, 'floor')).toBe(6);
    expect(tcAnswer(-5, 52, 0.5, 'floor')).toBe(-5);
    expect(tcAnswer(5, 70, 0.5, 'trunc')).toBe(3); // 70 cards -> 1.5 decks -> 3.33
    expect(discardDecks(39, 0.25)).toBe(0.75);
  });
  it('ramp and kelly', () => {
    const ramp = [1, 2, 4, 6, 8, 10];
    expect(rampBet(ramp, -3)).toBe(1);
    expect(rampBet(ramp, 1.9)).toBe(1);
    expect(rampBet(ramp, 2)).toBe(2);
    expect(rampBet(ramp, 4.5)).toBe(6);
    expect(rampBet(ramp, 9)).toBe(10);
    expect(kellyBet(10000, 0.01)).toBeCloseTo(75.19, 1);
    expect(kellyBet(10000, -0.01)).toBe(0);
  });
  it('bs items are unique per class and include key decisions', () => {
    const items = bsItems(DEFAULT_RULES);
    const keys = new Set(items.map((i) => bsItemKey(i.values, i.up)));
    expect(keys.size).toBe(items.length);
    expect(keys.has('bs:h16v10')).toBe(true);
    expect(keys.has('bs:p8v1')).toBe(true);
    expect(keys.has('bs:s18v9')).toBe(true);
    expect(keys.has('bs:h18v5')).toBe(false);
  });
  it('hard compositions', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const [a, b] = hardComposition(rng, 12);
      expect(a + b).toBe(12);
      expect(a).not.toBe(b);
    }
  });
});

describe('indices', () => {
  it('I18 and Fab 4 decisions', () => {
    expect(indexAction(ILLUSTRIOUS_18, chart6, [10, 6], 10, 0, { ...all, canSurrender: false }).action).toBe('stand');
    expect(indexAction(ILLUSTRIOUS_18, chart6, [10, 6], 10, -1, { ...all, canSurrender: false }).action).toBe('hit');
    expect(indexAction(REFERENCE_INDICES, chart6, [10, 5], 10, 0, all).action).toBe('surrender');
    expect(indexAction(REFERENCE_INDICES, chart6, [10, 5], 10, -1, all).action).toBe('hit');
    expect(indexAction(REFERENCE_INDICES, chart6, [10, 5], 10, 5, { ...all, canSurrender: false }).action).toBe('stand');
    expect(indexAction(REFERENCE_INDICES, chart6, [10, 10], 6, 4, all).action).toBe('split');
    expect(indexAction(REFERENCE_INDICES, chart6, [10, 10], 6, 3, all).action).toBe('stand');
    expect(indexAction(REFERENCE_INDICES, chart6, [8, 8], 10, 5, all).action).toBe('split'); // 8,8 isn't hard 16
    expect(indexAction(REFERENCE_INDICES, chart6, [5, 4, 3], 3, 3, all).action).toBe('stand'); // 12 v 3 multi-card
    expect(indexAction(REFERENCE_INDICES, chart6, [4, 3, 3], 10, 5, all).action).toBe('hit'); // 10 v 10 needs 2 cards to double
    expect(indexAction(REFERENCE_INDICES, chart6, [6, 5], 1, 0, all).action).toBe('hit');
    expect(indexAction(REFERENCE_INDICES, chart6, [6, 5], 1, 1, all).action).toBe('double');
    expect(FAB_4.length).toBe(4);
  });
  it('deviation items are centred on the index and graded', () => {
    const rng = mulberry32(9);
    for (const p of REFERENCE_INDICES) {
      const it = devItem(rng, p);
      expect(Math.abs(it.tc - p.index)).toBeLessThanOrEqual(2);
      const ans = devCorrect(it, REFERENCE_INDICES, chart6, all);
      if (p.hand.kind === 'insurance') expect(ans).toBe(it.tc >= 3 ? 'insure' : 'noinsure');
    }
  });
});

describe('count rounds', () => {
  it('reveal order contains every card dealt, and running count matches', () => {
    const rng = mulberry32(11);
    const shoe = new Shoe(2, 0.75, 1, 77);
    let rc = 0;
    while (!shoe.cutReached) {
      const r = dealCountRound(shoe, 3, true, rng);
      const all = [...r.seats.flat(), ...r.dealer];
      expect(r.order.length).toBe(all.length);
      expect([...r.order].sort()).toEqual([...all].sort());
      rc += r.order.reduce((s, c) => s + hiLoCard(c), 0);
    }
    const seen = shoe.cards.slice(shoe.burned.length, shoe.dealt);
    expect(rc).toBe(seen.reduce((s, c) => s + hiLoCard(c), 0));
  });
});
