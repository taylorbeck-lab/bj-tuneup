/**
 * Exact EV of every legal action at a decision point, from the unseen composition.
 * Engines are cached by (base composition, upcard, rules): after a hit, the next decision has the same
 * base (unseen minus the card + hand plus the card), so the whole hand reuses one engine and its caches.
 */
import type { Comp } from '../shoe';
import type { Rules } from '../rules';
import { rulesKey } from '../rules';
import type { Avail } from '../strategy/chart';
import { EvEngine, handActionEVs, insuranceEV, type ActionEVs } from './engine';

const cache = new Map<string, EvEngine>();
const MAX = 24;

export function engineFor(base: Comp, up: number, rules: Rules): EvEngine {
  const k = base.slice(1).join(',') + '|' + up + '|' + rulesKey(rules);
  let e = cache.get(k);
  if (!e) {
    e = new EvEngine(base, up, rules);
    cache.set(k, e);
    if (cache.size > MAX) cache.delete(cache.keys().next().value!);
  }
  return e;
}

export interface DecisionEVs extends ActionEVs {
  /** EV of taking insurance (per unit of main bet) when the upcard is an ace. */
  insurance?: number;
}

export function analyzeDecision(unseen: Comp, values: number[], up: number, rules: Rules, avail: Avail, splitHands = 1): DecisionEVs {
  const base = unseen.slice();
  for (const v of values) base[v]++;
  const eng = engineFor(base, up, rules);
  const evs: DecisionEVs = handActionEVs(eng, values, { ...avail, splitHands });
  if (up === 1) evs.insurance = insuranceEV(unseen);
  return evs;
}
