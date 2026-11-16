/**
 * How good was that shoe? At the end of a shoe José sums it up: how many hands it ran, how high and
 * low the count went, how many hands favoured you (your edge, worked out from the cards that were
 * left), and whether your bets went up when it mattered.
 */
import { edgeEOR, type EdgeModel } from '../../engine/edge';
import type { RoundLog } from '../../engine/game';

export type ShoeVerdict = 'hot' | 'cold' | 'neutral';

export interface ShoeSummary {
  hands: number;
  peakTc: number;
  lowTc: number;
  /** Hands where the player had the edge before the deal. */
  favoured: number;
  /** Best edge of the shoe (fraction, e.g. 0.021 = 2.1%). */
  bestEdge: number;
  /** Average edge over the hands you played. */
  avgEdge: number;
  /** Average bet on favoured hands vs the rest (0 when there were none). */
  betUp: number;
  betFlat: number;
  /** Your result this shoe, in dollars. */
  net: number;
  verdict: ShoeVerdict;
}

/** Edge before the deal: exact from the cards left when the model is ready, otherwise the Hi-Lo rule of thumb. */
const edgeOf = (r: RoundLog, m?: EdgeModel) => (m ? edgeEOR(m, r.bet.unseen) : -0.005 + 0.005 * r.bet.tc);

export function summariseShoe(rounds: RoundLog[], m?: EdgeModel): ShoeSummary | null {
  const played = rounds.filter((r) => r.bet.units > 0);
  if (!played.length) return null;
  const edges = played.map((r) => edgeOf(r, m));
  const tcs = played.map((r) => r.bet.tc);
  const fav = played.filter((_, i) => edges[i] > 0);
  const rest = played.filter((_, i) => edges[i] <= 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const peakTc = Math.max(...tcs);
  const lowTc = Math.min(...tcs);
  const favoured = fav.length;
  const share = favoured / played.length;
  const avgEdge = avg(edges);
  const verdict: ShoeVerdict = peakTc >= 4 || (share >= 0.4 && avgEdge > 0) ? 'hot' : peakTc <= 0 || avgEdge < -0.006 ? 'cold' : 'neutral';
  return {
    hands: played.length,
    peakTc,
    lowTc,
    favoured,
    bestEdge: Math.max(...edges),
    avgEdge,
    betUp: avg(fav.map((r) => r.bet.units)),
    betFlat: avg(rest.map((r) => r.bet.units)),
    net: played.reduce((a, r) => a + r.net, 0),
    verdict,
  };
}

/** José's one-liner on the shoe, and on whether you bet it right. */
export function shoeLine(s: ShoeSummary): string {
  const pressed = s.favoured > 0 && s.betFlat > 0 && s.betUp >= s.betFlat * 1.5;
  if (s.verdict === 'hot') return pressed ? 'Hot shoe, and you pressed it. That’s the game, primo.' : s.favoured ? 'That shoe was yours, and you bet it flat. Next time, push it.' : 'Hot at the end, primo. Watch for those.';
  if (s.verdict === 'cold') return s.favoured && !pressed && s.peakTc >= 2 ? 'Mostly cold, with a couple of good spots. That’s when the bet goes up.' : 'Cold shoe. Small bets were the right call.';
  if (pressed) return 'Nothing wild, but you bet up at the right times.';
  return s.favoured && s.peakTc >= 2 ? 'A couple of good spots in there. That’s when the bet goes up.' : 'Nothing special in that one. Stay patient.';
}
