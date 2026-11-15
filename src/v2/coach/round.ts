/**
 * Feedback classifiers for the feedback card: was a play, bet or insurance decision right, which
 * layer it belongs to (basic play, count play, bet), and the short line for a miss. Feedback is
 * always after the fact, and the short line never states the count (a real table never tells you);
 * the number lives in the full card, one tap away.
 */
import { ACTION_LABEL, type Action } from '../../engine/strategy/chart';
import type { CoachVerdict } from './grade';

export type Layer = 'play' | 'count' | 'deviate' | 'bet';

const word = (a: Action) => ACTION_LABEL[a].toUpperCase();
const lower = (a: Action) => ACTION_LABEL[a].toLowerCase();

/** The other side of a count play: the play the count can switch to. */
function deviationOf(v: CoachVerdict): Action | undefined {
  const p = v.countSpot;
  if (!p) return undefined;
  const a = p.atOrAbove === v.chartPlay ? p.below : p.atOrAbove;
  return a === 'insure' || a === 'noinsure' ? undefined : a;
}

export interface Feedback {
  layer: Layer;
  ok: boolean;
  /** Text for the fading tick when right. */
  tick?: string;
  /** Short line when wrong. */
  line?: string;
  word?: string;
}

/** A decision: was it basic strategy or the count that mattered? */
export function decisionFeedback(v: CoachVerdict, practicedFixed = false): Feedback {
  const dev = deviationOf(v);
  const countSituation = !!v.countSpot;
  if (v.right) {
    if (v.countPlay) return { layer: 'deviate', ok: true, tick: '✓ count play' };
    if (practicedFixed) return { layer: 'play', ok: true, tick: '✓ leak fixed' };
    return { layer: countSituation ? 'deviate' : 'play', ok: true, tick: '✓ ' + lower(v.chosen) };
  }
  if (v.countPlay) return { layer: 'deviate', ok: false, word: word(v.correct), line: `Count says ${lower(v.correct)} on ${v.hand}.` };
  if (countSituation && dev && v.chosen === dev) return { layer: 'deviate', ok: false, word: word(v.correct), line: `Count isn't there yet: ${lower(v.correct)} ${v.hand}.` };
  return { layer: 'play', ok: false, word: word(v.correct), line: `${ACTION_LABEL[v.correct]} ${v.hand}.` };
}

/** A bet, graded against the spread at the true count (units = recommended multiple of the minimum). */
export function betFeedback(right: boolean, bet: number, rec: number, units: number): Feedback {
  if (right) return { layer: 'bet', ok: true, tick: units > 1 ? '✓ bet up' : undefined };
  if (bet < rec * 0.5) return { layer: 'bet', ok: false, word: '↑ BET', line: 'Count says bet bigger.' };
  if (units === 1) return { layer: 'bet', ok: false, word: '↓ MIN', line: 'Count says the minimum.' };
  return { layer: 'bet', ok: false, word: '↓ BET', line: 'Easy: count says bet less.' };
}

export function insuranceFeedback(right: boolean, shouldTake: boolean, deviations: boolean): Feedback {
  const layer: Layer = deviations ? 'deviate' : 'play';
  if (right) return { layer, ok: true, tick: shouldTake ? '✓ insurance' : '✓ no insurance' };
  return shouldTake ? { layer, ok: false, word: 'INSURE', line: 'Count says take insurance.' } : { layer, ok: false, word: 'SKIP', line: 'Skip insurance.' };
}
