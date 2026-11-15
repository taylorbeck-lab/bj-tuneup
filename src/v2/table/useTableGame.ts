import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, type DecisionSnapshot } from '../../engine/game';
import type { Chart, Action } from '../../engine/strategy/chart';
import { valueOf, type CardId } from '../../engine/cards';
import { randomSeed } from '../../engine/rng';
import { SPEEDS, tableMax, type V2Settings } from '../settings';
import { occupiedSpots, cardPos, dealerCardPos } from './layout';

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
 * Drives the engine at casino pace: one card per tick at the chosen dealer speed, bots think a
 * little longer, finished hands stay on the felt for a realistic beat, then the sweep.
 */
export function useTableGame(s: V2Settings, chart: Chart | undefined, onDecision?: (snap: DecisionSnapshot, spot: number) => void, onRoundEnd?: (r: RoundResult, t: Table) => void, paused = false) {
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
  useEffect(() => {
    if (!chart) return;
    const humanSeats = layout.mine.map((sp) => seatOfSpot.get(sp)!);
    const min = s.tableMin;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupKey]);

  const t = tableRef.current;

  /** Recompute card placements, keeping ids stable so landed cards never move or re-animate. */
  const sync = useCallback(() => {
    const tb = tableRef.current;
    if (!tb) return;
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
          const pos = cardPos(spot, hi, ci, seat.human);
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
      setPhase(ph === 'insurance' ? 'insurance' : 'yourTurn');
      return;
    }
    setPhase(ph === 'deal' ? 'dealing' : 'playing');
    const botThinking = ph === 'play' ? 1.5 : 1;
    const id = setTimeout(() => {
      if (t.step()) bump();
    }, speed.card * botThinking);
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
    if (!t) return;
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
    onDecision?.(snap, spot);
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
    speed,
    spotOfSeat,
    seatOfSpot,
    /** Hand values of the active human hand. */
    activeValues: t && t.phase === 'play' ? t.seats[t.turn.seat]?.hands[t.turn.hand]?.cards.map(valueOf) : undefined,
  };
}
