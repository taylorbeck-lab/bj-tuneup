/**
 * The round coach: quiet when you're right, four lights when something needs attention.
 * Feedback is always after the fact, and the short line never states the count (a real table never
 * tells you the count); the number lives in the full card, one tap away.
 */
import { ACTION_LABEL, type Action } from '../../engine/strategy/chart';
import type { CoachVerdict } from './grade';

export type Light = 'ok' | 'no' | 'idle';
export type Layer = 'play' | 'count' | 'deviate' | 'bet';
export const LAYER_LABEL: Record<Layer, string> = { play: 'Play', count: 'Count', deviate: 'Deviate', bet: 'Bet' };

export interface Tile {
  light: Light;
  /** Short word on a red tile (e.g. STAND, ↑ BET); never a count number. */
  word?: string;
}

export interface RoundState {
  tiles: Partial<Record<Layer, Tile>>;
  /** One short line for the latest miss (no count numbers). */
  line?: string;
  /** Something went wrong this round: show the lights. */
  flagged: boolean;
}

/** Which layers are switched on. */
export function layersFor(c: { deviations: boolean; countQuiz: 'off' | 'sometimes' | 'often'; betCoach: boolean }): Layer[] {
  const out: Layer[] = ['play'];
  if (c.countQuiz !== 'off') out.push('count');
  if (c.deviations) out.push('deviate');
  if (c.betCoach) out.push('bet');
  return out;
}

export function freshRound(layers: Layer[], count?: Light): RoundState {
  const tiles: RoundState['tiles'] = {};
  for (const l of layers) tiles[l] = { light: l === 'count' && count ? count : 'idle' };
  return { tiles, flagged: count === 'no', line: count === 'no' ? 'Your last count check was off.' : undefined };
}

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

/** Fold one piece of feedback into the round. A red light stays red for the round. */
export function applyFeedback(r: RoundState, f: Feedback): RoundState {
  const tile = r.tiles[f.layer] ?? (f.layer === 'play' ? { light: 'idle' as Light } : undefined);
  if (!tile) return r; // layer switched off
  const next: Tile = tile.light === 'no' && f.ok ? tile : { light: f.ok ? 'ok' : 'no', word: f.ok ? undefined : f.word };
  return { tiles: { ...r.tiles, [f.layer]: next }, line: f.ok ? r.line : f.line, flagged: r.flagged || !f.ok };
}
