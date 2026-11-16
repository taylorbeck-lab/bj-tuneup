/**
 * Table geometry in container units (cqw: 1 = 1% of the felt width; the felt is FELT_H units tall).
 * The felt runs edge to edge with a black rail around the curved side. Spots follow the rail on an
 * arc and are numbered like a real table: 1 = first base (dealer's left, right side of the screen)
 * through 6 = third base. Every card has a fixed home; nothing reflows.
 */
export const MAX_SPOTS = 6;
export const FELT_H = 122;
export const RAIL = 3.4;
export const CARD_RATIO = 1.4;
/** Card widths: your cards are larger, other players' smaller, dealer in between. */
export const W_MINE = 12.4;
export const W_OTHER = 9.6;
export const W_DEALER = 11.4;
export const CARD_W = W_MINE;
export const CARD_H = W_MINE * CARD_RATIO;

export const SHOE = { x: 84, y: 2.5 };
export const TRAY = { x: 5, y: 2.5 };

/** Spots sit on an arc parallel to the rail. */
const ARC = { x: 50, y: 70, a: 37.5, b: 40 };
const angle = (spot: number) => ((12 + ((spot - 1) * 156) / (MAX_SPOTS - 1)) * Math.PI) / 180;

/** Centre of the betting circle for a spot (1..6). */
export function spotCenter(spot: number) {
  const t = angle(spot);
  return { x: ARC.x + ARC.a * Math.cos(t), y: ARC.y + ARC.b * Math.sin(t) };
}

/** Centre-bottom point where a spot's first card sits: just above the circle, toward the dealer. */
function base(spot: number) {
  const c = spotCenter(spot);
  return { x: c.x + (50 - c.x) * 0.16, y: c.y - 8.5 };
}

/** Top-left of card i of hand `hand` at a spot. */
export function cardPos(spot: number, hand: number, i: number, mine: boolean) {
  const w = mine ? W_MINE : W_OTHER;
  const h = w * CARD_RATIO;
  const b = base(spot);
  // cards fan to the right by half a card so every corner index stays readable
  const step = { x: w * 0.5, y: w * 0.08 };
  // split hands sit side by side, opening toward the middle of the table
  const dir = spot <= 3 ? -1 : 1;
  const split = hand * (w * 2.15);
  // long hands wrap to a second row after four cards
  const row = i >= 4 ? 1 : 0;
  const col = i - row * 4;
  return { x: b.x - w * 0.75 + dir * split + col * step.x + row * w * 0.25, y: b.y - h + col * step.y + hand * 1.5 + row * h * 0.42, w };
}

/**
 * Dealer cards: the first two sit centred on the table's centre line; hits fan to the right, and a
 * sixth card starts a row just below (leaving the corners above readable) so nothing runs into the shoe.
 */
export function dealerCardPos(i: number) {
  const step = 8;
  const row = Math.floor(i / 5);
  const col = i % 5;
  return { x: 50 - (W_DEALER + step) / 2 + col * step + row * W_DEALER * 0.3, y: 5 + row * W_DEALER * 0.95, w: W_DEALER };
}

/** Order bots take seats in (so a short table looks natural). */
export const BOT_FILL = [3, 5, 2, 6, 1, 4];

/** Spots occupied for a table: yours plus bots, sorted first base -> third base. */
export function occupiedSpots(players: number, mySeat: number, spots: 1 | 2): { spots: number[]; mine: number[] } {
  const seat = Math.min(MAX_SPOTS, Math.max(1, mySeat));
  const mine = [seat];
  if (spots === 2) mine.push(seat < MAX_SPOTS ? seat + 1 : seat - 1);
  const bots = BOT_FILL.filter((s) => !mine.includes(s)).slice(0, Math.max(0, Math.min(MAX_SPOTS, players) - 1));
  return { spots: [...new Set([...mine, ...bots])].sort((a, b) => a - b), mine };
}

/* ------------------------------------------------------------------------------------------------
 * Collision-free placement. A new card never covers another hand's cards (yours, another player's,
 * the dealer's), the chips, the tray or the shoe; within a hand each card only overlaps the one
 * before it the way a dealer fans them, leaving its corner index readable.
 *
 * When a spot changes (a card dealt, a split) only that spot is re-placed, with every other card on
 * the felt as a fixed obstacle, so cards already down never jump. The spot first tries where it sat
 * before, then nudges sideways or up, then shrinks a little, then stacks split hands in two rows.
 * --------------------------------------------------------------------------------------------- */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface CardSpot {
  x: number;
  y: number;
  w: number;
}
export interface SpotShape {
  spot: number;
  mine: boolean;
  /** Cards in each hand (several hands after splits). */
  hands: number[];
}
export interface SpotPlacement {
  scale: number;
  dx: number;
  dy: number;
  arr: Arrangement;
}
type Arrangement = 'in' | 'out' | 'stack' | 'up';

/** Where the corner index sits: the next card must leave this much of the one below visible. */
const IDX_W = 0.5;
const IDX_H = 0.95;
const PER_ROW = 5;
const GAP = 0.9;

const boxOf = (c: CardSpot): Box => ({ x: c.x, y: c.y, w: c.w, h: c.w * CARD_RATIO });
const overlaps = (a: Box, b: Box, m = 0.05) => a.x < b.x + b.w - m && b.x < a.x + a.w - m && a.y < b.y + b.h - m && b.y < a.y + a.h - m;

/** Card offsets within one hand (fan right, wrap below after five), relative to its top-left. */
function fan(n: number, w: number): CardSpot[] {
  const out: CardSpot[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / PER_ROW);
    const col = i % PER_ROW;
    out.push({ x: col * w * (IDX_W + 0.02) + row * w * 0.3, y: col * w * 0.06 + row * w * IDX_H, w });
  }
  return out;
}
function extent(cards: CardSpot[]): { w: number; h: number } {
  let w = 0;
  let h = 0;
  for (const c of cards) {
    w = Math.max(w, c.x + c.w);
    h = Math.max(h, c.y + c.w * CARD_RATIO);
  }
  return { w, h };
}

/** Lay out a spot's hands for a placement: hand 0 just above the bet, split hands beside it. */
export function placeSpot(shape: SpotShape, p: SpotPlacement): CardSpot[][] {
  const w = (shape.mine ? W_MINE : W_OTHER) * p.scale;
  const b = base(shape.spot);
  const toward = shape.spot <= 3 ? -1 : 1; // toward the middle of the table
  const fans = shape.hands.map((n) => fan(Math.max(1, n), w));
  const ext = fans.map(extent);
  const bottom = b.y + p.dy;
  const out: CardSpot[][] = [];
  if (p.arr === 'up') {
    // split hands one above the other: the narrowest footprint, for a seat boxed in by its neighbours
    let bottomY = bottom;
    const x0 = b.x - w * 0.75 + p.dx;
    fans.forEach((f, i) => {
      const top = bottomY - ext[i].h;
      out.push(f.map((c) => ({ x: x0 + c.x, y: top + c.y, w: c.w })));
      bottomY = top - GAP;
    });
    return out;
  }
  if (p.arr === 'stack') {
    // two columns: hands 0,1 on the bottom row, 2,3 on the row above
    const dir = toward;
    const rowH = Math.max(...ext.map((e) => e.h)) + GAP;
    let x0 = b.x - w * 0.75 + p.dx;
    fans.forEach((f, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const colX = col === 0 ? x0 : dir > 0 ? x0 + ext[0].w + GAP : x0 - ext[i].w - GAP;
      const top = bottom - ext[i].h - row * rowH;
      out.push(f.map((c) => ({ x: colX + c.x, y: top + c.y, w: c.w })));
    });
    return out;
  }
  const dir = p.arr === 'in' ? toward : -toward;
  let x = b.x - w * 0.75 + p.dx;
  fans.forEach((f, i) => {
    if (i > 0) x = dir > 0 ? x + ext[i - 1].w + GAP : x - ext[i].w - GAP;
    const top = bottom - ext[i].h;
    out.push(f.map((c) => ({ x: x + c.x, y: top + c.y, w: c.w })));
  });
  return out;
}

/** The felt: inside the rail, below the dealer's area, inside the curved bottom. */
function onFelt(bx: Box): boolean {
  if (bx.x < 4 || bx.x + bx.w > 96 || bx.y < 33) return false;
  const bottom = bx.y + bx.h;
  if (bottom <= 73) return true;
  const rx = 46;
  const ry = 45;
  const dy = (bottom - 73.2) / ry;
  if (dy >= 1) return false;
  const half = rx * Math.sqrt(1 - dy * dy);
  return bx.x >= 50 - half && bx.x + bx.w <= 50 + half;
}

/** Things on the felt that cards must stay off: tray, limits sign, shoe, every betting circle with its chips. */
export function staticObstacles(spots: number[]): Box[] {
  const out: Box[] = [
    { x: 4.5, y: 1.5, w: 11, h: 24 },
    { x: 16.5, y: 1.5, w: 18, h: 10.5 },
    { x: 83.5, y: 1.5, w: 12.5, h: 17.5 },
  ];
  for (const sp of spots) {
    const c = spotCenter(sp);
    out.push({ x: c.x - 6.2, y: c.y - 6.6, w: 12.4, h: 13 });
  }
  return out;
}

export function dealerBoxes(n: number): Box[] {
  return Array.from({ length: n }, (_, i) => boxOf(dealerCardPos(i)));
}

function fits(cards: CardSpot[][], obstacles: Box[]): boolean {
  for (const hand of cards)
    for (const c of hand) {
      const bx = boxOf(c);
      if (!onFelt(bx)) return false;
      for (const o of obstacles) if (overlaps(bx, o)) return false;
    }
  // split hands of the same spot stay apart too
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++) for (const a of cards[i]) for (const b of cards[j]) if (overlaps(boxOf(a), boxOf(b), 0.05)) return false;
  return true;
}

const SCALES = [1, 0.93, 0.86, 0.79, 0.72, 0.66, 0.6, 0.55, 0.5];
const DXS = [0, 1.5, -1.5, 3, -3, 4.5, -4.5, 6, -6, 8, -8, 10, -10, 12, -12, 15, -15, 18, -18, 21, -21];
const DYS = [0, -2, -4, -6, -9, -12, -15, -18, -22, -26, -30, -34, -38];
const ARR_COST: Record<Arrangement, number> = { in: 0, out: 1.5, up: 4, stack: 5 };

/**
 * Every placement, cheapest first: stay by your circle, nudge sideways before up, shrink a little
 * before climbing far from your bet, keep split hands side by side when possible.
 */
const cost = (p: SpotPlacement) => {
  const up = -p.dy;
  return Math.min(up, 6) * 0.6 + Math.max(0, up - 6) * 1.5 + Math.abs(p.dx) * 0.4 + (1 - p.scale) * 70 + ARR_COST[p.arr];
};
const CANDIDATES: Record<'one' | 'split', SpotPlacement[]> = { one: [], split: [] };
for (const scale of SCALES)
  for (const dy of DYS)
    for (const dx of DXS)
      for (const arr of ['in', 'out', 'stack', 'up'] as Arrangement[]) {
        const p = { scale, dx, dy, arr };
        CANDIDATES.split.push(p);
        if (arr === 'in') CANDIDATES.one.push(p);
      }
CANDIDATES.one.sort((a, b) => cost(a) - cost(b));
CANDIDATES.split.sort((a, b) => cost(a) - cost(b));

/** Find a placement for a spot that collides with nothing; prefer where it was, then the cheapest that fits. */
export function solveSpot(shape: SpotShape, obstacles: Box[], prefer?: SpotPlacement): { placement: SpotPlacement; cards: CardSpot[][]; clean: boolean } {
  const tryP = (p: SpotPlacement) => {
    const cards = placeSpot(shape, p);
    return fits(cards, obstacles) ? cards : null;
  };
  if (prefer) {
    const c = tryP(prefer);
    if (c) return { placement: prefer, cards: c, clean: true };
  }
  for (const p of shape.hands.length > 1 ? CANDIDATES.split : CANDIDATES.one) {
    const c = tryP(p);
    if (c) return { placement: p, cards: c, clean: true };
  }
  // nothing is clean: take the cheap placement that overlaps the least
  let best: { p: SpotPlacement; cards: CardSpot[][]; area: number } | null = null;
  for (const p of (shape.hands.length > 1 ? CANDIDATES.split : CANDIDATES.one).slice(0, 4000)) {
    const cards = placeSpot(shape, p);
    let area = 0;
    for (const h of cards)
      for (const c of h) {
        const b = boxOf(c);
        if (!onFelt(b)) area += 50;
        for (const o of obstacles) area += Math.max(0, Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x)) * Math.max(0, Math.min(b.y + b.h, o.y + o.h) - Math.max(b.y, o.y));
      }
    if (!best || area < best.area) best = { p, cards, area };
  }
  return { placement: best!.p, cards: best!.cards, clean: false };
}

/** Placements that found no clean spot (tests watch this; normal play should never add to it). */
export const layoutFallbacks: { spot: number; hands: number[]; others: number }[] = [];

export interface TableLayout {
  /** Per spot: its shape signature, placement and card positions. */
  spots: Map<number, { sig: string; placement: SpotPlacement; cards: CardSpot[][] }>;
}

/**
 * Place every spot's hands. Spots whose hands didn't change keep their cards exactly where they were;
 * a spot that changed is re-placed around everything else on the felt.
 */
export function layoutTable(shapes: SpotShape[], dealerCards: number, allSpots: number[], prev?: TableLayout): TableLayout {
  const next: TableLayout = { spots: new Map() };
  const sig = (s: SpotShape) => `${s.mine ? 'm' : 'o'}:${s.hands.join(',')}`;
  const fixed = [...staticObstacles(allSpots), ...dealerBoxes(dealerCards)];
  const changed: SpotShape[] = [];
  for (const s of shapes) {
    const old = prev?.spots.get(s.spot);
    if (old && old.sig === sig(s)) next.spots.set(s.spot, old);
    else changed.push(s);
  }
  const cardsOf = (m: TableLayout['spots'], except: number) => {
    const out: Box[] = [];
    for (const [sp, v] of m) if (sp !== except) for (const h of v.cards) for (const c of h) out.push(boxOf(c));
    return out;
  };
  for (const s of changed) {
    const old = prev?.spots.get(s.spot);
    const r = solveSpot(s, [...fixed, ...cardsOf(next.spots, s.spot)], old?.placement);
    if (r.clean) {
      next.spots.set(s.spot, { sig: sig(s), placement: r.placement, cards: r.cards });
      continue;
    }
    // Boxed in: this spot goes first and the others re-seat around it, each keeping its place if it still fits.
    const redo: TableLayout['spots'] = new Map();
    const first = solveSpot(s, fixed, old?.placement);
    redo.set(s.spot, { sig: sig(s), placement: first.placement, cards: first.cards });
    let ok = first.clean;
    for (const o of shapes) {
      if (o.spot === s.spot || !next.spots.has(o.spot)) continue;
      const was = next.spots.get(o.spot)!;
      const ro = solveSpot(o, [...fixed, ...cardsOf(redo, o.spot)], was.placement);
      ok = ok && ro.clean;
      redo.set(o.spot, ro.placement === was.placement ? was : { sig: was.sig, placement: ro.placement, cards: ro.cards });
    }
    if (ok) {
      for (const [sp, v] of redo) next.spots.set(sp, v);
    } else {
      layoutFallbacks.push({ spot: s.spot, hands: s.hands.slice(), others: next.spots.size });
      next.spots.set(s.spot, { sig: sig(s), placement: r.placement, cards: r.cards });
    }
  }
  return next;
}
