/**
 * Feel scoring.
 *
 * Every decision is graded three ways: vs the basic strategy chart, vs the index chart, and vs the
 * exact composition-perfect play. A *fringe play* is any departure from the chart. Fringe plays
 * that match the index chart are "index" plays; the rest are "feel" plays.
 *
 * FEEL RATING (0-100) over a set of decisions, each with bet b (units):
 *   O = Σ b · max(0, EV_best − EV_chart)      opportunity: EV available beyond the chart
 *   C = Σ b · (EV_chosen − EV_chart)          captured: what the player actually gained vs the chart
 *   D = max(O, 0.005 · Σ b)                   floor so a few small spots can't swing the score
 *   FEEL = clamp(50 + 50 · C / D, 0, 100)
 * 50 = plays exactly like the chart, 100 = captures every exact-composition gain, < 50 = the
 * departures (or missed index plays) cost more than they won.
 */
import type { Action } from './strategy/chart';
import { ACTION_LABEL } from './strategy/chart';
import { valueLabel, handTotal } from './cards';

export type FeelKind = 'chart' | 'index' | 'feel';

export interface FeelRecord {
  /** Situation key, e.g. "s14v4:double" (hand class, upcard, chosen action). */
  sit: string;
  /** Human label of the hand, e.g. "A,3 v 4". */
  label: string;
  chosen: Action;
  chart: Action;
  index: Action;
  best: Action;
  tc: number;
  bet: number;
  evChosen: number;
  evChart: number;
  evBest: number;
  kind: FeelKind;
  at?: number;
}

export interface GradedLike {
  values: number[];
  up: number;
  tc: number;
  bet: number;
  chosen: Action;
  chart: Action;
  index: Action;
  best: Action;
  evChosen: number;
  evChart: number;
  evBest: number;
}

export function handClass(values: readonly number[]): { key: string; label: string } {
  if (values.length === 2 && values[0] === values[1]) return { key: `p${values[0]}`, label: `${valueLabel(values[0])},${valueLabel(values[1])}` };
  const t = handTotal(values);
  if (t.soft && values.length === 2) {
    const other = values[0] === 1 ? values[1] : values[0];
    return { key: `s${t.total}`, label: `A,${valueLabel(other)}` };
  }
  return { key: `${t.soft ? 's' : 'h'}${t.total}`, label: `${t.soft ? 'soft ' : ''}${t.total}` };
}

export function toFeelRecord(d: GradedLike, at?: number): FeelRecord {
  const hc = handClass(d.values);
  const fringe = d.chosen !== d.chart;
  return {
    sit: `${hc.key}v${d.up}:${d.chosen}`,
    label: `${hc.label} v ${valueLabel(d.up)}`,
    chosen: d.chosen,
    chart: d.chart,
    index: d.index,
    best: d.best,
    tc: d.tc,
    bet: d.bet,
    evChosen: d.evChosen,
    evChart: d.evChart,
    evBest: d.evBest,
    kind: !fringe ? 'chart' : d.chosen === d.index ? 'index' : 'feel',
    at,
  };
}

const EPS = 1e-9;
export const isRight = (r: FeelRecord) => r.evChosen >= r.evBest - EPS;

export interface FeelStats {
  decisions: number;
  fringe: number;
  fringeIndex: number;
  fringeFeel: number;
  /** Fringe plays that were the exact best play. */
  fringeRight: number;
  /** EV gained (+) / lost (−) by fringe plays vs the chart, units. */
  fringeEV: number;
  /** EV left on the table by sticking to the chart when the exact play differed, units. */
  missedEV: number;
  opportunity: number;
  captured: number;
  rating: number;
}

export function feelStats(recs: FeelRecord[]): FeelStats {
  let O = 0;
  let C = 0;
  let B = 0;
  let fringe = 0;
  let fi = 0;
  let ff = 0;
  let right = 0;
  let fev = 0;
  let missed = 0;
  for (const r of recs) {
    O += r.bet * Math.max(0, r.evBest - r.evChart);
    C += r.bet * (r.evChosen - r.evChart);
    B += r.bet;
    if (r.kind !== 'chart') {
      fringe++;
      if (r.kind === 'index') fi++;
      else ff++;
      if (isRight(r)) right++;
      fev += r.bet * (r.evChosen - r.evChart);
    } else if (r.evBest > r.evChart + EPS) missed += r.bet * (r.evBest - r.evChart);
  }
  return {
    decisions: recs.length,
    fringe,
    fringeIndex: fi,
    fringeFeel: ff,
    fringeRight: right,
    fringeEV: fev,
    missedEV: missed,
    opportunity: O,
    captured: C,
    rating: feelRating(C, O, B),
  };
}

export function feelRating(captured: number, opportunity: number, totalBet: number): number {
  if (totalBet <= 0) return 50;
  const D = Math.max(opportunity, 0.005 * totalBet);
  return Math.max(0, Math.min(100, 50 + (50 * captured) / D));
}

export interface SituationStat {
  sit: string;
  label: string;
  action: Action;
  n: number;
  right: number;
  ev: number;
  minTc: number;
  maxTc: number;
}

/** Fringe plays grouped by situation (hand class, upcard, chosen action). */
export function situations(recs: FeelRecord[]): SituationStat[] {
  const m = new Map<string, SituationStat>();
  for (const r of recs) {
    if (r.kind === 'chart') continue;
    let s = m.get(r.sit);
    if (!s) m.set(r.sit, (s = { sit: r.sit, label: r.label, action: r.chosen, n: 0, right: 0, ev: 0, minTc: Infinity, maxTc: -Infinity }));
    s.n++;
    if (isRight(r)) s.right++;
    s.ev += r.bet * (r.evChosen - r.evChart);
    s.minTc = Math.min(s.minTc, r.tc);
    s.maxTc = Math.max(s.maxTc, r.tc);
  }
  return [...m.values()];
}

const verb: Record<Action, string> = { hit: 'hits', stand: 'stands', double: 'doubles', split: 'splits', surrender: 'surrenders' };
const tcText = (lo: number, hi: number) => (lo === hi ? `at TC ${lo > 0 ? '+' : ''}${lo}` : lo >= 0 ? `at TC +${lo} and higher` : hi <= 0 ? `at TC ${hi} and lower` : `between TC ${lo} and ${hi > 0 ? '+' : ''}${hi}`);

/** Plain-language takeaways: sharpest and leakiest situations, and the biggest missed opportunity. */
export function takeaways(recs: FeelRecord[], max = 4): string[] {
  const sits = situations(recs);
  const out: string[] = [];
  const sharp = sits.filter((s) => s.n >= 2 && s.right / s.n >= 0.6).sort((a, b) => b.ev - a.ev || b.n - a.n);
  const leaky = sits.filter((s) => s.ev < -1e-6).sort((a, b) => a.ev - b.ev);
  for (const s of sharp.slice(0, 2)) {
    const [hand, up] = s.label.split(' v ');
    out.push(`Your ${hand} ${verb[s.action]} vs ${up} ${tcText(s.minTc, s.maxTc)} were right ${s.right} of ${s.n} times (${s.ev >= 0 ? '+' : '−'}${Math.abs(s.ev).toFixed(2)} units vs the chart).`);
  }
  for (const s of leaky.slice(0, 2)) {
    const [hand, up] = s.label.split(' v ');
    out.push(`Your ${hand} ${verb[s.action]} vs ${up} cost ${Math.abs(s.ev).toFixed(2)} units (${s.right} of ${s.n} right).`);
  }
  // biggest missed opportunity (chart play when the exact play differed)
  const missed = new Map<string, { label: string; best: Action; ev: number; n: number }>();
  for (const r of recs) {
    if (r.kind !== 'chart' || r.evBest <= r.evChart + 1e-6) continue;
    const k = r.label + ':' + r.best;
    const e = missed.get(k) ?? { label: r.label, best: r.best, ev: 0, n: 0 };
    e.ev += r.bet * (r.evBest - r.evChart);
    e.n++;
    missed.set(k, e);
  }
  const top = [...missed.values()].sort((a, b) => b.ev - a.ev)[0];
  if (top && top.ev > 0.05) out.push(`You left ${top.ev.toFixed(2)} units on ${top.label}: ${ACTION_LABEL[top.best].toLowerCase()} was the exact play ${top.n} time${top.n > 1 ? 's' : ''}.`);
  return out.slice(0, max);
}
