import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, type DecisionSnapshot, type ShoeSnapshot } from '../../engine/game';
import { kvGet, kvSet } from '../../store/db';
import type { Chart, Action } from '../../engine/strategy/chart';
import { valueOf, isBlackjack, handTotal, type CardId } from '../../engine/cards';
import { randomSeed } from '../../engine/rng';
import { SPEEDS, tableMax, type V2Settings } from '../settings';
import { thinkFactor, thinkMs, personality, holeTurnMs, lingerMs, blackjackPayMs, dealerStepMs } from './pace';
import { occupiedSpots, dealerCardPos, layoutTable, type TableLayout, type SpotShape } from './layout';
import { initialBots, betweenHands, atShuffle, type TrafficChange } from './traffic';

/** Who else is at the table right now (kept across screens, like the game itself). */
let liveBots: { key: string; bots: number[] } | null = null;

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

export type UiPhase = 'betting' | 'dealing' | 'insurance' | 'peeking' | 'yourTurn' | 'playing' | 'results' | 'sweeping' | 'endOfShoe' | 'shuffling';

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
/** A real shuffle takes a moment: long enough to see it, and to reset your head. */
export const SHUFFLE_MS = 4600;
/** The dealer's peek with an ace or ten up: the hole card slides into the peeker, a beat, then the answer. */
export const PEEK_MS = 1500;
/** A double's card waits for the chips to go down (in dealer cards; 1 = one ordinary card). */
export const DOUBLE_BEAT = 1.35;
/** A split hand's second card, after the hand before it is finished. */
export const SPLIT_BEAT = 1.1;
/** How long "No blackjack" stays before play goes on. */
export const PEEK_CLEAR_MS = 1100;

/**
 * Drives the engine at casino pace: one card per tick at the chosen dealer speed, bots think a
 * little longer, finished hands stay on the felt for a realistic beat, then the sweep.
 */
export function useTableGame(s: V2Settings, chart: Chart | undefined, onDecision?: (snap: DecisionSnapshot, spot: number, ms: number) => void, onRoundEnd?: (r: RoundResult, t: Table) => void, paused = false) {
  // your spots, and the other players: a fixed number, or people coming and going (table traffic)
  const mine = useMemo(() => occupiedSpots(1, s.seat, s.spots).mine, [s.seat, s.spots]);
  const trafficKey = JSON.stringify([s.traffic, mine]);
  const [bots, setBots] = useState<number[]>(() => {
    if (s.traffic === 'off') return [];
    if (liveBots?.key === trafficKey) return liveBots.bots;
    return initialBots(s.traffic, mine, Math.random);
  });
  useEffect(() => {
    if (s.traffic === 'off') return;
    if (liveBots?.key === trafficKey) return;
    const b = initialBots(s.traffic, mine, Math.random);
    liveBots = { key: trafficKey, bots: b };
    setBots(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trafficKey]);
  const layout = useMemo(
    () => (s.traffic === 'off' ? occupiedSpots(s.players, s.seat, s.spots) : { spots: [...mine, ...bots.filter((b) => !mine.includes(b))].sort((a, b) => a - b), mine }),
    [s.traffic, s.players, s.seat, s.spots, mine, bots],
  );
  /** Who just sat down or got up (José mentions it); cleared when the next hand is dealt. */
  const [trafficNote, setTrafficNote] = useState<TrafficChange | null>(null);
  const moveTraffic = (kind: 'hand' | 'shuffle') => {
    if (s.traffic === 'off') return;
    const ch = (kind === 'shuffle' ? atShuffle : betweenHands)(bots, s.traffic, mine, Math.random);
    if (!ch.joined && !ch.left) return;
    liveBots = { key: trafficKey, bots: ch.bots };
    setBots(ch.bots);
    setTrafficNote(ch);
  };
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
  const setupKey = JSON.stringify([s.rules, layout, !!chart, s.shuffle]);
  /** The saved shoe belongs to the game (the rules), not to who's sitting at the table. */
  const shoeKey = JSON.stringify([s.rules, !!chart]);
  const restoring = useRef(false);
  /**
   * Which setup (rules, seats, shuffle) the table in play was built for. When someone sits down or
   * gets up the setup changes while this screen stays open: until the table has been rebuilt for the
   * new seats it must not be drawn, dealt on, or remembered as the game in progress.
   */
  const builtFor = useRef<string | null>(null);
  /** When your current decision started (for your pace and the table-is-waiting cue). */
  const turnStarted = useRef(Date.now());
  /** Each other player's own pace (quick regular to slow ponderer), fixed per table. */
  const paces = useRef<Record<number, number>>({});
  useEffect(() => {
    if (!chart) return;
    // coming back from the chart, stats or settings: carry on exactly where we were
    if (live && live.key === setupKey) {
      builtFor.current = setupKey;
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
    // someone sat down or got up between hands: same game, same shoe, same count
    const prev = tableRef.current;
    const carry = prev && JSON.stringify(prev.rules) === JSON.stringify(s.rules) && (prev.phase === 'bet' || prev.phase === 'settled') ? { shoe: prev.snapshotShoe(), logs: prev.logs } : null;
    tableRef.current = new Table({
      rules: s.rules,
      seats: layout.spots.length,
      humanSeat: humanSeats[0],
      humanSeats,
      chart,
      seed: randomSeed(),
      trueRandom: true,
      granularity: 0.5,
      rounding: 'floor',
      botBet: () => min * [1, 1, 1, 2, 2, 3, 4][Math.floor(Math.random() * 7)],
      botMistakeRate: 0.06,
      peekPause: true,
      cardPause: true,
      payPause: true,
      shuffleStyle: s.shuffle,
    });
    builtFor.current = setupKey;
    placed.current = [];
    setResult(null);
    if (carry && tableRef.current.restoreShoe(carry.shoe)) {
      tableRef.current.logs = carry.logs;
      // between hands nothing is on the felt; the end of the shoe and the shuffle carry on as they were
      setPhase((ph) => (ph === 'endOfShoe' || ph === 'shuffling' ? ph : 'betting'));
      bump();
      return;
    }
    setPhase('betting');
    bump();
    // a saved shoe for this same game picks up mid-shoe (count and all)
    const fresh = tableRef.current;
    restoring.current = true;
    kvGet<{ key: string; shoe: ShoeSnapshot }>(SHOE_KEY)
      .then((saved) => {
        if (saved && saved.key === shoeKey && tableRef.current === fresh && fresh.restoreShoe(saved.shoe)) bump();
      })
      .catch(() => {})
      .finally(() => (restoring.current = false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupKey]);

  // Save the shoe and the count as every card comes out, not only between hands. If the page is
  // reloaded in the middle of a hand (the phone closing the tab, an update, a setting changed), the
  // cards already dealt are gone, like a dead hand at a table: they are never dealt a second time.
  useEffect(() => {
    const tb = tableRef.current;
    if (!tb || restoring.current || builtFor.current !== setupKey) return;
    void kvSet(SHOE_KEY, { key: shoeKey, shoe: tb.snapshotShoe() });
  }, [phase, tick, setupKey]);

  const t = tableRef.current;

  /** After a peek with no blackjack: José says so for a moment before play goes on. */
  const peekClearUntil = useRef(0);
  const [peekClear, setPeekClear] = useState(false);
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
  // (when someone has just sat down or got up, the seats change one render before the table is rebuilt:
  // keep the felt as it was until they match)
  const current = !!t && builtFor.current === setupKey;
  if (current) sync();
  // (only a table built for this setup is the game in progress: remembering the old one under the new
  // setup's name is how a seat change once left the old table running, with no cards on the felt)
  if (t && current) live = { key: setupKey, table: t, phase, result, placed: placed.current, idSeq: idSeq.current };

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
    if (ph === 'bet') {
      // nothing has been dealt on this table: the screen can only be between hands
      if (phase !== 'betting' && phase !== 'shuffling' && phase !== 'endOfShoe') setPhase('betting');
      return;
    }
    if (paused) return;
    if (t.waitingForHuman) {
      if (phase !== 'yourTurn' && phase !== 'insurance') turnStarted.current = Date.now();
      setPhase(ph === 'insurance' ? 'insurance' : 'yourTurn');
      return;
    }
    setPhase(ph === 'deal' ? 'dealing' : ph === 'peek' ? 'peeking' : 'playing');
    // the dealer deals at an even pace; another player thinks as long as the decision deserves
    let wait = ph === 'peek' ? PEEK_MS : speed.card;
    // after a peek with no blackjack, José says so before anyone moves
    wait = Math.max(wait, peekClearUntil.current - Date.now());
    const owed = t.owesCard;
    if (owed === 'pay') {
      // a blackjack: the dealer stops at that hand, works out three to two and pays it (at any dealing
      // speed), after he's said there's no blackjack of his own when he's just checked
      wait = Math.max(0, peekClearUntil.current - Date.now()) + blackjackPayMs(Math.random());
    } else if (owed) {
      // a double: the chips go down beside the bet, then the one card, sideways. A split: the next hand's
      // second card comes one card later, like any other card the dealer puts down.
      wait = Math.round(speed.card * (owed === 'double' ? DOUBLE_BEAT : SPLIT_BEAT) * (0.9 + Math.random() * 0.2));
    } else if (ph === 'play') {
      const hand = t.seats[t.turn.seat]?.hands[t.turn.hand];
      if (hand) {
        const values = hand.cards.map(valueOf);
        const first = hand.cards.length === 2;
        const pace = (paces.current[t.turn.seat] ??= personality(Math.random));
        wait = thinkMs(speed.card, thinkFactor(values, valueOf(t.dealer[0]), first), pace, Math.random);
      }
    } else if (ph === 'dealer' && !t.holeRevealed) {
      // the last player is done: a beat, then the dealer turns his hole card (never a blink, at any speed)
      wait = Math.max(wait, holeTurnMs(speed.card, Math.random()));
    } else if (ph === 'dealer') {
      // his own hand: he totals what he has before he draws again or stops (never card after card in a blur)
      const dv = t.dealer.map(valueOf);
      wait = Math.max(wait, dealerStepMs(speed.card, dv.length, handTotal(dv).soft, Math.random()));
    }
    const id = setTimeout(() => {
      const peeked = t.phase === 'peek';
      if (t.step()) {
        if (peeked && t.phase !== 'settled') {
          peekClearUntil.current = Date.now() + PEEK_CLEAR_MS;
          setPeekClear(true);
          setTimeout(() => setPeekClear(false), PEEK_CLEAR_MS);
        }
        bump();
      }
    }, wait);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, tick, paused]);

  // results linger on the felt, then the sweep, then betting
  useEffect(() => {
    if (paused) return;
    if (phase === 'results') {
      // the round stays down long enough to read it: longer with more hands to pay or take, and a
      // dealer blackjack is shown (and said) before anything is collected
      const tb = tableRef.current;
      // each hand by what the dealer has to do with it: pay (more for a double), take, or knock for a push
      const hands = tb ? tb.seats.flatMap((s) => s.hands.map((h) => ({ net: h.net ?? 0, doubled: h.doubled, paid: !!h.paid && (h.net ?? 0) > 0 }))) : 1;
      const dealerBJ = !!tb && tb.dealer.length === 2 && isBlackjack(tb.dealer.map(valueOf));
      const insurance = !!tb && tb.seats.some((s) => s.insurance > 0);
      const id = setTimeout(() => setPhase('sweeping'), lingerMs(speed, hands, dealerBJ, Math.random(), insurance));
      return () => clearTimeout(id);
    }
    if (phase === 'sweeping') {
      const id = setTimeout(() => {
        placed.current = [];
        setResult(null);
        // the cut card is out: José stops for the end of the shoe before he shuffles
        const cut = !!tableRef.current?.needsShuffle;
        if (!cut) moveTraffic('hand');
        setPhase(cut ? 'endOfShoe' : 'betting');
      }, 450);
      return () => clearTimeout(id);
    }
    if (phase === 'shuffling') {
      // the shoe was shuffled and cut as this began (so the cut card can be shown going in)
      const id = setTimeout(() => {
        // the shuffle is when people come and go
        moveTraffic('shuffle');
        setPhase('betting');
        bump();
      }, SHUFFLE_MS);
      return () => clearTimeout(id);
    }
  }, [phase, speed.linger, bump, paused]);

  /** Can a round be dealt right now? (Not while the table is being rebuilt for new seats, or a saved shoe is loading.) */
  const canDeal = () => {
    const tb = tableRef.current;
    return !!tb && builtFor.current === setupKey && !restoring.current && (tb.phase === 'bet' || tb.phase === 'settled');
  };
  const deal = (bets: Record<number, number>, practice?: { values: [number, number]; up: number } | null) => {
    const t = tableRef.current;
    if (!t || !canDeal()) return;
    const bySeat: Record<number, number> = {};
    for (const [spot, amt] of Object.entries(bets)) {
      const si = seatOfSpot.get(Number(spot));
      if (si !== undefined) bySeat[si] = Math.min(amt, tableMax(s.tableMin));
    }
    placed.current = [];
    setTrafficNote(null);
    t.placeBet(bySeat);
    if (practice) t.stackPractice(practice.values, practice.up);
    setResult(null);
    setPhase('dealing');
    bump();
  };
  const act = (a: Action) => {
    const t = tableRef.current;
    if (!t || t.phase !== 'play' || !t.waitingForHuman) return;
    const spot = spotOfSeat(t.turn.seat);
    const snap = t.act(a);
    onDecision?.(snap, spot, Date.now() - turnStarted.current);
    turnStarted.current = Date.now();
    bump();
  };
  const insure = (take: boolean) => {
    const t = tableRef.current;
    if (!t || t.phase !== 'insurance') return;
    t.insure(take);
    bump();
  };
  /**
   * Ask the dealer to shuffle: the cards go back in, the shoe is shuffled and cut, and the count
   * starts over at 0 — exactly like a fresh shoe at a casino. Only between hands.
   */
  const shuffleUp = () => {
    if (phase !== 'betting' || !t) return;
    placed.current = [];
    t.reshuffle();
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
    cards: phase === 'betting' || phase === 'shuffling' || phase === 'endOfShoe' ? [] : placed.current,
    sweeping: phase === 'sweeping',
    result,
    activeSpot,
    insuranceSpot,
    activeHand: t?.phase === 'play' ? t.turn.hand : 0,
    legal: t && t.phase === 'play' && t.seats[t.turn.seat]?.human ? t.legalActions() : [],
    deal,
    canDeal,
    act,
    insure,
    hurry,
    shuffleUp,
    /** Done with the end of the shoe: shuffle. */
    finishShoe: () => {
      if (phase !== 'endOfShoe') return;
      tableRef.current?.reshuffle();
      setPhase('shuffling');
    },
    turnStarted,
    speed,
    /** The dealer just checked and doesn't have blackjack. */
    peekClear,
    /** Who just sat down or got up. */
    trafficNote,
    spotOfSeat,
    seatOfSpot,
    /** Hand values of the active human hand. */
    activeValues: t && t.phase === 'play' ? t.seats[t.turn.seat]?.hands[t.turn.hand]?.cards.map(valueOf) : undefined,
  };
}
