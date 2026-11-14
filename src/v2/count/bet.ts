/** Bet coaching: a simple, standard spread by true count (multiples of the table minimum). */
export const SPREAD = [
  { tc: 1, units: 1 },
  { tc: 2, units: 2 },
  { tc: 3, units: 4 },
  { tc: 4, units: 6 },
  { tc: 5, units: 8 },
];

export function recommendedUnits(tc: number): number {
  const t = Math.floor(tc);
  if (t <= 1) return 1;
  return SPREAD.find((x) => x.tc === Math.min(5, t))!.units;
}

export interface BetVerdict {
  right: boolean;
  rec: number;
  text: string;
  title: string;
}

/** Grade a bet (per spot) against the spread at the player's true count. */
export function gradeBet(bet: number, tableMin: number, tc: number): BetVerdict {
  const units = recommendedUnits(tc);
  const rec = units * tableMin;
  const tcs = tc > 0 ? '+' + tc : String(tc);
  if (units === 1) {
    const right = bet <= tableMin * 2;
    return {
      right,
      rec,
      title: right ? 'Good bet' : 'Bet smaller',
      text: right
        ? `True count ${tcs}: no edge yet, so the minimum is right.`
        : `True count ${tcs}: the house still has the edge. Big bets belong to positive counts; keep it near $${tableMin}.`,
    };
  }
  const right = bet >= rec * 0.5 && bet <= rec * 2;
  return {
    right,
    rec,
    title: right ? 'Good bet' : bet < rec * 0.5 ? 'Bet bigger' : 'Easy there',
    text: right
      ? `True count ${tcs}: the edge is yours and you raised your bet. That's how counting makes money.`
      : bet < rec * 0.5
        ? `True count ${tcs} means the shoe favours you. Counters raise to about ${units}× the minimum ($${rec}) here.`
        : `True count ${tcs} is good, but $${bet} is more than ${Math.round(bet / tableMin)}× the minimum. About $${rec} keeps the swings survivable.`,
  };
}
