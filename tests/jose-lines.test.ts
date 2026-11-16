import { describe, it, expect } from 'vitest';
import { joseLine, cutWords, noteRound, resetStreak, type JoseMoment } from '../src/v2/table/joseLines';

const result = (o: Partial<Extract<JoseMoment, { kind: 'result' }>>): JoseMoment => ({
  kind: 'result',
  seed: 1,
  net: 0,
  blackjack: false,
  dealerBlackjack: false,
  dealerBust: false,
  bust: false,
  doubled: false,
  surrendered: false,
  streak: 0,
  ...o,
});

describe('José’s lines', () => {
  it('never mentions a count number or tells you how to play before you act', () => {
    const moments: JoseMoment[] = [];
    for (let seed = 0; seed < 40; seed++) {
      moments.push({ kind: 'betting', first: false, seed, streak: (seed % 9) - 4 });
      moments.push({ kind: 'dealing', seed, bigBet: seed % 2 === 0 });
      moments.push({ kind: 'yourTurn', seed, waiting: seed % 2 === 0 });
      moments.push({ kind: 'insurance', seed });
      moments.push({ kind: 'dealer', seed });
      moments.push({ kind: 'peek', seed, ace: seed % 2 === 0 });
      moments.push({ kind: 'peekClear', seed });
      moments.push({ kind: 'shuffling', seed, cut: 0.55 + (seed % 5) * 0.05, pen: 0.65 });
      for (const o of [{ net: 1 }, { net: -1 }, { net: 0 }, { net: 1.5, blackjack: true }, { net: -1, bust: true }, { net: 1, dealerBust: true }, { net: 2, doubled: true }, { net: -1, dealerBlackjack: true }, { net: -0.5, surrendered: true }, { net: 1, streak: 4 }, { net: -1, streak: -5 }])
        moments.push(result({ seed, ...o }));
    }
    for (const m of moments) {
      const line = joseLine(m) ?? '';
      expect(line).not.toMatch(/\b(up|down) \d|true count|running count|count is/i);
      if (m.kind === 'yourTurn' || m.kind === 'dealing') expect(line).not.toMatch(/\b(hit|stand|double|split|surrender)\b/i);
    }
  });

  it('reacts to what happened', () => {
    expect(joseLine(result({ net: 1.5, blackjack: true }))).toMatch(/blackjack|twenty-one/i);
    expect(joseLine(result({ net: -1, bust: true }))).toMatch(/too many|bust|over/i);
    expect(joseLine(result({ net: 1, dealerBust: true }))).toMatch(/bust|too many/i);
    expect(joseLine(result({ net: 0 }))).toMatch(/push|tie/i);
    expect(joseLine({ kind: 'dealing', seed: 2, bigBet: true })).toMatch(/big|pit|eye|feeling/i);
    expect(joseLine({ kind: 'shuffling', seed: 0, cut: 0.72, pen: 0.65 })).toMatch(/deep/i);
    expect(joseLine({ kind: 'shuffling', seed: 0, cut: 0.58, pen: 0.65 })).toMatch(/shallow/i);
  });

  it('calls you primo most of the time, not every time', () => {
    const lines = Array.from({ length: 60 }, (_, seed) => joseLine({ kind: 'betting', first: false, seed, streak: 0 }) ?? '');
    const share = lines.filter((l) => /primo/i.test(l)).length / lines.length;
    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeLessThan(1);
  });

  it('keeps the run of wins and losses, once per round', () => {
    resetStreak();
    expect(noteRound(1, 1)).toBe(1);
    expect(noteRound(1, 1)).toBe(1);
    expect(noteRound(2, 2)).toBe(2);
    expect(noteRound(3, 0)).toBe(2);
    expect(noteRound(4, -1)).toBe(-1);
    expect(noteRound(5, -1)).toBe(-2);
  });

  it('describes the cut the way you would by eye', () => {
    expect(cutWords(0.5)).toMatch(/halfway/);
    expect(cutWords(0.66)).toMatch(/two-thirds/);
    expect(cutWords(0.75)).toMatch(/three-quarters/);
  });
});
