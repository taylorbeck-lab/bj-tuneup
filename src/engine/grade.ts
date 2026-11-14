/**
 * Grading of a player decision against three references:
 *   chart  = basic strategy (with the user's overrides),
 *   index  = chart + index plays at the player's true count (the user's strategy),
 *   best   = the exact composition-perfect play (max EV from the remaining cards).
 * EVs are per unit of the hand's initial bet; multiply by the bet for units.
 */
import type { Action, Chart } from './strategy/chart';
import { chartAction } from './strategy/chart';
import { indexAction, insuranceDecision, type IndexPlay } from './indices';
import type { DecisionSnapshot, InsuranceSnapshot } from './game';
import type { DecisionEVs } from './ev/analyze';
import { insuranceEV } from './ev/engine';

export interface DecisionGrade {
  chosen: Action;
  chart: Action;
  index: Action;
  indexPlayId?: string;
  best: Action;
  evChosen: number;
  evChart: number;
  evIndex: number;
  evBest: number;
  /** Departed from the user's strategy (chart + indices). */
  error: boolean;
  /** Departed from the basic strategy chart (a deviation or a feel play). */
  fringe: boolean;
  /** EV given up versus the user's strategy (negative = the departure gained EV). */
  lostVsIndex: number;
  /** EV given up versus the exact best play (always >= 0). */
  lostVsBest: number;
}

function bestOf(evs: DecisionEVs, legal: Action[]): Action {
  let b: Action = 'stand';
  let bv = -Infinity;
  for (const a of legal) {
    const v = evs[a];
    if (v !== undefined && v > bv + 1e-12) {
      bv = v;
      b = a;
    }
  }
  return b;
}

export function legalFrom(evs: DecisionEVs): Action[] {
  return (['hit', 'stand', 'double', 'split', 'surrender'] as Action[]).filter((a) => evs[a] !== undefined);
}

export function gradeDecision(snap: DecisionSnapshot, evs: DecisionEVs, chart: Chart, plays: IndexPlay[]): DecisionGrade {
  const legal = legalFrom(evs);
  const ch = chartAction(chart, snap.values, snap.up, snap.avail);
  const ix = indexAction(plays, chart, snap.values, snap.up, snap.tc, snap.avail);
  const best = bestOf(evs, legal);
  const ev = (a: Action) => evs[a] ?? evs.hit;
  return {
    chosen: snap.chosen,
    chart: ch,
    index: ix.action,
    indexPlayId: ix.play?.id,
    best,
    evChosen: ev(snap.chosen),
    evChart: ev(ch),
    evIndex: ev(ix.action),
    evBest: ev(best),
    error: snap.chosen !== ix.action,
    fringe: snap.chosen !== ch,
    lostVsIndex: ev(ix.action) - ev(snap.chosen),
    lostVsBest: Math.max(0, ev(best) - ev(snap.chosen)),
  };
}

export interface InsuranceGrade {
  take: boolean;
  shouldTake: boolean;
  /** EV of the insurance bet per unit of main bet. */
  ev: number;
  error: boolean;
  /** EV given up (per unit main bet) versus the exact decision. */
  lostVsBest: number;
}

export function gradeInsurance(s: InsuranceSnapshot, plays: IndexPlay[]): InsuranceGrade {
  const ev = insuranceEV(s.unseen);
  const shouldTake = insuranceDecision(plays, s.tc).take;
  const evTaken = s.take ? ev : 0;
  return { take: s.take, shouldTake, ev, error: s.take !== shouldTake, lostVsBest: Math.max(0, ev, 0) - evTaken };
}
