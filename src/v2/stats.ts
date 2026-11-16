/** Learning stats (on this device): per-situation strategy record, count checks, insurance, bets. */
import { kvGet, kvSet } from '../store/db';

export interface SitStat {
  n: number;
  right: number;
  /** Recent results, newest last (1 = right). */
  recent: number[];
  label: string;
}

export interface V2Stats {
  decisions: number;
  right: number;
  deviations: { n: number; right: number };
  sits: Record<string, SitStat>;
  count: { n: number; rcRight: number; tcRight: number; recent: number[] };
  insurance: { n: number; right: number };
  bets: { n: number; right: number };
  /** Daily totals for streaks and trends. */
  days: Record<string, { decisions: number; right: number; hands: number }>;
  /** How long your decisions take, by where you sit (first base acts first, third base last). */
  pace?: Record<SeatPos, { n: number; ms: number }>;
  /** End-of-shoe count checks: answered exactly right, answered, and passed. */
  shoeEnd?: { n: number; right: number; passed: number };
}
export type SeatPos = 'solo' | 'first' | 'middle' | 'third';
export const SEAT_POS_LABEL: Record<SeatPos, string> = { solo: 'Playing alone', first: 'First base', middle: 'Middle seats', third: 'Third base' };

/** The end-of-shoe count: right, wrong, or passed ("don't know" / skip). */
export function recordShoeEnd(result: 'right' | 'wrong' | 'passed') {
  return mutate((s) => {
    const e = (s.shoeEnd ??= { n: 0, right: 0, passed: 0 });
    if (result === 'passed') e.passed++;
    else {
      e.n++;
      if (result === 'right') e.right++;
    }
  });
}

/** Record how long a decision took (capped, so walking away from the phone doesn't skew it). */
export function recordPace(pos: SeatPos, ms: number) {
  return mutate((s) => {
    const p = (s.pace ??= { solo: { n: 0, ms: 0 }, first: { n: 0, ms: 0 }, middle: { n: 0, ms: 0 }, third: { n: 0, ms: 0 } });
    p[pos].n++;
    p[pos].ms += Math.min(ms, 30000);
  });
}

const EMPTY: V2Stats = { decisions: 0, right: 0, deviations: { n: 0, right: 0 }, sits: {}, count: { n: 0, rcRight: 0, tcRight: 0, recent: [] }, insurance: { n: 0, right: 0 }, bets: { n: 0, right: 0 }, days: {} };

let cache: V2Stats | null = null;
let listeners: ((s: V2Stats) => void)[] = [];

export async function loadStats(): Promise<V2Stats> {
  if (!cache) cache = { ...structuredClone(EMPTY), ...((await kvGet<V2Stats>('v2stats')) ?? {}) };
  return cache;
}
async function mutate(f: (s: V2Stats) => void) {
  const s = await loadStats();
  f(s);
  kvSet('v2stats', s);
  for (const l of listeners) l(s);
}
export function onStats(l: (s: V2Stats) => void) {
  listeners.push(l);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}
const today = () => new Date().toISOString().slice(0, 10);

export function recordDecision(key: string, label: string, right: boolean, countPlay: boolean) {
  return mutate((s) => {
    s.decisions++;
    if (right) s.right++;
    if (countPlay) {
      s.deviations.n++;
      if (right) s.deviations.right++;
    }
    const st = (s.sits[key] ??= { n: 0, right: 0, recent: [], label });
    st.n++;
    if (right) st.right++;
    st.recent = [...st.recent, right ? 1 : 0].slice(-10);
    const d = (s.days[today()] ??= { decisions: 0, right: 0, hands: 0 });
    d.decisions++;
    if (right) d.right++;
  });
}
export function recordHand() {
  return mutate((s) => {
    const d = (s.days[today()] ??= { decisions: 0, right: 0, hands: 0 });
    d.hands++;
  });
}
export function recordCount(rcRight: boolean, tcRight: boolean | null) {
  return mutate((s) => {
    s.count.n++;
    if (rcRight) s.count.rcRight++;
    if (tcRight) s.count.tcRight++;
    s.count.recent = [...s.count.recent, rcRight ? 1 : 0].slice(-20);
  });
}
export function recordInsurance(right: boolean) {
  return mutate((s) => {
    s.insurance.n++;
    if (right) s.insurance.right++;
  });
}
export function recordBet(right: boolean) {
  return mutate((s) => {
    s.bets.n++;
    if (right) s.bets.right++;
  });
}
export async function resetStats() {
  cache = structuredClone(EMPTY);
  await kvSet('v2stats', cache);
  for (const l of listeners) l(cache);
}
