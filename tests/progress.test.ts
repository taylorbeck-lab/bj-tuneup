import { describe, it, expect } from 'vitest';
import { nextStep, shouldOffer, playsForTier, newPlaysAt, describePlay, DEFAULT_PROGRESS, THRESHOLDS, type Progress } from '../src/v2/progress';
import { ILLUSTRIOUS_18 } from '../src/engine/indices';
import type { V2Stats } from '../src/v2/stats';
import { mergeV2 } from '../src/v2/settings';

const base = (): V2Stats => ({ decisions: 0, right: 0, deviations: { n: 0, right: 0 }, sits: {}, count: { n: 0, rcRight: 0, tcRight: 0, recent: [] }, insurance: { n: 0, right: 0 }, bets: { n: 0, right: 0 }, days: {} });
/** A log of `n` decisions of one kind with `miss` misses spread through it. */
const log = (kind: 'h' | 's' | 'p', n: number, miss = 0) => Array.from({ length: n }, (_, i) => (i % Math.max(1, Math.floor(n / Math.max(1, miss))) === 0 && i / Math.floor(n / Math.max(1, miss)) < miss ? kind : kind.toUpperCase())).join('');
const P = (o: Partial<Progress> = {}): Progress => ({ ...DEFAULT_PROGRESS, ...o });

describe('the course: Level 1 → counting', () => {
  it('needs enough hands, the hands right, and soft hands and pairs right too', () => {
    const s = base();
    s.days = { d: { decisions: 0, right: 0, hands: 250 } };
    s.log = log('h', 150) + log('s', 30) + log('p', 20);
    expect(nextStep(s, P())!.ready).toBe(true);

    // too few hands
    s.days = { d: { decisions: 0, right: 0, hands: 120 } };
    expect(nextStep(s, P())!.ready).toBe(false);
    s.days = { d: { decisions: 0, right: 0, hands: 250 } };

    // fuzzy on soft hands: 5 misses in the last 30
    s.log = log('h', 150) + log('s', 30, 5) + log('p', 20);
    const n = nextStep(s, P())!;
    expect(n.ready).toBe(false);
    expect(n.checks.find((c) => c.label === 'Soft hands')!.ok).toBe(false);

    // never seen enough pairs
    s.log = log('h', 170) + log('s', 30) + log('p', 8);
    expect(nextStep(s, P())!.checks.find((c) => c.label === 'Pairs')!.ok).toBe(false);
  });

  it('José asks only when it is on and after a "not yet" has waited its hands', () => {
    const s = base();
    s.days = { d: { decisions: 0, right: 0, hands: 250 } };
    s.log = log('h', 150) + log('s', 30) + log('p', 20);
    expect(shouldOffer(s, P())?.kind).toBe('count');
    expect(shouldOffer(s, P({ auto: false }))).toBeNull();
    expect(shouldOffer(s, P({ askAfter: 250 + THRESHOLDS.snoozeHands }))).toBeNull();
  });
});

describe('the course: Level 2 → count plays', () => {
  const ready = (): V2Stats => {
    const s = base();
    s.shoeEnd = { n: 16, right: 14, passed: 0, recent: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1] };
    s.tcRecent = [1, 1, 1, 1, 1, 1, 1, 0, 1, 1];
    s.betRecent = Array.from({ length: 100 }, (_, i) => (i % 10 === 0 ? 0 : 1));
    s.log = log('h', 150);
    return s;
  };
  it('needs the count exact at the cut card, the true count, the bets, and the hands still right', () => {
    expect(nextStep(ready(), P({ level: 2 }))!.ready).toBe(true);
    const s = ready();
    s.shoeEnd!.recent = [1, 0, 1, 0, 1, 1, 0, 1, 1, 1];
    expect(nextStep(s, P({ level: 2 }))!.ready).toBe(false);
    const s2 = ready();
    s2.log = log('h', 150, 12);
    expect(nextStep(s2, P({ level: 2 }))!.checks.find((c) => c.label === 'Every hand, still')!.ok).toBe(false);
    const s3 = ready();
    s3.betRecent = s3.betRecent!.slice(0, 40);
    expect(nextStep(s3, P({ level: 2 }))!.ready).toBe(false);
  });
});

describe('count plays come a few at a time', () => {
  it('starts with the core six, adds the rest of the main set, then everything', () => {
    const t1 = playsForTier(ILLUSTRIOUS_18, 1).map((p) => p.id);
    expect(t1).toEqual(expect.arrayContaining(['ins', '16v10', '15v10']));
    expect(t1).toHaveLength(6);
    expect(t1).not.toContain('TTv5');
    expect(playsForTier(ILLUSTRIOUS_18, 2)).toHaveLength(18);
    expect(newPlaysAt(ILLUSTRIOUS_18, 2).map((p) => p.id)).toContain('TTv6');
    expect(playsForTier(ILLUSTRIOUS_18, 3)).toHaveLength(ILLUSTRIOUS_18.length);
  });
  it('the next set unlocks when the ones you have are right often enough', () => {
    const s = base();
    s.devRecent = Array.from({ length: 20 }, (_, i) => (i < 3 ? 0 : 1));
    expect(nextStep(s, P({ level: 3, tier: 1 }))).toMatchObject({ kind: 'tier', ready: true });
    s.devRecent = Array.from({ length: 20 }, (_, i) => (i < 6 ? 0 : 1));
    expect(nextStep(s, P({ level: 3, tier: 1 }))!.ready).toBe(false);
    expect(nextStep(s, P({ level: 3, tier: 3 }))).toBeNull();
  });
  it('says each play the way you would at the table', () => {
    const by = (id: string) => describePlay(ILLUSTRIOUS_18.find((p) => p.id === id)!);
    expect(by('16v10')).toBe('16 vs 10: stand at even or higher');
    expect(by('ins')).toBe('Insurance: take it at up 3 or higher');
    expect(by('TTv5')).toBe('10,10 vs 5: split at up 5 or higher');
    expect(by('12v5')).toBe('12 vs 5: stand at down 2 or higher');
  });
});

describe('settings saved before the course', () => {
  it('start the course where the player already was', () => {
    expect(mergeV2({ onboarded: true, coach: { feedback: 'always', deviations: true, showCount: false, countQuiz: 'sometimes', betCoach: true, practiceMisses: true } }).progress).toMatchObject({ level: 3, tier: 3 });
    expect(mergeV2({ onboarded: true, coach: { feedback: 'always', deviations: false, showCount: false, countQuiz: 'sometimes', betCoach: true, practiceMisses: true } }).progress.level).toBe(2);
    expect(mergeV2({ onboarded: false }).progress).toMatchObject({ level: 1, auto: true });
    expect(mergeV2(undefined).progress.level).toBe(1);
  });
});

describe('the quiet-table offer', () => {
  it('comes once, at Level 1, to a player who is getting the hands right at a table with others', async () => {
    const { headsUpOffer } = await import('../src/v2/progress');
    const s = base();
    s.days = { d: { decisions: 0, right: 0, hands: 60 } };
    s.log = log('h', 50);
    expect(headsUpOffer(s, P(), 3)?.kind).toBe('headsUp');
    expect(headsUpOffer(s, P(), 0)).toBeNull();
    expect(headsUpOffer(s, P({ headsUpOffered: true }), 3)).toBeNull();
    expect(headsUpOffer(s, P({ level: 2 }), 3)).toBeNull();
    s.log = log('h', 50, 8);
    expect(headsUpOffer(s, P(), 3)).toBeNull();
  });
});
