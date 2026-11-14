import { useEffect, useMemo, useRef, useState } from 'react';
import { useV2, tableMax } from '../settings';
import { useStrategy } from '../../store/strategy';
import { useBankroll, money } from '../bankroll';
import { useTableGame, type RoundResult } from './useTableGame';
import { FeltPrint, PlayingCard, ShoeAndTray, BetStack, Chip, DENOMS, Mark } from './Visuals';
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
  /** Coach strip under the felt. */
  coach?: React.ReactNode;
  /** Extra HUD buttons. */
  hudExtra?: React.ReactNode;
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
  );
  tRef.current = g.table;
  const t = g.table;
  const [bets, setBets] = useState<Record<number, number>>({});
  const [lastBets, setLastBets] = useState<Record<number, number>>({});
  const [activeBetSpot, setActiveBetSpot] = useState<number>(s.seat);
  useEffect(() => setActiveBetSpot(g.layout.mine[0]), [g.layout]);

  const betting = g.phase === 'betting';
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
    g.deal(b);
    setBets({});
  };
  const rebetAmount = Object.values(lastBets).reduce((a, b) => a + b, 0);

  // committed money this round, to check doubles/splits are covered
  const committed = useMemo(() => {
    if (!t || betting) return 0;
    let c = 0;
    t.seats.forEach((seat) => seat.human && seat.hands.forEach((h) => (c += h.bet)));
    return c;
  }, [t, g.tick, betting]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeBase = t && t.phase === 'play' ? t.seats[t.turn.seat].baseBet : 0;
  const legal = g.legal.filter((a) => (a === 'double' || a === 'split' ? br.balance >= committed + activeBase : true));

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
  const discards = betting || g.phase === 'shuffling' ? total - remaining - (t?.shoe.burned.length ?? 0) : Math.max(0, total - remaining - g.cards.length - (t?.shoe.burned.length ?? 0));

  return (
    <div className="frame">
      <header className="hud">
        <a className="brand" href="#/" aria-label={BRAND.long}>
          <Mark size={22} color="var(--gold)" />
          {BRAND.name}
        </a>
        <span className="spacer" />
        {hooks.hudExtra}
        <span className="pill mono" aria-label="Bankroll" title="Bankroll">
          {money(br.balance)}
        </span>
        <a className="pill icon" href="#/chart" aria-label="Strategy chart">
          ▦
        </a>
        <a className="pill icon" href="#/settings" aria-label="Settings">
          ⚙
        </a>
      </header>

      <div className="felt-wrap" onClick={g.hurry}>
        <div className="felt">
          <FeltPrint rules={s.rules} />
          <ShoeAndTray remaining={remaining} discards={discards} total={total} />
          {/* betting circles */}
          {[1, 2, 3, 4, 5, 6, 7].map((sp) => {
            const c = spotCenter(sp);
            const occupied = g.layout.spots.includes(sp);
            const mine = g.layout.mine.includes(sp);
            const seat = t && !betting ? t.seats[g.seatOfSpot.get(sp) ?? -1] : undefined;
            const amount = betting ? (mine ? bets[sp] ?? 0 : 0) : seat ? seat.hands.reduce((a, h) => a + h.bet, 0) || seat.baseBet : 0;
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
                  <span className="seat-label" style={{ left: `${c.x}cqw`, top: `${c.y + 6.5}cqw`, color: 'var(--gold)' }}>
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
          {t && t.holeRevealed && !betting && t.dealer.length > 0 && (
            <span className="total-tag" style={{ left: `${dealerCardPos(0).x + dealerCardPos(0).w / 2}cqw`, top: `${dealerCardPos(0).y + dealerCardPos(0).w * CARD_RATIO + 1}cqw` }}>
              {totalText(t.dealer.map(valueOf))}
            </span>
          )}
          {/* your hand totals and results */}
          {t &&
            !betting &&
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
                    style={{ left: `${pos.x + pos.w / 2}cqw`, top: `${pos.y + pos.w * CARD_RATIO + 0.6}cqw`, outline: active ? '0.4cqw solid var(--gold)' : undefined, zIndex: 4 }}
                  >
                    {label}
                  </span>
                );
              });
            })}
          {g.phase === 'shuffling' && (
            <div style={{ position: 'absolute', left: '50%', top: '22cqw', transform: 'translateX(-50%)' }} className="total-tag">
              Shuffling…
            </div>
          )}
        </div>
      </div>

      <div className="dock">
        {hooks.coach}
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
                    <Chip key={d} value={d} lg onClick={() => addChip(d)} disabled={pending + d > br.balance || (bets[activeBetSpot] ?? 0) + d > max} />
                  ))}
                </div>
                <div className="actions" style={{ gridTemplateColumns: '1fr 1fr 1.4fr' }}>
                  <button className="act" onClick={() => setBets({})} disabled={!pending}>
                    Clear
                  </button>
                  <button className="act" onClick={() => doDeal(lastBets)} disabled={!rebetAmount || rebetAmount > br.balance}>
                    Rebet {rebetAmount ? money(rebetAmount) : ''}
                  </button>
                  <button className="act primary" onClick={() => doDeal(bets)} disabled={!canDeal}>
                    Deal {pending ? money(pending) : ''}
                  </button>
                </div>
                <p className="muted mono" style={{ margin: 0, fontSize: 12, textAlign: 'center' }}>
                  Table {money(s.tableMin)}–{money(max)}
                  {g.layout.mine.length > 1 ? ' · tap a gold circle to bet that spot' : ''}
                </p>
              </>
            )}
          </>
        )}
        {g.phase === 'insurance' && (
          <div className="actions" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button className="act" onClick={() => g.insure(false)}>
              No insurance
            </button>
            <button className="act" onClick={() => g.insure(true)}>
              Insurance {t ? money(t.seats[g.seatOfSpot.get(g.insuranceSpot ?? 0) ?? 0]?.baseBet / 2) : ''}
            </button>
          </div>
        )}
        {g.phase === 'yourTurn' && (
          <div className="actions" style={{ gridTemplateColumns: `repeat(${Math.min(3, legal.length)}, 1fr)` }}>
            {(['hit', 'stand', 'double', 'split', 'surrender'] as Action[])
              .filter((a) => legal.includes(a))
              .map((a) => (
                <button key={a} className={'act' + (a === 'hit' || a === 'stand' ? ' primary' : '')} onClick={() => g.act(a)}>
                  {ACTION_LABEL[a]}
                </button>
              ))}
          </div>
        )}
        {(g.phase === 'dealing' || g.phase === 'playing') && <p className="muted" style={{ margin: 0, textAlign: 'center', minHeight: 56, lineHeight: '56px' }}>…</p>}
        {(g.phase === 'results' || g.phase === 'sweeping') && g.result && (
          <button className="act" onClick={g.hurry} style={{ background: 'none' }}>
            {g.result.net > 0 ? `You won ${money(g.result.net)}` : g.result.net < 0 ? `You lost ${money(-g.result.net)}` : 'Push'} · tap to continue
          </button>
        )}
      </div>
    </div>
  );
}
