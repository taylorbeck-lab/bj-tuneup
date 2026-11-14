/**
 * Table geometry in container units (cqw: 1 = 1% of the felt width; the felt is FELT_H units tall).
 * Spots are numbered like a real table: 1 = first base (dealer's left, right side of the screen)
 * through 7 = third base. Every card has a fixed home; nothing reflows.
 */
export const FELT_H = 128;
export const CARD_RATIO = 1.4;
/** Card widths: your cards are larger, other players' smaller, dealer in between. */
export const W_MINE = 12.4;
export const W_OTHER = 8.8;
export const W_DEALER = 11.4;
/** Kept for callers that need a generic size. */
export const CARD_W = W_MINE;
export const CARD_H = W_MINE * CARD_RATIO;

export const SHOE = { x: 84, y: 3 };
export const TRAY = { x: 4, y: 3 };

const angle = (spot: number) => ((12 + ((spot - 1) * 156) / 6) * Math.PI) / 180;

/** Centre of the betting circle for a spot (1..7). */
export function spotCenter(spot: number) {
  const t = angle(spot);
  return { x: 50 + 41 * Math.cos(t), y: 42 + 74 * Math.sin(t) };
}

/** Centre-bottom point where a spot's first card sits (inside the circle, toward the dealer). */
function base(spot: number) {
  const t = angle(spot);
  return { x: 50 + 30 * Math.cos(t), y: 42 + 54 * Math.sin(t) };
}

/** Top-left of card i of hand `hand` at a spot. Cards cascade up and to the right. */
export function cardPos(spot: number, hand: number, i: number, mine: boolean) {
  const w = mine ? W_MINE : W_OTHER;
  const h = w * CARD_RATIO;
  const b = base(spot);
  // cards fan to the right by half a card so every corner index stays readable
  const step = { x: w * 0.5, y: w * 0.08 };
  // split hands sit side by side, opening toward the middle of the table
  const dir = spot <= 4 ? -1 : 1;
  const split = hand * (w * 2.15);
  // long hands wrap to a second row after four cards
  const row = i >= 4 ? 1 : 0;
  const col = i - row * 4;
  return { x: b.x - w * 0.75 + dir * split + col * step.x + row * w * 0.25, y: b.y - h + col * step.y + hand * 1.5 + row * h * 0.42, w };
}

export function dealerCardPos(i: number) {
  return { x: 31 + i * 8.2, y: 7.5, w: W_DEALER };
}

/** Order bots take seats in (so a 3-player table looks natural). */
export const BOT_FILL = [4, 2, 6, 1, 7, 3, 5];

/** Spots occupied for a table: yours plus bots, sorted first base -> third base. */
export function occupiedSpots(players: number, mySeat: number, spots: 1 | 2): { spots: number[]; mine: number[] } {
  const mine = [mySeat];
  if (spots === 2) mine.push(mySeat < 7 ? mySeat + 1 : mySeat - 1);
  const bots = BOT_FILL.filter((s) => !mine.includes(s)).slice(0, Math.max(0, players - 1));
  return { spots: [...new Set([...mine, ...bots])].sort((a, b) => a - b), mine };
}
