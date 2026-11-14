/** Pure drill logic: item generation and grading (UI-independent, unit-tested). */
import { type CardId, makeCard, valueOf, handTotal } from './cards';
import { hiLoCard, estimateDecks, roundTc, type Rounding } from './count';
import { type Rng, shuffle, randInt, pick } from './rng';
import type { Shoe } from './shoe';
import type { Rules } from './rules';
import { chartAction, type Action, type Avail, type Chart } from './strategy/chart';
import { indexAction, insuranceDecision, type IndexPlay } from './indices';

// ---------- deck countdown ----------
export function countdownDeck(rng: Rng, removeK: number) {
  const deck = shuffle(Array.from({ length: 52 }, (_, i) => i), rng);
  const removed = deck.slice(0, removeK);
  const cards = deck.slice(removeK);
  const answer = cards.reduce((s, c) => s + hiLoCard(c), 0);
  return { cards, removed, answer };
}

// ---------- discard estimation / true count ----------
/** Decks in the discard tray rounded to the given granularity. */
export function discardDecks(cardsDiscarded: number, granularity: number): number {
  const d = cardsDiscarded / 52;
  return granularity ? Math.round(d / granularity) * granularity : d;
}

export function tcAnswer(rc: number, cardsRemaining: number, granularity: number, rounding: Rounding): number {
  return roundTc(rc / estimateDecks(cardsRemaining, granularity), rounding);
}

/** Random realistic RC for a given depth: approximately normal with sd ~ sqrt(cards seen) * 0.9 ... clamp. */
export function randomRc(rng: Rng, cardsSeen: number, cardsRemaining: number): number {
  // Hi-Lo running count after n of N cards: variance ~ n (N-n)/(N-1) * 10/13
  const N = cardsSeen + cardsRemaining;
  const v = (cardsSeen * cardsRemaining) / Math.max(1, N - 1) * (10 / 13);
  const z = Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  return Math.round(z * Math.sqrt(v) * 1.4);
}

// ---------- hands for flash drills ----------
export function randomSuitCard(rng: Rng, value: number): CardId {
  const rank = value === 1 ? 0 : value === 10 ? 9 + randInt(rng, 4) : value - 1;
  return makeCard(rank, randInt(rng, 4));
}

export interface BsItem {
  key: string;
  values: [number, number];
  up: number;
}

/** All decision-relevant two-card hands vs every upcard. Trivial cells (hard <= 8, hard 17+ without surrender, soft 20, BJ) are excluded. */
export function bsItems(rules: Rules): BsItem[] {
  const out: BsItem[] = [];
  for (const up of [2, 3, 4, 5, 6, 7, 8, 9, 10, 1]) {
    for (let a = 1; a <= 10; a++) {
      for (let b = a; b <= 10; b++) {
        if (a === 1 && b === 10) continue;
        const { total, soft } = handTotal([a, b]);
        const pair = a === b;
        if (!pair && !soft && total <= 8) continue;
        if (!pair && !soft && total >= 17 && !(rules.lateSurrender && total === 17 && up === 1)) continue;
        if (soft && total >= 20 && !pair) continue;
        // collapse equivalent hard hands (e.g. 9,7 and 10,6) into one item per total, except pairs
        out.push({ key: `bs:${a},${b}v${up}`, values: [a, b], up });
      }
    }
  }
  // Keep one representative per (hard total, up) to avoid overweighting totals with many compositions.
  const seen = new Set<string>();
  return out.filter((it) => {
    const [a, b] = it.values;
    const { total, soft } = handTotal([a, b]);
    const cls = a === b ? `p${a}` : soft ? `s${total}` : `h${total}`;
    const k = `${cls}v${it.up}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function bsItemKey(values: readonly number[], up: number): string {
  const [a, b] = values;
  const { total, soft } = handTotal([a, b]);
  const cls = a === b ? `p${a}` : soft ? `s${total}` : `h${total}`;
  return `bs:${cls}v${up}`;
}

/** Random composition for a hard total (two cards, no pair, no ace). */
export function hardComposition(rng: Rng, total: number): [number, number] {
  const opts: [number, number][] = [];
  for (let a = 2; a <= 10; a++) {
    const b = total - a;
    if (b >= 2 && b <= 10 && a < b) opts.push([a, b]);
  }
  if (!opts.length) {
    const h = total / 2;
    return [h, h];
  }
  return pick(opts, rng);
}

export const ALL_AVAIL: Avail = { canDouble: true, canSplit: true, canSurrender: true };

export function availFor(rules: Rules): Avail {
  return { canDouble: true, canSplit: rules.maxSplitHands > 1, canSurrender: rules.lateSurrender };
}

export function bsCorrect(chart: Chart, values: readonly number[], up: number, av: Avail): Action {
  return chartAction(chart, values, up, av);
}

// ---------- deviations flash ----------
export interface DevItem {
  play: IndexPlay;
  values: number[];
  up: number;
  tc: number;
}

export function devItem(rng: Rng, play: IndexPlay): DevItem {
  const tc = play.index + randInt(rng, 5) - 2;
  let values: number[];
  switch (play.hand.kind) {
    case 'hard':
      values = hardComposition(rng, play.hand.total);
      break;
    case 'soft':
      values = [1, play.hand.total - 11];
      break;
    case 'pair':
      values = [play.hand.value, play.hand.value];
      break;
    case 'insurance':
      values = hardComposition(rng, 8 + randInt(rng, 12));
      break;
  }
  return { play, values, up: play.up, tc };
}

export type DevAnswer = Action | 'insure' | 'noinsure';

export function devCorrect(item: DevItem, plays: IndexPlay[], chart: Chart, av: Avail): DevAnswer {
  if (item.play.hand.kind === 'insurance') return insuranceDecision(plays, item.tc).take ? 'insure' : 'noinsure';
  return indexAction(plays, chart, item.values, item.up, item.tc, av).action;
}

// ---------- betting ----------
/** Ramp: ramp[0] at TC <= 1, ramp[1] at TC 2, ... ramp[5] at TC 6+. TC is floored first. */
export function rampBet(ramp: number[], tc: number): number {
  const t = Math.floor(tc);
  const i = Math.max(0, Math.min(ramp.length - 1, t - 1));
  return ramp[i];
}

/** Hi-Lo rule of thumb used until the exact edge model is available: each TC point is worth ~0.5%. */
export function approxEdge(baseEdge: number, tc: number): number {
  return baseEdge + 0.005 * tc;
}

/** Blackjack variance per hand is about 1.33 units^2. */
export const BJ_VARIANCE = 1.33;

export function kellyBet(bankroll: number, edge: number, fraction = 1, variance = BJ_VARIANCE): number {
  return Math.max(0, (bankroll * edge * fraction) / variance);
}

// ---------- counting round (for running-count drills) ----------
export interface CountRound {
  seats: CardId[][];
  dealer: CardId[];
  /** Cards in the order they are revealed. */
  order: CardId[];
  /** Where each revealed card lands: seat index (-1 = dealer) and position in that hand. */
  where: { who: number; pos: number }[];
}

function total(cards: CardId[]) {
  return handTotal(cards.map(valueOf));
}

/** Deal one round with simple realistic play (players use a basic-strategy-like hit/stand) for counting drills. */
export function dealCountRound(shoe: Shoe, seats: number, h17: boolean, rng: Rng): CountRound {
  const hands: CardId[][] = Array.from({ length: seats }, () => []);
  const dealer: CardId[] = [];
  const order: CardId[] = [];
  const where: { who: number; pos: number }[] = [];
  const reveal = (c: CardId, who: number, pos: number) => {
    order.push(c);
    where.push({ who, pos });
  };
  for (let r = 0; r < 2; r++) {
    hands.forEach((h, si) => {
      const c = shoe.draw();
      h.push(c);
      reveal(c, si, h.length - 1);
    });
    const c = shoe.draw();
    dealer.push(c);
    if (r === 0) reveal(c, -1, 0);
  }
  const up = valueOf(dealer[0]);
  hands.forEach((h, si) => {
    for (;;) {
      const t = total(h);
      if (t.total >= 21) break;
      const stiff = t.soft ? t.total <= 17 : t.total < 17;
      const want = t.soft ? t.total <= 17 : t.total <= 11 || (t.total < 17 && (up >= 7 || up === 1)) || (t.total === 12 && up <= 3);
      if (!stiff || !want) break;
      if (rng() < 0.03) break; // occasional "mistake" keeps the flow natural
      const c = shoe.draw();
      h.push(c);
      reveal(c, si, h.length - 1);
    }
  });
  reveal(dealer[1], -1, 1);
  const allBust = hands.every((h) => total(h).total > 21);
  if (!allBust) {
    for (;;) {
      const t = total(dealer);
      if (t.total > 17 || (t.total === 17 && !(t.soft && h17))) break;
      const c = shoe.draw();
      dealer.push(c);
      reveal(c, -1, dealer.length - 1);
    }
  }
  return { seats: hands, dealer, order, where };
}
