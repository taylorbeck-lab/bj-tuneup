/**
 * Goal-mode math: the probability of reaching a target, not just EV.
 *
 * 1. Hand level. For a utility u(net) over the hand's net result (in units of the bet), every legal
 *    action gets an exact outcome distribution, with the hit/stand continuation chosen to maximise
 *    expected utility (u = net reproduces max-EV play; u = [net ≥ need] maximises the chance of
 *    reaching a target). Splits: two independent hands, each played max-EV, convolved (documented
 *    approximation; resplits ignored).
 * 2. Round level. The outcome distribution of a whole round (blackjacks, dealer blackjack, doubles,
 *    splits) for a composition, playing the chart (or max-EV).
 * 3. Session level. Dynamic programming over bankroll (half-unit grid) and hands left:
 *    V_0(b) = [b ≥ T];  V_n(b) = 1 if b ≥ T, else max over bets x of Σ_o P(o) · V_{n−1}(b + x·o),
 *    with the composition held constant across the remaining hands (documented approximation).
 */
import type { Comp } from './shoe';
import type { Rules } from './rules';
import { canDoubleTotal } from './rules';
import { EvEngine, HandSolver, total } from './ev/engine';
import { POW, standEV, dealerBJProb } from './ev/dealer';
import { chartAction, type Action, type Chart } from './strategy/chart';

export type Dist = Map<number, number>;

function add(d: Dist, net: number, p: number) {
  if (p) d.set(net, (d.get(net) ?? 0) + p);
}
export function expect(d: Dist, u: (net: number) => number): number {
  let s = 0;
  for (const [n, p] of d) s += p * u(n);
  return s;
}
export function mean(d: Dist): number {
  return expect(d, (n) => n);
}
function convolve(a: Dist, b: Dist): Dist {
  const out: Dist = new Map();
  for (const [x, p] of a) for (const [y, q] of b) add(out, x + y, p * q);
  return out;
}

/** [lose, push, win] probabilities of standing on `t` against dealer vector. */
function standLPW(d: Float64Array, t: number): [number, number, number] {
  if (t > 21) return [1, 0, 0];
  let w = d[5];
  let push = 0;
  let l = 0;
  for (let i = 0; i < 5; i++) {
    const dt = 17 + i;
    if (t > dt) w += d[i];
    else if (t === dt) push += d[i];
    else l += d[i];
  }
  return [l, push, w];
}

type LPW = [number, number, number];

/** Outcome distributions per action for one hand, continuation maximising expected utility. */
export class GoalSolver {
  private sv: HandSolver;
  private memo = new Map<number, LPW>();
  constructor(
    private eng: EvEngine,
    private u: (net: number) => number,
  ) {
    this.sv = eng.solver();
  }
  private standAt(hk: number, t: number): LPW {
    if (t > 21) return [1, 0, 0];
    const d = this.eng.dealer(this.sv.shoe, hk + this.sv.offKey);
    return standLPW(d, t);
  }
  private util(x: LPW) {
    return x[0] * this.u(-1) + x[1] * this.u(0) + x[2] * this.u(1);
  }
  private hitLPW(hk: number, sum: number, ace: boolean): LPW {
    const out: LPW = [0, 0, 0];
    const sv = this.sv;
    if (sv.n === 0) return this.standAt(hk, total(sum, ace));
    for (let c = 1; c <= 10; c++) {
      if (!sv.shoe[c]) continue;
      const p = sv.p(c);
      if (sum + c > 21) {
        out[0] += p;
        continue;
      }
      sv.shoe[c]--;
      sv.n--;
      const r = this.best(hk + POW[c], sum + c, ace || c === 1);
      sv.shoe[c]++;
      sv.n++;
      out[0] += p * r[0];
      out[1] += p * r[1];
      out[2] += p * r[2];
    }
    return out;
  }
  private best(hk: number, sum: number, ace: boolean): LPW {
    const m = this.memo.get(hk);
    if (m) return m;
    const t = total(sum, ace);
    const s = this.standAt(hk, t);
    let r = s;
    if (t < 21) {
      const h = this.hitLPW(hk, sum, ace);
      if (this.util(h) > this.util(s) + 1e-12) r = h;
    }
    this.memo.set(hk, r);
    return r;
  }
  private doubleLPW(hk: number, sum: number, ace: boolean): LPW {
    const out: LPW = [0, 0, 0];
    const sv = this.sv;
    for (let c = 1; c <= 10; c++) {
      if (!sv.shoe[c]) continue;
      const p = sv.p(c);
      if (sum + c > 21) {
        out[0] += p;
        continue;
      }
      sv.shoe[c]--;
      sv.n--;
      const r = this.standAt(hk + POW[c], total(sum + c, ace || c === 1));
      sv.shoe[c]++;
      sv.n++;
      out[0] += p * r[0];
      out[1] += p * r[1];
      out[2] += p * r[2];
    }
    return out;
  }

  /** Distributions of net (units of the initial bet) for each legal action of a hand. */
  actions(values: number[], avail: { canDouble: boolean; canSplit: boolean; canSurrender: boolean }): Partial<Record<Action, Dist>> {
    const sv = this.sv;
    const r = this.eng.rules;
    const hk = sv.take(values);
    const out: Partial<Record<Action, Dist>> = {};
    try {
      let sum = 0;
      let ace = false;
      for (const v of values) {
        sum += v;
        if (v === 1) ace = true;
      }
      const t = total(sum, ace);
      const lpw = (x: LPW, k: number): Dist => {
        const d: Dist = new Map();
        add(d, -k, x[0]);
        add(d, 0, x[1]);
        add(d, k, x[2]);
        return d;
      };
      out.stand = lpw(this.standAt(hk, t), 1);
      if (t < 21) out.hit = lpw(this.hitLPW(hk, sum, ace), 1);
      const two = values.length === 2;
      const soft = ace && sum + 10 <= 21;
      if (two && avail.canDouble && canDoubleTotal(r, t, soft)) out.double = lpw(this.doubleLPW(hk, sum, ace), 2);
      if (two && avail.canSurrender && r.lateSurrender) out.surrender = new Map([[-0.5, 1]]);
      if (two && avail.canSplit && values[0] === values[1] && r.maxSplitHands > 1) {
        sv.restore(values);
        try {
          const one = splitHandDist(this.eng, values[0]);
          out.split = convolve(one, one);
        } finally {
          sv.take(values);
        }
      }
    } finally {
      sv.restore(values);
    }
    return out;
  }
}

/** One post-split hand's net distribution (max-EV play, DAS per rules, no resplit). */
function splitHandDist(eng: EvEngine, p: number): Dist {
  const r = eng.rules;
  const sv = eng.solver([p]);
  const k0 = sv.take([p]);
  const out: Dist = new Map();
  try {
    for (let c = 1; c <= 10; c++) {
      if (!sv.shoe[c]) continue;
      const pc = sv.p(c);
      sv.shoe[c]--;
      sv.n--;
      const hk = k0 + POW[c];
      const sum = p + c;
      const ace = p === 1 || c === 1;
      const t = total(sum, ace);
      const d = eng.dealer(sv.shoe, hk + sv.offKey);
      const sEV = standEV(d, t);
      let choice: 'stand' | 'hit' | 'double' = 'stand';
      let bestEV = sEV;
      const canHit = !(p === 1 && !r.hitSplitAces) && t < 21;
      if (canHit) {
        const h = sv.hit(hk, sum, ace);
        if (h > bestEV) (bestEV = h), (choice = 'hit');
        if (r.das && canDoubleTotal(r, t, ace && sum + 10 <= 21)) {
          const db = sv.double(hk, sum, ace);
          if (db > bestEV) (bestEV = db), (choice = 'double');
        }
      }
      let lpw: LPW;
      let k = 1;
      if (choice === 'stand') lpw = standLPW(d, t);
      else {
        lpw = splitContinuation(eng, sv, hk, sum, ace, choice);
        if (choice === 'double') k = 2;
      }
      add(out, -k, pc * lpw[0]);
      add(out, 0, pc * lpw[1]);
      add(out, k, pc * lpw[2]);
      sv.shoe[c]++;
      sv.n++;
    }
  } finally {
    sv.restore([p]);
  }
  return out;
}

/** L/P/W of hitting (max-EV continuation) or doubling from a split-hand state of solver `sv`. */
function splitContinuation(eng: EvEngine, sv: HandSolver, hk: number, sum: number, ace: boolean, choice: 'hit' | 'double'): LPW {
  const rec = (k: number, s: number, a: boolean, depth: number): LPW => {
    const t = total(s, a);
    const d = eng.dealer(sv.shoe, k + sv.offKey);
    const st = standLPW(d, t);
    if (depth > 0 && (t >= 21 || sv.stand(k, t) >= sv.hit(k, s, a))) return st;
    if (depth > 0 && choice === 'double') return st;
    const o: LPW = [0, 0, 0];
    for (let c = 1; c <= 10; c++) {
      if (!sv.shoe[c]) continue;
      const p = sv.p(c);
      if (s + c > 21) {
        o[0] += p;
        continue;
      }
      sv.shoe[c]--;
      sv.n--;
      const r = choice === 'double' ? standLPW(eng.dealer(sv.shoe, k + POW[c] + sv.offKey), total(s + c, a || c === 1)) : rec(k + POW[c], s + c, a || c === 1, depth + 1);
      sv.shoe[c]++;
      sv.n++;
      o[0] += p * r[0];
      o[1] += p * r[1];
      o[2] += p * r[2];
    }
    return o;
  };
  return rec(hk, sum, ace, 0);
}

/**
 * Distribution of a full round's net (per unit bet) from composition `comp`, playing `chart` for the
 * initial decision (max-EV if no chart) and max-EV hit/stand afterwards. Insurance never taken.
 */
export function roundOutcomeDist(comp: Comp, rules: Rules, chart?: Chart): Dist {
  let n = 0;
  for (let v = 1; v <= 10; v++) n += comp[v];
  const out: Dist = new Map();
  for (let up = 1; up <= 10; up++) {
    if (!comp[up]) continue;
    const base = comp.slice();
    base[up]--;
    const eng = new EvEngine(base, up, rules);
    const gs = new GoalSolver(eng, (x) => x);
    const pUp = comp[up] / n;
    const n1 = n - 1;
    for (let a = 1; a <= 10; a++)
      for (let b = a; b <= 10; b++) {
        const w = a === b ? base[a] * (base[a] - 1) : 2 * base[a] * base[b];
        if (w <= 0) continue;
        const pHand = (pUp * w) / (n1 * (n1 - 1));
        const rest = base.slice();
        rest[a]--;
        rest[b]--;
        const pBJ = dealerBJProb(rest, up);
        if ((a === 1 && b === 10) || (a === 10 && b === 1)) {
          add(out, 0, pHand * pBJ);
          add(out, rules.bjPayout, pHand * (1 - pBJ));
          continue;
        }
        add(out, -1, pHand * pBJ);
        const avail = { canDouble: true, canSplit: rules.maxSplitHands > 1, canSurrender: rules.lateSurrender };
        const dists = gs.actions([a, b], avail);
        let act: Action;
        if (chart) act = chartAction(chart, [a, b], up, avail);
        else {
          act = 'stand';
          let bv = -Infinity;
          for (const [k, d] of Object.entries(dists) as [Action, Dist][]) {
            const m = mean(d);
            if (m > bv) (bv = m), (act = k);
          }
        }
        const d = dists[act] ?? dists.stand!;
        for (const [net, p] of d) add(out, net, pHand * (1 - pBJ) * p);
      }
  }
  return out;
}

export interface GoalDP {
  /** V[n][b2] = P(reach target) with n hands left and bankroll b2/2 units. */
  V: Float64Array[];
  /** Best bet (units) per state; 0 = sit out. */
  bestBet: Int16Array[];
  target: number;
}

/**
 * Bankroll DP. Bets are whole units in [minBet, maxBet] and never above the bankroll; `sitOut`
 * allows betting nothing. Bankroll is clipped to [0, target]; below `minBet` (and no sit-out) is ruin.
 */
export function goalDP(round: Dist, target: number, hands: number, minBet = 1, maxBet = target, sitOut = false): GoalDP {
  const T2 = Math.round(target * 2);
  const outcomes = [...round.entries()].filter(([, p]) => p > 0);
  const V: Float64Array[] = [];
  const bestBet: Int16Array[] = [];
  const v0 = new Float64Array(T2 + 1);
  v0[T2] = 1;
  V.push(v0);
  bestBet.push(new Int16Array(T2 + 1));
  for (let n = 1; n <= hands; n++) {
    const prev = V[n - 1];
    const cur = new Float64Array(T2 + 1);
    const bb = new Int16Array(T2 + 1);
    cur[T2] = 1;
    for (let b2 = 0; b2 < T2; b2++) {
      let best = sitOut ? prev[b2] : 0;
      let bx = 0;
      const maxX = Math.min(maxBet, Math.floor(b2 / 2));
      for (let x = minBet; x <= maxX; x++) {
        let s = 0;
        for (const [o, p] of outcomes) {
          const nb = Math.min(T2, Math.max(0, b2 + Math.round(2 * x * o)));
          s += p * prev[nb];
        }
        if (s > best + 1e-12) {
          best = s;
          bx = x;
        }
      }
      cur[b2] = best;
      bb[b2] = bx;
    }
    V.push(cur);
    bestBet.push(bb);
  }
  return { V, bestBet, target };
}

/** P(reach target) after betting `x` this hand with outcome distribution `d`, then playing optimally. */
export function goalProbAfter(dp: GoalDP, bankroll: number, x: number, d: Dist, handsLeftAfter: number): number {
  const T2 = Math.round(dp.target * 2);
  const V = dp.V[Math.min(handsLeftAfter, dp.V.length - 1)];
  let s = 0;
  for (const [o, p] of d) {
    const nb = Math.min(T2, Math.max(0, Math.round(2 * (bankroll + x * o))));
    s += p * V[nb];
  }
  return s;
}

/** Utility for a hand decision under the DP: u(net) = V_{n-1}(bankroll + bet·net). */
export function goalUtility(dp: GoalDP, bankroll: number, bet: number, handsLeftAfter: number): (net: number) => number {
  const T2 = Math.round(dp.target * 2);
  const V = dp.V[Math.min(handsLeftAfter, dp.V.length - 1)];
  return (net) => V[Math.min(T2, Math.max(0, Math.round(2 * (bankroll + bet * net))))];
}
