import type { Table } from '../../engine/game';
import { CardTile } from '../../ui/components';
import { handTotal, valueOf } from '../../engine/cards';

function totalLabel(cards: number[]): string {
  if (!cards.length) return '';
  const t = handTotal(cards.map(valueOf));
  return t.soft && t.total < 21 ? `${t.total - 10}/${t.total}` : String(t.total);
}

/** Visual table: dealer on top, seats below, the human seat outlined. */
export function TableView({ table, showTotals = true }: { table: Table; showTotals?: boolean }) {
  const t = table;
  const small = t.seats.length > 3;
  const size = small ? 'sm' : undefined;
  const settled = t.phase === 'settled';
  const dealerShown = t.holeRevealed ? t.dealer : t.dealer.slice(0, 1);
  return (
    <div className="stage" style={{ justifyContent: 'space-between', gap: 'var(--s5)', minHeight: 340 }}>
      <div className="seat">
        <div className="row" style={{ gap: 'var(--s1)', minHeight: small ? 56 : 88 }}>
          {t.dealer.map((c, i) => (i === 1 && !t.holeRevealed ? <CardTile key={i} faceDown size={size} /> : <CardTile key={i} card={c} size={size} className="deal-in" />))}
        </div>
        <span className="label">
          dealer {showTotals && t.holeRevealed ? totalLabel(dealerShown) : ''}
        </span>
      </div>
      <div className="seat-row" style={{ alignItems: 'flex-end' }}>
        {t.seats.map((s, si) => {
          const isTurn = t.phase === 'play' && t.turn.seat === si;
          return (
            <div
              key={si}
              className="seat"
              style={s.human ? { outline: 'var(--hair) solid var(--fg)', outlineOffset: 6, padding: 2 } : { opacity: 0.8 }}
              aria-label={s.human ? 'Your seat' : `Seat ${si + 1}`}
            >
              {s.hands.map((h, hi) => {
                const active = isTurn && t.turn.hand === hi;
                return (
                  <div key={hi} className="stack" style={{ gap: 2, alignItems: 'center' }}>
                    <div className="hand" style={active && s.hands.length > 1 ? { outline: '2px solid var(--fg)', outlineOffset: 2 } : undefined}>
                      {h.cards.map((c, i) => (
                        <CardTile key={i} card={c} size={size} className="deal-in" />
                      ))}
                    </div>
                    <span className="mono" style={{ fontSize: 'var(--t-xs)' }}>
                      {showTotals && h.cards.length ? totalLabel(h.cards) : ''}
                      {h.doubled ? ' ×2' : ''}
                      {h.surrendered ? ' surr' : ''}
                      {settled && s.human && h.net !== undefined ? (
                        <span className={h.net < 0 ? 'accent' : h.net > 0 ? 'pos' : 'muted'}> {h.net > 0 ? '+' + h.net : h.net === 0 ? 'push' : String(h.net).replace('-', '−')}</span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
              <span className="label">{s.human ? `you · ${s.baseBet}u` : `seat ${si + 1}`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
