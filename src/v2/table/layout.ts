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

/** Dealer cards: the first two sit centred on the table's centre line; hits fan to the right. */
export function dealerCardPos(i: number) {
  const step = 8.2;
  return { x: 50 - (W_DEALER + step) / 2 + i * step, y: 5, w: W_DEALER };
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
