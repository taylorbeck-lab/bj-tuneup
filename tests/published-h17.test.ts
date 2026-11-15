/**
 * Cross-check against the widely published 4–8 deck, dealer-hits-soft-17, double-after-split chart
 * (the one most players learn from) and its count plays. Our charts are computed from first
 * principles; this test makes sure they agree with the published consensus.
 */
import { describe, it, expect } from 'vitest';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import { generateIndices } from '../src/engine/indexgen';
import { resolveCode, type Code } from '../src/engine/strategy/chart';
import { DEFAULT_V2 } from '../src/v2/settings';
import type { Rules } from '../src/engine/rules';

const rules: Rules = { ...DEFAULT_V2.rules, decks: 6, h17: true, das: true, lateSurrender: true };
// columns: dealer 2,3,4,5,6,7,8,9,T,A
const HARD: Record<number, string> = {
  17: 'SSSSSSSSSS', 16: 'SSSSSHHHHH', 15: 'SSSSSHHHHH', 14: 'SSSSSHHHHH', 13: 'SSSSSHHHHH',
  12: 'HHSSSHHHHH', 11: 'DDDDDDDDDD', 10: 'DDDDDDDDHH', 9: 'HDDDDHHHHH', 8: 'HHHHHHHHHH',
};
const SOFT: Record<number, string[]> = {
  20: 'S S S S S S S S S S'.split(' '), 19: 'S S S S Ds S S S S S'.split(' '), 18: 'Ds Ds Ds Ds Ds S S H H H'.split(' '),
  17: 'H D D D D H H H H H'.split(' '), 16: 'H H D D D H H H H H'.split(' '), 15: 'H H D D D H H H H H'.split(' '),
  14: 'H H H D D H H H H H'.split(' '), 13: 'H H H D D H H H H H'.split(' '),
};
// Y = split, N = don't (with double after split)
const PAIRS: Record<number, string> = { 1: 'YYYYYYYYYY', 10: 'NNNNNNNNNN', 9: 'YYYYYNYYNN', 8: 'YYYYYYYYYY', 7: 'YYYYYYNNNN', 6: 'YYYYYNNNNN', 5: 'NNNNNNNNNN', 4: 'NNNYYNNNNN', 3: 'YYYYYYNNNN', 2: 'YYYYYYNNNN' };

describe('published 6D H17 DAS chart', () => {
  const c = generateBasicStrategy(rules).chart;
  const noSur = { canDouble: true, canSplit: true, canSurrender: false };
  const play = (code: Code) => ({ hit: 'H', stand: 'S', double: 'D', split: 'P', surrender: 'R' })[resolveCode(code, noSur)];

  it('hard totals match', () => {
    for (const [t, row] of Object.entries(HARD)) c.hard[+t].forEach((code, i) => expect(play(code), `hard ${t} col ${i}`).toBe(row[i]));
  });
  it('soft totals match (D vs Ds included)', () => {
    for (const [t, row] of Object.entries(SOFT)) c.soft[+t].forEach((code, i) => expect(code, `soft ${t} col ${i}`).toBe(row[i]));
  });
  it('pair splitting matches', () => {
    for (const [v, row] of Object.entries(PAIRS)) c.pairs[+v].forEach((code, i) => expect(code === 'P' || code === 'Rp' ? 'Y' : 'N', `pair ${v} col ${i}`).toBe(row[i]));
  });
  it('surrender: 16 v 9/T/A and 15 v T, plus the H17 extras (15 v A, 17 v A, 8,8 v A)', () => {
    const R = (code: Code) => code === 'Rh' || code === 'Rs' || code === 'Rp';
    expect([R(c.hard[16][7]), R(c.hard[16][8]), R(c.hard[16][9]), R(c.hard[15][8])]).toEqual([true, true, true, true]);
    expect([R(c.hard[15][9]), R(c.hard[17][9]), R(c.pairs[8][9])]).toEqual([true, true, true]);
    expect(R(c.hard[14][8])).toBe(false);
  });

  it('count plays agree with the published H17 deviations within one point', () => {
    const got = new Map(generateIndices(c, rules).map((g) => [g.play.id, g.play.index]));
    const published: Record<string, number> = {
      ins: 3, '16v10': 0, '15v10': 4, TTv4: 6, TTv5: 5, TTv6: 4, '10v10': 4, '10vA': 3, '12v2': 3, '12v3': 2, '12v4': 0,
      '9v2': 1, '9v7': 3, '16v9': 4, '16vA': 3, '15vA': 5, '13v2': -1, '8v6': 2, A8v4: 3, A8v5: 1, A8v6: 0, A6v2: 1,
      R16v8: 4, R15v9: 2, R15v10: 0, R15vA: -1, R16v9: -1,
    };
    for (const [id, idx] of Object.entries(published)) {
      expect(got.has(id), id).toBe(true);
      expect(Math.abs(got.get(id)! - idx), `${id}: ours ${got.get(id)} vs published ${idx}`).toBeLessThanOrEqual(1);
    }
  }, 120000);
});
