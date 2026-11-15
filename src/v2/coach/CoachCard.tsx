import { useEffect, useState } from 'react';
import { ACTION_LABEL } from '../../engine/strategy/chart';
import type { ActionOdds } from '../../workers/handlers';
import type { CoachVerdict } from './grade';

export interface CoachMsg {
  kind: 'decision' | 'insurance' | 'info' | 'count' | 'bet';
  ok: boolean | null;
  title: string;
  accent?: string;
  hand?: string;
  text: string;
  verdict?: CoachVerdict;
  odds?: ActionOdds[];
}

const pct = (x: number) => Math.round(x * 100) + '%';
const per100 = (x: number) => (x >= 0 ? `+$${Math.round(x * 100)}` : `−$${Math.round(-x * 100)}`);

/**
 * The coach's card: verdict, the odds of each play in plain words, and the why.
 * On the table it sits in a fixed two-line strip so the screen never scrolls; tap it to open the
 * whole card over the felt, tap again to fold it away.
 */
export function CoachCard({ msg, onClose, askHref, startOpen }: { msg: CoachMsg; onClose?: () => void; askHref?: string; startOpen?: boolean }) {
  const [open, setOpen] = useState(!!startOpen);
  useEffect(() => setOpen(!!startOpen), [msg, startOpen]);
  const v = msg.verdict;
  const odds = msg.odds ? [...msg.odds].sort((a, b) => b.ev - a.ev) : null;
  const best = odds?.[0];
  const chosen = v && odds?.find((o) => o.action === v.chosen);
  const correct = v && odds?.find((o) => o.action === v.correct);
  return (
    <div
      className={'coach' + (open ? ' open' : ' compact') + (msg.ok === true ? ' ok' : msg.ok === false ? ' no' : '')}
      role="status"
      aria-live="polite"
      aria-expanded={open}
      onClick={() => (startOpen && open && onClose ? onClose() : setOpen(!open))}
    >
      <div className="head">
        <span className="display">{msg.title}</span>
        {msg.accent && <span className="serif">{msg.accent}</span>}
        {msg.hand && <span className="label hand">{msg.hand}</span>}
        <span className="more" aria-hidden="true">
          {open ? '▾' : 'why ▴'}
        </span>
        {open && onClose && (
          <button
            type="button"
            className="x"
            aria-label="Dismiss coach"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ✕
          </button>
        )}
      </div>
      {odds && v && (
        <div className="odds">
          {odds
            .filter((o) => o.action !== 'surrender' || v.chosen === 'surrender' || v.correct === 'surrender')
            .slice(0, 4)
            .map((o) => (
              <span key={o.action} className={'odd' + (o === best ? ' best' : '')} title={`push ${pct(o.push)}`}>
                {ACTION_LABEL[o.action]} {o.action === 'surrender' ? 'keeps half' : `wins ${pct(o.win)}`}
              </span>
            ))}
        </div>
      )}
      <p>
        {msg.text}
        {askHref && (
          <>
            {' '}
            <a href={askHref} onClick={(e) => e.stopPropagation()} style={{ fontWeight: 700 }}>
              Ask the coach →
            </a>
          </>
        )}
      </p>
      {v && !v.right && chosen && correct && correct.ev > chosen.ev && (
        <p className="muted" style={{ fontSize: 13 }}>
          Over time, {ACTION_LABEL[v.chosen].toLowerCase()} here costs about <b>${Math.max(1, Math.round((correct.ev - chosen.ev) * 100))}</b> per $100 bet. ({ACTION_LABEL[v.correct]}: {per100(correct.ev)}, {ACTION_LABEL[v.chosen]}: {per100(chosen.ev)} per $100 on average.)
        </p>
      )}
    </div>
  );
}
