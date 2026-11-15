import { describe, it, expect } from 'vitest';
import { mergeV2, tableMax, DEFAULT_V2 } from '../src/v2/settings';
import { DEFAULT_RULES } from '../src/engine/rules';

const oldDefault = {
  rules: { ...DEFAULT_RULES, decks: 6 as const, h17: true, das: true, lateSurrender: false, penetration: 0.75, seats: 7 },
  players: 5,
  seat: 4,
  tableMin: 25,
  onboarded: true,
};

describe('house game defaults', () => {
  it('new players get the double-deck $10 game', () => {
    const s = mergeV2();
    expect(s.rules.decks).toBe(2);
    expect(s.tableMin).toBe(10);
    expect(tableMax(s.tableMin)).toBe(500);
    expect(s.coach.countQuiz).toBe('off');
  });
  it('an untouched old 6-deck default moves to the new game, keeping everything else', () => {
    const s = mergeV2(oldDefault);
    expect(s.rules.decks).toBe(2);
    expect(s.rules.penetration).toBe(DEFAULT_V2.rules.penetration);
    expect(s.tableMin).toBe(10);
    expect(s.players).toBe(4);
    expect(s.onboarded).toBe(true);
  });
  it('a deliberately changed game is left alone', () => {
    const s = mergeV2({ ...oldDefault, rules: { ...oldDefault.rules, lateSurrender: true } });
    expect(s.rules.decks).toBe(6);
    expect(s.tableMin).toBe(25);
    const t = mergeV2({ ...oldDefault, tableMin: 50 });
    expect(t.rules.decks).toBe(6);
  });
  it('once upgraded, a later switch back to six decks sticks', () => {
    const s = mergeV2({ ...mergeV2(oldDefault), rules: { ...DEFAULT_V2.rules, decks: 6, penetration: 0.75 }, tableMin: 25 });
    expect(s.rules.decks).toBe(6);
  });
});
