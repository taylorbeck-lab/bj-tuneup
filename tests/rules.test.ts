import { describe, it, expect } from 'vitest';
import { BUILT_IN_PRESETS, DEFAULT_RULES, normalizeRules, rulesLabel, canDoubleTotal } from '../src/engine/rules';
import { cardLabel, parseCard, valueOf, handTotal, isBlackjack, makeCard } from '../src/engine/cards';
import { mergeSettings } from '../src/store/settings';

describe('rules', () => {
  it('defaults to a 2-deck H17 DAS pitch game', () => {
    expect(DEFAULT_RULES.decks).toBe(2);
    expect(DEFAULT_RULES.h17).toBe(true);
    expect(DEFAULT_RULES.das).toBe(true);
    expect(rulesLabel(DEFAULT_RULES)).toBe('2D H17 DAS 3:2');
  });
  it('normalizes bad input', () => {
    const r = normalizeRules({ decks: 3 as never, penetration: 2, seats: 12, maxSplitHands: 0, burn: 5 });
    expect(r.decks).toBe(2);
    expect(r.penetration).toBeLessThanOrEqual(0.92);
    expect(r.seats).toBe(6);
    expect(r.maxSplitHands).toBe(1);
    expect(r.burn).toBe(1);
  });
  it('has the required presets', () => {
    const names = BUILT_IN_PRESETS.map((p) => p.name);
    expect(names).toContain('Downtown 2D H17');
    expect(names).toContain('6D H17 DAS LS');
    expect(names).toContain('6D S17 DAS LS');
    for (const p of BUILT_IN_PRESETS) expect(normalizeRules(p.rules)).toEqual(p.rules);
  });
  it('double restrictions', () => {
    const r = { ...DEFAULT_RULES, doubleOn: '10-11' as const };
    expect(canDoubleTotal(r, 9, false)).toBe(false);
    expect(canDoubleTotal(r, 10, false)).toBe(true);
    expect(canDoubleTotal(r, 18, true)).toBe(false);
    expect(canDoubleTotal({ ...r, doubleOn: '9-11' }, 9, false)).toBe(true);
    expect(canDoubleTotal(DEFAULT_RULES, 18, true)).toBe(true);
  });
  it('settings merge keeps defaults for missing fields', () => {
    const s = mergeSettings({ theme: 'light' });
    expect(s.theme).toBe('light');
    expect(s.rules.decks).toBe(2);
    expect(s.count.deckGranularity).toBe(0.5);
  });
});

describe('cards', () => {
  it('parses and labels', () => {
    expect(cardLabel(parseCard('KS'))).toBe('K♠');
    expect(cardLabel(parseCard('10h'))).toBe('10♥');
    expect(parseCard('Q♥')).toBe(makeCard(11, 1));
    expect(parseCard('TD')).toBe(makeCard(9, 2));
    expect(parseCard('ZZ')).toBe(-1);
  });
  it('values and totals', () => {
    expect(valueOf(makeCard(0, 0))).toBe(1);
    expect(valueOf(makeCard(12, 3))).toBe(10);
    expect(handTotal([1, 6])).toEqual({ total: 17, soft: true });
    expect(handTotal([1, 6, 10])).toEqual({ total: 17, soft: false });
    expect(handTotal([1, 1, 9])).toEqual({ total: 21, soft: true });
    expect(isBlackjack([10, 1])).toBe(true);
    expect(isBlackjack([10, 1, 10])).toBe(false);
  });
});
