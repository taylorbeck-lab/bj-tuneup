/**
 * Table traffic: other players sit down and get up the way they do in a casino. Most of the coming
 * and going happens at the shuffle; now and then someone leaves mid-shoe (busted, done, dinner), and
 * once in a while someone sits down between hands. How busy the table runs is a setting: quiet
 * (often heads up), normal, busy, or fixed (a set number of players, no traffic).
 *
 * Why it matters for counting: the more players, the fewer rounds you see per shoe, and the fewer
 * of the hot ones you get to bet into. Playing through it is the lesson.
 */
import { MAX_SPOTS } from './layout';

export type Traffic = 'off' | 'quiet' | 'normal' | 'busy';

/** Players at the table including you, low to high. */
export const TRAFFIC_RANGE: Record<Exclude<Traffic, 'off'>, [number, number]> = {
  quiet: [1, 2],
  normal: [2, 5],
  busy: [4, 6],
};

/** Chances per round (mid-shoe) and per shuffle. */
const MID_SHOE_LEAVE = 0.04; // per player, per round
const MID_SHOE_JOIN = 0.03; // per round
const SHUFFLE_LEAVE = 0.3; // per player
const SHUFFLE_JOIN = 0.45; // per open seat draw

export interface TrafficChange {
  bots: number[];
  joined: number;
  left: number;
}

const freeSeats = (bots: number[], mine: number[]) => Array.from({ length: MAX_SPOTS }, (_, i) => i + 1).filter((s) => !bots.includes(s) && !mine.includes(s));
const pickOne = <T,>(xs: T[], rng: () => number) => xs[Math.floor(rng() * xs.length)];

/** Who's at the table when you sit down. */
export function initialBots(traffic: Exclude<Traffic, 'off'>, mine: number[], rng: () => number): number[] {
  const [lo, hi] = TRAFFIC_RANGE[traffic];
  const others = Math.min(MAX_SPOTS - mine.length, lo - 1 + Math.floor(rng() * (hi - lo + 1)));
  let bots: number[] = [];
  for (let i = 0; i < others; i++) bots = [...bots, pickOne(freeSeats(bots, mine), rng)];
  return bots.sort((a, b) => a - b);
}

function settle(bots: number[], traffic: Exclude<Traffic, 'off'>, mine: number[], rng: () => number): number[] {
  const [lo, hi] = TRAFFIC_RANGE[traffic];
  let out = bots.slice();
  // keep within the range for this kind of table
  while (out.length + 1 > hi && out.length) out = out.filter((b) => b !== pickOne(out, rng));
  while (out.length + 1 < lo && freeSeats(out, mine).length) out = [...out, pickOne(freeSeats(out, mine), rng)];
  return out.sort((a, b) => a - b);
}

/** Between hands, mid-shoe: someone may get up; once in a while someone sits down. */
export function betweenHands(bots: number[], traffic: Exclude<Traffic, 'off'>, mine: number[], rng: () => number): TrafficChange {
  const [lo, hi] = TRAFFIC_RANGE[traffic];
  let out = bots.slice();
  let left = 0;
  let joined = 0;
  for (const b of bots) if (out.length + 1 > lo && rng() < MID_SHOE_LEAVE) {
    out = out.filter((x) => x !== b);
    left++;
  }
  if (!left && out.length + 1 < hi && freeSeats(out, mine).length && rng() < MID_SHOE_JOIN) {
    out = [...out, pickOne(freeSeats(out, mine), rng)];
    joined++;
  }
  return { bots: out.sort((a, b) => a - b), joined, left };
}

/** At the shuffle: the natural time to leave or sit down. */
export function atShuffle(bots: number[], traffic: Exclude<Traffic, 'off'>, mine: number[], rng: () => number): TrafficChange {
  let out = bots.filter(() => rng() >= SHUFFLE_LEAVE);
  const left = bots.length - out.length;
  let joined = 0;
  const [, hi] = TRAFFIC_RANGE[traffic];
  for (let tries = 0; tries < 3; tries++)
    if (out.length + 1 < hi && freeSeats(out, mine).length && rng() < SHUFFLE_JOIN) {
      out = [...out, pickOne(freeSeats(out, mine), rng)];
      joined++;
    }
  const settled = settle(out, traffic, mine, rng);
  joined += Math.max(0, settled.length - out.length);
  return { bots: settled, joined, left: left + Math.max(0, out.length - settled.length) };
}

/** Rounds per shoe scale with cards per round: about 2.7 cards a hand, 2.9 for the dealer. */
export function headsUpRounds(rounds: number, handsPerRound: number): number {
  const per = (n: number) => 2.7 * n + 2.9;
  return Math.round((rounds * per(handsPerRound)) / per(1));
}
