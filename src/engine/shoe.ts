import { type CardId, valueOf } from './cards';
import { type Rng, mulberry32, randomSeed, shuffle } from './rng';

/** Composition by blackjack value: index 1..10 (index 0 unused). */
export type Comp = number[];

export function fullComp(decks: number): Comp {
  const c = new Array(11).fill(0);
  for (let v = 1; v <= 9; v++) c[v] = 4 * decks;
  c[10] = 16 * decks;
  return c;
}
export const compTotal = (c: Comp): number => {
  let n = 0;
  for (let v = 1; v <= 10; v++) n += c[v];
  return n;
};

/**
 * A real shuffled shoe with a cut card and burn card. Tracks the exact remaining
 * composition both by blackjack value and by physical card (52 types).
 */
export class Shoe {
  readonly decks: number;
  readonly seed: number;
  readonly penetration: number;
  readonly burnCount: number;
  cards: CardId[] = [];
  pos = 0;
  cutIndex = 0;
  burned: CardId[] = [];
  /** Remaining (unseen, including burned-but-hidden? no: burned cards are removed) counts by value. */
  remainingByValue: Comp = fullComp(1);
  /** Remaining counts by physical card id 0..51. */
  remainingByCard: number[] = new Array(52).fill(0);
  private rng: Rng;

  constructor(decks: number, penetration: number, burn = 1, seed = randomSeed()) {
    this.decks = decks;
    this.seed = seed;
    this.penetration = penetration;
    this.burnCount = burn;
    this.rng = mulberry32(seed);
    this.shuffle();
  }

  /** Shuffle all cards back in, place the cut card and burn. */
  shuffle(): void {
    const cards: CardId[] = [];
    for (let d = 0; d < this.decks; d++) for (let id = 0; id < 52; id++) cards.push(id);
    this.cards = shuffle(cards, this.rng);
    this.pos = 0;
    this.burned = [];
    this.remainingByValue = fullComp(this.decks);
    this.remainingByCard = new Array(52).fill(this.decks);
    this.cutIndex = Math.round(this.cards.length * this.penetration);
    for (let i = 0; i < this.burnCount; i++) this.burned.push(this.take());
  }

  private take(): CardId {
    if (this.pos >= this.cards.length) throw new Error('Shoe exhausted');
    const c = this.cards[this.pos++];
    this.remainingByValue[valueOf(c)]--;
    this.remainingByCard[c]--;
    return c;
  }

  /** Deal one card face up. */
  draw(): CardId {
    return this.take();
  }

  get size(): number {
    return this.cards.length;
  }
  get remaining(): number {
    return this.cards.length - this.pos;
  }
  /** Cards dealt so far, including burned cards. */
  get dealt(): number {
    return this.pos;
  }
  /** Cards that have been seen by the player (excludes burn cards). */
  get seenCount(): number {
    return this.pos - this.burned.length;
  }
  /** True when the cut card has come out: finish the round, then shuffle. */
  get cutReached(): boolean {
    return this.pos >= this.cutIndex;
  }
  /**
   * Composition of the cards the player cannot see (remaining shoe + burned cards).
   * This is the "unseen" composition used for all player-side math: a player cannot
   * know what the burn card was, so it is still unknown to him.
   */
  unseenByValue(): Comp {
    const c = this.remainingByValue.slice();
    for (const b of this.burned) c[valueOf(b)]++;
    return c;
  }
  unseenByCard(): number[] {
    const c = this.remainingByCard.slice();
    for (const b of this.burned) c[b]++;
    return c;
  }
  /** Stack the next cards (for scenarios/tests): moves the given cards to the current position. */
  stack(next: CardId[]): void {
    let p = this.pos;
    for (const want of next) {
      const idx = this.cards.indexOf(want, p);
      if (idx < 0) throw new Error('Card not available to stack');
      [this.cards[p], this.cards[idx]] = [this.cards[idx], this.cards[p]];
      p++;
    }
  }
}
