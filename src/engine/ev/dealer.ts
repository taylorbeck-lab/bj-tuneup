/**
 * Exact dealer outcome probabilities, drawing without replacement from the actual remaining cards.
 * The game is a US peek game: with an A or ten-value upcard the dealer has already checked for
 * blackjack, so the distribution is conditioned on "no dealer blackjack" (the hole card cannot be
 * the card that would make blackjack).
 */
import type { Comp } from '../shoe';

/** Multiset key: counts per value packed base-32 (value v occupies digit v-1). Safe below 2^53. */
export const POW: number[] = [0, 1, 32, 1024, 32768, 1048576, 33554432, 1073741824, 34359738368, 1099511627776, 35184372088832];

export function keyOf(values: readonly number[]): number {
  let k = 0;
  for (const v of values) k += POW[v];
  return k;
}

/** Dealer final distribution: index 0..4 = 17..21, index 5 = bust. */
export type DealerVec = Float64Array;
export const BUST = 5;

function standVec(total: number): DealerVec {
  const v = new Float64Array(6);
  v[total - 17] = 1;
  return v;
}
const STAND: DealerVec[] = [17, 18, 19, 20, 21].map(standVec);
const BUSTV: DealerVec = (() => {
  const v = new Float64Array(6);
  v[BUST] = 1;
  return v;
})();

/**
 * Probabilities of the dealer's final total given upcard `up` and remaining composition `shoe`
 * (which must NOT include the upcard). `shoe` is used as scratch space and restored.
 * If `peek` and up is A/T, conditioned on no blackjack.
 */
export function dealerProbsRecursive(shoe: Comp, up: number, h17: boolean, peek = true): DealerVec {
  let n = 0;
  for (let v = 1; v <= 10; v++) n += shoe[v];
  const memo = new Map<number, DealerVec>();
  const excl = peek ? (up === 1 ? 10 : up === 10 ? 1 : 0) : 0;

  const rec = (sum: number, ace: boolean, key: number, first: boolean): DealerVec => {
    const soft = ace && sum + 10 <= 21;
    const tot = soft ? sum + 10 : sum;
    if (tot > 21) return BUSTV;
    if (tot >= 17 && !(tot === 17 && soft && h17)) return STAND[tot - 17];
    const m = memo.get(key);
    if (m) return m;
    const res = new Float64Array(6);
    let denom = n;
    if (first && excl) denom -= shoe[excl];
    if (denom <= 0) {
      // Degenerate: no cards left to draw. Treat as dealer standing on a stiff (loses to any total).
      res[BUST] = 0;
      memo.set(key, res);
      return res;
    }
    for (let c = 1; c <= 10; c++) {
      const cnt = shoe[c];
      if (cnt === 0 || (first && c === excl)) continue;
      const p = cnt / denom;
      shoe[c]--;
      n--;
      const sub = rec(sum + c, ace || c === 1, key + POW[c], false);
      shoe[c]++;
      n++;
      for (let i = 0; i < 6; i++) res[i] += p * sub[i];
    }
    memo.set(key, res);
    return res;
  };
  return rec(up, up === 1, 0, true);
}

/**
 * Dealer state graph for one upcard: every multiset of drawn cards the dealer can reach before
 * standing, in topological order (by number of cards). Built once per (upcard, H17/S17) and reused.
 * edge[i*10 + c-1] = child node index (>= 0), or -(outcome + 1) when drawing c ends the hand.
 */
interface DealerGraph {
  n: number;
  size: Int32Array;
  counts: Int8Array; // n * 11
  edge: Int32Array; // n * 10
}
const graphs = new Map<number, DealerGraph>();

function buildGraph(up: number, h17: boolean): DealerGraph {
  const keyIdx = new Map<number, number>();
  const sums: number[] = [];
  const aces: boolean[] = [];
  const sizes: number[] = [];
  const counts: number[][] = [];
  const edges: number[] = [];
  const add = (sum: number, ace: boolean, key: number, cnt: number[], size: number): number => {
    const ex = keyIdx.get(key);
    if (ex !== undefined) return ex;
    const i = sums.length;
    keyIdx.set(key, i);
    sums.push(sum);
    aces.push(ace);
    sizes.push(size);
    counts.push(cnt);
    return i;
  };
  const outcome = (sum: number, ace: boolean): number => {
    const soft = ace && sum + 10 <= 21;
    const tot = soft ? sum + 10 : sum;
    if (tot > 21) return BUST;
    if (tot >= 17 && !(tot === 17 && soft && h17)) return tot - 17;
    return -1;
  };
  add(up, up === 1, 0, new Array(11).fill(0), 0);
  for (let i = 0; i < sums.length; i++) {
    for (let c = 1; c <= 10; c++) {
      const s2 = sums[i] + c;
      const a2 = aces[i] || c === 1;
      const o = outcome(s2, a2);
      if (o >= 0) edges.push(-(o + 1));
      else {
        const cnt = counts[i].slice();
        cnt[c]++;
        let key = 0;
        for (let v = 1; v <= 10; v++) key += cnt[v] * POW[v];
        edges.push(add(s2, a2, key, cnt, sizes[i] + 1));
      }
    }
  }
  // BFS order from the root is already topological (children always have one more card).
  const n = sums.length;
  const g: DealerGraph = { n, size: new Int32Array(sizes), counts: new Int8Array(n * 11), edge: new Int32Array(edges) };
  for (let i = 0; i < n; i++) for (let v = 1; v <= 10; v++) g.counts[i * 11 + v] = counts[i][v];
  return g;
}

function graphFor(up: number, h17: boolean): DealerGraph {
  const k = up * 2 + (h17 ? 1 : 0);
  let g = graphs.get(k);
  if (!g) {
    g = buildGraph(up, h17);
    graphs.set(k, g);
  }
  return g;
}

let reachBuf = new Float64Array(1024);

/**
 * Probabilities of the dealer's final total given upcard `up` and remaining composition `shoe`
 * (which must NOT include the upcard). If `peek` and up is A/T, conditioned on no blackjack.
 * Forward pass over the precomputed dealer graph: reach(child) += reach(node) * P(card | node),
 * where P(card c | node) = (shoe[c] - drawn[c]) / (N - drawn).
 */
export function dealerProbs(shoe: Comp, up: number, h17: boolean, peek = true): DealerVec {
  const g = graphFor(up, h17);
  if (reachBuf.length < g.n) reachBuf = new Float64Array(g.n * 2);
  const reach = reachBuf;
  reach.fill(0, 0, g.n);
  reach[0] = 1;
  let N = 0;
  for (let v = 1; v <= 10; v++) N += shoe[v];
  const excl = peek ? (up === 1 ? 10 : up === 10 ? 1 : 0) : 0;
  const res = new Float64Array(6);
  const { counts, edge, size } = g;
  for (let i = 0; i < g.n; i++) {
    const r = reach[i];
    if (r === 0) continue;
    let denom = N - size[i];
    if (i === 0 && excl) denom -= shoe[excl];
    if (denom <= 0) continue;
    const inv = r / denom;
    const cb = i * 11;
    const eb = i * 10;
    for (let c = 1; c <= 10; c++) {
      if (i === 0 && c === excl) continue;
      const left = shoe[c] - counts[cb + c];
      if (left <= 0) continue;
      const p = left * inv;
      const t = edge[eb + c - 1];
      if (t >= 0) reach[t] += p;
      else res[-t - 1] += p;
    }
  }
  return res;
}

/** Probability the dealer has blackjack given upcard and remaining composition (before the peek). */
export function dealerBJProb(shoe: Comp, up: number): number {
  let n = 0;
  for (let v = 1; v <= 10; v++) n += shoe[v];
  if (n === 0) return 0;
  if (up === 1) return shoe[10] / n;
  if (up === 10) return shoe[1] / n;
  return 0;
}

/** EV of standing on `total` (player has not busted) against a dealer distribution conditioned on no BJ. */
export function standEV(d: DealerVec, total: number): number {
  if (total > 21) return -1;
  let ev = d[BUST];
  for (let i = 0; i < 5; i++) {
    const t = 17 + i;
    if (total > t) ev += d[i];
    else if (total < t) ev -= d[i];
  }
  // Dealer totals < 17 never occur except in degenerate empty shoes (treated as dealer losing)
  return ev;
}
