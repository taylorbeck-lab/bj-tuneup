import { describe, it, expect } from 'vitest';
import { trueCountCheck, tcVerdict, tcWorking, rcVerdict } from '../src/v2/count/trueCount';

// 78 cards left = 1.5 decks exactly, so the tray reading and the exact value agree
const at15 = (rc: number, answer: number) => trueCountCheck(rc, 78, answer);

describe('the true count check', () => {
  it('marks the answer the sheet works out as right (the reported case: up 6 with about one deck in the tray estimate)', () => {
    // 40 cards left: the tray reads about 1 deck left, so up 6 ÷ 1 = up 6; exact is 6 ÷ 0.77 ≈ 7.8
    const c = trueCountCheck(6, 40, 6);
    expect(c.decksLeft).toBe(1);
    expect(c.shown).toBe(6);
    expect(c.right).toBe(true);
    expect(c.grade).toBe('exact');
  });
  it('whatever the cards left, the worked-out value is always marked right', () => {
    for (let unseen = 10; unseen <= 312; unseen += 7)
      for (let rc = -12; rc <= 12; rc++) {
        const c = trueCountCheck(rc, unseen);
        expect(trueCountCheck(rc, unseen, c.shown).grade).toBe('exact');
      }
  });
  it('mid-way between two whole numbers there is one right answer: round down, never up', () => {
    // up 5 ÷ 1.5 = up 3.33
    expect(at15(5, 3).grade).toBe('exact');
    expect(at15(5, 4).right).toBe(false);
    expect(at15(5, 4).grade).toBe('oneOff');
    expect(at15(5, 2).right).toBe(false);
    // up 8 ÷ 1.5 = up 5.33
    expect(at15(8, 5).right).toBe(true);
    expect(at15(8, 6).right).toBe(false);
  });
  it('close to a line, the whole number on either side counts (it is an estimate)', () => {
    // up 6 ÷ 1.5 = up 4.0: a hair less tray and it would be up 3
    expect(at15(6, 4).grade).toBe('exact');
    expect(at15(6, 3).grade).toBe('close');
    expect(at15(6, 5).right).toBe(false);
    // up 7 ÷ 1.5 = up 4.67: not close to up 5 (within a quarter point is close)
    expect(at15(7, 5).right).toBe(false);
    // up 13 ÷ 1.5 = up 8.67; up 4 ÷ 1.5 = up 2.67; up 11 ÷ 4 decks (208 cards) = up 2.75: close to up 3
    expect(trueCountCheck(11, 208, 3).grade).toBe('close');
    expect(trueCountCheck(11, 208, 2).grade).toBe('exact');
    expect(trueCountCheck(11, 208, 4).right).toBe(false);
  });
  it('a sharper read of the tray than the nearest half deck is never marked wrong', () => {
    // 40 cards: the tray says 1 deck (up 6), the exact cards say 0.77 decks (up 7.8)
    expect(trueCountCheck(6, 40, 7).right).toBe(true);
    // (up 7.8 still rounds down to up 7)
    expect(trueCountCheck(6, 40, 8).grade).toBe('oneOff');
    expect(trueCountCheck(6, 40, 5).grade).toBe('close');
    expect(trueCountCheck(6, 40, 3).grade).toBe('off');
    expect(trueCountCheck(6, 40, 10).grade).toBe('off');
  });
  it('counts that are down round down too (further down)', () => {
    // down 5 ÷ 1.5 = down 3.33 → down 4
    expect(at15(-5, -4).grade).toBe('exact');
    expect(at15(-5, -3).right).toBe(false);
    // down 6 ÷ 1.5 = down 4.0
    expect(at15(-6, -4).grade).toBe('exact');
    expect(at15(-6, -5).grade).toBe('close');
  });
  it('even is even, and no answer is no answer', () => {
    expect(trueCountCheck(0, 60, 0).grade).toBe('exact');
    expect(trueCountCheck(0, 60, 1).right).toBe(false);
    expect(trueCountCheck(6, 40, null).right).toBe(false);
  });
  it('how often there is only one right answer: most of the time', () => {
    let one = 0;
    let n = 0;
    for (let unseen = 26; unseen <= 104; unseen += 3)
      for (let rc = -10; rc <= 10; rc++) {
        if (rc === 0) continue;
        const c = trueCountCheck(rc, unseen);
        n++;
        if (c.hi === c.lo) one++;
        // never more than a few whole numbers wide, even late in a double deck
        expect(c.hi - c.lo).toBeLessThanOrEqual(Math.max(2, Math.ceil(Math.abs(c.exact - c.raw)) + 1));
      }
    expect(one / n).toBeGreaterThan(0.2);
  });
});

describe('what José says about your true count', () => {
  const v = (rc: number, unseen: number, answer: number, rcAnswer: number | null = rc) => tcVerdict({ rc, unseen, totalCards: 104, answer, rcAnswer });
  it('shows the division, and only says "round down" when there is something to round', () => {
    expect(tcWorking(5, 78)).toBe('up 5 ÷ 1.5 decks left = up 3.3, so up 3 (round down)');
    expect(tcWorking(6, 78)).toBe('up 6 ÷ 1.5 decks left = up 4');
    expect(tcWorking(-5, 78)).toBe('down 5 ÷ 1.5 decks left = down 3.3, so down 4 (round down)');
    expect(tcWorking(0, 78)).toMatch(/even/);
    expect(tcWorking(3, 52)).toBe('up 3 ÷ 1 deck left = up 3');
  });
  it('right is right, and close to the line counts and says why', () => {
    expect(v(5, 78, 3)).toMatchObject({ ok: true, title: 'Nailed it' });
    const close = v(6, 78, 3);
    expect(close).toMatchObject({ ok: true, title: 'Close enough' });
    expect(close.line).toMatch(/either way/);
    expect(v(6, 40, 7).line).toMatch(/sharper read/);
  });
  it('rounding up when it is not close is one off, and says so', () => {
    const up = v(5, 78, 4);
    expect(up).toMatchObject({ ok: false, title: 'One off' });
    expect(up.line).toMatch(/rounding up/);
    expect(v(8, 78, 4).line).toMatch(/one too low/);
    // down 4 ÷ 1.5 = down 2.7 is down 3; down 2 is rounding toward even
    expect(v(-4, 78, -2).line).toMatch(/toward even/);
  });
  it('never calls a far miss close', () => {
    for (const [rc, unseen, ans] of [[6, 40, 1], [5, 78, 9], [-4, 78, 3], [2, 78, 8]] as const) {
      const r = v(rc, unseen, ans);
      expect(r.ok).toBe(false);
      expect(r.title).toMatch(/^Off by \d+$/);
      expect(r.title + r.line).not.toMatch(/close/i);
    }
  });
  it('names the usual slips', () => {
    // gave the running count as the true count (up 6 with 1.5 decks left is up 4)
    expect(v(6, 78, 6).line).toMatch(/running count\. Divide/);
    // divided by the decks in the tray (half a deck played of two): up 2 ÷ 0.5 = up 4, but 1.5 are left
    expect(v(2, 78, 4).line).toMatch(/decks in the tray/);
    // the division was right for a running count that was off
    const carried = v(6, 78, 2, 3);
    expect(carried).toMatchObject({ ok: false, title: 'Right sum, wrong count' });
    expect(carried.line).toMatch(/up 3 you were carrying/);
  });
  it('the reported case: up 3 with 3 decks left, answered up 6', () => {
    const r = tcVerdict({ rc: 3, unseen: 156, totalCards: 312, answer: 6, rcAnswer: 3 });
    expect(r).toMatchObject({ ok: false, title: 'Off by 5' });
    expect(r.line).toBe('up 3 ÷ 3 decks left = up 1. You said up 6. With more than a deck left, the true count is always smaller than the running count.');
  });
  it('the running count: exact or off by how much', () => {
    expect(rcVerdict(4, 4)).toMatchObject({ ok: true, title: 'Spot on' });
    expect(rcVerdict(4, 5).title).toBe('Off by one');
    expect(rcVerdict(4, 2).title).toBe('Off by 2');
    expect(rcVerdict(4, -3).title).toBe('Off by 7');
    expect(rcVerdict(4, -3).line).toMatch(/whole hand/);
  });
});
