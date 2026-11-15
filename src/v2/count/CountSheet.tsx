import { useState } from 'react';
import type { Table } from '../../engine/game';
import { recordCount } from '../stats';
import { countWords, padPress, padValue, padText, EMPTY_PAD, type PadState } from './words';

/**
 * Count keypad that works the way you count in your head: tap Up or Down (either before or after
 * the number), then the number, or Even for zero. No plus/minus signs.
 */
function Pad({ onSubmit, label }: { onSubmit: (n: number) => void; label: string }) {
  const [p, setP] = useState<PadState>(EMPTY_PAD);
  const press = (k: string) => setP((x) => padPress(x, k));
  const value = padValue(p);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="pad-read display" aria-live="polite">
        {padText(p) === '?' ? <span className="muted">?</span> : padText(p)}
      </div>
      <div className="dir-row">
        <button type="button" className={'dir down' + (p.dir === 'down' ? ' on' : '')} onClick={() => press('down')} aria-pressed={p.dir === 'down'}>
          ▼ Down
        </button>
        <button type="button" className={'dir even' + (p.dir === 'even' ? ' on' : '')} onClick={() => press('even')} aria-pressed={p.dir === 'even'}>
          Even
        </button>
        <button type="button" className={'dir up' + (p.dir === 'up' ? ' on' : '')} onClick={() => press('up')} aria-pressed={p.dir === 'up'}>
          ▲ Up
        </button>
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button key={k} type="button" onClick={() => press(k)} aria-label={k === 'del' ? 'delete' : k}>
              {k === 'del' ? '⌫' : k}
            </button>
          ),
        )}
      </div>
      <button
        className="act primary"
        disabled={value === null}
        onClick={() => {
          if (value === null) return;
          onSubmit(value);
          setP(EMPTY_PAD);
        }}
      >
        {value === null ? label : `${label}: ${countWords(value)}`}
      </button>
    </div>
  );
}

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
            <p className="muted count-rule">
              <b>2–6 up one · 7–9 nothing · 10s &amp; aces down one.</b> Every card since the shuffle, except the burn card and the dealer's hidden card.
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
              <span className="serif">running count {countWords(rc)}</span>
            </div>
            {!rcRight && <p>You said {countWords(rcAns)}. It happens: find your rhythm by pairing cards that cancel (a 10 and a 5 = 0) and counting the leftovers.</p>}
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
                <span className="serif">true count {countWords(tcShown)}</span>
              </div>
              <p>
                {rc === 0
                  ? 'Running count even, so the true count is even too'
                  : `${countWords(rc)} ÷ ${decksLeft} decks left = ${tcRaw > 0 ? 'up' : 'down'} ${Math.abs(tcRaw).toFixed(1)} → ${countWords(tcShown)} (round down)`}
                {!tcRight ? `. You said ${countWords(tcAns)}.` : '.'}
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
