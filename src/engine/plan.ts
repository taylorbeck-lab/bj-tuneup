/**
 * Plan a session: what a game is worth with your spread, and how a short, strike-and-go session is
 * likely to go.
 *
 * 1. The game: thousands of shoes dealt at this table's depth and crowd (about 2.7 cards a player
 *    and 2.9 for the dealer each round, burn card, cut card where it's placed). At the start of every
 *    round we note the Hi-Lo true count you'd bet on and your edge from the cards left (the EOR model
 *    in edge.ts, playing basic strategy), centred so a flat bettor gets the edge off the top.
 * 2. Your spread: a bet ramp from 1 unit up to your top bet at a true count of +4 (+5 in a shoe game).
 *    Its edge and swing come straight from step 1 (a blackjack hand's variance is about 1.33 units²).
 * 3. The session: thousands of sessions of your length, each round's result drawn around its edge,
 *    stopping when you hit your win goal or lose the buy-in, the way you'd actually play it.
 */
import { fullComp, type Comp } from './shoe';
import { mulberry32 } from './rng';
import { hiLoTag } from './count';
import { edgeEOR, BJ_VARIANCE, type EdgeModel } from './edge';
import type { Rules } from './rules';

/** Rounds dealt per hour, by players at the table (you included). */
export const HANDS_PER_HOUR: Record<number, number> = { 1: 200, 2: 140, 3: 110, 4: 90, 5: 75, 6: 65 };

export interface PlanInput {
  rules: Rules;
  model: EdgeModel;
  /** Players at the table, you included. */
  players: number;
  minutes: number;
  /** One unit, in dollars (your minimum bet). */
  unit: number;
  buyIn: number;
  /** Leave when you're up this much (dollars), or null to play the time out. */
  winGoal: number | null;
  seed?: number;
}

export interface SpreadPlan {
  spread: number;
  /** Edge on the money you bet (e.g. 0.012 = 1.2%). */
  edge: number;
  avgBetUnits: number;
  /** Dollars won per hour on average, and the swing (one standard deviation) per hour. */
  perHour: number;
  swingPerHour: number;
  /** Over the session: average result, and the chances of each ending. */
  session: number;
  pUp: number;
  /** Hit the win goal (before losing the buy-in and before time's up). */
  pGoal: number;
  /** Lost the whole buy-in. */
  pBust: number;
  /** Hands to play before the win is more likely than not to be ahead of one swing (N0). */
  n0: number;
}

export interface Plan {
  handsPerHour: number;
  hands: number;
  /** Share of rounds where the cards left favour you. */
  favourable: number;
  roundsPerShoe: number;
  spreads: SpreadPlan[];
}

/** Units bet at a true count for a 1-to-`spread` ramp: 1 unit up to +1, the top bet at +4 (+5 in a shoe game). */
export function rampUnits(tc: number, spread: number, decks: number): number {
  const top = decks <= 2 ? 4 : 5;
  if (tc < 2 || spread <= 1) return 1;
  return Math.min(spread, Math.max(1, Math.round(1 + ((spread - 1) * (Math.floor(tc) - 1)) / (top - 1))));
}

/** The rounds of many shoes: the true count you'd bet on and your edge, in order. */
export function dealShoes(rules: Rules, model: EdgeModel, players: number, shoes: number, seed = 1) {
  const r = mulberry32(seed);
  const N = rules.decks * 52;
  const tcs: number[] = [];
  const edges: number[] = [];
  const shoeStart: number[] = [];
  const perRound = 2.7 * players + 2.9;
  for (let s = 0; s < shoes; s++) {
    shoeStart.push(tcs.length);
    const comp: Comp = fullComp(rules.decks);
    // the order cards come out of the shoe: draw values in proportion to what's left
    const take = () => {
      let left = 0;
      for (let v = 1; v <= 10; v++) left += comp[v];
      let x = r() * left;
      for (let v = 1; v <= 10; v++) {
        x -= comp[v];
        if (x < 0) {
          comp[v]--;
          return v;
        }
      }
      comp[10]--;
      return 10;
    };
    const pen = Math.min(0.92, Math.max(0.4, rules.penetration + (rules.cutSpread ? (r() + r() - 1) * rules.cutSpread : 0)));
    const cut = Math.round(N * pen);
    let dealt = 1;
    let rc = 0;
    take(); // burn (unseen)
    while (dealt < cut) {
      const decksLeft = Math.max(0.5, Math.round(((N - dealt) / 52) * 2) / 2);
      tcs.push(rc / decksLeft);
      edges.push(edgeEOR(model, comp));
      const n = Math.max(4, Math.round(perRound + (r() - 0.5) * 3));
      for (let i = 0; i < n && dealt < N - 1; i++) {
        rc += hiLoTag(take());
        dealt++;
      }
    }
  }
  return { tcs, edges, shoeStart };
}

/** Standard normal draw (Box–Muller). */
function normal(r: () => number) {
  return Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());
}

export function planSession(input: PlanInput, spreads: number[]): Plan {
  const { rules, model, players, minutes, unit, buyIn, winGoal } = input;
  const seed = input.seed ?? 7;
  const shoes = rules.decks <= 2 ? 6000 : 2500;
  const { tcs, edges, shoeStart } = dealShoes(rules, model, players, shoes, seed);
  const R = tcs.length;
  // A flat bettor's long-run edge is the edge off the top, wherever in the shoe the rounds fall (for a
  // fixed strategy, every round's expected edge averages to the full-shoe edge). The linear model
  // runs a little rich on neutral part-shoes, so centre it there: the count's swings stay exact.
  const centre = edges.reduce((a, e) => a + e, 0) / R - model.base;
  for (let i = 0; i < R; i++) edges[i] -= centre;
  const handsPerHour = HANDS_PER_HOUR[Math.min(6, Math.max(1, players))];
  const hands = Math.max(1, Math.round((handsPerHour * minutes) / 60));
  const favourable = edges.filter((e) => e > 0).length / R;
  const sd1 = Math.sqrt(BJ_VARIANCE);
  const rnd = mulberry32(seed ^ 0x5bd1e995);

  const out: SpreadPlan[] = spreads.map((spread) => {
    let ev = 0;
    let bet = 0;
    let bet2 = 0;
    for (let i = 0; i < R; i++) {
      const u = rampUnits(tcs[i], spread, rules.decks);
      ev += u * edges[i];
      bet += u;
      bet2 += u * u;
    }
    const evRound = ev / R;
    const varRound = (bet2 / R) * BJ_VARIANCE;
    // sessions: start at the top of a random shoe, play round after round until a stop
    const sessions = 3000;
    const goalU = winGoal ? winGoal / unit : Infinity;
    const bustU = buyIn / unit;
    let up = 0;
    let goal = 0;
    let bust = 0;
    let total = 0;
    for (let s = 0; s < sessions; s++) {
      let i = shoeStart[Math.floor(rnd() * shoeStart.length)];
      let bank = 0;
      for (let h = 0; h < hands; h++) {
        const u = Math.min(rampUnits(tcs[i], spread, rules.decks), Math.max(1, Math.floor((bustU + bank) / 1)));
        bank += u * edges[i] + u * sd1 * normal(rnd);
        i = (i + 1) % R;
        if (bank >= goalU) {
          goal++;
          break;
        }
        if (bank <= -bustU) {
          bank = -bustU;
          bust++;
          break;
        }
      }
      if (bank > 0) up++;
      total += bank;
    }
    return {
      spread,
      edge: ev / bet,
      avgBetUnits: bet / R,
      perHour: evRound * handsPerHour * unit,
      swingPerHour: Math.sqrt(varRound * handsPerHour) * unit,
      session: (total / sessions) * unit,
      pUp: up / sessions,
      pGoal: winGoal ? goal / sessions : 0,
      pBust: bust / sessions,
      n0: evRound > 0 ? varRound / (evRound * evRound) : Infinity,
    };
  });
  return { handsPerHour, hands, favourable, roundsPerShoe: R / shoes, spreads: out };
}

/** José's read on a game, from the plan for your spread. */
export function verdict(rules: Rules, p: SpreadPlan): { tone: 'go' | 'grind' | 'walk'; line: string } {
  if (rules.bjPayout !== 1.5) return { tone: 'walk', line: 'Six to five? Walk away, primo. It costs you about 1.4% on every bet; no count at these spreads gets that back.' };
  if (p.edge <= 0) return { tone: 'walk', line: 'Counted perfectly, this game still loses money with that spread. Find a better game or spread wider.' };
  if (p.edge >= 0.01) return { tone: 'go', line: 'A strike game, primo. The edge is real; get in, catch a good count, get out before anybody cares.' };
  return { tone: 'grind', line: 'A grind. The edge is thin and the swings are big: it pays over many hours, not in one quick session.' };
}
