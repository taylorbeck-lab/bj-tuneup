import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, type DecisionSnapshot, type ShoeSnapshot } from '../../engine/game';
import { kvGet, kvSet } from '../../store/db';
import type { Chart, Action } from '../../engine/strategy/chart';
import { valueOf, type CardId } from '../../engine/cards';
import { randomSeed } from '../../engine/rng';
import { SPEEDS, tableMax, type V2Settings } from '../settings';
import { thinkFactor, thinkMs, personality } from './pace';
import { occupiedSpots, dealerCardPos, layoutTable, type TableLayout, type SpotShape } from './layout';

export interface PlacedCard {
  id: string;
  card: CardId;
  x: number;
  y: number;
  /** Card width (cqw). */
  w: number;
  mine: boolean;
  faceDown: boolean;
  /** Seat spot (0 = dealer). */
  spot: number;
  hand: number;
}

export type UiPhase = 'betting' | 'dealing' | 'insurance' | 'yourTurn' | 'playing' | 'results' | 'sweeping' | 'shuffling';

export interface RoundResult {
  net: number;
  hands: { spot: number; hand: number; net: number }[];
}

/**
 * The live game, kept outside the screen so looking at the chart or settings never ends a hand:
 * the table, where the round is, and the cards on the felt. Between hands the shoe and the count
 * are also saved on the device, so a reload (or iOS closing the app) picks up mid-shoe.
 */
let live: { key: string; table: Table; phase: UiPhase; result: RoundResult | null; placed: PlacedCard[]; idSeq: number } | null = null;
const SHOE_KEY = 'v2shoe';

/**
 * Drives the engine at casino pace: one card per tick at the chosen dealer speed, bots think a
 * little longer, finished hands stay on the felt for a realistic beat, then the sweep.
 */
export function useTableGame(s: V2Settings, chart: Chart | undefined, onDecision?: (snap: DecisionSnapshot, spot: number, ms: number) => void, onRoundEnd?: (r: RoundResult, t: Table) => void, paused = false) {
  const layout = useMemo(() => occupiedSpots(s.players, s.seat, s.spots), [s.players, s.seat, s.spots]);
  const speed = SPEEDS.find((x) => x.id === s.speed)!;
  const tableRef = useRef<Table | null>(null);
  const [tick, setTick] = useState(0);
  const [phase, setPhase] = useState<UiPhase>('betting');
  const [result, setResult] = useState<RoundResult | null>(null);
  const placed = useRef<PlacedCard[]>([]);
  const idSeq = useRef(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  // engine seat index <-> spot number
  const seatOfSpot = useMemo(() => new Map(layout.spots.map((sp, i) => [sp, i])), [layout]);
  const spotOfSeat = (i: number) => layout.spots[i];

  // (re)create the table when the setup changes
  const setupKey = JSON.stringify([s.rules, layout, !!chart]);
  const restoring = useRef(false);
  /** When your current decision started (for your pace and the table-is-waiting cue). */
  const turnStarted = useRef(Date.now());
  /** Each other player's own pace (quick regular to slow ponderer), fixed per table. */
  const paces = useRef<Record<number, number>>({});
  useEffect(() => {
    if (!chart) return;
    // coming back from the chart, stats or settings: carry on exactly where we were
    if (live && live.key === setupKey) {
      tableRef.current = live.table;
      placed.current = live.placed;
      idSeq.current = live.idSeq;
      setPhase(live.phase);
      setResult(live.result);
      bump();
      return;
    }
    const humanSeats = layout.mine.map((sp) => seatOfSpot.get(sp)!);
    const min = s.tableMin;
    paces.current = {};
    tableRef.current = new Table({
      rules: s.rules,
      seats: layout.spots.length,
      humanSeat: humanSeats[0],
      humanSeats,
      chart,
      seed: randomSeed(),
      granularity: 0.5,
      rounding: 'floor',
      botBet: () => min * [1, 1, 1, 2, 2, 3, 4][Math.floor(Math.random() * 7)],
      botMistakeRate: 0.06,
    });
    placed.current = [];
    setPhase('betting');
    setResult(null);
    bump();
    // a saved shoe for this same game picks up mid-shoe (count and all)
    const fresh = tableRef.current;
    restoring.current = true;
    kvGet<{ key: string; shoe: ShoeSnapshot }>(SHOE_KEY)
      .then((saved) => {
        if (saved && saved.key === setupKey && tableRef.current === fresh && fresh.restoreShoe(saved.shoe)) bump();
      })
      .catch(() => {})
      .finally(() => (restoring.current = false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupKey]);

  // save the shoe and the count whenever the table opens for bets
  useEffect(() => {
    const tb = tableRef.current;
    if (phase !== 'betting' || !tb || restoring.current) return;
    void kvSet(SHOE_KEY, { key: setupKey, shoe: tb.snapshotShoe() });
  }, [phase, tick, setupKey]);

  const t = tableRef.current;

  /** Where every hand sits this round (collision-free; re-placed only when a spot's hands change). */
  const tableLayout = useRef<{ round: number; layout?: TableLayout }>({ round: -1 });

  /** Recompute card placements, keeping ids stable so landed cards never move or re-animate. */
  const sync = useCallback(() => {
    const tb = tableRef.current;
    if (!tb) return;
    if (tableLayout.current.round !== tb.round) tableLayout.current = { round: tb.round };
    const shapes: SpotShape[] = [];
    tb.seats.forEach((seat, si) => {
      if (seat.hands.some((h) => h.cards.length)) shapes.push({ spot: spotOfSeat(si), mine: seat.human, hands: seat.hands.map((h) => h.cards.length) });
    });
    const lay = layoutTable(shapes, tb.dealer.length, layout.spots, tableLayout.current.layout);
    tableLayout.current.layout = lay;
    const prev = placed.current;
    const used = new Set<string>();
    const next: PlacedCard[] = [];
    const take = (pred: (p: PlacedCard) => boolean) => {
      const m = prev.find((p) => !used.has(p.id) && pred(p));
      if (m) used.add(m.id);
      return m;
    };
    tb.dealer.forEach((c, i) => {
      const pos = dealerCardPos(i);
      const m = take((p) => p.spot === 0 && p.hand === i);
      next.push({ id: m?.id ?? 'c' + idSeq.current++, card: c, ...pos, mine: false, faceDown: i === 1 && !tb.holeRevealed, spot: 0, hand: i });
    });
    tb.seats.forEach((seat, si) => {
      const spot = spotOfSeat(si);
      seat.hands.forEach((h, hi) => {
        h.cards.forEach((c, ci) => {
          const pos = lay.spots.get(spot)!.cards[hi][ci];
          const m =
            take((p) => p.spot === spot && p.card === c && p.hand === hi && Math.abs(p.x - pos.x) < 0.01 && Math.abs(p.y - pos.y) < 0.01) ??
            take((p) => p.spot === spot && p.card === c);
          next.push({ id: m?.id ?? 'c' + idSeq.current++, card: c, ...pos, mine: seat.human, faceDown: false, spot, hand: hi });
        });
      });
    });
    placed.current = next;
  }, [layout]); // eslint-disable-line react-hooks/exhaustive-deps

  // card placements are derived from the engine on every render (ids stay stable)
  if (t) sync();
  if (t) live = { key: setupKey, table: t, phase, result, placed: placed.current, idSeq: idSeq.current };

  // the automatic dealer loop
  useEffect(() => {
    if (!t) return;
    const ph = t.phase;
    if (ph === 'settled') {
      if (phase !== 'results' && phase !== 'sweeping' && phase !== 'betting') {
        const hands: RoundResult['hands'] = [];
        t.seats.forEach((seat, si) => {
          if (!seat.human) return;
          seat.hands.forEach((h, hi) => hands.push({ spot: spotOfSeat(si), hand: hi, net: h.net ?? 0 }));
        });
        const r = { net: t.logs[t.logs.length - 1]?.net ?? 0, hands };
        setResult(r);
        setPhase('results');
        onRoundEnd?.(r, t);
      }
      return;
    }
    if (ph === 'bet') return;
    if (paused) return;
    if (t.waitingForHuman) {
      if (phase !== 'yourTurn' && phase !== 'insurance') turnStarted.current = Date.now();
      setPhase(ph === 'insurance' ? 'insurance' : 'yourTurn');
      return;
    }
    setPhase(ph === 'deal' ? 'dealing' : 'playing');
    // the dealer deals at an even pace; another player thinks as long as the decision deserves
    let wait = speed.card;
    if (ph === 'play') {
      const hand = t.seats[t.turn.seat]?.hands[t.turn.hand];
      if (hand) {
        const values = hand.cards.map(valueOf);
        const first = hand.cards.length === 2;
        const pace = (paces.current[t.turn.seat] ??= personality(Math.random));
        wait = thinkMs(speed.card, thinkFactor(values, valueOf(t.dealer[0]), first), pace, Math.random);
      }
    }
    const id = setTimeout(() => {
      if (t.step()) bump();
    }, wait);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, tick, paused]);

  // results linger on the felt, then the sweep, then betting
  useEffect(() => {
    if (paused) return;
    if (phase === 'results') {
      const id = setTimeout(() => setPhase('sweeping'), speed.linger);
      return () => clearTimeout(id);
    }
    if (phase === 'sweeping') {
      const id = setTimeout(() => {
        placed.current = [];
        setResult(null);
        setPhase(tableRef.current?.needsShuffle ? 'shuffling' : 'betting');
      }, 450);
      return () => clearTimeout(id);
    }
    if (phase === 'shuffling') {
      const id = setTimeout(() => {
        tableRef.current?.reshuffle();
        setPhase('betting');
        bump();
      }, 1600);
      return () => clearTimeout(id);
    }
  }, [phase, speed.linger, bump, paused]);

  const deal = (bets: Record<number, number>, practice?: { values: [number, number]; up: number } | null) => {
    if (!t || restoring.current) return;
    const bySeat: Record<number, number> = {};
    for (const [spot, amt] of Object.entries(bets)) {
      const si = seatOfSpot.get(Number(spot));
      if (si !== undefined) bySeat[si] = Math.min(amt, tableMax(s.tableMin));
    }
    placed.current = [];
    t.placeBet(bySeat);
    if (practice) t.stackPractice(practice.values, practice.up);
    setResult(null);
    setPhase('dealing');
    bump();
  };
  const act = (a: Action) => {
    if (!t || t.phase !== 'play') return;
    const spot = spotOfSeat(t.turn.seat);
    const snap = t.act(a);
    onDecision?.(snap, spot, Date.now() - turnStarted.current);
    turnStarted.current = Date.now();
    bump();
  };
  const insure = (take: boolean) => {
    if (!t) return;
    t.insure(take);
    bump();
  };
  /**
   * Ask the dealer to shuffle up: the cards go back in, the shoe is shuffled and cut, and the count
   * starts over at 0 — exactly like a fresh shoe at a casino. Only between hands.
   */
  const shuffleUp = () => {
    if (phase !== 'betting' || !t) return;
    placed.current = [];
    setPhase('shuffling');
  };
  /** Skip the linger (tap to continue). */
  const hurry = () => {
    if (phase === 'results') setPhase('sweeping');
  };

  const activeSpot = t && t.phase === 'play' ? spotOfSeat(t.turn.seat) : null;
  const insuranceSpot = t && t.phase === 'insurance' && t.pendingInsurance.length ? spotOfSeat(t.pendingInsurance[0]) : null;
  return {
    table: t,
    tick,
    phase,
    layout,
    cards: phase === 'betting' || phase === 'shuffling' ? [] : placed.current,
    sweeping: phase === 'sweeping',
    result,
    activeSpot,
    insuranceSpot,
    activeHand: t?.phase === 'play' ? t.turn.hand : 0,
    legal: t && t.phase === 'play' && t.seats[t.turn.seat]?.human ? t.legalActions() : [],
    deal,
    act,
    insure,
    hurry,
    shuffleUp,
    turnStarted,
    speed,
    spotOfSeat,
    seatOfSpot,
    /** Hand values of the active human hand. */
    activeValues: t && t.phase === 'play' ? t.seats[t.turn.seat]?.hands[t.turn.hand]?.cards.map(valueOf) : undefined,
  };
}
