/** Coach grading (pure): the right play for this hand, and the words for it. */
import type { DecisionSnapshot } from '../../engine/game';
import { chartAction, ACTION_LABEL, type Action, type Chart } from '../../engine/strategy/chart';
import { indexAction, insuranceDecision, playLabel, type IndexPlay } from '../../engine/indices';
import { handTotal, valueLabel } from '../../engine/cards';
import { whyBasic, whyIndex, whyInsurance } from './why';

export interface CoachVerdict {
  right: boolean;
  chosen: Action;
  correct: Action;
  /** The play came from the count (deviation), not the chart. */
  countPlay?: IndexPlay;
  /** A count play exists for this hand (whether or not the count reached it). */
  countSpot?: IndexPlay;
  chartPlay: Action;
  title: string;
  accent: string;
  why: string;
  /** Short situation label, e.g. "16 vs 10". */
  hand: string;
  /** Situation key for stats (e.g. "h16v10"). */
  key: string;
}

export function handLabel(values: readonly number[], up: number): string {
  const pair = values.length === 2 && values[0] === values[1];
  const t = handTotal(values);
  const me = pair ? `${valueLabel(values[0])},${valueLabel(values[1])}` : t.soft ? `soft ${t.total}` : `${t.total}`;
  return `${me} vs ${up === 1 ? 'A' : up === 10 ? '10' : up}`;
}

export function situationKey(values: readonly number[], up: number): string {
  const pair = values.length === 2 && values[0] === values[1];
  const t = handTotal(values);
  return `${pair ? 'p' + values[0] : t.soft ? 's' + t.total : 'h' + t.total}v${up}`;
}

const RIGHT = ['textbook', 'nicely played', 'that’s the one', 'sharp', 'clean'];
const pickPraise = (n: number) => RIGHT[n % RIGHT.length];

/**
 * Grade a decision. `plays` are the count plays you're held to (none unless `deviations`). `accept`
 * are count plays that also count as right when you make them at the right count, even though you're
 * not held to them yet: someone who's counting (Level 2, or a play not yet given at Level 3) and knows
 * a count play shouldn't be marked wrong for making it.
 */
export function gradeDecision(snap: DecisionSnapshot, chart: Chart, plays: IndexPlay[], deviations: boolean, n = 0, accept?: IndexPlay[]): CoachVerdict {
  const chartPlay = chartAction(chart, snap.values, snap.up, snap.avail);
  let correct = chartPlay;
  let countPlay: IndexPlay | undefined;
  let countSpot: IndexPlay | undefined;
  if (deviations) {
    const ix = indexAction(plays, chart, snap.values, snap.up, snap.tc, snap.avail);
    correct = ix.action;
    countSpot = ix.play;
    if (ix.play && ix.action !== chartPlay) countPlay = ix.play;
  }
  let right = snap.chosen === correct;
  if (!right && accept?.length) {
    const ax = indexAction(accept, chart, snap.values, snap.up, snap.tc, snap.avail);
    if (ax.play && ax.action !== chartPlay && snap.chosen === ax.action) {
      // the count play, made at the right count: right, and credited as a count play
      right = true;
      correct = ax.action;
      countPlay = ax.play;
      countSpot = ax.play;
    }
  }
  const why = countPlay ? whyIndex(countPlay, snap.tc, correct) : whyBasic(snap.values, snap.up, correct);
  return {
    right,
    chosen: snap.chosen,
    correct,
    countPlay,
    countSpot,
    chartPlay,
    title: right ? 'Right call' : 'Not quite',
    accent: right ? (countPlay ? 'count play' : pickPraise(n)) : `${ACTION_LABEL[correct].toLowerCase()} here`,
    why: countPlay ? `${playLabel(countPlay)}: ${why}` : why,
    hand: handLabel(snap.values, snap.up),
    key: situationKey(snap.values, snap.up),
  };
}

export interface InsuranceVerdict {
  right: boolean;
  take: boolean;
  shouldTake: boolean;
  tenShare: number;
  why: string;
}

/**
 * Grade insurance. Held to the count (`deviations`): take it at the insurance index. Otherwise the
 * play is to skip it, except that someone who's counting (`accept`) and takes it at the right count is
 * right too (a count play).
 */
export function gradeInsurance(take: boolean, unseen: number[], tc: number, plays: IndexPlay[], deviations: boolean, accept?: IndexPlay[]): InsuranceVerdict {
  const n = unseen.reduce((a, b) => a + b, 0);
  const tenShare = unseen[10] / n;
  const shouldTake = deviations ? insuranceDecision(plays, tc).take : false;
  const countSaysTake = insuranceDecision(deviations ? plays : (accept ?? plays), tc).take;
  const accepted = !deviations && !!accept?.length && take && countSaysTake;
  const right = take === shouldTake || accepted;
  return { right, take, shouldTake, tenShare, why: whyInsurance({ take, right, tenShare, tc, countSaysTake, heldToCount: deviations, counting: deviations || !!accept?.length }) };
}
