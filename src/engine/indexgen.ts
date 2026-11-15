/**
 * Hi-Lo index generation (risk-neutral, combinatorial).
 *
 * For a true count t we build a representative remaining shoe at three depths spread over the dealt
 * part of the shoe (20%, 50%, 80% of the way to the cut card); the cards already seen are a neutral cross-section adjusted so that
 * (low cards seen) - (high cards seen) = t * d, spreading the extra low cards evenly over 2-6 and
 * the missing high cards over T and A in their 4:1 proportion. On that shoe the exact EV engine
 * values both plays (averaged over the two-card compositions of the hand, weighted by how likely
 * each is), and the index is where the EV difference crosses zero, rounded to the nearest integer
 * (the convention that best reproduces the published Illustrious 18). Hit/stand plays on hard
 * totals also include three-card hands (weighted by how often the player reaches them by hitting),
 * because a published index covers every hand of that total, not just two-card ones.
 */
import { fullComp, type Comp } from './shoe';
import type { Rules } from './rules';
import { EvEngine, handActionEVs, insuranceEV } from './ev/engine';
import type { Action, Chart } from './strategy/chart';
import { chartAction } from './strategy/chart';
import type { HandSpec, IndexPlay } from './indices';

/** Remaining composition at true count t (Hi-Lo) with `d` decks remaining in a `decks`-deck shoe. */
export function compAtTrueCount(decks: number, d: number, t: number): Comp {
  const full = fullComp(decks);
  const seenN = Math.round(52 * (decks - d));
  // neutral seen cross-section
  const seen = new Array(11).fill(0);
  for (let v = 1; v <= 10; v++) seen[v] = (full[v] * seenN) / (52 * decks);
  const rc = t * d;
  // shift rc/2 from high to low
  const shift = rc / 2;
  for (let v = 2; v <= 6; v++) seen[v] += shift / 5;
  seen[10] -= (shift * 4) / 5;
  seen[1] -= shift / 5;
  // round to integers keeping the total and the running count as close as possible
  const ints = roundPreserving(seen, seenN);
  fixRunningCount(ints, full, Math.round(rc));
  const rem = full.map((c, v) => (v === 0 ? 0 : c - ints[v]));
  for (let v = 1; v <= 10; v++) if (rem[v] < 0) rem[v] = 0;
  return rem;
}

/** Nudge integer seen counts (same total) until their Hi-Lo running count equals `target`. */
function fixRunningCount(seen: number[], full: Comp, target: number): void {
  const rcOf = () => seen[2] + seen[3] + seen[4] + seen[5] + seen[6] - seen[1] - seen[10];
  const lows = [2, 3, 4, 5, 6];
  const pickMin = (ranks: number[]) => ranks.filter((v) => seen[v] < full[v]).sort((a, b) => seen[a] / full[a] - seen[b] / full[b])[0];
  const pickMax = (ranks: number[]) => ranks.filter((v) => seen[v] > 0).sort((a, b) => seen[b] / full[b] - seen[a] / full[a])[0];
  for (let guard = 0; guard < 400; guard++) {
    const diff = target - rcOf();
    if (diff === 0) return;
    if (diff > 0) {
      // need more low seen / fewer high seen
      const from = Math.abs(diff) >= 2 ? pickMax([1, 10]) : pickMax([7, 8, 9]) ?? pickMax([1, 10]);
      const to = pickMin(lows);
      if (from === undefined || to === undefined) return;
      seen[from]--;
      seen[to]++;
    } else {
      const from = Math.abs(diff) >= 2 ? pickMax(lows) : pickMax([7, 8, 9]) ?? pickMax(lows);
      const to = pickMin([10, 10, 10, 10, 1]);
      if (from === undefined || to === undefined) return;
      seen[from]--;
      seen[to]++;
    }
  }
}

function roundPreserving(x: number[], total: number): number[] {
  const out = x.map((v, i) => (i === 0 ? 0 : Math.max(0, Math.floor(v))));
  let s = out.reduce((a, b) => a + b, 0);
  const frac = x.map((v, i) => ({ i, f: i === 0 ? -1 : v - Math.floor(v) })).sort((a, b) => b.f - a.f);
  for (const { i } of frac) {
    if (s >= total) break;
    if (i === 0) continue;
    out[i]++;
    s++;
  }
  return out;
}

export interface Candidate {
  id: string;
  hand: HandSpec;
  up: number;
  /** The play to compare against the chart's play (e.g. 'stand' for 16 v T). */
  alt: Action | 'insure';
  surrender?: boolean;
}

const H = (total: number): HandSpec => ({ kind: 'hard', total });
const S = (total: number): HandSpec => ({ kind: 'soft', total });
const P = (value: number): HandSpec => ({ kind: 'pair', value });

/** Plays to index: Illustrious 18 + Fab 4 + the composition/feel plays this player cares about. */
export const CANDIDATES: Candidate[] = [
  { id: 'ins', hand: { kind: 'insurance' }, up: 1, alt: 'insure' },
  { id: '16v10', hand: H(16), up: 10, alt: 'stand' },
  { id: '15v10', hand: H(15), up: 10, alt: 'stand' },
  { id: 'TTv5', hand: P(10), up: 5, alt: 'split' },
  { id: 'TTv6', hand: P(10), up: 6, alt: 'split' },
  { id: 'TTv4', hand: P(10), up: 4, alt: 'split' },
  { id: '10v10', hand: H(10), up: 10, alt: 'double' },
  { id: '12v3', hand: H(12), up: 3, alt: 'stand' },
  { id: '12v2', hand: H(12), up: 2, alt: 'stand' },
  { id: '11vA', hand: H(11), up: 1, alt: 'double' },
  { id: '9v2', hand: H(9), up: 2, alt: 'double' },
  { id: '10vA', hand: H(10), up: 1, alt: 'double' },
  { id: '9v7', hand: H(9), up: 7, alt: 'double' },
  { id: '16v9', hand: H(16), up: 9, alt: 'stand' },
  { id: '13v2', hand: H(13), up: 2, alt: 'hit' },
  { id: '12v4', hand: H(12), up: 4, alt: 'hit' },
  { id: '12v5', hand: H(12), up: 5, alt: 'hit' },
  { id: '12v6', hand: H(12), up: 6, alt: 'hit' },
  { id: '13v3', hand: H(13), up: 3, alt: 'hit' },
  { id: 'R14v10', hand: H(14), up: 10, alt: 'surrender', surrender: true },
  { id: 'R15v10', hand: H(15), up: 10, alt: 'surrender', surrender: true },
  { id: 'R15v9', hand: H(15), up: 9, alt: 'surrender', surrender: true },
  { id: 'R15vA', hand: H(15), up: 1, alt: 'surrender', surrender: true },
  { id: 'R16v8', hand: H(16), up: 8, alt: 'surrender', surrender: true },
  { id: 'R17vA', hand: H(17), up: 1, alt: 'surrender', surrender: true },
  { id: 'R16v9', hand: H(16), up: 9, alt: 'surrender', surrender: true },
  // composition / feel plays
  { id: 'A3v4', hand: S(14), up: 4, alt: 'double' },
  { id: 'A2v4', hand: S(13), up: 4, alt: 'double' },
  { id: 'A8v5', hand: S(19), up: 5, alt: 'double' },
  { id: 'A8v4', hand: S(19), up: 4, alt: 'double' },
  { id: 'A6v2', hand: S(17), up: 2, alt: 'double' },
  { id: '44v4', hand: P(4), up: 4, alt: 'split' },
  { id: '8v6', hand: H(8), up: 6, alt: 'double' },
  { id: '8v5', hand: H(8), up: 5, alt: 'double' },
  { id: '9v3', hand: H(9), up: 3, alt: 'double' },
  { id: '10v9', hand: H(10), up: 9, alt: 'double' },
  { id: '15v9', hand: H(15), up: 9, alt: 'stand' },
  { id: '16vA', hand: H(16), up: 1, alt: 'stand' },
  { id: '99v7', hand: P(9), up: 7, alt: 'split' },
  { id: 'A8v6', hand: S(19), up: 6, alt: 'stand' },
  { id: '15vA', hand: H(15), up: 1, alt: 'stand' },
];

/** Two-card compositions forming a hand spec, with weights (probability-proportional from `comp`). */
export function compositions(spec: HandSpec, comp: Comp): { values: [number, number]; w: number }[] {
  const out: { values: [number, number]; w: number }[] = [];
  const add = (a: number, b: number) => {
    const w = a === b ? comp[a] * (comp[a] - 1) : 2 * comp[a] * comp[b];
    if (w > 0) out.push({ values: [a, b], w });
  };
  if (spec.kind === 'pair') add(spec.value, spec.value);
  else if (spec.kind === 'soft') add(1, spec.total - 11);
  else if (spec.kind === 'hard') {
    for (let a = 2; a <= 10; a++) {
      const b = spec.total - a;
      if (b > a && b <= 10) add(a, b);
    }
    if (!out.length && spec.total % 2 === 0 && spec.total / 2 <= 10) add(spec.total / 2, spec.total / 2);
  }
  return out;
}

/**
 * Three-card hard hands totalling `total`, reached by hitting a two-card hand the chart hits.
 * Weight = P(two-card hand) * P(third card), from composition `comp`.
 */
export function threeCard(total: number, up: number, comp: Comp, chart: Chart): { values: number[]; w: number }[] {
  const out: { values: number[]; w: number }[] = [];
  const N = comp.reduce((a, b) => a + b, 0);
  for (let a = 1; a <= 10; a++)
    for (let b = a; b <= 10; b++) {
      const w2 = a === b ? comp[a] * (comp[a] - 1) : 2 * comp[a] * comp[b];
      if (w2 <= 0) continue;
      if (a === 1 && b === 10) continue;
      const act = chartAction(chart, [a, b], up, { canDouble: false, canSplit: false, canSurrender: false });
      const dbl = chartAction(chart, [a, b], up, { canDouble: true, canSplit: false, canSurrender: false });
      if (act !== 'hit' || dbl === 'double') continue;
      const c3 = total - a - b;
      for (const c of c3 === 11 ? [1] : c3 >= 1 && c3 <= 10 ? [c3] : []) {
        const left = comp[c] - (c === a ? 1 : 0) - (c === b ? 1 : 0);
        if (left <= 0) continue;
        const vals = [a, b, c];
        // must be a hard total (no usable ace)
        const sum = a + b + c;
        if (vals.includes(1) && sum + 10 <= 21) continue;
        if (sum !== total) continue;
        out.push({ values: vals, w: (w2 * left) / (N - 2) });
      }
    }
  return out;
}

const tag = (v: number) => (v >= 2 && v <= 6 ? 1 : v === 1 || v === 10 ? -1 : 0);

interface Part {
  key: string;
  w: number;
  diff: number;
  /** Hi-Lo tags and number of the cards the player sees at the decision (hand + upcard). */
  tags: number;
  n: number;
}

/**
 * EV difference A - B (per unit) per hand composition, on composition `comp` (upcard included).
 * Hit/stand plays on hard totals also include three-card hands.
 */
export function evParts(c: Candidate, A: Action, base: Action, comp: Comp, rules: Rules, chart?: Chart): Part[] {
  if (c.hand.kind === 'insurance') {
    const s = comp.slice();
    s[1]--;
    return [{ key: 'ins', w: 1, diff: insuranceEV(s), tags: -1, n: 1 }];
  }
  const shoe = comp.slice();
  shoe[c.up]--;
  const eng = new EvEngine(shoe, c.up, rules);
  const hs = (A === 'hit' || A === 'stand') && (base === 'hit' || base === 'stand');
  const comps: { values: number[]; w: number }[] = compositions(c.hand, shoe);
  if (hs && chart && c.hand.kind === 'hard') comps.push(...threeCard(c.hand.total, c.up, shoe, chart));
  const out: Part[] = [];
  for (const { values, w } of comps) {
    const evs = handActionEVs(eng, values, { canDouble: values.length === 2, canSplit: true, canSurrender: rules.lateSurrender && values.length === 2 });
    const a = evs[A];
    const b = evs[base];
    if (a === undefined || b === undefined) continue;
    out.push({ key: values.join(','), w, diff: a - b, tags: values.reduce((s, v) => s + tag(v), tag(c.up)), n: values.length + 1 });
  }
  return out;
}

/** Weighted EV difference (convenience). */
export function evDiff(c: Candidate, A: Action, base: Action, comp: Comp, rules: Rules, chart?: Chart): number {
  const parts = evParts(c, A, base, comp, rules, chart);
  const W = parts.reduce((s, p) => s + p.w, 0);
  return W ? parts.reduce((s, p) => s + p.w * p.diff, 0) / W : NaN;
}

export interface GeneratedIndex {
  play: IndexPlay;
  /** Fractional crossing true count (as the player observes it at the decision). */
  crossing: number;
  /** Weighted EV difference (deviation - chart play) at each observed true count. */
  curve: { t: number; diff: number }[];
  base: Action;
}

function interp(pts: { x: number; y: number }[], x: number): number {
  if (x <= pts[0].x) {
    const [a, b] = pts;
    return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i].x) {
      const a = pts[i - 1];
      const b = pts[i];
      return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    }
  }
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  return b.y + ((b.y - a.y) * (x - b.x)) / (b.x - a.x);
}

/**
 * Generate the index for one candidate. The true count is the one the player observes at the
 * decision, i.e. it includes his own cards and the upcard: each hand composition's EV curve is
 * mapped onto that observed count before the compositions are averaged.
 * Returns null when the play never crosses in the range or does not exist under these rules.
 */
export function generateIndex(c: Candidate, chart: Chart, rules: Rules, tRange: [number, number] = [-10, 12]): GeneratedIndex | null {
  if (c.surrender && !rules.lateSurrender) return null;
  const decks = rules.decks;
  let base: Action;
  if (c.hand.kind === 'insurance') base = 'stand';
  else {
    const comps = compositions(c.hand, fullComp(decks));
    if (!comps.length) return null;
    // Surrender indices compare against the chart play; all others ignore surrender (handled by the Fab 4).
    base = chartAction(chart, comps[0].values, c.up, { canDouble: true, canSplit: true, canSurrender: !!c.surrender && rules.lateSurrender });
    if (c.surrender && base === 'surrender') base = chartAction(chart, comps[0].values, c.up, { canDouble: true, canSplit: true, canSurrender: false });
  }
  // A = the deviation, B = the chart play. If the chart already makes A, index the reverse play.
  const A: Action = c.alt === 'insure' ? 'stand' : c.alt;
  let B: Action = base;
  if (c.hand.kind !== 'insurance' && A === B) B = fallback(A, c.hand);

  const full = fullComp(decks);
  // Decisions happen throughout the dealt part of the shoe: average over three depths.
  const depths = [0.2, 0.5, 0.8].map((f) => Math.max(0.5, decks - decks * rules.penetration * f));
  const byKey = new Map<string, { w: number; pts: { x: number; y: number }[] }>();
  depths.forEach((d, di) => {
    for (let t = tRange[0] - 4; t <= tRange[1] + 4; t++) {
      const comp = compAtTrueCount(decks, d, t);
      let rcOther = 0;
      let unseen = 0;
      for (let v = 1; v <= 10; v++) {
        rcOther += tag(v) * (full[v] - comp[v]);
        unseen += comp[v];
      }
      for (const p of evParts(c, A, B, comp, rules, chart)) {
        const obs = (rcOther + p.tags) / ((unseen - p.n) / 52);
        const k = di + ':' + p.key;
        let e = byKey.get(k);
        if (!e) byKey.set(k, (e = { w: p.w, pts: [] }));
        e.pts.push({ x: obs, y: p.diff });
      }
    }
  });
  if (!byKey.size) return null;
  // Per-depth weights must not depend on how many cards remain: normalise each depth's weights.
  const depthW = new Map<string, number>();
  for (const [k, e] of byKey) {
    const dk = k.split(':')[0];
    depthW.set(dk, (depthW.get(dk) ?? 0) + e.w);
  }
  for (const e of byKey.values()) {
    e.pts.sort((a, b) => a.x - b.x);
    e.pts = e.pts.filter((p, i, arr) => i === 0 || p.x - arr[i - 1].x > 1e-6);
  }
  const curve: { t: number; diff: number }[] = [];
  for (let t = tRange[0]; t <= tRange[1]; t++) {
    let W = 0;
    let acc = 0;
    for (const [k, e] of byKey) {
      if (e.pts.length < 2) continue;
      const w = e.w / depthW.get(k.split(':')[0])!;
      acc += w * interp(e.pts, t);
      W += w;
    }
    curve.push({ t, diff: W ? acc / W : NaN });
  }
  let crossing: number | null = null;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (isFinite(a.diff) && isFinite(b.diff) && Math.sign(a.diff) !== Math.sign(b.diff)) {
      crossing = a.t + (0 - a.diff) / (b.diff - a.diff);
      break;
    }
  }
  if (crossing === null) return null;
  const finite = curve.filter((p) => isFinite(p.diff));
  const rising = finite[finite.length - 1].diff > finite[0].diff;
  const play: IndexPlay = {
    id: c.id,
    hand: c.hand,
    up: c.up,
    index: Math.round(crossing),
    atOrAbove: rising ? A : B,
    below: rising ? B : A,
    surrender: c.surrender,
    source: 'generated',
  };
  if (c.hand.kind === 'insurance') {
    play.atOrAbove = 'insure';
    play.below = 'noinsure';
  }
  return { play, crossing, curve, base: B };
}

function fallback(a: Action, hand: HandSpec): Action {
  switch (a) {
    case 'double':
      return 'hit';
    case 'stand':
      return 'hit';
    case 'hit':
      return 'stand';
    case 'split':
      return hand.kind === 'pair' && hand.value === 10 ? 'stand' : 'hit';
    case 'surrender':
      return 'hit';
  }
}

export function generateIndices(chart: Chart, rules: Rules, onProgress?: (done: number, total: number) => void): GeneratedIndex[] {
  const out: GeneratedIndex[] = [];
  CANDIDATES.forEach((c, i) => {
    const g = generateIndex(c, chart, rules);
    if (g) out.push(g);
    onProgress?.(i + 1, CANDIDATES.length);
  });
  return out;
}
