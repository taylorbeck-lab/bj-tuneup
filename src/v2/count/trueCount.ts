/**
 * The true count the way you work it out at a table: read the decks left off the discard tray to the
 * nearest half deck, divide the running count by it, round down. An answer is right within one of
 * that, or within one of the exact value (cards left ÷ 52), so a sharper estimate is never marked wrong.
 */
export function trueCountCheck(rc: number, unseen: number, answer?: number | null) {
  const decksLeft = Math.max(0.5, Math.round((unseen / 52) * 2) / 2);
  const raw = rc / decksLeft;
  const shown = Math.floor(raw);
  const exact = (rc * 52) / Math.max(1, unseen);
  const right = answer !== null && answer !== undefined && (Math.abs(answer - shown) <= 1 || Math.abs(answer - exact) <= 1);
  return { decksLeft, raw, shown, exact, right };
}
