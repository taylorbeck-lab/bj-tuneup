import { useState } from 'react';
import type { Table } from '../../engine/game';
import { recordCount } from '../stats';

/** Signed number keypad. */
function Pad({ onSubmit, label }: { onSubmit: (n: number) => void; label: string }) {
  const [v, setV] = useState('');
  const press = (k: string) => {
    if (k === '±') setV((x) => (x.startsWith('-') ? x.slice(1) : '-' + x));
    else if (k === '⌫') setV((x) => x.slice(0, -1));
    else setV((x) => (x.replace('-', '').length >= 3 ? x : x + k));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="mono" style={{ fontSize: 40, fontWeight: 700, textAlign: 'center', minHeight: 48 }} aria-live="polite">
        {v === '' ? <span className="muted">?</span> : v.replace('-', '−')}
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '±', '0', '⌫'].map((k) => (
          <button key={k} type="button" onClick={() => press(k)} aria-label={k === '±' ? 'plus or minus' : k === '⌫' ? 'delete' : k}>
            {k}
          </button>
        ))}
      </div>
      <button
        className="act primary"
        disabled={v === '' || v === '-'}
        onClick={() => {
          onSubmit(Number(v));
          setV('');
        }}
      >
        {label}
      </button>
    </div>
  );
}

const signed = (n: number) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');

/**
 * Count check: running count first, then the true count with the discard tray reading, then what it
 * means. Grading: running count must be exact; true count within ±1 of running ÷ decks left.
 */
export function CountSheet({ table, onClose, quiz }: { table: Table; onClose: () => void; quiz?: boolean }) {
  const rc = table.rc;
  const unseen = table.unseenCount();
  const decksLeft = Math.max(0.5, Math.round((unseen / 52) * 2) / 2);
  const tcExact = rc / (unseen / 52);
  const [step, setStep] = useState<'rc' | 'tc' | 'done'>('rc');
  const [rcAns, setRcAns] = useState<number | null>(null);
  const [tcAns, setTcAns] = useState<number | null>(null);
  const rcRight = rcAns === rc;
  const tcRight = tcAns !== null && Math.abs(tcAns - tcExact) <= 1;
  const tcRaw = rc / decksLeft;
  const tcShown = Math.floor(tcRaw);
  const decksPlayed = Math.round(((table.rules.decks * 52 - unseen) / 52) * 2) / 2;

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Count check">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="display" style={{ fontSize: 30 }}>
            {quiz ? 'Dealer asks' : 'Count check'}
          </span>
          <span className="serif" style={{ fontSize: 22 }}>
            {step === 'rc' ? 'what’s the count?' : step === 'tc' ? 'and the true count?' : 'here’s the read'}
          </span>
          <button className="pill icon" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {step === 'rc' && (
          <>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Running count of every card you've seen since the shuffle. 2–6 are +1, 7–9 are 0, 10s and aces are −1. The burn card and the dealer's hidden card don't count.
            </p>
            <Pad
              label="Check"
              onSubmit={(n) => {
                setRcAns(n);
                setStep('tc');
              }}
            />
          </>
        )}

        {step !== 'rc' && rcAns !== null && (
          <div className={'coach ' + (rcRight ? 'ok' : 'no')}>
            <div className="head">
              <span className="display">{rcRight ? 'Spot on' : 'Off a bit'}</span>
              <span className="serif">running count {signed(rc)}</span>
            </div>
            {!rcRight && <p>You said {signed(rcAns)}. It happens: find your rhythm by pairing cards that cancel (a 10 and a 5 = 0) and counting the leftovers.</p>}
          </div>
        )}

        {step === 'tc' && (
          <>
            <p style={{ margin: 0, fontSize: 14 }}>
              The tray holds about <b>{decksPlayed} decks</b>, so about <b>{decksLeft} decks</b> are left in the shoe. True count = running count ÷ decks left, rounded down.
            </p>
            <Pad
              label="Check"
              onSubmit={(n) => {
                setTcAns(n);
                setStep('done');
                recordCount(rcAns === rc, Math.abs(n - tcExact) <= 1);
              }}
            />
          </>
        )}

        {step === 'done' && tcAns !== null && (
          <>
            <div className={'coach ' + (tcRight ? 'ok' : 'no')}>
              <div className="head">
                <span className="display">{tcRight ? 'Nailed it' : 'Close, not quite'}</span>
                <span className="serif">true count ≈ {signed(tcShown)}</span>
              </div>
              <p>
                {signed(rc)} ÷ {decksLeft} decks = {tcRaw.toFixed(1).replace('-', '−')} → {signed(tcShown)} (round down)
                {!tcRight ? `. You said ${signed(tcAns)}.` : '.'}
              </p>
            </div>
            <div className="coach">
              <div className="head">
                <span className="display">What it means</span>
              </div>
              <p>{meaning(tcShown)}</p>
            </div>
            <button className="act stand" onClick={onClose}>
              Back to the table
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function meaning(tc: number): string {
  if (tc >= 4) return 'Hot shoe. Lots of 10s and aces left: blackjacks, doubles and dealer busts all come more often. This is when counters bet big and start using count plays (like standing on 16 vs 10, taking insurance at +3).';
  if (tc >= 2) return 'The shoe favours you now. Each +1 of true count is worth about half a percent to the player: time to raise your bet.';
  if (tc >= 1) return 'Slightly in your favour, about break-even. Keep your bet small.';
  if (tc > -1) return 'Neutral shoe. The house has its usual small edge: minimum bet.';
  return 'Negative count: the small cards are still in the shoe and the dealer busts less. Bet the minimum (or take a break).';
}
