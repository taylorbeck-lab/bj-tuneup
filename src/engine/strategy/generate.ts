/**
 * Basic strategy generator.
 *
 * Total-dependent basic strategy: for every row (hard total, soft total, pair) and dealer upcard,
 * take all initial two-card hands that form that row, compute the exact EV of each action from a
 * full shoe (with the hand and upcard removed), weight by the probability of being dealt that
 * hand, and pick the best. This "initial two-card hands" convention is the one used by published
 * charts (Wizard of Odds, BJA). Hard rows use non-pair hands when any exist.
 *
 * Composition-dependent strategy: the best action for each individual two-card hand; reported as
 * exceptions to the total-dependent chart.
 */
import { fullComp, type Comp } from '../shoe';
import type { Rules } from '../rules';
import { EvEngine, handActionEVs, type ActionEVs } from '../ev/engine';
import { dealerBJProb } from '../ev/dealer';
import { UPS, HARD_ROWS, SOFT_ROWS, PAIR_ROWS, type Chart, type Code, type Action, chartAction, upIndex } from './chart';

export interface HandEVRecord {
  a: number;
  b: number;
  up: number;
  weight: number;
  evs: ActionEVs;
}

/** EVs of all initial two-card hands vs every upcard from composition `comp`. */
export function allInitialEVs(comp: Comp, rules: Rules, ups: readonly number[] = UPS, continuation?: Chart): HandEVRecord[] {
  const out: HandEVRecord[] = [];
  for (const up of ups) {
    if (comp[up] <= 0) continue;
    const base = comp.slice();
    base[up]--;
    const eng = new EvEngine(base, up, rules, continuation);
    for (let a = 1; a <= 10; a++) {
      for (let b = a; b <= 10; b++) {
        const w = a === b ? base[a] * (base[a] - 1) : 2 * base[a] * base[b];
        if (w <= 0) continue;
        const evs = handActionEVs(eng, [a, b], { canDouble: true, canSplit: true, canSurrender: true });
        out.push({ a, b, up, weight: w, evs });
      }
    }
  }
  return out;
}

export function bestAction(evs: ActionEVs, exclude: Action[] = []): Action {
  let best: Action = 'stand';
  let bv = -Infinity;
  for (const k of ['stand', 'hit', 'double', 'split', 'surrender'] as Action[]) {
    const v = evs[k];
    if (v === undefined || exclude.includes(k)) continue;
    if (v > bv + 1e-12) {
      bv = v;
      best = k;
    }
  }
  return best;
}

/** Chart code from (weighted) EVs. */
export function codeFromEVs(evs: ActionEVs, allowSplit: boolean): Code {
  const ex: Action[] = allowSplit ? [] : ['split'];
  const b = bestAction(evs, ex);
  const hitOverStand = evs.hit >= evs.stand;
  switch (b) {
    case 'hit':
      return 'H';
    case 'stand':
      return 'S';
    case 'double':
      return hitOverStand ? 'D' : 'Ds';
    case 'split':
      return 'P';
    case 'surrender': {
      const second = bestAction(evs, [...ex, 'surrender', 'double']);
      return second === 'split' ? 'Rp' : second === 'hit' ? 'Rh' : 'Rs';
    }
  }
}

function avg(recs: HandEVRecord[]): ActionEVs {
  const W = recs.reduce((s, r) => s + r.weight, 0);
  const acc: ActionEVs = { stand: 0, hit: 0 };
  const keys = ['stand', 'hit', 'double', 'split', 'surrender'] as const;
  for (const k of keys) {
    if (recs.every((r) => r.evs[k] !== undefined)) acc[k] = recs.reduce((s, r) => s + r.weight * (r.evs[k] as number), 0) / W;
  }
  return acc;
}

export interface GeneratedStrategy {
  chart: Chart;
  /** Weighted EVs per cell for display: key `${section}:${row}:${up}` */
  cellEVs: Record<string, ActionEVs>;
  /** Two-card hands whose composition-dependent best play differs from the chart. */
  exceptions: { a: number; b: number; up: number; chart: Action; best: Action; gain: number }[];
  records: HandEVRecord[];
}

export function generateBasicStrategy(rules: Rules, comp: Comp = fullComp(rules.decks)): GeneratedStrategy {
  const recs = allInitialEVs(comp, rules);
  const chart: Chart = { hard: {}, soft: {}, pairs: {} };
  const cellEVs: Record<string, ActionEVs> = {};
  for (const t of HARD_ROWS) chart.hard[t] = new Array(10).fill('S');
  for (const t of SOFT_ROWS) chart.soft[t] = new Array(10).fill('S');
  for (const p of PAIR_ROWS) chart.pairs[p] = new Array(10).fill('S');

  for (const up of UPS) {
    const col = upIndex(up);
    const R = recs.filter((r) => r.up === up);
    for (const t of HARD_ROWS) {
      let set = R.filter((r) => r.a !== 1 && r.a !== r.b && r.a + r.b === t);
      if (!set.length) set = R.filter((r) => r.a !== 1 && r.a + r.b === t);
      if (!set.length) {
        chart.hard[t][col] = t >= 17 ? 'S' : 'H';
        continue;
      }
      const e = avg(set);
      cellEVs[`hard:${t}:${up}`] = e;
      chart.hard[t][col] = codeFromEVs(e, false);
    }
    for (const t of SOFT_ROWS) {
      const other = t - 11;
      const set = R.filter((r) => r.a === 1 && r.b === other);
      if (!set.length || t === 21) {
        chart.soft[t][col] = 'S';
        continue;
      }
      const e = avg(set);
      cellEVs[`soft:${t}:${up}`] = e;
      chart.soft[t][col] = codeFromEVs(e, false);
    }
    for (const p of PAIR_ROWS) {
      const set = R.filter((r) => r.a === p && r.b === p);
      if (!set.length) continue;
      const e = avg(set);
      cellEVs[`pair:${p}:${up}`] = e;
      chart.pairs[p][col] = codeFromEVs(e, true);
    }
  }

  const exceptions: GeneratedStrategy['exceptions'] = [];
  for (const r of recs) {
    if (r.a === 1 && r.b === 10) continue;
    const avail = { canDouble: r.evs.double !== undefined, canSplit: r.evs.split !== undefined, canSurrender: r.evs.surrender !== undefined };
    const ca = chartAction(chart, [r.a, r.b], r.up, avail);
    const best = bestAction(r.evs);
    if (best !== ca) {
      const gain = (r.evs[best] as number) - (r.evs[ca] as number);
      if (gain > 1e-9) exceptions.push({ a: r.a, b: r.b, up: r.up, chart: ca, best, gain });
    }
  }
  return { chart, cellEVs, exceptions, records: recs };
}

/**
 * Expected value of one round (per unit initial bet) from composition `comp`:
 * with `chart` the initial decision follows the chart (hit/stand continuation is composition-optimal,
 * or follows the chart too with `chartContinuation`);
 * without, the initial decision is composition-dependent optimal.
 * Insurance is never taken. Dealer peeks for blackjack.
 */
export function roundEV(comp: Comp, rules: Rules, chart?: Chart, recs?: HandEVRecord[], chartContinuation = false): number {
  const records = recs ?? allInitialEVs(comp, rules, UPS, chartContinuation ? chart : undefined);
  let n = 0;
  for (let v = 1; v <= 10; v++) n += comp[v];
  let ev = 0;
  for (const r of records) {
    const pUp = comp[r.up] / n;
    const n1 = n - 1;
    const pHand = r.weight / (n1 * (n1 - 1));
    const rest = comp.slice();
    rest[r.up]--;
    rest[r.a]--;
    rest[r.b]--;
    const pBJ = dealerBJProb(rest, r.up);
    let v: number;
    if ((r.a === 1 && r.b === 10) || (r.a === 10 && r.b === 1)) v = (1 - pBJ) * rules.bjPayout;
    else {
      let play: number;
      if (chart) {
        const avail = { canDouble: r.evs.double !== undefined, canSplit: r.evs.split !== undefined, canSurrender: r.evs.surrender !== undefined };
        play = r.evs[chartAction(chart, [r.a, r.b], r.up, avail)] as number;
      } else play = r.evs[bestAction(r.evs)] as number;
      v = -pBJ + (1 - pBJ) * play;
    }
    ev += pUp * pHand * v;
  }
  return ev;
}
