/** "Practice my misses": pick a situation you've been missing, weighted by recent misses. */
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

export function pickPractice(stats: V2Stats, rng: Rng): { values: [number, number]; up: number; key: string } | null {
  const l = leaks(stats);
  if (!l.length) return null;
  const total = l.reduce((a, s) => a + s.recentMisses, 0);
  let r = rng() * total;
  for (const s of l) {
    r -= s.recentMisses;
    if (r <= 0) {
      const k = parseKey(s.key);
      if (!k) return null;
      let values: [number, number];
      if (k.kind === 'p') values = [k.n, k.n];
      else if (k.kind === 's') {
        if (k.n < 13 || k.n > 20) return null;
        values = [1, k.n - 11];
      } else {
        if (k.n < 5 || k.n > 20) return null;
        values = hardComposition(rng, k.n);
      }
      return { values, up: k.up, key: s.key };
    }
  }
  return null;
}
