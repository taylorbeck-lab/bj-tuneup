/** Strike Mode scenarios: situations where the max-EV play and the max-probability-of-goal play can differ. */
import type { Comp } from './shoe';
import { type CardId, makeCard, valueOf, isBlackjack } from './cards';
import { mulberry32, shuffle } from './rng';
import { compAtTrueCount } from './indexgen';

export interface Scenario {
  id: string;
  title: string;
  story: string;
  /** Bankroll and target in units. */
  bankroll: number;
  target: number;
  /** Hands left including this one. */
  hands: number;
  tc: number;
  minBet: number;
  maxBet: number;
  /** May skip hands (bet nothing). */
  sitOut: boolean;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'last-hand',
    title: 'Last hand',
    story: 'Your ride is outside. You are down 8 units on the day with 12 left in front of you and want to walk out even (20). One hand.',
    bankroll: 12,
    target: 20,
    hands: 1,
    tc: 1,
    minBet: 1,
    maxBet: 12,
    sitOut: false,
  },
  {
    id: 'short-bankroll',
    title: 'Short bankroll',
    story: 'The trip bankroll is down to 6 units and you need 30 to stay in action tomorrow. 20 hands left in a hot shoe.',
    bankroll: 6,
    target: 30,
    hands: 20,
    tc: 3,
    minBet: 1,
    maxBet: 12,
    sitOut: false,
  },
  {
    id: 'target-in-sight',
    title: 'Target in sight',
    story: 'You are at 92 units; 100 is the number you promised yourself. 12 hands before the shift change.',
    bankroll: 92,
    target: 100,
    hands: 12,
    tc: 0,
    minBet: 1,
    maxBet: 20,
    sitOut: false,
  },
  {
    id: 'stale-shoe',
    title: 'Stale shoe',
    story: 'The shoe went nowhere and the session is stale. 40 units in front of you, you want 50 before you leave in 8 hands. You may sit hands out.',
    bankroll: 40,
    target: 50,
    hands: 8,
    tc: -1,
    minBet: 1,
    maxBet: 20,
    sitOut: true,
  },
  {
    id: 'end-of-trip',
    title: 'End of trip',
    story: 'Last session of the trip: 25 units left, 60 covers the whole trip. 15 hands, count is mildly positive.',
    bankroll: 25,
    target: 60,
    hands: 15,
    tc: 2,
    minBet: 1,
    maxBet: 25,
    sitOut: false,
  },
];

/** Composition for the scenario: a 2-deck (or rules) shoe about half dealt at the scenario's TC. */
export function scenarioComp(s: Scenario, decks: number): Comp {
  return compAtTrueCount(decks, Math.max(0.75, decks / 2), s.tc);
}

/** Deal a decision hand (no blackjacks either side) from a composition. */
export function dealFrom(comp: Comp, seed: number): { player: CardId[]; up: CardId; hole: CardId; unseen: Comp } {
  const rng = mulberry32(seed);
  for (let attempt = 0; attempt < 100; attempt++) {
    const cards: CardId[] = [];
    for (let v = 1; v <= 10; v++)
      for (let i = 0; i < comp[v]; i++) {
        const rank = v === 1 ? 0 : v === 10 ? 9 + (i % 4) : v - 1;
        cards.push(makeCard(rank, i % 4));
      }
    shuffle(cards, rng);
    const [p1, up, p2, hole] = cards;
    const pv = [valueOf(p1), valueOf(p2)];
    const dv = [valueOf(up), valueOf(hole)];
    if (isBlackjack(pv) || isBlackjack(dv)) continue;
    const unseen = comp.slice();
    for (const c of [p1, p2, up]) unseen[valueOf(c)]--;
    return { player: [p1, p2], up, hole, unseen };
  }
  throw new Error('Could not deal');
}

export function grade(ratio: number): 'A' | 'B' | 'C' | 'D' {
  return ratio >= 0.98 ? 'A' : ratio >= 0.9 ? 'B' : ratio >= 0.75 ? 'C' : 'D';
}
