/**
 * How long another player at the table takes to decide. Real players snap off the obvious ones
 * (standing on 19, hitting 7, doubling 11 against a 6) and hesitate on the tough ones (16 against a
 * 10, 12 against a 2, soft 18 against a 9). Each player also has their own pace, a quick regular or a
 * slow ponderer, and now and then someone just isn't paying attention. Counting through that, at
 * any seat, is the real-world skill.
 */
import { handTotal } from '../../engine/cards';

/** Relative thinking time for a decision (1 = an ordinary decision). */
export function thinkFactor(values: readonly number[], up: number, firstDecision: boolean): number {
  const { total, soft } = handTotal(values);
  const pair = values.length === 2 && values[0] === values[1];
  const strong = up === 1 || up >= 7; // dealer shows 7 through ace
  let f: number;
  if (pair && firstDecision) f = values[0] === 10 ? 0.7 : values[0] === 1 || values[0] === 8 ? 1.0 : 1.5;
  else if (soft) f = total >= 19 ? 0.55 : total === 18 ? (up === 1 || up >= 9 ? 1.9 : 1.2) : 1.3;
  else if (total >= 17) f = 0.55;
  else if (total <= 8) f = 0.6;
  else if (total === 11) f = 0.8;
  else if (total === 10) f = up === 1 || up === 10 ? 1.6 : 0.8;
  else if (total === 9) f = 1.1;
  else if (total === 16 && up === 10) f = 2.6;
  else if (total === 15 && up === 10) f = 2.3;
  else if (strong) f = 2.0; // 12-16 against 7 through ace
  else if (total <= 13 && up <= 3) f = 1.8; // 12-13 against 2-3
  else f = 1.1; // 12-16 against 4-6
  return firstDecision ? f : f * 0.75;
}

/** A player's own pace, fixed for the session: 0.65 (quick) to 1.5 (slow). */
export function personality(rnd: () => number): number {
  return 0.65 + rnd() * 0.85;
}

/** Milliseconds for one decision at a given dealer card pace. */
export function thinkMs(cardMs: number, factor: number, pace: number, rnd: () => number): number {
  // roughly log-normal jitter, plus the occasional distracted player
  const u = Math.max(1e-6, rnd());
  const v = rnd();
  const normal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  let ms = cardMs * 1.25 * factor * pace * Math.exp(0.3 * normal);
  if (rnd() < 0.06) ms *= 2.2;
  return Math.round(Math.min(cardMs * 7, Math.max(cardMs * 0.45, ms)));
}
