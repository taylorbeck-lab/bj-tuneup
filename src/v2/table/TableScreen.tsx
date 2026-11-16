import { useEffect, useRef, useState } from 'react';
import { useV2, tableMax } from '../settings';
import { useStrategy } from '../../store/strategy';
import { useBankroll, money } from '../bankroll';
import { useTableGame, type RoundResult } from './useTableGame';
import { FeltPrint, Rail, PlayingCard, ShoeAndTray, BetStack, Chip, DENOMS, LimitPlacard } from './Visuals';
import { StatsIcon, ChartIcon, GearIcon } from '../icons';
import { spotCenter, LOGO_BOX } from './layout';
import { JoseZone } from './Jose';
import { joseLine, cutWords, noteRound, currentStreak, type JoseMoment } from './joseLines';
import { isBlackjack, valueOf, handTotal } from '../../engine/cards';
import { ACTION_LABEL, type Action } from '../../engine/strategy/chart';
import { BRAND } from '../brand';
import type { DecisionSnapshot } from '../../engine/game';
import type { Table } from '../../engine/game';

export interface TableHooks {
  onDecision?: (snap: DecisionSnapshot, spot: number, t: Table, ms: number) => void;
  onRoundEnd?: (r: RoundResult, t: Table) => void;
  onBet?: (bets: Record<number, number>, t: Table) => void;
  onInsurance?: (take: boolean, t: Table) => void;
  /** Overlays drawn on the felt (count badge, etc). */
  feltExtra?: (t: Table | null) => React.ReactNode;
  /** What José says instead of his own line (feedback on your play, the count when asked). */
  jose?: React.ReactNode;
  /** What's in José's bubble can give way to the dealer's own moments (the peek): nothing, or a right-play note. A miss never does. */
  joseYields?: boolean;
  /** Called when the table opens for bets. */
  onBetting?: (t: Table) => void;
  /** Pause the dealer (e.g. while a count check is open). */
  paused?: boolean;
  /** The end of the shoe: what José shows before he shuffles (call `done` to shuffle; null = shuffle straight away). */
  endOfShoe?: (t: Table, done: () => void) => React.ReactNode;
  /** Tap on the discard tray (the count lives there). */
  onTray?: () => void;
  /** Optional practice hand for the next deal (practice my misses). */
  practiceHand?: () => { values: [number, number]; up: number } | null;
}


/** Chips you've put out but not dealt yet (kept while you look at the chart). */
let pendingBets: Record<number, number> = {};

/** Without an end-of-shoe screen, shuffle straight away. */
function AutoShuffle({ done }: { done: () => void }) {
  useEffect(() => {
    done();
  }, [done]);
  return null;
}

export function TableScreen({ hooks = {} }: { hooks?: TableHooks }) {
  const { s } = useV2();
  const st = useStrategy(s.rules);
  const { br, settle, reset } = useBankroll(s.startBankroll);
  const tRef = useRef<Table | null>(null);
  const g = useTableGame(
    s,
    st.chart,
    (snap, spot, ms) => tRef.current && hooks.onDecision?.(snap, spot, tRef.current, ms),
    (r, t) => {
      settle(r.net);
      hooks.onRoundEnd?.(r, t);
    },
    hooks.paused,
  );
  tRef.current = g.table;
  const t = g.table;
  const [bets, setBetsState] = useState<Record<number, number>>(() => pendingBets);
  const setBets = (b: Record<number, number>) => {
    pendingBets = b;
    setBetsState(b);
  };
  const [lastBets, setLastBets] = useState<Record<number, number>>({});
  /** Like a real table: after a win or a push your bet stays in the circle; after a loss it's gone. */
  const carry = useRef<Record<number, number> | null>(null);
  useEffect(() => {
    if (!g.result) return;
    const keep: Record<number, number> = {};
    for (const [sp, amt] of Object.entries(lastBets)) {
      const first = g.result.hands.find((h) => h.spot === Number(sp) && h.hand === 0);
      if (first && first.net >= 0 && amt > 0) keep[Number(sp)] = amt;
    }
    carry.current = keep;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.result]);
  const [askShuffle, setAskShuffle] = useState(false);
  // sitting on a decision too long: the table is waiting (your circle pulses)
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    setWaiting(false);
    if (g.phase !== 'yourTurn') return;
    const id = setTimeout(() => setWaiting(true), Math.max(0, 8000 - (Date.now() - g.turnStarted.current)));
    return () => clearTimeout(id);
  }, [g.phase, g.tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const [activeBetSpot, setActiveBetSpot] = useState<number>(s.seat);
  useEffect(() => setActiveBetSpot(g.layout.mine[0]), [g.layout]);
  useEffect(() => {
    if (g.phase !== 'betting') return;
    if (carry.current) {
      const keep = carry.current;
      carry.current = null;
      const total = Object.values(keep).reduce((a, b) => a + b, 0);
      if (total > 0 && total <= br.balance) setBets(keep);
    }
    if (g.table) hooks.onBetting?.(g.table);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.phase]);

  const betting = g.phase === 'betting';
  /** Between hands: nothing dealt on the felt (betting, or José shuffling). */
  const idle = betting || g.phase === 'shuffling' || g.phase === 'endOfShoe';
  const pending = Object.values(bets).reduce((a, b) => a + b, 0);
  const max = tableMax(s.tableMin);
  const canDeal = betting && g.layout.mine.some((sp) => (bets[sp] ?? 0) >= s.tableMin) && Object.values(bets).every((b) => b === 0 || b >= s.tableMin) && pending <= br.balance;
  const addChip = (d: number) => {
    const sp = activeBetSpot;
    const cur = bets[sp] ?? 0;
    if (cur + d > max || pending + d > br.balance) return;
    setBets({ ...bets, [sp]: cur + d });
  };
  const doDeal = (b: Record<number, number>) => {
    if (!t) return;
    setLastBets(b);
    hooks.onBet?.(b, t);
    g.deal(b, hooks.practiceHand?.());
    setBets({});
  };

  // Exactly what the rules allow (the coach grades against the same list). Play money never takes a
  // double or split away; a short bankroll just dips below zero and reloads between hands.
  const legal = g.legal;
  // Hit, Stand and Double always sit in the same three places (Double greys out after the first two
  // cards); Split joins on a pair, Surrender when the rules offer it.
  const shown = (['hit', 'stand', 'double', 'split', 'surrender'] as Action[]).filter((a) => a === 'hit' || a === 'stand' || a === 'double' || legal.includes(a));

  // keyboard: H S D P R
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const m: Record<string, Action> = { h: 'hit', s: 'stand', d: 'double', p: 'split', r: 'surrender' };
      const a = m[e.key.toLowerCase()];
      if (a && legal.includes(a)) g.act(a);
      if (e.key === 'Enter' && betting && canDeal) doDeal(bets);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const total = s.rules.decks * 52;
  const remaining = t ? t.shoe.remaining : total;
  // every card out of the shoe that isn't on the felt is in the tray (burn cards included)
  const discards = g.phase === 'shuffling' ? 0 : Math.max(0, total - remaining - g.cards.length);

  // where the cut card went in this shoe (shown as the shoe is cut)
  const cut = t ? t.shoe.cutFraction : s.rules.penetration;

  // what José says right now (never the count, never advice before you act: the feedback teaches)
  const myHands = t ? t.seats.filter((x) => x.human).flatMap((x) => x.hands) : [];
  const myHand = myHands[0];
  const round = t?.round ?? 0;
  const myBet = Math.max(0, ...Object.values(bets));
  const bigBet = myBet >= Math.max(5 * s.tableMin, max / 2);
  const dealerVals = t ? t.dealer.map(valueOf) : [];
  const joseMoment: JoseMoment = (() => {
    if (g.phase === 'shuffling') return { kind: 'shuffling', seed: t?.shoesPlayed ?? 0, cut, pen: s.rules.penetration };
    if (betting) return { kind: 'betting', first: !t || t.round === 0, seed: round, streak: currentStreak() };
    if (g.phase === 'dealing') return { kind: 'dealing', seed: round, bigBet };
    if (g.phase === 'insurance') return { kind: 'insurance', seed: round };
    if (g.phase === 'peeking') return { kind: 'peek', seed: round, ace: dealerVals[0] === 1 };
    if (g.peekClear) return { kind: 'peekClear', seed: round };
    if (g.phase === 'yourTurn') return { kind: 'yourTurn', waiting, seed: round };
    if ((g.phase === 'results' || g.phase === 'sweeping') && g.result) {
      const mine = myHand ? myHand.cards.map(valueOf) : [];
      return {
        kind: 'result',
        seed: round,
        net: g.result.net,
        blackjack: !!myHand && myHands.length === 1 && mine.length === 2 && isBlackjack(mine) && g.result.net > 0,
        dealerBlackjack: dealerVals.length === 2 && isBlackjack(dealerVals),
        dealerBust: dealerVals.length > 2 && handTotal(dealerVals).total > 21,
        bust: myHands.length > 0 && myHands.every((h) => handTotal(h.cards.map(valueOf)).total > 21),
        doubled: myHands.some((h) => h.doubled),
        surrendered: myHands.some((h) => h.surrendered),
        streak: noteRound(round, g.result.net),
      };
    }
    if (t?.phase === 'dealer') return { kind: 'dealer', seed: round };
    return { kind: 'quiet' };
  })();

  return (
    <div className="frame table-frame">
      <div className="felt-stage">
        <JoseZone line={joseLine(joseMoment)} says={(joseMoment.kind === 'peek' || joseMoment.kind === 'peekClear') && hooks.joseYields !== false ? undefined : (hooks.jose ?? undefined)} />
        <div className="felt-wrap">
          <div className="felt">
            <FeltPrint rules={s.rules} />
            <Rail />
            {/* the logo on the felt takes you back to the intro */}
            <a className="logo-link" href="#/home" aria-label={`${BRAND.long}: how it works`} style={{ left: `${LOGO_BOX.x}cqw`, top: `${LOGO_BOX.y}cqw`, width: `${LOGO_BOX.w}cqw`, height: `${LOGO_BOX.h}cqw` }} />
            <ShoeAndTray discards={discards} decks={s.rules.decks} onTray={hooks.onTray} onShoe={() => setAskShuffle(true)} />
            <LimitPlacard min={s.tableMin} max={max} />
            {/* betting circles */}
            {[1, 2, 3, 4, 5, 6].map((sp) => {
              const c = spotCenter(sp);
              const occupied = g.layout.spots.includes(sp);
              const mine = g.layout.mine.includes(sp);
              const seat = t && !idle ? t.seats[g.seatOfSpot.get(sp) ?? -1] : undefined;
              // Once the round is settled the dealer pays or takes, like a real table: a winning bet
              // stays with its payout stacked beside it, a losing bet is taken, a push just stays.
              const settled = !!seat && t?.phase === 'settled';
              const amount = idle
                ? mine
                  ? bets[sp] ?? 0
                  : 0
                : seat
                  ? settled
                    ? seat.hands.reduce((a, h) => a + ((h.net ?? 0) >= 0 ? h.bet : 0), 0)
                    : seat.hands.reduce((a, h) => a + h.bet, 0) || seat.baseBet
                  : 0;
              const payout = settled && seat ? seat.hands.reduce((a, h) => a + Math.max(0, h.net ?? 0), 0) : 0;
              return (
                <div key={sp}>
                  <button
                    type="button"
                    className={'spot' + (mine ? ' mine' : '') + (mine && betting && activeBetSpot === sp && g.layout.mine.length > 1 ? ' active' : '') + (t?.phase === 'play' && g.activeSpot === sp ? ' turn' : '') + (mine && waiting && g.activeSpot === sp ? ' waiting' : '')}
                    style={{ left: `${c.x}cqw`, top: `${c.y}cqw`, opacity: occupied ? 1 : 0.35 }}
                    aria-label={mine ? `Your spot ${sp}` : `Spot ${sp}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (mine && betting) setActiveBetSpot(sp);
                    }}
                  />
                  {occupied && <BetStack amount={amount} x={c.x} y={c.y} />}
                  {/* the payout goes just beside the bet, overlapping the circle's edge (left at the end seat, by the rail) */}
                  {occupied && payout > 0 && <BetStack amount={payout} x={c.x + (sp === 1 ? -5.2 : 5.2)} y={c.y + 2.6} />}
                  {mine && (
                    <span className="seat-label" style={{ left: `${c.x}cqw`, top: `${c.y + 6.5}cqw` }}>
                      you
                    </span>
                  )}
                </div>
              );
            })}
            {/* cards */}
            {g.cards.map((p) => (
              <PlayingCard key={p.id} p={p} sweep={g.sweeping} dur={g.speed.card} peek={g.phase === 'peeking' && p.spot === 0 && p.hand === 1} />
            ))}
            {/* whose turn it is: the dealer's pointer moves player to player, then to the dealer's own hand */}
            {t &&
              (t.phase === 'play' || t.phase === 'dealer') &&
              (() => {
                const spot = t.phase === 'dealer' ? 0 : g.activeSpot;
                const hand = t.phase === 'dealer' ? -1 : g.activeHand;
                const cards = g.cards.filter((p) => p.spot === spot && (spot === 0 || p.hand === hand));
                if (!cards.length) return null;
                const left = Math.min(...cards.map((p) => p.x));
                const right = Math.max(...cards.map((p) => p.x + p.w));
                const top = Math.min(...cards.map((p) => p.y));
                const yours = spot !== 0 && g.layout.mine.includes(spot ?? -1);
                return (
                  <span
                    key={`${spot}-${hand}`}
                    className={'hand-pointer' + (yours ? ' yours' : '') + (spot === 0 ? ' dealer' : '')}
                    style={spot === 0 ? { left: `${right + 2.4}cqw`, top: `${top + 4}cqw` } : { left: `${(left + right) / 2}cqw`, top: `${top - 3.4}cqw` }}
                    aria-hidden="true"
                  />
                );
              })()}
            {hooks.feltExtra?.(t)}
            {g.phase === 'shuffling' && (
              <div className="shuffle-show" role="status" aria-label={`Shuffling. Fresh shoe, count back to zero. Cut card ${cutWords(cut)}.`}>
                <div className="shuffle-art" aria-hidden="true">
                  <div className="riffle">
                    {Array.from({ length: 10 }, (_, i) => (
                      <span key={i} style={{ animationDelay: `${i * 70}ms` }} />
                    ))}
                  </div>
                  {/* then the cut: the whole shoe seen from the side, and the cut card going in where the dealing stops */}
                  <div className="cut-stack">
                    <div className="cut-dealt" style={{ width: `${cut * 100}%` }} />
                    <div className="cut-card" style={{ left: `${cut * 100}%` }} />
                  </div>
                </div>
                <div className="shuffle-title">Shuffling</div>
                <div className="shuffle-sub">
                  <span className="sub-a">fresh shoe · count back to zero</span>
                  <span className="sub-b">cut card {cutWords(cut)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dock">
        {betting && (
          <>
            {br.balance < s.tableMin ? (
              <button className="act primary" onClick={() => reset(s.startBankroll)}>
                Out of chips — reload {money(s.startBankroll)}
              </button>
            ) : (
              <>
                <div className="chips-row">
                  {DENOMS.map((d) => (
                    <Chip key={d} value={d} onClick={() => addChip(d)} disabled={pending + d > br.balance || (bets[activeBetSpot] ?? 0) + d > max} />
                  ))}
                </div>
                <div className="actions" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
                  <button className="act" onClick={() => setBets({})} disabled={!pending}>
                    Clear
                  </button>
                  <button className="act primary" onClick={() => doDeal(bets)} disabled={!canDeal}>
                    Deal {pending ? money(pending) : ''}
                  </button>
                </div>
                {g.layout.mine.length > 1 && <p className="muted hold-hint">Tap one of your circles to bet that spot.</p>}
              </>
            )}
          </>
        )}
        {g.phase === 'insurance' && (
          <div className="actions" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button className="act" onClick={() => (t && hooks.onInsurance?.(false, t), g.insure(false))}>
              No insurance
            </button>
            <button className="act" onClick={() => (t && hooks.onInsurance?.(true, t), g.insure(true))}>
              Insurance {t ? money(t.seats[g.seatOfSpot.get(g.insuranceSpot ?? 0) ?? 0]?.baseBet / 2) : ''}
            </button>
          </div>
        )}
        {g.phase === 'yourTurn' && (
          <div className={'actions' + (shown.length > 4 ? ' many' : '')} style={{ gridTemplateColumns: `repeat(${shown.length > 4 ? 3 : shown.length}, 1fr)` }}>
            {shown.map((a) => (
              <button key={a} className={'act ' + a} onClick={() => g.act(a)} disabled={!legal.includes(a)}>
                {ACTION_LABEL[a]}
              </button>
            ))}
          </div>
        )}
        {(g.phase === 'dealing' || g.phase === 'playing') && <p className="muted" style={{ margin: 0, textAlign: 'center', minHeight: 52, lineHeight: '52px' }}>…</p>}
        {/* the player's side: your bankroll and the menu */}
        <div className="player-row">
          <span className="bankroll" aria-label="Bankroll" title="Bankroll">
            {money(br.balance)}
          </span>
          <span className="spacer" />
          <a className="icon-btn" href="#/stats" aria-label="Your stats">
            <StatsIcon />
          </a>
          <a className="icon-btn" href="#/chart" aria-label="Strategy charts">
            <ChartIcon />
          </a>
          <a className="icon-btn" href="#/settings" aria-label="Settings">
            <GearIcon />
          </a>
        </div>
        {/* the dealer pays or takes on the felt; screen readers still hear the result */}
        <p className="sr-only" aria-live="polite">
          {(g.phase === 'results' || g.phase === 'sweeping') && g.result ? (g.result.net > 0 ? `You won ${money(g.result.net)}` : g.result.net < 0 ? `You lost ${money(-g.result.net)}` : 'Push') : ''}
        </p>
      </div>
      {g.phase === 'endOfShoe' && t && (hooks.endOfShoe?.(t, g.finishShoe) ?? <AutoShuffle done={g.finishShoe} />)}
      {askShuffle && (
        <div className="sheet-back" onClick={() => setAskShuffle(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Shuffle">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="display" style={{ fontSize: 28 }}>
                Shuffle?
              </span>
              <span className="serif" style={{ fontSize: 20 }}>
                fresh shoe, count back to 0
              </span>
            </div>
            {betting ? (
              <button
                className="act stand"
                onClick={() => {
                  setAskShuffle(false);
                  g.shuffleUp();
                }}
              >
                Shuffle
              </button>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                José shuffles between hands. Ask again once this hand is done.
              </p>
            )}
            <button className="act" onClick={() => setAskShuffle(false)}>
              Never mind
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
