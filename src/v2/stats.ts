/** Learning stats (on this device): per-situation strategy record, count checks, insurance, bets. */
import { kvGet, kvSet } from '../store/db';
import { nextSchedule, type Schedule } from './practice';

export interface SitStat {
  n: number;
  right: number;
  /** Recent results, newest last (1 = right). */
  recent: number[];
  label: string;
  /** When a missed hand comes back for practice (spaced out, see practice.ts). */
  sched?: Schedule;
}

export interface V2Stats {
  decisions: number;
  right: number;
  /**
   * Count plays you're held to (Level 3): the times one applied, and how often you made it. `own`:
   * count plays you made right before being held to them (Level 2, or not yet given at Level 3).
   */
  deviations: { n: number; right: number; own?: number };
  sits: Record<string, SitStat>;
  count: { n: number; rcRight: number; tcRight: number; recent: number[] };
  insurance: { n: number; right: number };
  bets: { n: number; right: number };
  /** Daily totals for streaks and trends. */
  days: Record<string, { decisions: number; right: number; hands: number }>;
  /** How long your decisions take, by where you sit (first base acts first, third base last). */
  pace?: Record<SeatPos, { n: number; ms: number }>;
  /** End-of-shoe count checks: answered exactly right, answered, and passed; `recent` 1 = exact, 0 = off or passed. */
  shoeEnd?: { n: number; right: number; passed: number; recent?: number[] };
  /**
   * Your latest decisions, oldest first, one letter each: H/S/P for a right play on a hard, soft or
   * pair hand, h/s/p for a miss. The level checks read these windows.
   */
  log?: string;
  /**
   * True-count answers only (a count check where you gave the true count, graded the way the sheet
   * teaches it). `count.tcRight` above also counted checks where you skipped the true count, and older
   * ones graded against the exact decks left, so it isn't used for display.
   */
  tc?: { n: number; right: number };
  /** Latest true-count checks (1 = within one), latest bets (1 = right), latest count-play spots (1 = right). */
  tcRecent?: number[];
  betRecent?: number[];
  devRecent?: number[];
}
export type HandKind = 'hard' | 'soft' | 'pair';
const KIND_CH: Record<HandKind, string> = { hard: 'h', soft: 's', pair: 'p' };
const LOG_MAX = 400;
export type SeatPos = 'solo' | 'first' | 'middle' | 'third';
export const SEAT_POS_LABEL: Record<SeatPos, string> = { solo: 'Playing alone', first: 'First base', middle: 'Middle seats', third: 'Third base' };

/** The end-of-shoe count: right, wrong, or passed ("don't know" / skip). */
export function recordShoeEnd(result: 'right' | 'wrong' | 'passed') {
  return mutate((s) => {
    const e = (s.shoeEnd ??= { n: 0, right: 0, passed: 0 });
    e.recent = [...(e.recent ?? []), result === 'right' ? 1 : 0].slice(-20);
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

export function recordDecision(key: string, label: string, right: boolean, countPlay: boolean, kind: HandKind = 'hard', own = false) {
  return mutate((s) => {
    s.decisions++;
    if (right) s.right++;
    const ch = KIND_CH[kind];
    s.log = ((s.log ?? '') + (right ? ch.toUpperCase() : ch)).slice(-LOG_MAX);
    if (own) s.deviations.own = (s.deviations.own ?? 0) + 1;
    if (countPlay) {
      s.deviations.n++;
      if (right) s.deviations.right++;
      s.devRecent = [...(s.devRecent ?? []), right ? 1 : 0].slice(-40);
    }
    const st = (s.sits[key] ??= { n: 0, right: 0, recent: [], label });
    st.n++;
    if (right) st.right++;
    st.recent = [...st.recent, right ? 1 : 0].slice(-10);
    const sched = nextSchedule(st.sched, right, handsPlayed(s), Math.random);
    if (sched) st.sched = sched;
    else delete st.sched;
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
    if (tcRight !== null) {
      s.tcRecent = [...(s.tcRecent ?? []), tcRight ? 1 : 0].slice(-20);
      const t = (s.tc ??= { n: 0, right: 0 });
      t.n++;
      if (tcRight) t.right++;
    }
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
    s.betRecent = [...(s.betRecent ?? []), right ? 1 : 0].slice(-120);
  });
}
/** Hands played, all time. */
export const handsPlayed = (s: V2Stats) => Object.values(s.days).reduce((a, d) => a + d.hands, 0);

export async function resetStats() {
  cache = structuredClone(EMPTY);
  await kvSet('v2stats', cache);
  for (const l of listeners) l(cache);
}
