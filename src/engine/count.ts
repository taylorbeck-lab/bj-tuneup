import { type CardId, valueOf, rankOf } from './cards';
export type Rounding = 'floor' | 'round' | 'trunc';

/** Hi-Lo tag for a blackjack value: 2-6 = +1, 7-9 = 0, T/A = -1. */
export const hiLoTag = (v: number): number => (v >= 2 && v <= 6 ? 1 : v === 1 || v === 10 ? -1 : 0);
export const hiLoCard = (c: CardId): number => hiLoTag(valueOf(c));

export function runningCount(cards: readonly CardId[]): number {
  let rc = 0;
  for (const c of cards) rc += hiLoCard(c);
  return rc;
}

/**
 * Decks remaining as estimated by a player with the given granularity
 * (1, 0.5, 0.25 decks; 0 = exact). Uses the nearest step, never below one step.
 */
export function estimateDecks(cardsRemaining: number, granularity: number): number {
  const exact = cardsRemaining / 52;
  if (!granularity) return Math.max(exact, 1 / 52);
  const est = Math.round(exact / granularity) * granularity;
  return Math.max(est, granularity);
}

export function roundTc(tc: number, mode: Rounding): number {
  switch (mode) {
    case 'floor':
      return Math.floor(tc);
    case 'trunc':
      return Math.trunc(tc) + 0; // avoid -0
    case 'round':
      return Math.round(tc) + 0;
  }
}

export function trueCount(rc: number, cardsRemaining: number, granularity: number, rounding?: Rounding): number {
  const tc = rc / estimateDecks(cardsRemaining, granularity);
  return rounding ? roundTc(tc, rounding) : tc;
}

/** Ace side count: aces seen vs expected for the cards seen. Positive surplus = ace-rich remaining. */
export function aceSideCount(acesSeen: number, cardsSeen: number, decks: number) {
  const expectedSeen = (cardsSeen / 52) * 4;
  const acesRemaining = 4 * decks - acesSeen;
  const cardsRemaining = 52 * decks - cardsSeen;
  const expectedRemaining = (cardsRemaining / 52) * 4;
  /** Extra aces per remaining deck (above 4/deck = neutral). */
  const surplus = expectedSeen - acesSeen;
  const perDeck = cardsRemaining > 0 ? surplus / (cardsRemaining / 52) : 0;
  return { acesSeen, expectedSeen, acesRemaining, expectedRemaining, surplus, perDeck };
}

/** Running state of a counter watching cards come out of a shoe. */
export class Counter {
  rc = 0;
  seen = 0;
  aces = 0;
  keySeen = new Map<CardId, number>();
  constructor(
    public decks: number,
    public keyCards: CardId[] = [],
  ) {}
  see(c: CardId): void {
    this.rc += hiLoCard(c);
    this.seen++;
    if (rankOf(c) === 0) this.aces++;
    if (this.keyCards.includes(c)) this.keySeen.set(c, (this.keySeen.get(c) ?? 0) + 1);
  }
  reset(): void {
    this.rc = 0;
    this.seen = 0;
    this.aces = 0;
    this.keySeen.clear();
  }
  /** Copies of a key card still unseen. */
  keyRemaining(c: CardId): number {
    return this.decks - (this.keySeen.get(c) ?? 0);
  }
  tc(granularity: number, rounding?: Rounding): number {
    return trueCount(this.rc, this.decks * 52 - this.seen, granularity, rounding);
  }
  ace() {
    return aceSideCount(this.aces, this.seen, this.decks);
  }
}
