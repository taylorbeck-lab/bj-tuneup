import { describe, it, expect } from 'vitest';
import { layoutFallbacks, layoutTable, occupiedSpots, dealerBoxes, CARD_RATIO, type SpotShape, type TableLayout } from '../src/v2/table/layout';
import { mulberry32 } from '../src/engine/rng';

type B = { x: number; y: number; w: number; h: number };
const box = (c: { x: number; y: number; w: number }): B => ({ x: c.x, y: c.y, w: c.w, h: c.w * CARD_RATIO });
const hit = (a: B, b: B) => a.x < b.x + b.w - 0.2 && b.x < a.x + a.w - 0.2 && a.y < b.y + b.h - 0.2 && b.y < a.y + a.h - 0.2;

/** Final hands for a spot this round: mostly 2–4 cards, sometimes a split, now and then a long hand. */
function finalHands(r: () => number): number[] {
  const u = r();
  if (u < 0.03) return Array.from({ length: 3 + Math.floor(r() * 2) }, () => 2 + Math.floor(r() * 2));
  if (u < 0.15) return [2 + Math.floor(r() * 3), 2 + Math.floor(r() * 3)];
  if (u < 0.2) return [5 + Math.floor(r() * 3)];
  return [2 + Math.floor(r() * 3)];
}

describe('collision-free table layout', () => {
  it('no hand ever lands on another or the dealer, and cards already down (almost) never move', () => {
    const r = mulberry32(7);
    let steps = 0;
    let unclean = 0;
    let moved = 0;
    for (let players = 1; players <= 6; players++)
      for (let seat = 1; seat <= 6; seat++)
        for (const spots of [1, 2] as const) {
          const lay = occupiedSpots(players, seat, spots);
          for (let round = 0; round < 25; round++) {
            const shapes = new Map<number, SpotShape>(lay.spots.map((sp) => [sp, { spot: sp, mine: lay.mine.includes(sp), hands: [0] }]));
            let prev: TableLayout | undefined;
            let dealer = 0;
            const step = () => {
              const live = [...shapes.values()].filter((s) => s.hands.some((n) => n > 0)).map((s) => ({ ...s, hands: s.hands.filter((n) => n > 0) }));
              const next = layoutTable(live, dealer, lay.spots, prev);
              steps++;
              // unchanged spots keep every card exactly where it was
              if (prev) for (const [sp, v] of next.spots) { const o = prev.spots.get(sp); if (o && o.sig === v.sig && v.cards !== o.cards) moved++; }
              const all: { tag: string; b: B }[] = [];
              for (const [sp, v] of next.spots) v.cards.forEach((h, hi) => h.forEach((c) => all.push({ tag: sp + ':' + hi, b: box(c) })));
              const dealerB = dealerBoxes(dealer);
              for (let i = 0; i < all.length; i++) {
                for (let j = i + 1; j < all.length; j++) if (all[i].tag !== all[j].tag && hit(all[i].b, all[j].b)) unclean++;
                for (const d of dealerB) if (hit(all[i].b, d)) unclean++;
              }
              prev = next;
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
                s.hands = goal.map(() => 1); s.hands[0] = 1; step();
                for (let h = 0; h < goal.length; h++) while (s.hands[h] < goal[h]) { s.hands[h]++; step(); }
              } else while (s.hands[0] < goal[0]) { s.hands[0]++; step(); }
            }
            const dn = 2 + Math.floor(r() * 5);
            while (dealer < dn) { dealer++; step(); }
          }
        }
    expect(steps).toBeGreaterThan(20000);
    expect(unclean).toBe(0);
    // a hand already on the felt is re-seated only when a neighbour is boxed in (rare)
    expect(moved).toBeLessThan(steps * 0.005);
    // a hand with no clean place at all: only freak hands (6+ cards at a middle seat beside full neighbours)
    expect(layoutFallbacks.length).toBeLessThanOrEqual(5);
  });

  it("the dealer's cards never reach the shoe", () => {
    for (const b of dealerBoxes(8)) expect(b.x + b.w).toBeLessThanOrEqual(84);
  });
});
