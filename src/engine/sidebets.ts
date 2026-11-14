/**
 * Side bets: exact EV from the remaining composition *by physical card* (52 types), with
 * user-editable paytables. Every bet is resolved on the first cards of the round, which come from the
 * unseen cards (burn card included), so probabilities are exact combinatorics on those counts.
 */
import { type CardId, rankOf, suitOf, isRed, valueOf, makeCard, cardLabel } from './cards';

export type ByCard = number[]; // length 52

export interface Line {
  id: string;
  label: string;
  pays: number;
}

export type SideBetKind = 'perfectPairs' | 'luckyLadies' | 'twentyOnePlus3' | 'matchDealer' | 'buster' | 'customPair';

/** A custom pair line: what the player's first two cards must be. Highest-paying matching line wins. */
export interface PairPattern {
  /** 'any' pair of the same rank; 'colored' same rank+color; 'suited' identical cards; 'mixed' same rank, different colors. */
  kind: 'any' | 'colored' | 'suited' | 'mixed' | 'specific' | 'rank';
  /** For 'specific': both cards (e.g. K♠ K♠) as card ids. */
  cards?: [CardId, CardId];
  /** For 'rank': rank index 0..12, optionally suited. */
  rank?: number;
  suited?: boolean;
}

export interface SideBet {
  kind: SideBetKind;
  name: string;
  lines: Line[];
  /** customPair only: pattern for each line id. */
  patterns?: Record<string, PairPattern>;
  /** buster only: dealer hits soft 17. */
  h17?: boolean;
}

export const SIDE_BETS: SideBet[] = [
  {
    kind: 'perfectPairs',
    name: 'Perfect Pairs',
    lines: [
      { id: 'perfect', label: 'Perfect pair', pays: 25 },
      { id: 'colored', label: 'Colored pair', pays: 12 },
      { id: 'mixed', label: 'Mixed pair', pays: 6 },
    ],
  },
  {
    kind: 'luckyLadies',
    name: 'Lucky Ladies',
    lines: [
      { id: 'qhqhBJ', label: 'Q♥ pair + dealer BJ', pays: 1000 },
      { id: 'qhqh', label: 'Q♥ pair', pays: 125 },
      { id: 'matched', label: 'Matched 20', pays: 19 },
      { id: 'suited', label: 'Suited 20', pays: 9 },
      { id: 'any', label: 'Any 20', pays: 4 },
    ],
  },
  {
    kind: 'twentyOnePlus3',
    name: '21+3',
    lines: [
      { id: 'suitedTrips', label: 'Suited trips', pays: 9 },
      { id: 'straightFlush', label: 'Straight flush', pays: 9 },
      { id: 'trips', label: 'Three of a kind', pays: 9 },
      { id: 'straight', label: 'Straight', pays: 9 },
      { id: 'flush', label: 'Flush', pays: 9 },
    ],
  },
  {
    kind: 'matchDealer',
    name: 'Match the Dealer',
    lines: [
      { id: 'suited', label: 'Suited match (each)', pays: 19 },
      { id: 'unsuited', label: 'Unsuited match (each)', pays: 4 },
    ],
  },
  {
    kind: 'buster',
    name: 'Buster Blackjack',
    lines: [
      { id: 'c8', label: 'Bust with 8+ cards', pays: 250 },
      { id: 'c7', label: 'Bust with 7 cards', pays: 50 },
      { id: 'c6', label: 'Bust with 6 cards', pays: 12 },
      { id: 'c5', label: 'Bust with 5 cards', pays: 4 },
      { id: 'c4', label: 'Bust with 4 cards', pays: 2 },
      { id: 'c3', label: 'Bust with 3 cards', pays: 2 },
    ],
  },
  {
    kind: 'customPair',
    name: 'Custom pair (K♠ / Q♥ jackpots)',
    lines: [
      { id: 'ksks', label: 'K♠ K♠', pays: 250 },
      { id: 'qhqh', label: 'Q♥ Q♥', pays: 100 },
      { id: 'suited', label: 'Suited pair', pays: 25 },
      { id: 'colored', label: 'Colored pair', pays: 10 },
      { id: 'any', label: 'Any pair', pays: 5 },
    ],
    patterns: {
      ksks: { kind: 'specific', cards: [makeCard(12, 0), makeCard(12, 0)] },
      qhqh: { kind: 'specific', cards: [makeCard(11, 1), makeCard(11, 1)] },
      suited: { kind: 'suited' },
      colored: { kind: 'colored' },
      any: { kind: 'any' },
    },
  },
];

export interface SideBetEV {
  ev: number;
  lines: { id: string; label: string; pays: number; prob: number; ret: number }[];
  pLose: number;
}

const pay = (b: SideBet, id: string) => b.lines.find((l) => l.id === id)?.pays ?? 0;
const color = (c: CardId) => (isRed(c) ? 1 : 0);

function result(b: SideBet, probs: Map<string, number>): SideBetEV {
  let ev = 0;
  let pWin = 0;
  const lines = b.lines.map((l) => {
    const p = probs.get(l.id) ?? 0;
    pWin += p;
    ev += p * l.pays;
    return { id: l.id, label: l.label, pays: l.pays, prob: p, ret: p * l.pays };
  });
  const pLose = Math.max(0, 1 - pWin);
  ev -= pLose;
  return { ev, lines, pLose };
}

function addP(m: Map<string, number>, k: string | null, p: number) {
  if (k && p) m.set(k, (m.get(k) ?? 0) + p);
}

/** Iterate unordered pairs of card types with their probability as the player's first two cards. */
function forPairs(c: ByCard, f: (a: CardId, b: CardId, p: number) => void) {
  let N = 0;
  for (let i = 0; i < 52; i++) N += c[i];
  const tot = (N * (N - 1)) / 2;
  if (tot <= 0) return;
  for (let i = 0; i < 52; i++) {
    if (!c[i]) continue;
    const same = (c[i] * (c[i] - 1)) / 2;
    if (same) f(i, i, same / tot);
    for (let j = i + 1; j < 52; j++) if (c[j]) f(i, j, (c[i] * c[j]) / tot);
  }
}

export function classifyPerfectPairs(a: CardId, b: CardId): string | null {
  if (rankOf(a) !== rankOf(b)) return null;
  if (a === b) return 'perfect';
  return color(a) === color(b) ? 'colored' : 'mixed';
}

export function classifyLuckyLadies(a: CardId, b: CardId): string | null {
  if (valueOf(a) + valueOf(b) !== 20 && !(valueOf(a) === 10 && valueOf(b) === 10)) {
    // A+9 counts as 20 (ace = 11)
    const isA9 = (valueOf(a) === 1 && valueOf(b) === 9) || (valueOf(a) === 9 && valueOf(b) === 1);
    if (!isA9) return null;
  }
  const qh = makeCard(11, 1);
  if (a === qh && b === qh) return 'qhqh';
  if (a === b) return 'matched';
  if (suitOf(a) === suitOf(b)) return 'suited';
  return 'any';
}

export function classifyPair(b: SideBet, x: CardId, y: CardId): string | null {
  if (rankOf(x) !== rankOf(y)) {
    // specific patterns can involve different ranks
    for (const l of [...b.lines].sort((p, q) => q.pays - p.pays)) {
      const pt = b.patterns?.[l.id];
      if (pt?.kind === 'specific' && pt.cards && ((pt.cards[0] === x && pt.cards[1] === y) || (pt.cards[0] === y && pt.cards[1] === x))) return l.id;
    }
    return null;
  }
  for (const l of [...b.lines].sort((p, q) => q.pays - p.pays)) {
    const pt = b.patterns?.[l.id];
    if (!pt) continue;
    const ok =
      pt.kind === 'any' ||
      (pt.kind === 'suited' && x === y) ||
      (pt.kind === 'colored' && color(x) === color(y)) ||
      (pt.kind === 'mixed' && color(x) !== color(y)) ||
      (pt.kind === 'specific' && !!pt.cards && ((pt.cards[0] === x && pt.cards[1] === y) || (pt.cards[0] === y && pt.cards[1] === x))) ||
      (pt.kind === 'rank' && rankOf(x) === pt.rank && (!pt.suited || x === y));
    if (ok) return l.id;
  }
  return null;
}

/** Every 21+3 category a 3-card hand satisfies (A plays high or low; Q-K-A and A-2-3 are straights). */
export function categories21p3(a: CardId, b: CardId, c: CardId): string[] {
  const r = [rankOf(a), rankOf(b), rankOf(c)].sort((x, y) => x - y);
  const flush = suitOf(a) === suitOf(b) && suitOf(b) === suitOf(c);
  const trips = r[0] === r[1] && r[1] === r[2];
  const distinct = r[0] !== r[1] && r[1] !== r[2];
  const straight = distinct && (r[2] - r[0] === 2 || (r[0] === 0 && r[1] === 11 && r[2] === 12));
  const out: string[] = [];
  if (trips && flush) out.push('suitedTrips');
  if (straight && flush) out.push('straightFlush');
  if (trips) out.push('trips');
  if (straight) out.push('straight');
  if (flush) out.push('flush');
  return out;
}

/** The paying 21+3 line for a hand: the highest-paying category it satisfies (null if none pays). */
export function classify21p3(a: CardId, b: CardId, c: CardId, bet?: SideBet): string | null {
  const cats = categories21p3(a, b, c);
  if (!bet) return cats[0] ?? null;
  let best: string | null = null;
  let bp = 0;
  for (const k of cats) {
    const p = pay(bet, k);
    if (p > bp) {
      bp = p;
      best = k;
    }
  }
  return best;
}

/** Match the dealer: number of suited and unsuited rank matches of the two player cards vs the upcard. */
export function matchDealerPayout(b: SideBet, p1: CardId, p2: CardId, up: CardId): number {
  let w = 0;
  for (const p of [p1, p2]) {
    if (rankOf(p) !== rankOf(up)) continue;
    w += p === up ? pay(b, 'suited') : pay(b, 'unsuited');
  }
  return w > 0 ? w : -1;
}

export function sideBetEV(b: SideBet, counts: ByCard): SideBetEV {
  const probs = new Map<string, number>();
  let N = 0;
  for (let i = 0; i < 52; i++) N += counts[i];
  switch (b.kind) {
    case 'perfectPairs':
      forPairs(counts, (x, y, p) => addP(probs, classifyPerfectPairs(x, y), p));
      return result(b, probs);
    case 'customPair':
      forPairs(counts, (x, y, p) => addP(probs, classifyPair(b, x, y), p));
      return result(b, probs);
    case 'luckyLadies': {
      forPairs(counts, (x, y, p) => {
        const k = classifyLuckyLadies(x, y);
        if (k === 'qhqh' && pay(b, 'qhqhBJ')) {
          // dealer blackjack from the remaining cards (after the two Q♥)
          const rem = N - 2;
          let aces = 0;
          let tens = 0;
          for (let i = 0; i < 52; i++) {
            const n = counts[i] - (i === x ? 1 : 0) - (i === y ? 1 : 0);
            if (valueOf(i) === 1) aces += n;
            else if (valueOf(i) === 10) tens += n;
          }
          const pbj = rem > 1 ? (2 * aces * tens) / (rem * (rem - 1)) : 0;
          addP(probs, 'qhqhBJ', p * pbj);
          addP(probs, 'qhqh', p * (1 - pbj));
        } else addP(probs, k, p);
      });
      return result(b, probs);
    }
    case 'twentyOnePlus3': {
      // player's two cards + dealer upcard: any 3 cards from the shoe
      const tot = (N * (N - 1) * (N - 2)) / 6;
      if (tot <= 0) return result(b, probs);
      const choose = (n: number, k: number) => (k === 1 ? n : k === 2 ? (n * (n - 1)) / 2 : (n * (n - 1) * (n - 2)) / 6);
      for (let i = 0; i < 52; i++) {
        if (!counts[i]) continue;
        for (let j = i; j < 52; j++) {
          if (!counts[j]) continue;
          for (let k = j; k < 52; k++) {
            if (!counts[k]) continue;
            let w: number;
            if (i === j && j === k) w = choose(counts[i], 3);
            else if (i === j) w = choose(counts[i], 2) * counts[k];
            else if (j === k) w = counts[i] * choose(counts[j], 2);
            else w = counts[i] * counts[j] * counts[k];
            if (w > 0) addP(probs, classify21p3(i, j, k, b), w / tot);
          }
        }
      }
      return result(b, probs);
    }
    case 'matchDealer': {
      // P(upcard u) * P(player pair outcome | u). Double matches pay the sum.
      const outs = new Map<number, number>();
      for (let u = 0; u < 52; u++) {
        if (!counts[u]) continue;
        const pu = counts[u] / N;
        const c2 = counts.slice();
        c2[u]--;
        forPairs(c2, (x, y, p) => {
          const w = matchDealerPayout(b, x, y, u);
          outs.set(w, (outs.get(w) ?? 0) + pu * p);
        });
      }
      let ev = 0;
      let pLose = 0;
      const lineP = new Map<string, number>();
      for (const [w, p] of outs) {
        ev += w * p;
        if (w < 0) pLose += p;
        else lineP.set(String(w), (lineP.get(String(w)) ?? 0) + p);
      }
      const lines = [...lineP.entries()]
        .sort((a, c) => Number(c[0]) - Number(a[0]))
        .map(([w, p]) => ({ id: 'w' + w, label: `Pays ${w}`, pays: Number(w), prob: p, ret: p * Number(w) }));
      return { ev, lines, pLose };
    }
    case 'buster': {
      const byVal = new Array(11).fill(0);
      for (let i = 0; i < 52; i++) byVal[valueOf(i)] += counts[i];
      const dist = dealerBustByCards(byVal, b.h17 ?? true);
      for (const [n, p] of dist) addP(probs, n >= 8 ? 'c8' : 'c' + n, p);
      return result(b, probs);
    }
  }
}

/**
 * Probability that the dealer busts with exactly n cards, dealing the dealer's hand straight from
 * composition `c` (by value). The dealer plays out regardless of the players (Buster rules);
 * a dealer blackjack is not a bust. The players' cards are not removed (documented approximation:
 * the bet is placed before the deal, and the players' draws are unknown).
 */
export function dealerBustByCards(c: number[], h17: boolean): Map<number, number> {
  const shoe = c.slice();
  let n = 0;
  for (let v = 1; v <= 10; v++) n += shoe[v];
  const out = new Map<number, number>();
  const rec = (sum: number, ace: boolean, cards: number, p: number) => {
    const soft = ace && sum + 10 <= 21;
    const tot = soft ? sum + 10 : sum;
    if (cards === 2 && tot === 21) return; // blackjack
    if (tot > 21) {
      out.set(cards, (out.get(cards) ?? 0) + p);
      return;
    }
    if (cards >= 2 && tot >= 17 && !(tot === 17 && soft && h17)) return;
    for (let v = 1; v <= 10; v++) {
      if (!shoe[v]) continue;
      const q = shoe[v] / n;
      shoe[v]--;
      n--;
      rec(sum + v, ace || v === 1, cards + 1, p * q);
      shoe[v]++;
      n++;
    }
  };
  rec(0, false, 0, 1);
  return out;
}

export function withPays(b: SideBet, pays: Record<string, number>): SideBet {
  return { ...b, lines: b.lines.map((l) => ({ ...l, pays: pays[l.id] ?? l.pays })) };
}

/** Resolve a side bet on actual cards (for the Hunter's results). Returns net units. */
export function resolveSideBet(b: SideBet, player: CardId[], dealer: CardId[], dealerFinal?: CardId[]): number {
  const [p1, p2] = player;
  const up = dealer[0];
  switch (b.kind) {
    case 'perfectPairs': {
      const k = classifyPerfectPairs(p1, p2);
      return k ? pay(b, k) : -1;
    }
    case 'customPair': {
      const k = classifyPair(b, p1, p2);
      return k ? pay(b, k) : -1;
    }
    case 'luckyLadies': {
      let k = classifyLuckyLadies(p1, p2);
      if (k === 'qhqh') {
        const dv = dealer.slice(0, 2).map(valueOf);
        if (dv.includes(1) && dv.includes(10) && pay(b, 'qhqhBJ')) k = 'qhqhBJ';
      }
      return k ? pay(b, k) : -1;
    }
    case 'twentyOnePlus3': {
      const k = classify21p3(p1, p2, up, b);
      return k ? pay(b, k) : -1;
    }
    case 'matchDealer':
      return matchDealerPayout(b, p1, p2, up);
    case 'buster': {
      const d = dealerFinal ?? dealer;
      const t = d.map(valueOf);
      let sum = 0;
      let ace = false;
      for (const v of t) {
        sum += v;
        if (v === 1) ace = true;
      }
      const tot = ace && sum + 10 <= 21 ? sum + 10 : sum;
      if (tot <= 21) return -1;
      const n = d.length;
      return pay(b, n >= 8 ? 'c8' : 'c' + n) || -1;
    }
  }
}

export const keyCardLabel = cardLabel;
