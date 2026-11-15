import { useEffect, useRef, useState } from 'react';
import { useV2, tableMax } from '../settings';
import { useStrategy } from '../../store/strategy';
import { useBankroll, money } from '../bankroll';
import { useTableGame, type RoundResult } from './useTableGame';
import { FeltPrint, PlayingCard, ShoeAndTray, BetStack, Chip, DENOMS, LimitPlacard } from './Visuals';
import { Emblem } from '../icons';
import { spotCenter, cardPos, dealerCardPos, CARD_RATIO } from './layout';
import { handTotal, valueOf, isBlackjack } from '../../engine/cards';
import { ACTION_LABEL, type Action } from '../../engine/strategy/chart';
import { BRAND } from '../brand';
import type { DecisionSnapshot } from '../../engine/game';
import type { Table } from '../../engine/game';

export interface TableHooks {
  onDecision?: (snap: DecisionSnapshot, spot: number, t: Table) => void;
  onRoundEnd?: (r: RoundResult, t: Table) => void;
  onBet?: (bets: Record<number, number>, t: Table) => void;
  onInsurance?: (take: boolean, t: Table) => void;
  /** Overlays drawn on the felt (count badge, etc). */
  feltExtra?: (t: Table | null) => React.ReactNode;
  /** Coach strip under the felt. */
  coach?: React.ReactNode;
  /** Extra HUD buttons. */
  hudExtra?: React.ReactNode;
  /** Called when the table opens for bets. */
  onBetting?: (t: Table) => void;
  /** Pause the dealer (e.g. while a count check is open). */
  paused?: boolean;
  /** Optional practice hand for the next deal (practice my misses). */
  practiceHand?: () => { values: [number, number]; up: number } | null;
}

function totalText(values: number[]): string {
  if (isBlackjack(values)) return 'BJ';
  const t = handTotal(values);
  if (t.total > 21) return 'Bust';
  return t.soft && t.total < 21 ? `${t.total - 10}/${t.total}` : String(t.total);
}

export function TableScreen({ hooks = {} }: { hooks?: TableHooks }) {
  const { s } = useV2();
  const st = useStrategy(s.rules);
  const { br, settle, reset } = useBankroll(s.startBankroll);
  const tRef = useRef<Table | null>(null);
  const g = useTableGame(
    s,
    st.chart,
    (snap, spot) => tRef.current && hooks.onDecision?.(snap, spot, tRef.current),
    (r, t) => {
      settle(r.net);
      hooks.onRoundEnd?.(r, t);
    },
    hooks.paused,
  );
  tRef.current = g.table;
  const t = g.table;
  const [bets, setBets] = useState<Record<number, number>>({});
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
  /** Between hands: nothing dealt on the felt (betting, or the dealer shuffling up). */
  const idle = betting || g.phase === 'shuffling';
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

  return (
    <div className="frame table-frame">
      <header className="hud">
        <a className="brand" href="#/" aria-label={BRAND.long}>
          <Emblem height={24} />
          <span className="brand-text">{BRAND.name}</span>
        </a>
        <span className="spacer" />
        {hooks.hudExtra}
        <span className="pill mono mustard" aria-label="Bankroll" title="Bankroll">
          {money(br.balance)}
        </span>
        <a className="pill icon" href="#/stats" aria-label="Your stats">
          ★
        </a>
        <a className="pill icon" href="#/chart" aria-label="Strategy chart">
          ▦
        </a>
        <a className="pill icon" href="#/settings" aria-label="Settings">
          ⚙
        </a>
      </header>

      <div className="felt-stage">
        <div className="felt-wrap" onClick={g.hurry}>
          <div className="felt">
            <FeltPrint rules={s.rules} />
            <ShoeAndTray discards={discards} decks={s.rules.decks} />
            <LimitPlacard min={s.tableMin} max={max} />
            {/* betting circles */}
            {[1, 2, 3, 4, 5, 6].map((sp) => {
              const c = spotCenter(sp);
              const occupied = g.layout.spots.includes(sp);
              const mine = g.layout.mine.includes(sp);
              const seat = t && !idle ? t.seats[g.seatOfSpot.get(sp) ?? -1] : undefined;
              const amount = idle ? (mine ? bets[sp] ?? 0 : 0) : seat ? seat.hands.reduce((a, h) => a + h.bet, 0) || seat.baseBet : 0;
              return (
                <div key={sp}>
                  <button
                    type="button"
                    className={'spot' + (mine ? ' mine' : '') + (mine && betting && activeBetSpot === sp && g.layout.mine.length > 1 ? ' active' : '')}
                    style={{ left: `${c.x}cqw`, top: `${c.y}cqw`, opacity: occupied ? 1 : 0.35 }}
                    aria-label={mine ? `Your spot ${sp}` : `Spot ${sp}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (mine && betting) setActiveBetSpot(sp);
                    }}
                  />
                  {occupied && <BetStack amount={amount} x={c.x} y={c.y} />}
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
              <PlayingCard key={p.id} p={p} sweep={g.sweeping} dur={g.speed.card} />
            ))}
            {/* dealer total */}
            {t && t.holeRevealed && !idle && t.dealer.length > 0 && (
              <span className="total-tag" style={{ left: `${dealerCardPos(0).x + dealerCardPos(0).w / 2}cqw`, top: `${dealerCardPos(0).y + dealerCardPos(0).w * CARD_RATIO + 1}cqw` }}>
                {totalText(t.dealer.map(valueOf))}
              </span>
            )}
            {/* your hand totals and results */}
            {t &&
              !idle &&
              t.seats.map((seat, si) => {
                if (!seat.human) return null;
                const sp = g.spotOfSeat(si);
                return seat.hands.map((h, hi) => {
                  if (!h.cards.length) return null;
                  const pos = cardPos(sp, hi, 0, true);
                  const res = g.result?.hands.find((x) => x.spot === sp && x.hand === hi);
                  const active = g.activeSpot === sp && g.activeHand === hi && g.phase === 'yourTurn';
                  const label = res ? (res.net > 0 ? '+' + money(res.net) : res.net < 0 ? money(res.net) : 'Push') : totalText(h.cards.map(valueOf));
                  return (
                    <span
                      key={`${si}-${hi}`}
                      className={'total-tag' + (res ? (res.net > 0 ? ' win' : res.net < 0 ? ' lose' : '') : '')}
                      style={{ left: `${pos.x + (pos.w * (1 + 0.5 * (Math.min(4, h.cards.length) - 1))) / 2}cqw`, top: `${pos.y - 5}cqw`, outline: active ? '0.6cqw solid var(--mustard)' : undefined, zIndex: 4 }}
                    >
                      {label}
                    </span>
                  );
                });
              })}
            {hooks.feltExtra?.(t)}
            {g.phase === 'shuffling' && (
              <div style={{ position: 'absolute', left: '50%', top: '22cqw', transform: 'translateX(-50%)' }} className="total-tag">
                Shuffling up · count starts at 0
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dock">
        {/* the coach strip shares the dock with the play buttons (betting needs the room for chips) */}
        {!idle && hooks.coach && <div className="coach-slot">{hooks.coach}</div>}
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
                <div className="dock-foot">
                  <span className="muted">{g.layout.mine.length > 1 ? 'Tap one of your circles to bet that spot' : ''}</span>
                  <button type="button" className="link-btn" onClick={g.shuffleUp} aria-label="Shuffle up: new shoe, count back to 0">
                    ⟲ Shuffle up
                  </button>
                </div>
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
        {(g.phase === 'dealing' || g.phase === 'playing') && <p className="muted" style={{ margin: 0, textAlign: 'center', minHeight: 56, lineHeight: '56px' }}>…</p>}
        {(g.phase === 'results' || g.phase === 'sweeping') && g.result && (
          <button className="act quiet" onClick={g.hurry}>
            {g.result.net > 0 ? `You won ${money(g.result.net)}` : g.result.net < 0 ? `You lost ${money(-g.result.net)}` : 'Push'} · tap to continue
          </button>
        )}
      </div>
    </div>
  );
}
