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

export function gradeDecision(snap: DecisionSnapshot, chart: Chart, plays: IndexPlay[], deviations: boolean, n = 0): CoachVerdict {
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
  const right = snap.chosen === correct;
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

export function gradeInsurance(take: boolean, unseen: number[], tc: number, plays: IndexPlay[], deviations: boolean): InsuranceVerdict {
  const n = unseen.reduce((a, b) => a + b, 0);
  const tenShare = unseen[10] / n;
  const shouldTake = deviations ? insuranceDecision(plays, tc).take : false;
  return { right: take === shouldTake, take, shouldTake, tenShare, why: whyInsurance(take, tenShare, deviations, tc) };
}
