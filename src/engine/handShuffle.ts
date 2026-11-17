/**
 * A dealer's hand shuffle, card by card.
 *
 * A computer's shuffle makes every order of the cards equally likely. A real dealer picks the
 * discards up hand by hand, riffles a few times, strips, riffles again and offers the cut, so the
 * next shoe is built from where the last one ended: some of its order survives (it takes about
 * seven good riffles to randomise a single deck; dealers do three or four on two). That carry-over is
 * what advantage players exploit when they track a shuffle.
 *
 * The riffle follows the Gilbert–Shannon–Reeds model (cut near the middle, binomially; each half
 * drops in proportion to how many cards it still holds), with cards falling in small clumps the way
 * dealers' riffles really do. Everything here only reorders the cards it's given: the shoe keeps
 * exactly the same cards, so the count and the odds of what's left are untouched.
 */
import type { Rng } from './rng';
import type { CardId } from './cards';

/** Average cards that fall together from one thumb in a dealer's riffle (a perfect riffle is 1). */
export const RIFFLE_CLUMP = 1.7;

/** Interleave two packets the way a riffle drops them. */
export function merge<T>(left: T[], right: T[], rng: Rng, clump = RIFFLE_CLUMP): T[] {
  const out: T[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    const a = left.length - i;
    const b = right.length - j;
    let n = 1;
    while (rng() < 1 - 1 / clump) n++;
    if (rng() * (a + b) < a) {
      out.push(...left.slice(i, i + n));
      i = Math.min(left.length, i + n);
    } else {
      out.push(...right.slice(j, j + n));
      j = Math.min(right.length, j + n);
    }
  }
  return out;
}

/** One riffle: split near the middle, then interleave. */
export function riffle<T>(cards: T[], rng: Rng): T[] {
  let k = 0;
  for (let i = 0; i < cards.length; i++) if (rng() < 0.5) k++;
  return merge(cards.slice(0, k), cards.slice(k), rng);
}

/** A strip: small packets pulled off the top into a new pile (each packet keeps its own order). */
export function strip<T>(cards: T[], rng: Rng): T[] {
  const rest = cards.slice();
  let out: T[] = [];
  while (rest.length) {
    const packet = rest.splice(0, Math.min(rest.length, 4 + Math.floor(rng() * 9)));
    out = packet.concat(out);
  }
  return out;
}

/** The player's cut: somewhere through the middle of the pack. */
export function cutPack<T>(cards: T[], rng: Rng): T[] {
  const k = Math.floor(cards.length * (0.3 + 0.4 * rng()));
  return cards.slice(k).concat(cards.slice(0, k));
}

/**
 * The shuffle a dealer does. Two decks or fewer: riffle, riffle, strip, riffle, cut. A shoe game:
 * split the pack, take a grab from each half, riffle each pair twice onto a new stack, strip, cut.
 */
export function dealerShuffle<T>(pile: T[], decks: number, rng: Rng): T[] {
  if (decks <= 2) return cutPack(riffle(strip(riffle(riffle(pile, rng), rng), rng), rng), rng);
  const half = Math.floor(pile.length / 2);
  const left = pile.slice(0, half);
  const right = pile.slice(half);
  let out: T[] = [];
  while (left.length || right.length) {
    const g = 20 + Math.floor(rng() * 14);
    out = riffle(merge(left.splice(0, g), right.splice(0, g), rng), rng).concat(out);
  }
  return cutPack(strip(out, rng), rng);
}

/** A card dealt this shoe, and where it went: a seat (and hand) or the dealer (-1). */
export interface DealtCard {
  card: CardId;
  who: number;
  hand: number;
}

/**
 * The discard pile as a dealer builds it: the burn card first, then every round picked up hand by
 * hand (third base to first base, the dealer's own hand last), each new round on top, and the cards
 * left behind the cut card on top at the shuffle. Returned top first.
 */
export function pickupPile(burned: CardId[], rounds: DealtCard[][], undealt: CardId[]): CardId[] {
  const bottomUp: CardId[] = [...burned];
  for (const dealt of rounds) {
    const hands = new Map<string, CardId[]>();
    for (const d of dealt) {
      const k = `${d.who}:${d.hand}`;
      (hands.get(k) ?? hands.set(k, []).get(k)!).push(d.card);
    }
    const order = [...hands.keys()].sort((a, b) => {
      const [wa, ha] = a.split(':').map(Number);
      const [wb, hb] = b.split(':').map(Number);
      if (wa === -1 || wb === -1) return wa === -1 ? 1 : -1;
      return wb - wa || hb - ha;
    });
    for (const k of order) bottomUp.push(...hands.get(k)!);
  }
  bottomUp.push(...undealt.slice().reverse());
  return bottomUp.reverse();
}
