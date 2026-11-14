/**
 * Combinatorial EV engine.
 *
 * Everything is computed from an exact composition (counts by value 1..10). For one dealer upcard an
 * EvEngine holds a "base" composition B (the unseen cards, with the player's current cards added
 * back). Any state is described by the multiset R of cards removed from B (the player's cards plus,
 * for split hands, the other split card); the shoe at that state is B - R. Dealer distributions are
 * cached per R, so every player hand that leaves the same shoe re-uses one dealer computation.
 *
 * Peek conditioning is exact: with an A (T) upcard the hole card is known not to be a T (A). Dealer
 * outcomes are conditioned on that, and so are the player's draw probabilities (`HandSolver.p`):
 * the hole card is one of the unseen cards, so the player's next card is drawn from the unseen
 * cards minus a hole card that cannot be the blackjack card.
 *
 * Splits use the standard "count only the pair cards already split" approximation, see `splitEV`.
 */
import type { Comp } from '../shoe';
import type { Rules } from '../rules';
import { canDoubleTotal } from '../rules';
import { POW, dealerProbs, standEV, type DealerVec } from './dealer';

export const total = (sum: number, ace: boolean): number => (ace && sum + 10 <= 21 ? sum + 10 : sum);
const isSoft = (sum: number, ace: boolean): boolean => ace && sum + 10 <= 21;

export class EvEngine {
  readonly base: Comp;
  readonly up: number;
  readonly rules: Rules;
  /** Card value the hole card cannot be (peek): T under an A, A under a T, else 0. */
  readonly excl: number;
  private dcache = new Map<number, DealerVec>();
  private solvers = new Map<number, HandSolver>();

  constructor(base: Comp, up: number, rules: Rules) {
    this.base = base.slice();
    this.up = up;
    this.rules = rules;
    this.excl = up === 1 ? 10 : up === 10 ? 1 : 0;
  }

  /** Dealer distribution for the shoe B - R, where `shoe` currently equals B - R and `rkey` = key(R). */
  dealer(shoe: Comp, rkey: number): DealerVec {
    let d = this.dcache.get(rkey);
    if (!d) {
      d = dealerProbs(shoe, this.up, this.rules.h17, true);
      this.dcache.set(rkey, d);
    }
    return d;
  }

  /** Solver for hands whose "other removed cards" are `other` (e.g. the second split card). */
  solver(other: number[] = []): HandSolver {
    let k = 0;
    for (const v of other) k += POW[v];
    let s = this.solvers.get(k);
    if (!s) {
      s = new HandSolver(this, other, k);
      this.solvers.set(k, s);
    }
    return s;
  }

  get cacheSize(): number {
    return this.dcache.size;
  }
}

export class HandSolver {
  readonly shoe: Comp;
  n: number;
  private bestMemo = new Map<number, number>();
  private hitMemo = new Map<number, number>();
  private standMemo = new Map<number, number>();

  constructor(
    readonly eng: EvEngine,
    other: number[],
    readonly offKey: number,
  ) {
    this.shoe = eng.base.slice();
    for (const v of other) this.shoe[v]--;
    let n = 0;
    for (let v = 1; v <= 10; v++) {
      if (this.shoe[v] < 0) throw new Error('Invalid composition');
      n += this.shoe[v];
    }
    this.n = n;
  }

  /** Remove the given cards from the scratch shoe (call `restore` afterwards). */
  take(values: readonly number[]): number {
    let k = 0;
    for (const v of values) {
      if (this.shoe[v] <= 0) throw new Error('Card not available in composition');
      this.shoe[v]--;
      this.n--;
      k += POW[v];
    }
    return k;
  }
  restore(values: readonly number[]): void {
    for (const v of values) {
      this.shoe[v]++;
      this.n++;
    }
  }

  /**
   * Probability that the player's next card is `c`, given the current scratch shoe and that the
   * (unseen) hole card does not give the dealer blackjack. With remaining counts m (M cards) and
   * excluded hole value x: P(c) = m_c (M - 1 - m_x + [c = x]) / ((M - 1)(M - m_x)).
   */
  p(c: number): number {
    const m = this.shoe;
    const M = this.n;
    const x = this.eng.excl;
    if (!x || M < 2) return m[c] / M;
    const mx = m[x];
    if (mx >= M) return m[c] / M;
    return (m[c] * (M - 1 - mx + (c === x ? 1 : 0))) / ((M - 1) * (M - mx));
  }

  /** EV of standing. `hk` = key of hand cards. Shoe must currently be B - other - hand. */
  stand(hk: number, tot: number): number {
    if (tot > 21) return -1;
    let ev = this.standMemo.get(hk);
    if (ev === undefined) {
      const d = this.eng.dealer(this.shoe, hk + this.offKey);
      ev = standEV(d, tot);
      this.standMemo.set(hk, ev);
    }
    return ev;
  }

  /** EV of hitting once and then playing hit/stand optimally (composition-dependent). */
  hit(hk: number, sum: number, ace: boolean): number {
    let ev = this.hitMemo.get(hk);
    if (ev !== undefined) return ev;
    ev = 0;
    if (this.n === 0) return this.stand(hk, total(sum, ace));
    for (let c = 1; c <= 10; c++) {
      if (!this.shoe[c]) continue;
      const p = this.p(c);
      const s2 = sum + c;
      if (s2 > 21) {
        ev -= p;
        continue;
      }
      this.shoe[c]--;
      this.n--;
      ev += p * this.best(hk + POW[c], s2, ace || c === 1);
      this.shoe[c]++;
      this.n++;
    }
    this.hitMemo.set(hk, ev);
    return ev;
  }

  /** Best of hit/stand. */
  best(hk: number, sum: number, ace: boolean): number {
    let ev = this.bestMemo.get(hk);
    if (ev !== undefined) return ev;
    const t = total(sum, ace);
    const s = this.stand(hk, t);
    ev = t >= 21 ? s : Math.max(s, this.hit(hk, sum, ace));
    this.bestMemo.set(hk, ev);
    return ev;
  }

  /** Stand vs hit decision (true = hit) for the current state. */
  shouldHit(hk: number, sum: number, ace: boolean): boolean {
    const t = total(sum, ace);
    if (t >= 21) return false;
    return this.hit(hk, sum, ace) > this.stand(hk, t);
  }

  /** EV of doubling (one card, double stake). */
  double(hk: number, sum: number, ace: boolean): number {
    let ev = 0;
    if (this.n === 0) return 2 * this.stand(hk, total(sum, ace));
    for (let c = 1; c <= 10; c++) {
      if (!this.shoe[c]) continue;
      const p = this.p(c);
      const s2 = sum + c;
      if (s2 > 21) {
        ev -= p;
        continue;
      }
      this.shoe[c]--;
      this.n--;
      ev += p * this.stand(hk + POW[c], total(s2, ace || c === 1));
      this.shoe[c]++;
      this.n++;
    }
    return 2 * ev;
  }
}

export interface ActionEVs {
  stand: number;
  hit: number;
  double?: number;
  split?: number;
  surrender?: number;
}

export interface DecisionOptions {
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
  /** Hands that already exist from splitting this pair (1 = not split yet). */
  splitHands?: number;
}

function sumAce(values: readonly number[]): { sum: number; ace: boolean } {
  let sum = 0;
  let ace = false;
  for (const v of values) {
    sum += v;
    if (v === 1) ace = true;
  }
  return { sum, ace };
}

/**
 * EVs of every legal action for a hand. The engine base must contain the hand's cards
 * (B = unseen shoe + hand cards). Values are per unit of the original bet, conditioned on
 * no dealer blackjack.
 */
export function handActionEVs(eng: EvEngine, hand: number[], opts: DecisionOptions): ActionEVs {
  const sv = eng.solver();
  const hk = sv.take(hand);
  try {
    const { sum, ace } = sumAce(hand);
    const t = total(sum, ace);
    const res: ActionEVs = { stand: sv.stand(hk, t), hit: t > 21 ? -1 : sv.hit(hk, sum, ace) };
    if (t > 21) return { stand: -1, hit: -1 };
    if (opts.canDouble && hand.length === 2 && canDoubleTotal(eng.rules, t, isSoft(sum, ace))) res.double = sv.double(hk, sum, ace);
    if (opts.canSurrender && hand.length === 2 && eng.rules.lateSurrender) res.surrender = -0.5;
    if (opts.canSplit && hand.length === 2 && hand[0] === hand[1] && eng.rules.maxSplitHands > (opts.splitHands ?? 1)) {
      sv.restore(hand);
      try {
        res.split = splitEV(eng, hand[0], opts.splitHands ?? 1);
      } finally {
        sv.take(hand);
      }
    }
    return res;
  } finally {
    sv.restore(hand);
  }
}

/**
 * EV of one post-split hand that starts with card `p` and receives a second card `c`,
 * played optimally, no further split. Shoe of `sv` must equal B - p(other) - p(this) - c on entry.
 */
function postSplitValue(eng: EvEngine, sv: HandSolver, hk: number, p: number, c: number): number {
  const r = eng.rules;
  const sum = p + c;
  const ace = p === 1 || c === 1;
  const t = total(sum, ace);
  const stand = sv.stand(hk, t);
  if (p === 1 && !r.hitSplitAces) return stand;
  let best = t >= 21 ? stand : Math.max(stand, sv.hit(hk, sum, ace));
  if (r.das && canDoubleTotal(r, t, isSoft(sum, ace))) best = Math.max(best, sv.double(hk, sum, ace));
  return best;
}

/**
 * Split EV (sum over all resulting hands, per unit of original bet).
 *
 * Approximation (the method used by Wizard of Odds' Appendix 9 and most combinatorial analyzers):
 * a split hand is evaluated from the shoe with the upcard and all pair cards dealt so far removed
 * (one per hand created), ignoring the other cards drawn to the other split hands. Let, for h hands
 * created (h pair cards out):
 *   q_h = probability the next card is another pair card,
 *   X_h = EV of a split hand given its second card is not a pair card (optimal play, DAS per rules),
 *   Y_h = EV of a split hand that drew a pair card but cannot resplit (max hands reached).
 * With k hands still waiting for a second card:
 *   f(h, 0) = 0,
 *   f(h, k) = q_h * (h < max ? max(f(h+1, k+1), Y_h + f(h, k-1)) : Y_h + f(h, k-1)) + (1 - q_h) * (X_h + f(h, k-1)),
 *   (resplitting is optional: the player resplits only when it is worth more than playing on),
 *   splitEV = f(hands after this split, 2).
 * Without resplitting this is exactly 2 * E[post-split hand EV].
 */
export function splitEV(eng: EvEngine, p: number, splitHandsBefore = 1, resplit: 'optimal' | 'always' = 'optimal'): number {
  const r = eng.rules;
  const maxHands = p === 1 && !r.resplitAces ? 2 : r.maxSplitHands;
  const stats = new Map<number, { q: number; X: number; Y: number }>();
  const statsFor = (h: number) => {
    let st = stats.get(h);
    if (st) return st;
    // h pair cards out: h-1 "other" cards + this hand's own pair card.
    const other = new Array(h - 1).fill(p);
    if (eng.base[p] < h) {
      st = { q: 0, X: 0, Y: 0 };
      stats.set(h, st);
      return st;
    }
    const sv = eng.solver(other);
    const k0 = sv.take([p]);
    let X = 0;
    let Y = 0;
    let q = 0;
    try {
      for (let c = 1; c <= 10; c++) {
        if (!sv.shoe[c]) continue;
        const pc = sv.p(c);
        sv.shoe[c]--;
        sv.n--;
        const v = postSplitValue(eng, sv, k0 + POW[c], p, c);
        sv.shoe[c]++;
        sv.n++;
        if (c === p) {
          q = pc;
          Y = v;
        } else X += pc * v;
      }
    } finally {
      sv.restore([p]);
    }
    if (q < 1) X /= 1 - q;
    st = { q, X, Y };
    stats.set(h, st);
    return st;
  };
  const memo = new Map<number, number>();
  const f = (h: number, k: number): number => {
    if (k === 0) return 0;
    const key = h * 64 + k;
    const m = memo.get(key);
    if (m !== undefined) return m;
    const { q, X, Y } = statsFor(h);
    const playOn = Y + f(h, k - 1);
    const pairBranch = h < maxHands ? (resplit === 'always' ? f(h + 1, k + 1) : Math.max(f(h + 1, k + 1), playOn)) : playOn;
    const v = q * pairBranch + (1 - q) * (X + f(h, k - 1));
    memo.set(key, v);
    return v;
  };
  return f(splitHandsBefore + 1, 2);
}

/** Insurance EV per unit of main bet (insurance stake = 0.5 units, pays 2:1). `unseen` includes the hole card. */
export function insuranceEV(unseen: Comp): number {
  let n = 0;
  for (let v = 1; v <= 10; v++) n += unseen[v];
  const p10 = unseen[10] / n;
  return 0.5 * (2 * p10 - (1 - p10));
}
