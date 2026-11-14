import { describe, it, expect } from 'vitest';
import { SIDE_BETS, sideBetEV, withPays, resolveSideBet, dealerBustByCards, type SideBet, type ByCard } from '../src/engine/sidebets';
import { makeCard, valueOf, type CardId } from '../src/engine/cards';

const full = (decks: number): ByCard => new Array(52).fill(decks);
const bet = (kind: SideBet['kind']) => SIDE_BETS.find((b) => b.kind === kind)!;

describe('side bet EVs vs Wizard of Odds (full shoes)', () => {
  it('Perfect Pairs 25/12/6', () => {
    const pp = bet('perfectPairs');
    expect(sideBetEV(pp, full(6)).ev).toBeCloseTo(-0.061093, 6);
    expect(sideBetEV(pp, full(2)).ev).toBeCloseTo(-0.223301, 6);
    const e8 = sideBetEV(pp, full(8));
    expect(e8.ev).toBeCloseTo(-0.040964, 6);
    expect(e8.lines.find((l) => l.id === 'perfect')!.prob).toBeCloseTo(1456 / 86320, 9);
    expect(sideBetEV(withPays(pp, { perfect: 25, colored: 15, mixed: 5 }), full(6)).ev).toBeCloseTo(-0.041801, 6);
  });
  it('21+3 versions and category counts (6 decks)', () => {
    const v1 = bet('twentyOnePlus3');
    expect(sideBetEV(v1, full(6)).ev).toBeCloseTo(-0.032386, 6);
    const v5 = withPays(v1, { suitedTrips: 100, straightFlush: 40, trips: 25, straight: 10, flush: 5 });
    const e = sideBetEV(v5, full(6));
    const tot = 5013320;
    expect(e.lines.find((l) => l.id === 'straightFlush')!.prob).toBeCloseTo(10368 / tot, 10);
    expect(e.lines.find((l) => l.id === 'straight')!.prob).toBeCloseTo(155520 / tot, 10);
    expect(e.lines.find((l) => l.id === 'flush')!.prob).toBeCloseTo(292896 / tot, 10);
    expect(e.lines.find((l) => l.id === 'suitedTrips')!.prob).toBeCloseTo(1040 / tot, 10);
    expect(e.lines.find((l) => l.id === 'trips')!.prob).toBeCloseTo(25272 / tot, 10);
    expect(sideBetEV(v5, full(8)).ev).toBeCloseTo(-0.062882, 6);
    // Xtreme: no suited-trips line -> pays as trips
    expect(sideBetEV(withPays(v1, { suitedTrips: 0, straightFlush: 30, trips: 20, straight: 10, flush: 5 }), full(6)).ev).toBeCloseTo(-0.133896, 6);
  });
  it('Lucky Ladies pay table A', () => {
    const ll = bet('luckyLadies');
    const e = sideBetEV(ll, full(6));
    expect(e.ev).toBeCloseTo(-0.247089, 6);
    expect(e.lines.find((l) => l.id === 'qhqhBJ')!.prob).toBeCloseTo(135360 / 9294695280, 10);
    expect(-sideBetEV(ll, full(2)).ev * 100).toBeCloseTo(30.05, 2);
  });
  it('Match the Dealer', () => {
    const md = bet('matchDealer');
    expect(sideBetEV(md, full(2)).ev).toBeCloseTo(-0.033124, 6);
    expect(sideBetEV(withPays(md, { suited: 11, unsuited: 4 }), full(6)).ev).toBeCloseTo(-0.040618, 6);
  });
  it('Buster Blackjack (6D, 12-to-1 six cards)', () => {
    const b = bet('buster');
    const e = sideBetEV({ ...b, h17: true }, full(6));
    expect(e.ev).toBeCloseTo(-0.062143, 5);
    expect(e.lines.find((l) => l.id === 'c3')!.prob).toBeCloseTo(0.173032, 6);
    expect(-sideBetEV({ ...b, h17: false }, full(6)).ev * 100).toBeCloseTo(8.25, 2);
  });
});

/** All orderings of k distinct positions from a small physical shoe. */
function* perms(cards: CardId[], k: number): Generator<CardId[]> {
  const n = cards.length;
  const used = new Array(n).fill(false);
  const cur: CardId[] = [];
  function* go(): Generator<CardId[]> {
    if (cur.length === k) {
      yield cur.slice();
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(cards[i]);
      yield* go();
      cur.pop();
      used[i] = false;
    }
  }
  yield* go();
}

describe('side bet combinatorics vs brute-force enumeration on small shoes', () => {
  // a small shoe with duplicates so pairs, suited pairs, Q♥ pairs, 20s, straights, flushes and matches all occur
  const cards: CardId[] = [makeCard(11, 1), makeCard(11, 1), makeCard(12, 0), makeCard(12, 0), makeCard(12, 1), makeCard(0, 0), makeCard(9, 2), makeCard(10, 1), makeCard(8, 1), makeCard(1, 3)];
  const counts: ByCard = new Array(52).fill(0);
  for (const c of cards) counts[c]++;
  for (const b of SIDE_BETS.filter((x) => x.kind !== 'buster')) {
    it(b.name, () => {
      // deal order: player 1, dealer up, player 2, dealer hole
      let sum = 0;
      let n = 0;
      for (const [p1, up, p2, hole] of perms(cards, 4)) {
        sum += resolveSideBet(b, [p1, p2], [up, hole]);
        n++;
      }
      expect(sideBetEV(b, counts).ev).toBeCloseTo(sum / n, 10);
    });
  }
  it('Buster: dealer bust-by-cards distribution', () => {
    const small: CardId[] = [makeCard(1, 0), makeCard(2, 0), makeCard(3, 0), makeCard(4, 0), makeCard(5, 0), makeCard(9, 0), makeCard(12, 0), makeCard(5, 1)];
    const byVal = new Array(11).fill(0);
    for (const c of small) byVal[valueOf(c)]++;
    const exact = dealerBustByCards(byVal, true);
    const brute = new Map<number, number>();
    let n = 0;
    for (const order of perms(small, small.length)) {
      n++;
      let sum = 0;
      let ace = false;
      let k = 0;
      for (;;) {
        const v = valueOf(order[k++]);
        sum += v;
        if (v === 1) ace = true;
        const soft = ace && sum + 10 <= 21;
        const t = soft ? sum + 10 : sum;
        if (k === 2 && t === 21) break;
        if (t > 21) {
          brute.set(k, (brute.get(k) ?? 0) + 1);
          break;
        }
        if (k >= 2 && t >= 17 && !(t === 17 && soft)) break;
        if (k >= small.length) break;
      }
    }
    for (const [k, c] of brute) expect(exact.get(k) ?? 0).toBeCloseTo(c / n, 10);
  });
});
