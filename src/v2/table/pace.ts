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

/**
 * A player's own pace, fixed for as long as they sit: 0.6 (a quick regular) to 1.8 (a slow ponderer),
 * with more people near the quick end than the slow one, the way a real table runs.
 */
export function personality(rnd: () => number): number {
  return 0.6 + 1.2 * rnd() ** 1.4;
}

/**
 * Table time: the pauses that belong to people, not to the dealer's hands. The dealing speed sets how
 * fast cards come out of the shoe. It does not make the other players decide in a blink, the dealer
 * snatch the cards up the moment his hand is done, or a dealer blackjack vanish before you've seen
 * it. At a real table a fast dealer still waits on each player, pays and takes spot by spot, and
 * shows a blackjack before he collects. That time is what you count in, so it's kept at every speed.
 */

/**
 * An ordinary decision by another player, in ms. People don't think faster because the dealer's
 * hands are fast: it's about a second at any speed (a hair more at a slow table).
 */
export function thinkBase(cardMs: number): number {
  return 900 + 0.1 * cardMs;
}
/** Nobody signals faster than this, however obvious the hand; nobody is waited on longer than THINK_MAX. */
export const THINK_MIN = 450;
export const THINK_MAX = 7000;

/** Milliseconds for one decision at a given dealer card pace. */
export function thinkMs(cardMs: number, factor: number, pace: number, rnd: () => number): number {
  // roughly log-normal jitter, plus the occasional distracted player
  const u = Math.max(1e-6, rnd());
  const v = rnd();
  const normal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  // (a wide spread: the same player is quick on one hand and slow on the next)
  let ms = thinkBase(cardMs) * factor * pace * Math.exp(0.42 * normal);
  // now and then someone isn't paying attention, counts their chips, or asks the table
  if (rnd() < 0.08) ms *= 2 + 1.5 * rnd();
  return Math.round(Math.min(THINK_MAX, Math.max(THINK_MIN, ms)));
}

/** The last player is done: the beat before the dealer turns his hole card over (`u`: 0..1, a little variation). */
export function holeTurnMs(cardMs: number, u = 0): number {
  return Math.round(Math.max(cardMs, 650) * (1 + 0.4 * u));
}

/**
 * The dealer playing his own hand. Dealing to the table is one motion after another; his own hand
 * isn't: he turns a card, totals what he has, and only then draws again or stops. So each step is
 * part hand speed and part reading the hand, longer the more cards there are to add up and longer on
 * a soft hand (`cards`: how many he's holding now; `u`: 0..1, because no dealer is a metronome).
 */
export function dealerStepMs(cardMs: number, cards: number, soft: boolean, u = 0): number {
  return Math.round((0.6 * cardMs + 500 + 140 * Math.max(0, cards - 2) + (soft ? 200 : 0)) * (0.9 + 0.5 * u));
}

/** A dealer blackjack is shown, and said, before anything is collected. */
export const BLACKJACK_HOLD_MS = 1700;

/** Paying a blackjack: the dealer stops, works out three to two, and counts it out. */
export const BLACKJACK_PAY_MS = 1600;
export function blackjackPayMs(u = 0): number {
  return Math.round(BLACKJACK_PAY_MS * (1 + 0.35 * u));
}
/** Settling insurance (paying it on a dealer blackjack, or taking it). */
export const INSURANCE_MS = 700;

/** A hand at the end of the round, as the dealer has to deal with it. */
export interface SettledHand {
  net: number;
  doubled?: boolean;
  /** A blackjack still to be paid now (not one paid earlier, when the dealer got to it). */
  blackjack?: boolean;
  /** Paid earlier in the round: only the cards are left to pick up. */
  paid?: boolean;
}
/** Time for the dealer to pay or take one hand. */
export function payMs(h: SettledHand): number {
  if (h.paid) return 250;
  if (h.net > 0) return h.blackjack ? BLACKJACK_PAY_MS : h.doubled ? 650 : 450; // a doubled bet is a bigger stack to match
  if (h.net === 0) return 250; // a push: a knock on the felt
  return 350; // the bet and the cards
}

/** The least time a finished round stays down, whatever the dealing speed: reading the dealer's hand, then each hand he pays or takes. */
export const READ_DEALER_MS = 1100;
export const READ_PER_HAND_MS = 400;
export const READ_MIN_MS = READ_DEALER_MS + READ_PER_HAND_MS;

/**
 * How long the finished round stays on the felt before the cards are picked up. Each speed has its
 * own pause, but never less than it takes to read the dealer's hand and for the dealer to pay or
 * take each hand in turn: a win takes longer than a loss, a doubled win longer still, a push is a
 * knock on the felt, insurance is settled first, and a dealer blackjack is held on top of it all. So a
 * full table takes longer than heads up, and a round of big payouts longer than a round of losses.
 */
export function lingerMs(speed: { linger: number }, hands: number | SettledHand[], dealerBlackjack: boolean, u = 0, insurance = false): number {
  // what the dealer has to do: each hand by its result when we know them, or an ordinary hand's worth each
  const paying = typeof hands === 'number' ? READ_PER_HAND_MS * Math.max(1, hands) : Math.max(READ_PER_HAND_MS, hands.reduce((a, h) => a + payMs(h), 0));
  const hold = dealerBlackjack ? BLACKJACK_HOLD_MS : 0;
  const need = READ_DEALER_MS + paying + hold + (insurance ? INSURANCE_MS : 0);
  // (`u`: 0..1; paying and taking never takes exactly the same time twice, and never less than the floor)
  return Math.round(Math.max(speed.linger + hold, need) * (1 + 0.25 * u));
}
