/**
 * Card model.
 * A physical card is an integer id 0..51: rank = id % 13 (0=A, 1=2, ..., 9=10, 10=J, 11=Q, 12=K),
 * suit = floor(id / 13) (0=spades, 1=hearts, 2=diamonds, 3=clubs).
 * Blackjack math works on "values" 1..10 (ace = 1, all ten-value cards = 10).
 */
export type CardId = number;
export type Suit = 0 | 1 | 2 | 3;

export const SUITS = ['S', 'H', 'D', 'C'] as const;
export const SUIT_GLYPHS = ['♠', '♥', '♦', '♣'] as const; // ♠ ♥ ♦ ♣
export const SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export const RANK_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export const RANK_NAMES = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'] as const;

export const rankOf = (c: CardId): number => c % 13;
export const suitOf = (c: CardId): Suit => Math.floor(c / 13) as Suit;
export const isRed = (c: CardId): boolean => {
  const s = suitOf(c);
  return s === 1 || s === 2;
};
/** Blackjack value 1..10 (ace = 1). */
export const valueOf = (c: CardId): number => {
  const r = rankOf(c);
  return r >= 9 ? 10 : r + 1;
};
export const makeCard = (rank: number, suit: number): CardId => suit * 13 + rank;

export function cardLabel(c: CardId): string {
  return RANK_LABELS[rankOf(c)] + SUIT_GLYPHS[suitOf(c)];
}
export function cardName(c: CardId): string {
  return `${RANK_NAMES[rankOf(c)]} of ${SUIT_NAMES[suitOf(c)]}`;
}
/** Parse "KS", "10h", "Q♥", "A♠" into a card id. Returns -1 if invalid. */
export function parseCard(s: string): CardId {
  const t = s.trim().toUpperCase();
  const m = /^(10|[2-9AJQKT])\s*([SHDC♠♥♦♣])$/.exec(t);
  if (!m) return -1;
  const rankStr = m[1] === 'T' ? '10' : m[1];
  const rank = RANK_LABELS.indexOf(rankStr as (typeof RANK_LABELS)[number]);
  let suit = SUITS.indexOf(m[2] as (typeof SUITS)[number]);
  if (suit < 0) suit = SUIT_GLYPHS.indexOf(m[2] as (typeof SUIT_GLYPHS)[number]);
  if (rank < 0 || suit < 0) return -1;
  return makeCard(rank, suit);
}

/** Label for a blackjack value (1..10). */
export const valueLabel = (v: number): string => (v === 1 ? 'A' : v === 10 ? 'T' : String(v));

/** Hand total from values. */
export function handTotal(values: readonly number[]): { total: number; soft: boolean } {
  let sum = 0;
  let aces = 0;
  for (const v of values) {
    sum += v;
    if (v === 1) aces++;
  }
  if (aces > 0 && sum + 10 <= 21) return { total: sum + 10, soft: true };
  return { total: sum, soft: false };
}

export const isBlackjack = (values: readonly number[]): boolean =>
  values.length === 2 && ((values[0] === 1 && values[1] === 10) || (values[0] === 10 && values[1] === 1));
