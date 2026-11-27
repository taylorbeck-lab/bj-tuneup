import { describe, it, expect } from 'vitest';
import { layoutTable, occupiedSpots, neighbours, dealerBoxes, spotCenter, CARD_RATIO, FAN_MIN, STEP_DY, SMALLEST, type SpotShape, type TableLayout, type CardSpot } from '../src/v2/table/layout';
import { mulberry32 } from '../src/engine/rng';
import { initialBots, atShuffle } from '../src/v2/table/traffic';

type B = { x: number; y: number; w: number; h: number };
const box = (c: CardSpot): B => ({ x: c.x, y: c.y, w: c.w, h: c.w * CARD_RATIO });
const hit = (a: B, b: B) => a.x < b.x + b.w - 0.05 && b.x < a.x + a.w - 0.05 && a.y < b.y + b.h - 0.05 && b.y < a.y + a.h - 0.05;
const span = (h: CardSpot[]) => [Math.min(...h.map((c) => c.x)), Math.max(...h.map((c) => c.x + c.w))];

/** Final hands for a spot this round: mostly 2–4 cards, sometimes a split, now and then a long hand. */
function finalHands(r: () => number): number[] {
  const u = r();
  if (u < 0.03) return Array.from({ length: 3 + Math.floor(r() * 2) }, () => 2 + Math.floor(r() * 2));
  if (u < 0.15) return [2 + Math.floor(r() * 3), 2 + Math.floor(r() * 3)];
  if (u < 0.2) return [5 + Math.floor(r() * 3)];
  return [2 + Math.floor(r() * 3)];
}

/** Everything that must hold for one picture of the table. */
function check(lay: TableLayout, seats: number[], dealer: number) {
  const hands: { spot: number; hand: number; cards: CardSpot[] }[] = [];
  for (const [sp, v] of lay.spots) v.cards.forEach((h, hi) => h.length && hands.push({ spot: sp, hand: hi, cards: h }));
  const problems: string[] = [];
  const dealerB = dealerBoxes(dealer);
  for (const a of hands) {
    const [a0, a1] = span(a.cards);
    for (const c of a.cards) {
      const b = box(c);
      // on the felt, below the tray, the shoe and the dealer's hand
      if (b.x < 1.5 - 1e-6 || b.x + b.w > 98.5 + 1e-6 || b.y < 27 - 1e-6) problems.push(`off the felt: ${a.spot}:${a.hand}`);
      for (const d of dealerB) if (hit(b, d)) problems.push(`on the dealer's cards: ${a.spot}:${a.hand}`);
      // off every betting circle and its chips
      for (const sp of seats) {
        const k = spotCenter(sp);
        if (hit(b, { x: k.x - 6.2, y: k.y - 6.6, w: 12.4, h: 13 })) problems.push(`on circle ${sp}: ${a.spot}:${a.hand}`);
      }
    }
    // within a hand every rank stays readable: the next card sits clear of it to the right, or below it
    for (let i = 1; i < a.cards.length; i++) {
      const p = a.cards[i - 1];
      const c = a.cards[i];
      if (c.x - p.x < FAN_MIN * p.w - 1e-6 && c.y - p.y < STEP_DY * p.w - 1e-6) problems.push(`rank covered: ${a.spot}:${a.hand} card ${i}`);
    }
    for (const b of hands) {
      if (a === b) continue;
      const [b0, b1] = span(b.cards);
      // side by side, never stacked: no two hands share any width of the table
      if (a0 < b1 - 0.05 && b0 < a1 - 0.05) problems.push(`hands share a column: ${a.spot}:${a.hand} and ${b.spot}:${b.hand}`);
      // and in seat order across the table (third base on the left)
      if (a.spot !== b.spot && spotCenter(a.spot).x < spotCenter(b.spot).x !== a0 < b0) problems.push(`out of seat order: ${a.spot} and ${b.spot}`);
      // a split: the first hand played is the one on the right
      if (a.spot === b.spot && a.hand < b.hand !== a0 > b0) problems.push(`split hands out of order at ${a.spot}`);
    }
  }
  return problems;
}

describe('table layout: every hand in its own column, side by side', () => {
  it('never stacks, covers or crowds a hand, at every table size, seat and number of your hands', () => {
    const r = mulberry32(7);
    let steps = 0;
    let shrunk = 0;
    let smallest = 1;
    const problems = new Set<string>();
    for (let players = 1; players <= 6; players++)
      for (let seat = 1; seat <= 6; seat++)
        for (const hands of [1, 2]) {
          // (two hands: you also play the circle beside you)
          const lay = occupiedSpots(players, seat, hands === 2 ? neighbours(seat)[0] : null);
          for (let round = 0; round < 25; round++) {
            const shapes = new Map<number, SpotShape>(lay.spots.map((sp) => [sp, { spot: sp, mine: lay.mine.includes(sp), hands: [0] }]));
            let dealer = 0;
            const step = () => {
              const live = [...shapes.values()].filter((s) => s.hands.some((n) => n > 0));
              const next = layoutTable(live, dealer, lay.spots, lay.mine);
              steps++;
              for (const p of check(next, lay.spots, dealer)) problems.add(p);
              for (const v of next.spots.values()) {
                if (v.placement.scale < 1) shrunk++;
                smallest = Math.min(smallest, v.placement.scale);
              }
            };
            // the deal: one card each, dealer up, second card each, dealer hole
            for (const sp of lay.spots) { shapes.get(sp)!.hands[0] = 1; step(); }
            dealer = 1; step();
            for (const sp of lay.spots) { shapes.get(sp)!.hands[0] = 2; step(); }
            dealer = 2; step();
            // each spot plays out, first base to third
            for (const sp of lay.spots) {
              const s = shapes.get(sp)!;
              const goal = finalHands(r);
              if (goal.length > 1) {
                s.hands = goal.map(() => 1); step();
                for (let h = 0; h < goal.length; h++) while (s.hands[h] < goal[h]) { s.hands[h]++; step(); }
              } else while (s.hands[0] < goal[0]) { s.hands[0]++; step(); }
            }
            const dn = 2 + Math.floor(r() * 5);
            while (dealer < dn) { dealer++; step(); }
          }
        }
    expect(steps).toBeGreaterThan(20000);
    expect([...problems]).toEqual([]);
    // cards only get smaller at a crowded table, and never unreadably small
    expect(smallest).toBeGreaterThan(0.55);
    expect(shrunk).toBeGreaterThan(0);
  });

  it('a full table of ordinary hands is dealt at full size, and the deal and a third card move nobody', () => {
    const seats = [1, 2, 3, 4, 5, 6];
    const mine = [3];
    const table = (hands: Record<number, number[]>, dealer = 2) => layoutTable(seats.filter((sp) => hands[sp]).map((sp) => ({ spot: sp, mine: mine.includes(sp), hands: hands[sp] })), dealer, seats, mine);
    const first = table({ 1: [1] }, 0);
    const dealt = table({ 1: [2], 2: [2], 3: [2], 4: [2], 5: [2], 6: [2] });
    // the first card out of the shoe is still where it landed once everyone has two
    expect(dealt.spots.get(1)!.cards[0][0]).toEqual(first.spots.get(1)!.cards[0][0]);
    for (const v of dealt.spots.values()) expect(v.placement.scale).toBe(1);
    // everyone takes a third card: full size still, and nobody else's cards move as each one lands
    let prev = dealt;
    const hands: Record<number, number[]> = { 1: [2], 2: [2], 3: [2], 4: [2], 5: [2], 6: [2] };
    for (const sp of seats) {
      hands[sp] = [3];
      const next = table(hands);
      for (const other of seats) if (other !== sp) expect(next.spots.get(other)!.cards).toEqual(prev.spots.get(other)!.cards);
      expect(next.spots.get(sp)!.cards[0][0]).toEqual(prev.spots.get(sp)!.cards[0][0]);
      expect(next.spots.get(sp)!.placement.scale).toBe(1);
      prev = next;
    }
  });

  it('at a table with seats to spare, a long hand or a split is fanned at full size', () => {
    const seats = [2, 3, 5];
    const lay = layoutTable(
      [
        { spot: 2, mine: false, hands: [5] },
        { spot: 3, mine: true, hands: [3, 2] },
        { spot: 5, mine: false, hands: [4] },
      ],
      3,
      seats,
      [3],
    );
    expect(check(lay, seats, 3)).toEqual([]);
    for (const v of lay.spots.values()) {
      expect(v.placement.scale).toBe(1);
      // fanned in a row: every card of a hand on (nearly) the same line
      for (const h of v.cards) expect(Math.max(...h.map((c) => c.y)) - Math.min(...h.map((c) => c.y))).toBeLessThan(2);
    }
  });

  it('only a table short of room steps a hand down, and never shrinks a fanned hand past the limit', () => {
    const seats = [1, 2, 3, 4, 5, 6];
    // a heavy but ordinary full table: still one row of fanned hands
    const heavy = layoutTable(
      [5, 3, 4, 5, 2, 4].map((n, i) => ({ spot: i + 1, mine: i === 2, hands: [n] })),
      4,
      seats,
      [3],
    );
    expect(check(heavy, seats, 4)).toEqual([]);
    for (const v of heavy.spots.values()) {
      expect(v.placement.scale).toBeGreaterThanOrEqual(SMALLEST);
      for (const h of v.cards) expect(Math.max(...h.map((c) => c.y)) - Math.min(...h.map((c) => c.y))).toBeLessThan(2);
    }
    // the freak table (you split to four, a neighbour splits too): hands still side by side
    const freak = layoutTable(
      [
        { spot: 1, mine: false, hands: [2] },
        { spot: 2, mine: false, hands: [2, 2] },
        { spot: 3, mine: false, hands: [2] },
        { spot: 4, mine: true, hands: [3, 2, 2, 4] },
        { spot: 5, mine: false, hands: [2] },
        { spot: 6, mine: false, hands: [3] },
      ],
      3,
      seats,
      [4],
    );
    expect(check(freak, seats, 3)).toEqual([]);
  });

  it('a second hand: the circle beside you stays free until the table is full, and taking it moves nobody', () => {
    for (let seat = 1; seat <= 6; seat++)
      for (let players = 1; players <= 6; players++) {
        const one = occupiedSpots(players, seat);
        expect(one.mine).toEqual([seat]);
        expect(one.spots.length).toBe(players);
        const free = neighbours(seat).filter((sp) => !one.spots.includes(sp));
        // with a seat to spare anywhere, one of them is beside you
        if (players < 6) expect(free.length).toBeGreaterThan(0);
        else expect(free.length).toBe(0);
        for (const sp of free) {
          const two = occupiedSpots(players, seat, sp);
          expect(two.mine).toEqual([seat, sp]);
          expect(two.spots.filter((x) => x !== sp)).toEqual(one.spots);
        }
      }
  });

  it('people sitting down leave a gap beside you while there are other seats to take', () => {
    const r = mulberry32(11);
    for (let seat = 1; seat <= 6; seat++)
      for (let i = 0; i < 300; i++) {
        const bots = initialBots('normal', [seat], r);
        const apart = [1, 2, 3, 4, 5, 6].filter((sp) => sp !== seat && !neighbours(seat).includes(sp)).length;
        expect(bots).not.toContain(seat);
        if (bots.length <= apart) for (const sp of neighbours(seat)) expect(bots).not.toContain(sp);
        // and nobody sits on a circle you are playing as a second hand
        const second = neighbours(seat)[0];
        const next = atShuffle(bots.filter((b) => b !== second), 'busy', [seat, second], r);
        expect(next.bots).not.toContain(second);
        expect(next.bots).not.toContain(seat);
      }
  });

  it("the dealer's cards never reach the shoe", () => {
    for (const b of dealerBoxes(8)) expect(b.x + b.w).toBeLessThanOrEqual(84);
  });
});
