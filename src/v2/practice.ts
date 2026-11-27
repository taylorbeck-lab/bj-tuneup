/**
 * "Practice my misses", spaced out. A hand you miss comes back a few hands later, then about 30
 * hands after that, then about 100; get it right each time and it graduates. Miss it again and it
 * starts over. Never two practice hands in a row: seeing the same hand right after missing it tests
 * whether you remember the last hand, not whether you know the play; spacing is what makes it stick.
 * And it's rare and never on a good count: a practice hand is always a decision you missed (a stiff or
 * a soft hand, never a 20 or a blackjack), so too many of them make the deal feel stale and forced.
 * At most one a shoe, none when the count is in your favour, and José says when he's dealt one.
 *
 * Practice hands move real cards from the part of the shoe you haven't seen, so the count stays
 * honest, but the order isn't random any more. So it tapers with the course: often at Level 1 (learning
 * the hands is the point), now and then at Level 2 (counting wants the shoe's natural order), never at
 * Level 3 (a fully random shoe, every swing and streak real).
 */
import type { V2Stats } from './stats';
import { hardComposition } from '../engine/drills';
import type { Rng } from '../engine/rng';

export function parseKey(key: string): { kind: 'h' | 's' | 'p'; n: number; up: number } | null {
  const m = /^([hsp])(\d+)v(\d+)$/.exec(key);
  if (!m) return null;
  return { kind: m[1] as 'h' | 's' | 'p', n: Number(m[2]), up: Number(m[3]) };
}

/** Situations still being learned: at least one miss in the last 3 tries. */
export function leaks(stats: V2Stats) {
  return Object.entries(stats.sits)
    .map(([key, s]) => ({ key, ...s, recentMisses: s.recent.slice(-3).filter((x) => x === 0).length }))
    .filter((s) => s.recentMisses > 0);
}

/** Hands until a missed hand comes back: a few (5 to 10), then about 30, then about 100. */
export const INTERVALS = [30, 100];
export const FIRST_GAP: [number, number] = [5, 10];
/** Fewest hands between two practice hands, by level (Level 3: never). */
export const PRACTICE_GAP: Record<1 | 2 | 3, number> = { 1: 8, 2: 25, 3: Infinity };

export interface Schedule {
  /** 0 = waiting for the first check after a miss; each right answer at or after `due` moves it on. */
  step: number;
  /** Hand count when it's due back. */
  due: number;
}

/** The next schedule after you play this hand (null = learned, nothing scheduled). */
export function nextSchedule(cur: Schedule | undefined, right: boolean, hands: number, rng: Rng): Schedule | undefined {
  if (!right) return { step: 0, due: hands + FIRST_GAP[0] + Math.floor(rng() * (FIRST_GAP[1] - FIRST_GAP[0] + 1)) };
  if (!cur) return undefined;
  // right before it was due (it came up on its own): keep the date
  if (hands < cur.due) return cur;
  if (cur.step >= INTERVALS.length) return undefined;
  return { step: cur.step + 1, due: hands + INTERVALS[cur.step] };
}

function handFor(key: string, rng: Rng): { values: [number, number]; up: number } | null {
  const k = parseKey(key);
  if (!k) return null;
  if (k.kind === 'p') return { values: [k.n, k.n], up: k.up };
  if (k.kind === 's') return k.n < 13 || k.n > 20 ? null : { values: [1, k.n - 11], up: k.up };
  return k.n < 5 || k.n > 20 ? null : { values: hardComposition(rng, k.n), up: k.up };
}

/**
 * The practice hand to deal now, if any: the most overdue hand you've missed, when enough hands
 * have gone by since the last practice hand for your level.
 */
export function pickPractice(
  stats: V2Stats,
  rng: Rng,
  o: { hands: number; lastPractice: number; level: 1 | 2 | 3; trueCount?: number; shoe?: number; lastPracticeShoe?: number; bigBet?: boolean },
): { values: [number, number]; up: number; key: string } | null {
  const gap = PRACTICE_GAP[o.level];
  if (!Number.isFinite(gap) || o.hands - o.lastPractice < gap) return null;
  // never when the cards left favour you (the stretch a counter waits for stays exactly as dealt),
  // and never more than one in a shoe
  if ((o.trueCount ?? 0) >= 1) return null;
  // once your bets are graded (Level 2), never on a hand you've bet up: a hand you've missed before is
  // a tough one by nature, and a set-up tough hand on a big bet would make over-betting look cursed
  if (o.level >= 2 && o.bigBet) return null;
  if (o.shoe !== undefined && o.shoe === o.lastPracticeShoe) return null;
  // (a miss saved before the schedule existed counts as due now)
  const dueAt = (s: V2Stats['sits'][string]) => (s.sched ? s.sched.due : s.recent.slice(-3).includes(0) ? 0 : Infinity);
  const due = Object.entries(stats.sits)
    .filter(([, s]) => dueAt(s) <= o.hands)
    .sort((a, b) => dueAt(a[1]) - dueAt(b[1]));
  for (const [key] of due) {
    const h = handFor(key, rng);
    if (h) return { ...h, key };
  }
  return null;
}
