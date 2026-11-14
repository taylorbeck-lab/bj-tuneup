/**
 * Spaced repetition (Leitner boxes). Every drill item / situation has a key. A miss sends it back to
 * box 0; a hit moves it up one box. Lower boxes and overdue items are drawn more often.
 */
import { getAll, put } from './db';

export interface SrsItem {
  key: string;
  label?: string;
  hits: number;
  misses: number;
  box: number;
  lastAt: number;
  due: number;
}

const INTERVALS = [0, 10 * 60e3, 24 * 3600e3, 3 * 86400e3, 7 * 86400e3, 21 * 86400e3];
const WEIGHTS = [10, 5, 3, 2, 1, 0.6];
export const MASTERED_BOX = 4;

export function update(item: SrsItem | undefined, key: string, correct: boolean, now = Date.now(), label?: string): SrsItem {
  const it: SrsItem = item ? { ...item } : { key, hits: 0, misses: 0, box: 1, lastAt: 0, due: 0 };
  if (label) it.label = label;
  if (correct) {
    it.hits++;
    it.box = Math.min(5, it.box + 1);
  } else {
    it.misses++;
    it.box = 0;
  }
  it.lastAt = now;
  it.due = now + INTERVALS[it.box];
  return it;
}

/** Selection weight: unseen items weigh like box 1; overdue items x2. */
export function weight(item: SrsItem | undefined, now = Date.now()): number {
  if (!item) return WEIGHTS[1];
  return WEIGHTS[item.box] * (item.due <= now ? 2 : 1);
}

export function pickWeighted<T>(cands: T[], w: (t: T) => number, rng: () => number): T {
  let tot = 0;
  for (const c of cands) tot += w(c);
  let r = rng() * tot;
  for (const c of cands) {
    r -= w(c);
    if (r <= 0) return c;
  }
  return cands[cands.length - 1];
}

let cache: Map<string, SrsItem> | null = null;

export async function loadSrs(): Promise<Map<string, SrsItem>> {
  if (!cache) {
    cache = new Map();
    for (const it of await getAll<SrsItem>('srs')) cache.set(it.key, it);
  }
  return cache;
}

export async function recordSrs(key: string, correct: boolean, label?: string): Promise<SrsItem> {
  const m = await loadSrs();
  const it = update(m.get(key), key, correct, Date.now(), label);
  m.set(key, it);
  await put('srs', it);
  return it;
}
