/**
 * The course. Everyone starts at Level 1 (basic strategy, nothing else) and José moves you up when
 * your stats say you're ready: to counting and betting with the count (Level 2), then to count plays
 * (Level 3), which come in a few at a time, the most valuable first. Nobody skips basic strategy by
 * saying they know it (most people are fuzzy on soft hands and pairs); only a player who already
 * counts can unlock everything from the start ("I'm already an AP"). Settings can change the level
 * any time.
 *
 * Every threshold is here, in one place, to tune after watching people play.
 */
import { handsPlayed, type V2Stats } from './stats';
import type { IndexPlay } from '../engine/indices';
import { countWords } from './count/words';
import { valueLabel } from '../engine/cards';

export type Level = 1 | 2 | 3;
export type Tier = 1 | 2 | 3;

export interface Progress {
  level: Level;
  /** José moves you up when you're ready (off once you pick a level yourself). */
  auto: boolean;
  /** At Level 3: which count plays are graded (1 = the core six, 2 = + the rest of the main set, 3 = all). */
  tier: Tier;
  /** "Not yet": don't ask again until this many hands have been played. */
  askAfter: number;
  /** José has offered you a table to yourself (once, at Level 1). */
  headsUpOffered?: boolean;
}
export const DEFAULT_PROGRESS: Progress = { level: 1, auto: true, tier: 1, askAfter: 0 };

export const LEVEL_NAME: Record<Level, string> = { 1: 'Basic strategy', 2: 'Count & bet', 3: 'Full AP' };

export const THRESHOLDS = {
  /** Level 1 → 2: the hands are automatic, rare ones included. */
  toCount: {
    minHands: 200,
    window: 150,
    accuracy: 0.95,
    /** Soft hands and pairs are where people stay fuzzy, so they're checked on their own. */
    softWindow: 30,
    softAccuracy: 0.9,
    pairWindow: 20,
    pairAccuracy: 0.9,
  },
  /** Level 2 → 3: counting accurately and betting with it, without the hands slipping. */
  toPlays: {
    minShoes: 15,
    shoeWindow: 10,
    shoeRight: 8,
    tcWindow: 10,
    tcAccuracy: 0.8,
    betWindow: 100,
    betAccuracy: 0.8,
    basicWindow: 150,
    basicAccuracy: 0.95,
  },
  /** At Level 3: the count plays you have, right often enough to add the next set. */
  nextTier: { window: 20, accuracy: 0.8 },
  /** "Not yet" waits this many hands before José asks again. */
  snoozeHands: 100,
  /** At Level 1, a sharp player at a busy table gets offered a quiet one (once): more hands an hour. */
  headsUp: { minHands: 40, window: 50, accuracy: 0.9 },
};

/** The count plays, in the order they're taught: most valuable first, the ones that draw attention later. */
export const TIER_PLAYS: Record<1 | 2, string[]> = {
  1: ['ins', '16v10', '15v10', '10v10', '12v3', '12v2'],
  2: ['11vA', '9v2', '10vA', '9v7', '16v9', '13v2', '12v4', '12v5', '12v6', '13v3', 'TTv5', 'TTv6', 'R14v10', 'R15v10', 'R15v9', 'R15vA'],
};

/** The count plays graded at a tier (tier 3 = every play for these rules). */
export function playsForTier(plays: IndexPlay[], tier: Tier): IndexPlay[] {
  if (tier >= 3) return plays;
  const ids = new Set([...TIER_PLAYS[1], ...(tier >= 2 ? TIER_PLAYS[2] : [])]);
  return plays.filter((p) => ids.has(p.id));
}
/** The plays a tier adds. */
export function newPlaysAt(plays: IndexPlay[], tier: Tier): IndexPlay[] {
  const before = tier === 1 ? [] : playsForTier(plays, (tier - 1) as Tier);
  const have = new Set(before.map((p) => p.id));
  return playsForTier(plays, tier).filter((p) => !have.has(p.id));
}

const ACT: Record<string, string> = { stand: 'stand', hit: 'hit', double: 'double', split: 'split', surrender: 'surrender', insure: 'take insurance' };
/** "16 vs 10: stand at even or higher" — the rule as you'd say it at the table. */
export function describePlay(p: IndexPlay): string {
  const when = p.index <= 0 ? (p.index === 0 ? 'even or higher' : `${countWords(p.index)} or higher`) : `up ${p.index} or higher`;
  const act = ACT[p.atOrAbove] ?? p.atOrAbove;
  if (p.hand.kind === 'insurance') return `Insurance: take it at ${when}`;
  const card = (v: number) => (v === 10 ? '10' : valueLabel(v));
  const up = card(p.up);
  const hand = p.hand.kind === 'pair' ? `${card(p.hand.value)},${card(p.hand.value)}` : p.hand.kind === 'soft' ? `A,${p.hand.total - 11}` : String(p.hand.total);
  return `${hand} vs ${up}: ${act} at ${when}`;
}

export interface Check {
  label: string;
  /** e.g. "142 of 200", "93%". */
  have: string;
  need: string;
  ok: boolean;
  /** 0..1, for a progress bar. */
  frac: number;
}
export interface NextStep {
  kind: 'count' | 'plays' | 'tier' | 'headsUp';
  title: string;
  checks: Check[];
  ready: boolean;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
/** Share right in the last `n` results (fewer than `n` counts as not enough yet). `unit` names what's counted. */
function windowCheck(label: string, results: number[], n: number, need: number, unit = 'so far'): Check {
  const w = results.slice(-n);
  const acc = w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0;
  const enough = w.length >= n;
  return {
    label,
    // (not "7 of 10": that reads as 7 right; say how many there have been)
    have: enough ? pct(acc) : w.length ? `only ${w.length} ${unit}` : 'none yet',
    need: `${pct(need)} of the last ${n}`,
    ok: enough && acc >= need - 1e-9,
    frac: enough ? Math.min(1, acc / need) : Math.min(0.99, (w.length / n) * Math.min(1, acc / need || 0.5)),
  };
}
const fromLog = (log: string, kinds: string) => [...log].filter((c) => kinds.includes(c.toLowerCase())).map((c) => (c === c.toUpperCase() ? 1 : 0));

/** What's next for this player, and how close they are. Null at the very top. */
export function nextStep(s: V2Stats, p: Progress): NextStep | null {
  const log = s.log ?? '';
  const all = fromLog(log, 'hsp');
  if (p.level === 1) {
    const t = THRESHOLDS.toCount;
    const hands = handsPlayed(s);
    const checks: Check[] = [
      { label: 'Hands played', have: `${hands}`, need: `${t.minHands}`, ok: hands >= t.minHands, frac: Math.min(1, hands / t.minHands) },
      windowCheck('Every hand', all, t.window, t.accuracy, 'decisions so far'),
      windowCheck('Soft hands', fromLog(log, 's'), t.softWindow, t.softAccuracy, 'soft hands so far'),
      windowCheck('Pairs', fromLog(log, 'p'), t.pairWindow, t.pairAccuracy, 'pairs so far'),
    ];
    return { kind: 'count', title: 'Next: counting', checks, ready: checks.every((c) => c.ok) };
  }
  if (p.level === 2) {
    const t = THRESHOLDS.toPlays;
    const shoes = s.shoeEnd?.n ?? 0;
    const recent = (s.shoeEnd?.recent ?? []).slice(-t.shoeWindow);
    const exact = recent.reduce((a, b) => a + b, 0);
    const checks: Check[] = [
      { label: 'Shoes counted to the cut card', have: `${shoes}`, need: `${t.minShoes}`, ok: shoes >= t.minShoes, frac: Math.min(1, shoes / t.minShoes) },
      {
        label: 'Count exact at the cut card',
        have: recent.length >= t.shoeWindow ? `${exact} right` : recent.length ? `only ${recent.length} ${recent.length === 1 ? 'shoe' : 'shoes'} so far` : 'none yet',
        need: `${t.shoeRight} of the last ${t.shoeWindow}`,
        ok: recent.length >= t.shoeWindow && exact >= t.shoeRight,
        frac: Math.min(1, exact / t.shoeRight),
      },
      windowCheck('True count within one', s.tcRecent ?? [], t.tcWindow, t.tcAccuracy, 'true counts answered so far'),
      windowCheck('Bets with the count', s.betRecent ?? [], t.betWindow, t.betAccuracy, 'bets so far'),
      windowCheck('Every hand, still', all, t.basicWindow, t.basicAccuracy, 'decisions so far'),
    ];
    return { kind: 'plays', title: 'Next: count plays', checks, ready: checks.every((c) => c.ok) };
  }
  if (p.tier < 3) {
    const t = THRESHOLDS.nextTier;
    const checks = [windowCheck('Count plays right', s.devRecent ?? [], t.window, t.accuracy, 'count-play spots so far')];
    return { kind: 'tier', title: p.tier === 1 ? 'Next: the rest of the main count plays' : 'Next: every count play', checks, ready: checks.every((c) => c.ok) };
  }
  return null;
}

/** Should José offer the next step now (at the end of a shoe)? */
export function shouldOffer(s: V2Stats, p: Progress): NextStep | null {
  if (!p.auto) return null;
  if (handsPlayed(s) < p.askAfter) return null;
  const n = nextStep(s, p);
  return n && n.ready ? n : null;
}

/**
 * At Level 1, once you're clearly playing the hands well at a table with other players, José offers a
 * quiet table: heads up you see about twice the hands, and at this level it's all about speed.
 */
export function headsUpOffer(s: V2Stats, p: Progress, othersAtTable: number): NextStep | null {
  if (p.level !== 1 || p.headsUpOffered || othersAtTable < 1) return null;
  const t = THRESHOLDS.headsUp;
  const hands = handsPlayed(s);
  if (hands < t.minHands) return null;
  const check = windowCheck('Every hand', fromLog(s.log ?? '', 'hsp'), t.window, t.accuracy, 'decisions so far');
  return check.ok ? { kind: 'headsUp', title: 'A quiet table', checks: [check], ready: true } : null;
}
