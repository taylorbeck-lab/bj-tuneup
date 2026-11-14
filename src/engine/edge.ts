/**
 * Player edge for the next round from the remaining composition.
 *
 * Effects of removal (EOR) are computed with the exact engine: EOR_r = EV(full shoe minus one card of
 * rank r) − EV(full shoe), with composition-optimal play for the two-card decisions (as in Wizard of
 * Odds Appendix 7 / the bjstrat CA). The linear (Griffin) model then gives, for remaining
 * composition c with R cards out of a full shoe of N:
 *     x_r  = full_r · R/N − c_r                    (cards of rank r removed beyond proportion)
 *     edge = base(R) + (N/R) · Σ_r x_r · EOR_r
 * where base(R) is the exact EV of a *neutral* shoe of R cards (the depth effect: a neutral
 * single deck left in a 2-deck game plays like a single-deck game), interpolated from exact values.
 * The linear term is multiplied by a calibration factor fitted to exact EVs of realistic shoes (see
 * `scale`): a fixed strategy gains less than linearly at high counts.
 * Count-based estimates fit EOR_r by weighted least squares (weights = share of rank r):
 *     Hi-Lo:          EOR_r ≈ b·tag_r              → edge ≈ base + β·TC,           β = (N/52)·b
 *     Hi-Lo + aces:   EOR_r ≈ b1·tag_r + b2·[r=A]  → edge ≈ base + β₂·TC + γ·aceSurplusPerDeck,
 *                                                   β₂ = (N/52)·b1, γ = −(N/52)·b2
 * where aceSurplusPerDeck = (aces remaining − 4·decks remaining) / decks remaining.
 */
import { fullComp, type Comp } from './shoe';
import type { Rules } from './rules';
import type { Chart } from './strategy/chart';
import { roundEV } from './strategy/generate';
import { hiLoTag } from './count';
import { compAtTrueCount } from './indexgen';

export interface EdgeModel {
  decks: number;
  /** Player EV off the top (per unit). */
  base: number;
  /** EOR per single card removed from the full shoe, index 1..10. */
  eor: number[];
  /** Edge gained per Hi-Lo true count point. */
  beta: number;
  /** With ace side count: TC slope and edge per extra ace per deck remaining. */
  beta2: number;
  gamma: number;
  /** Exact EV of a neutral (proportional) shoe with d decks remaining: the depth effect. */
  depth: { d: number; ev: number }[];
  /**
   * Calibration of the linear term (least squares against exact EVs of realistic shoes at TC −6…+8
   * and several depths). < 1 when the modelled player's strategy loses efficiency away from TC 0.
   */
  scale: number;
}

/**
 * Compute the EOR model (expensive: ~15 full-round evaluations; run in a worker, cache per rules).
 * With `chart`, the modelled player follows the chart for every decision (a basic-strategy bettor);
 * without, every decision is composition-optimal (as in published EOR tables).
 */
export function computeEdgeModel(rules: Rules, chart?: Chart): EdgeModel {
  const full = fullComp(rules.decks);
  const ev = (c: Comp) => roundEV(c, rules, chart, undefined, !!chart);
  const base = ev(full);
  const eor = new Array(11).fill(0);
  for (let r = 1; r <= 10; r++) {
    const c = full.slice();
    c[r]--;
    eor[r] = ev(c) - base;
  }
  // Depth effect: a neutral shoe with fewer cards left plays like a game with fewer decks.
  const depth: { d: number; ev: number }[] = [{ d: rules.decks, ev: base }];
  const steps = rules.decks <= 2 ? [0.5, 1, 1.5] : [1, 2, 3, 4, 5].filter((d) => d < rules.decks);
  for (const d of steps) {
    const c = new Array(11).fill(0);
    for (let v = 1; v <= 9; v++) c[v] = Math.round(4 * d);
    c[10] = Math.round(16 * d);
    depth.push({ d, ev: ev(c) });
  }
  depth.sort((a, b) => a.d - b.d);
  const model: EdgeModel = { decks: rules.decks, base, eor, depth, scale: 1, ...fitCounts(eor, rules.decks) };
  // Calibrate the linear term on realistic shoes.
  let num = 0;
  let den = 0;
  const N = 52 * rules.decks;
  for (const f of [0.35, 0.55, 0.75]) {
    const d = Math.max(0.6, rules.decks * f);
    for (const t of [-6, -3, 2, 4, 6, 8]) {
      const c = compAtTrueCount(rules.decks, d, t);
      let R = 0;
      for (let v = 1; v <= 10; v++) R += c[v];
      let lin = 0;
      for (let r = 1; r <= 10; r++) lin += (full[r] * (R / N) - c[r]) * eor[r];
      lin *= N / R;
      const y = ev(c) - baseAt(model, R / 52);
      num += lin * y;
      den += lin * lin;
    }
  }
  model.scale = den > 0 ? num / den : 1;
  model.beta *= model.scale;
  model.beta2 *= model.scale;
  model.gamma *= model.scale;
  return model;
}

/** EV of a neutral shoe with `d` decks remaining (linear interpolation of the exact values). */
export function baseAt(m: EdgeModel, d: number): number {
  const pts = m.depth;
  if (!pts?.length) return m.base;
  if (d <= pts[0].d) return pts[0].ev;
  for (let i = 1; i < pts.length; i++) {
    if (d <= pts[i].d) {
      const a = pts[i - 1];
      const b = pts[i];
      return a.ev + ((b.ev - a.ev) * (d - a.d)) / (b.d - a.d);
    }
  }
  return pts[pts.length - 1].ev;
}

export function fitCounts(eor: number[], decks: number): { beta: number; beta2: number; gamma: number } {
  const full = fullComp(decks);
  const N = 52 * decks;
  const p = full.map((c) => c / N);
  const t = (r: number) => hiLoTag(r);
  const u = (r: number) => (r === 1 ? 1 : 0);
  let stt = 0;
  let ste = 0;
  let suu = 0;
  let stu = 0;
  let sue = 0;
  for (let r = 1; r <= 10; r++) {
    stt += p[r] * t(r) * t(r);
    ste += p[r] * t(r) * eor[r];
    suu += p[r] * u(r) * u(r);
    stu += p[r] * t(r) * u(r);
    sue += p[r] * u(r) * eor[r];
  }
  const b = ste / stt;
  const det = stt * suu - stu * stu;
  const b1 = (ste * suu - sue * stu) / det;
  const b2 = (stt * sue - stu * ste) / det;
  const k = N / 52;
  return { beta: k * b, beta2: k * b1, gamma: -k * b2 };
}

/** Edge from the full remaining composition via the linear EOR model. */
export function edgeEOR(m: EdgeModel, comp: Comp): number {
  const full = fullComp(m.decks);
  const N = 52 * m.decks;
  let R = 0;
  for (let v = 1; v <= 10; v++) R += comp[v];
  if (R <= 0) return m.base;
  let s = 0;
  for (let r = 1; r <= 10; r++) s += (full[r] * (R / N) - comp[r]) * m.eor[r];
  return baseAt(m, R / 52) + (m.scale ?? 1) * (N / R) * s;
}

/** Hi-Lo true count and ace surplus per deck of a remaining composition. */
export function countsOf(m: { decks: number }, comp: Comp) {
  const full = fullComp(m.decks);
  let rc = 0;
  let R = 0;
  for (let v = 1; v <= 10; v++) {
    rc += hiLoTag(v) * (full[v] - comp[v]);
    R += comp[v];
  }
  const d = R / 52;
  return { tc: rc / d, aceSurplusPerDeck: (comp[1] - 4 * d) / d, decksRemaining: d };
}

/** Hi-Lo estimate; pass decks remaining to include the depth effect. */
export const edgeHiLo = (m: EdgeModel, tc: number, decksRemaining = m.decks) => baseAt(m, decksRemaining) + m.beta * tc;
export const edgeHiLoAce = (m: EdgeModel, tc: number, aceSurplusPerDeck: number, decksRemaining = m.decks) => baseAt(m, decksRemaining) + m.beta2 * tc + m.gamma * aceSurplusPerDeck;

/** Per-hand variance of blackjack (units²), standard value with doubles and splits. */
export const BJ_VARIANCE = 1.33;

export function kelly(bankroll: number, edge: number, variance = BJ_VARIANCE) {
  const full = Math.max(0, (bankroll * edge) / variance);
  return { full, half: full / 2 };
}

/**
 * Betting EV of a session: Σ units · edge(composition at bet time), compared with what the user's
 * ramp (at the same true counts) would have earned. Edge from the EOR model.
 */
export function scoreBets(bets: { units: number; tc: number; unseen: Comp }[], m: EdgeModel, rampUnits: (tc: number) => number) {
  let betEV = 0;
  let rampEV = 0;
  let units = 0;
  let rampUnitsSum = 0;
  for (const b of bets) {
    const e = edgeEOR(m, b.unseen);
    betEV += b.units * e;
    const r = rampUnits(b.tc);
    rampEV += r * e;
    units += b.units;
    rampUnitsSum += r;
  }
  return { betEV, rampEV, units, rampUnits: rampUnitsSum, diff: betEV - rampEV };
}
