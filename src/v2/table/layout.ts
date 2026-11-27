/**
 * Table geometry in container units (cqw: 1 = 1% of the screen's width; the felt is FELT_H units tall).
 * The table is wider than the screen: the felt fills it edge to edge and runs off both sides, with a
 * gentle curve along the front and a padded cognac leather rail. Spots follow the rail on an arc and are numbered like
 * a real table: 1 = first base (dealer's left, right side of the screen) through 6 = third base.
 */
export const MAX_SPOTS = 6;
export const FELT_H = 95;
/** The front of the table: an ellipse much wider than the screen, so only a soft curve shows. */
export const FRONT = { cx: 50, cy: 36, rx: 75, ry: 59 };
/** The padded leather rail along the front, in table units (drawn by `Rail` in Visuals.tsx). */
export const RAIL = 5.2;
export const CARD_RATIO = 1.4;
/** Card widths: your cards are larger, other players' smaller, dealer in between. */
export const W_MINE = 11;
export const W_OTHER = 8.6;
export const W_DEALER = 11.4;
export const CARD_W = W_MINE;
export const CARD_H = W_MINE * CARD_RATIO;

/** The printed logo on the felt (tap it for the intro). */
export const LOGO_BOX = { x: 37.35, y: 47.4, w: 25.3, h: 21.56 };

/** Top-left of the shoe and the discard tray drawings (sizes in Visuals.tsx). */
export const SHOE = { x: 83, y: 1.2 };
export const TRAY = { x: 1.5, y: 1.2 };

/**
 * Spots sit on an arc parallel to the rail: the table's front ellipse drawn 15.5 units in, so the
 * circles follow the curve of the leather, evenly spaced along it.
 */
const ARC = { x: 50, y: FRONT.cy, a: FRONT.rx - 15.5, b: FRONT.ry - 15.5 };
/** Angle of each spot on the arc (first base to third base), evenly spaced by arc length. */
const ANGLES = [44, 63.2, 81.2, 98.8, 116.8, 136];
const angle = (spot: number) => (ANGLES[spot - 1] * Math.PI) / 180;

/** Centre of the betting circle for a spot (1..6). */
export function spotCenter(spot: number) {
  const t = angle(spot);
  return { x: ARC.x + ARC.a * Math.cos(t), y: ARC.y + ARC.b * Math.sin(t) };
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

/** The circles either side of a seat: the only ones a player may spread to for a second hand. */
export function neighbours(seat: number): number[] {
  return [seat - 1, seat + 1].filter((sp) => sp >= 1 && sp <= MAX_SPOTS);
}

/**
 * Spots occupied for a table with a fixed number of players: yours plus the others, sorted first
 * base -> third base. `second` is the circle beside you that you are playing as a second hand.
 */
export function occupiedSpots(players: number, mySeat: number, second?: number | null): { spots: number[]; mine: number[] } {
  const seat = Math.min(MAX_SPOTS, Math.max(1, mySeat));
  const mine = second && second !== seat ? [seat, second] : [seat];
  // the others fill in around you, leaving the circles beside you for last (strangers leave a gap,
  // and it keeps a second hand open to you until the table is full)
  const beside = neighbours(seat);
  const order = [...BOT_FILL.filter((s) => !beside.includes(s)), ...BOT_FILL.filter((s) => beside.includes(s))];
  const bots = order.filter((s) => !mine.includes(s)).slice(0, Math.max(0, Math.min(MAX_SPOTS, players) - 1));
  return { spots: [...new Set([...mine, ...bots])].sort((a, b) => a - b), mine };
}

/* ------------------------------------------------------------------------------------------------
 * Lanes: where every card on the felt goes.
 *
 * Every seat in the round has its own column of felt in front of its circle, and its cards never
 * leave it. Hands sit side by side across the table, the way a dealer lays them out: never one
 * player's hand above another's, and split hands beside each other, never in rows.
 *
 * - A hand fans to the right, each card leaving the rank of the one before it readable.
 * - A seat keeps room for a third card from the start, so the usual hit moves nothing.
 * - A long hand or a split needs more felt than its seat has: the dealer makes room. Seats with room
 *   to spare give it up first and their hands slide over a little; at a table with empty seats
 *   nobody moves at all.
 * - When the whole table is short of room, every card on it gets a little smaller together, so the
 *   table still reads as one tidy row. Only past that (several splits at a full table) do the longest
 *   hands step down and to the right like a column of solitaire, every rank still showing.
 *
 * The layout is a pure function of what is on the felt: the same hands always sit in the same places.
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
/** A seat's column of felt: its left edge, its width, and how much its cards were scaled. */
export interface SpotPlacement {
  x: number;
  width: number;
  scale: number;
}
export interface TableLayout {
  spots: Map<number, { sig: string; placement: SpotPlacement; cards: CardSpot[][] }>;
}

/** The felt the players' cards may use, side to side (inside the rail). */
const X0 = 1.5;
const X1 = 98.5;
/** Felt left clear between two seats' cards, and between one seat's split hands. */
const LANE_GAP = 1;
const HAND_GAP = 0.9;
/** A fanned hand: each card half a card to the right of the last; squeezed, never less than FAN_MIN. */
const FAN = 0.5;
export const FAN_MIN = 0.34;
/** A stepped hand: each card half a card (the height of the rank) lower, and a little to the right. */
export const STEP_DY = 0.5;
const STEP_DX = 0.24;
const STEP_DX_MIN = 0.12;
/** Cards are never shrunk below this to keep a hand fanned; past it the longest hands step instead. */
export const SMALLEST = 0.72;
/** A fanned hand drifts down a hair per card, as dealt by hand. */
const DRIFT = 0.04;
/** Cards stay below the tray, the shoe and the dealer's hand, and above the betting circles. */
const TOP = 27;
const CIRCLE_CLEAR = 7.2;
const CIRCLE_HALF = 6.2;

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Widths of a hand in card widths: [the least it can take, all it can use], fanned or stepped. */
const fanned = (n: number): [number, number] => [1 + FAN_MIN * (Math.max(n, 2) - 1), 1 + FAN * (Math.max(n, 2) - 1)];
const stepped = (n: number): [number, number] => [1 + STEP_DX_MIN * (Math.max(n, 2) - 1), 1 + STEP_DX * (Math.max(n, 2) - 1)];

/**
 * Share `total` among columns: each gets its weight's share, but never less than `lo` (what it must
 * have) or more than `hi` (what it can use). Assumes the `lo`s fit.
 */
function share(lo: number[], hi: number[], weight: number[], total: number): number[] {
  if (sum(hi) <= total) return hi.slice();
  let a = 0;
  let b = Math.max(...hi.map((h, i) => h / weight[i]));
  const at = (m: number) => lo.map((l, i) => clamp(m * weight[i], l, Math.max(l, hi[i])));
  for (let k = 0; k < 48; k++) {
    const m = (a + b) / 2;
    if (sum(at(m)) > total) b = m;
    else a = m;
  }
  return at(a);
}

/**
 * Put columns of the given widths as near as possible to where each wants to be (its left edge),
 * in order, a gap apart, inside [x0, x1]. Columns that would overlap share the shift between them.
 */
function settle(want: number[], width: number[], gap: number, x0: number, x1: number): number[] {
  const off: number[] = [];
  let acc = 0;
  for (let i = 0; i < width.length; i++) {
    off.push(acc);
    acc += width[i] + gap;
  }
  const total = acc - gap;
  // least-squares positions that keep the order (pool adjacent violators)
  const blocks: { mean: number; n: number }[] = [];
  for (let i = 0; i < want.length; i++) {
    let cur = { mean: want[i] - off[i], n: 1 };
    while (blocks.length && blocks[blocks.length - 1].mean > cur.mean) {
      const p = blocks.pop()!;
      cur = { mean: (p.mean * p.n + cur.mean * cur.n) / (p.n + cur.n), n: p.n + cur.n };
    }
    blocks.push(cur);
  }
  const out: number[] = [];
  for (const b of blocks) for (let k = 0; k < b.n; k++) out.push(clamp(b.mean, x0, Math.max(x0, x1 - total)) + off[out.length]);
  return out;
}

/** One hand's cards inside `width` of felt starting at `left`, its bottom edge on `baseline`. */
function handCards(n: number, left: number, width: number, w: number, baseline: number, step: boolean): CardSpot[] {
  const h = w * CARD_RATIO;
  const dx = n > 1 ? Math.max(0, Math.min((step ? STEP_DX : FAN) * w, (width - w) / (n - 1))) : 0;
  const out: CardSpot[] = [];
  for (let i = 0; i < n; i++) out.push({ x: left + i * dx, y: step ? baseline - h - (n - 1 - i) * STEP_DY * w : baseline - h - (3 - Math.min(i, 3)) * DRIFT * w, w });
  return out;
}

export function dealerBoxes(n: number): Box[] {
  return Array.from({ length: n }, (_, i) => {
    const c = dealerCardPos(i);
    return { x: c.x, y: c.y, w: c.w, h: c.w * CARD_RATIO };
  });
}

/**
 * Place every hand on the felt. `shapes` are the seats with cards down; `allSpots` every seat in the
 * round (a seat keeps its column before its cards arrive, so the deal moves nothing); `mineSpots` the
 * human's seats (their cards are larger).
 */
export function layoutTable(shapes: SpotShape[], dealerCards: number, allSpots: number[], mineSpots: number[] = []): TableLayout {
  const byShape = new Map(shapes.map((s) => [s.spot, s]));
  // left to right across the screen (third base is on the left)
  const seats = [...new Set([...allSpots, ...shapes.map((s) => s.spot)])].sort((a, b) => spotCenter(a).x - spotCenter(b).x);
  const baseW = seats.map((sp) => ((byShape.get(sp)?.mine ?? mineSpots.includes(sp)) ? W_MINE : W_OTHER));
  /** The hands with cards at each seat (a seat still waiting for its cards counts as one two-card hand). */
  const live = seats.map((sp) => {
    const hs = (byShape.get(sp)?.hands ?? []).filter((n) => n > 0);
    return hs.length ? hs : [2];
  });
  const room = X1 - X0 - LANE_GAP * (seats.length - 1);
  const gaps = live.map((hs) => HAND_GAP * (hs.length - 1));

  // Everything fans if it fits with the cards no smaller than SMALLEST; if not, hands of four or
  // more step; if still not, every split hand and every hand of three or more steps.
  let steps: boolean[][] = [];
  let scale = 1;
  for (const rule of [() => false, (n: number) => n >= 4, (n: number, split: boolean) => split || n >= 3]) {
    steps = live.map((hs) => hs.map((n) => rule(n, hs.length > 1)));
    const least = sum(live.map((hs, i) => baseW[i] * sum(hs.map((n, k) => (steps[i][k] ? stepped(n) : fanned(n))[0]))));
    scale = Math.min(1, (room - sum(gaps)) / least);
    if (scale >= SMALLEST) break;
  }
  /** [the least, the most] felt hand k at seat i can use with cards `w` wide. */
  const range = (i: number, k: number, w: number) => {
    const [least, most] = steps[i][k] ? stepped(live[i][k]) : fanned(live[i][k]);
    return [least * w, most * w];
  };
  const lo = live.map((hs, i) => sum(hs.map((_, k) => range(i, k, baseW[i] * scale)[0])) + gaps[i]);
  const hi = live.map((hs, i) => sum(hs.map((_, k) => range(i, k, baseW[i] * scale)[1])) + gaps[i]);
  // A seat's column: what its hands need, and for a hand on its own, room for a third card (so the
  // usual hit moves nobody). Each column sits as near its circle as its neighbours allow.
  const held = live.map((hs, i) => (hs.length === 1 && !steps[i][0] ? Math.max(lo[i], fanned(3)[0] * baseW[i] * scale) : lo[i]));
  const width = share(lo, held, baseW, room);
  const left = settle(
    seats.map((sp, i) => spotCenter(sp).x - 0.75 * baseW[i] * scale),
    width,
    LANE_GAP,
    X0,
    X1,
  );
  // Felt nobody is using opens the fans up: first the felt to a hand's right, then (for a split or a
  // long hand only, so an ordinary hand's first card never moves) the felt to its left.
  for (let i = 0; i < seats.length; i++) width[i] = Math.max(width[i], Math.min(hi[i], (i + 1 < seats.length ? left[i + 1] - LANE_GAP : X1) - left[i]));
  for (let i = 0; i < seats.length; i++) {
    if (live[i].length === 1 && live[i][0] <= 3) continue;
    const take = Math.min(hi[i] - width[i], left[i] - (i > 0 ? left[i - 1] + width[i - 1] + LANE_GAP : X0));
    if (take > 1e-9) {
      left[i] -= take;
      width[i] += take;
    }
  }
  const dealer = dealerBoxes(dealerCards);
  const circles = seats.map((sp) => spotCenter(sp));
  const next: TableLayout = { spots: new Map() };
  seats.forEach((sp, i) => {
    const shape = byShape.get(sp);
    if (!shape) return;
    const counts = shape.hands;
    const liveIdx = counts.map((n, k) => (n > 0 ? k : -1)).filter((x) => x >= 0);
    let s = scale;
    let cards: CardSpot[][] = [];
    // (the loop only ever repeats for a stepped hand too tall for its column: its cards shrink to fit)
    for (let attempt = 0; attempt < 24; attempt++, s *= 0.94) {
      const w = baseW[i] * s;
      const inner = width[i] - gaps[i];
      const least = liveIdx.map((_, k) => range(i, k, w)[0]);
      const fit = Math.min(1, inner / sum(least));
      const widths = share(
        least.map((l) => l * fit),
        liveIdx.map((_, k) => range(i, k, w)[1]),
        liveIdx.map(() => 1),
        inner,
      );
      // split hands side by side, the first one played on the right (play moves right to left)
      const place = (baseline: number) => {
        cards = counts.map(() => []);
        let x = left[i];
        for (let k = liveIdx.length - 1; k >= 0; k--) {
          cards[liveIdx[k]] = handCards(counts[liveIdx[k]], x, widths[k], w, baseline, steps[i][k]);
          x += widths[k] + HAND_GAP;
        }
      };
      // a first pass to learn how much felt the cards cover, then the real baseline: above its own
      // circle, and above any neighbour's circle the cards reach over
      place(0);
      const all = cards.flat();
      const xa = Math.min(...all.map((c) => c.x));
      const xb = Math.max(...all.map((c) => c.x + c.w));
      let baseline = circles[i].y - CIRCLE_CLEAR;
      for (const c of circles) if (xa < c.x + CIRCLE_HALF && xb > c.x - CIRCLE_HALF) baseline = Math.min(baseline, c.y - CIRCLE_CLEAR);
      let top = TOP;
      for (const d of dealer) if (xa < d.x + d.w && xb > d.x) top = Math.max(top, d.y + d.h + 1);
      place(baseline);
      if (Math.min(...cards.flat().map((c) => c.y)) >= top - 1e-6) break;
    }
    next.spots.set(sp, { sig: `${shape.mine ? 'm' : 'o'}:${counts.join(',')}`, placement: { x: left[i], width: width[i], scale: s }, cards });
  });
  return next;
}
