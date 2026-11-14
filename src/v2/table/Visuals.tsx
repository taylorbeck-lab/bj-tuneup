import type { CSSProperties } from 'react';
import { rankOf, suitOf, isRed, RANK_LABELS, SUIT_GLYPHS, cardName } from '../../engine/cards';
import { BRAND } from '../brand';
import type { Rules } from '../../engine/rules';
import { SHOE, CARD_H, CARD_W, FELT_H } from './layout';
import type { PlacedCard } from './useTableGame';

export { Mark } from '../icons';

function CardBack() {
  return (
    <svg viewBox="0 0 50 70" preserveAspectRatio="none" aria-hidden="true">
      <rect x="3" y="3" width="44" height="64" rx="3" fill="none" stroke="#fbf6ec" strokeWidth="1.2" />
      {Array.from({ length: 7 }, (_, i) => (
        <line key={i} x1="25" y1="40" x2={25 + Math.cos(Math.PI + (i * Math.PI) / 6) * 30} y2={40 + Math.sin(Math.PI + (i * Math.PI) / 6) * 30} stroke="#f2bf47" strokeWidth="1.4" strokeOpacity="0.7" />
      ))}
      <circle cx="25" cy="40" r="7" fill="#f2bf47" stroke="#1b1a17" strokeWidth="1.2" />
      <path d="M8 52h34M13 52l4-6h16l4 6" fill="none" stroke="#1b1a17" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayingCard({ p, sweep, dur, dim }: { p: PlacedCard; sweep?: boolean; dur: number; dim?: boolean }) {
  const style = {
    '--w': `${p.w}cqw`,
    zIndex: p.mine ? 3 : p.spot === 0 ? 2 : 1,
    '--tx': `${p.x}cqw`,
    '--ty': `${p.y}cqw`,
    '--sx': `${SHOE.x + 2}cqw`,
    '--sy': `${SHOE.y + 2}cqw`,
    '--dur': `${sweep ? 420 : Math.max(180, Math.min(360, dur * 0.45))}ms`,
  } as CSSProperties;
  if (p.faceDown)
    return (
      <div className={'pc back' + (sweep ? ' sweep' : '')} style={style} aria-label="face-down card">
        <CardBack />
      </div>
    );
  const c = p.card;
  return (
    <div className={'pc' + (isRed(c) ? ' red' : '') + (sweep ? ' sweep' : '') + (dim ? ' dim' : '')} style={style} role="img" aria-label={cardName(c)}>
      <span className="r">{RANK_LABELS[rankOf(c)]}</span>
      <span className="s">{SUIT_GLYPHS[suitOf(c)]}</span>
      <span className="big">{SUIT_GLYPHS[suitOf(c)]}</span>
    </div>
  );
}

const CHIP_COLORS: Record<number, string> = { 1: 'var(--chip-5)', 5: 'var(--chip-5)', 25: 'var(--chip-25)', 100: 'var(--chip-100)', 500: 'var(--chip-500)', 1000: 'var(--chip-1000)' };
export const DENOMS = [5, 25, 100, 500];

export function Chip({ value, lg, onClick, disabled, label }: { value: number; lg?: boolean; onClick?: () => void; disabled?: boolean; label?: string }) {
  const style = { '--c': CHIP_COLORS[value] ?? 'var(--chip-100)' } as CSSProperties;
  const text = label ?? (value >= 1000 ? value / 1000 + 'K' : String(value));
  if (onClick)
    return (
      <button type="button" className={'chip' + (lg ? ' lg' : '')} style={style} onClick={onClick} disabled={disabled} aria-label={`$${value} chip`}>
        {text}
      </button>
    );
  return (
    <span className={'chip' + (lg ? ' lg' : '')} style={style}>
      {text}
    </span>
  );
}

/** Break an amount into chips for display (largest first, max 4 shown). */
export function chipStack(amount: number): number[] {
  const out: number[] = [];
  let a = amount;
  for (const d of [1000, 500, 100, 25, 5, 1]) {
    while (a >= d && out.length < 12) {
      out.push(d);
      a -= d;
    }
  }
  return out;
}

export function BetStack({ amount, x, y }: { amount: number; x: number; y: number }) {
  if (amount <= 0) return null;
  const stack = chipStack(amount).slice(0, 5);
  return (
    <div style={{ position: 'absolute', left: `${x}cqw`, top: `${y}cqw`, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
      {stack.map((d, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, top: `${-i * 0.9}cqw`, transform: 'translate(-50%, -50%)' }}>
          <Chip value={d} label={i === stack.length - 1 ? '$' + amount : ''} />
        </div>
      ))}
    </div>
  );
}

/** Printed felt: arc text with the rules, the logo, the insurance line. */
export function FeltPrint({ rules }: { rules: Rules }) {
  const bj = rules.bjPayout === 1.5 ? 'BLACKJACK PAYS 3 TO 2' : 'BLACKJACK PAYS 6 TO 5';
  const s17 = rules.h17 ? 'DEALER HITS SOFT 17' : 'DEALER STANDS ON ALL 17s';
  return (
    <svg className="felt-print" viewBox={`0 0 100 ${FELT_H}`} aria-hidden="true">
      <defs>
        <path id="arc1" d="M 8 30 Q 50 58 92 30" />
        <path id="arc2" d="M 12 35.5 Q 50 62 88 35.5" />
      </defs>
      <text fontSize="3.6" fill="var(--felt-ink)" letterSpacing="0.5" fontFamily="var(--display)">
        <textPath href="#arc1" startOffset="50%" textAnchor="middle">
          {bj}
        </textPath>
      </text>
      <text fontSize="2.6" fill="var(--felt-ink)" letterSpacing="0.2" fontFamily="var(--serif)" fontStyle="italic">
        <textPath href="#arc2" startOffset="50%" textAnchor="middle">
          {s17.toLowerCase().replace('dealer', 'Dealer')} · insurance pays 2 to 1
        </textPath>
      </text>
      <g transform="translate(50 64) scale(0.8)" opacity="0.22">
        <circle cx="0" cy="-5" r="4.4" fill="none" stroke="var(--cream)" strokeWidth="0.8" />
        <path d="M-10 3h20M-7 3l3-4.6h8l3 4.6" fill="none" stroke="var(--cream)" strokeWidth="0.8" strokeLinejoin="round" />
        <text y="11" fontSize="5" textAnchor="middle" fill="var(--cream)" letterSpacing="1.2" fontFamily="var(--display)">
          {BRAND.name}
        </text>
      </g>
      {/* palms in the corners of the felt */}
      <g opacity="0.12" fill="var(--cream)">
        <path transform="translate(4 96) scale(0.32)" d="M31 62c1-10 2-22 1-33l3 .4c1 11 0 23-1 32.6zM33 28c-4-6-12-9-20-7 6-1 12 1 16 5-6-2-13-1-18 4 6-3 13-3 18-1-4 1-8 4-10 9 4-4 9-7 14-8zM33 28c3-7 11-11 19-10-6 0-12 3-15 7 6-3 13-3 18 1-6-2-12-1-17 2 5 0 9 3 11 8-4-3-9-6-14-6z" />
        <path transform="translate(76 96) scale(0.32)" d="M28 62V12a4 4 0 0 1 8 0v50zM28 40h-8a6 6 0 0 1-6-6V22a3 3 0 0 1 6 0v12h8zM36 32h7V18a3 3 0 0 1 6 0v14a6 6 0 0 1-6 6h-7z" />
      </g>
    </svg>
  );
}

/** Shoe (cards left) and discard tray (cards played) with realistic fill heights. */
export function ShoeAndTray({ remaining, discards, total }: { remaining: number; discards: number; total: number }) {
  const h = 16;
  const trayFill = (discards / total) * h;
  const shoeFill = (remaining / total) * h;
  return (
    <>
      <div style={{ position: 'absolute', left: '3cqw', top: '2.5cqw', width: '7cqw', height: `${h + 1}cqw`, border: '0.35cqw solid rgba(244,232,210,0.4)', borderTop: 0, borderRadius: '0 0 1cqw 1cqw' }} aria-label={`Discard tray: about ${(discards / 52).toFixed(1)} decks played`} role="img">
        <div style={{ position: 'absolute', left: '0.6cqw', right: '0.6cqw', bottom: '0.5cqw', height: `${trayFill}cqw`, background: 'repeating-linear-gradient(0deg, #e7dcc8 0 0.35cqw, #cfc3ad 0.35cqw 0.5cqw)', borderRadius: '0.3cqw' }} />
      </div>
      <div style={{ position: 'absolute', right: '3cqw', top: '2.5cqw', width: '11cqw', height: `${h + 1}cqw`, borderRadius: '1.2cqw', background: 'rgba(10,20,15,0.5)', border: '0.35cqw solid rgba(244,232,210,0.4)' }} aria-label="Shoe" role="img">
        <div style={{ position: 'absolute', left: '1.2cqw', right: '1.2cqw', bottom: '0.8cqw', height: `${shoeFill}cqw`, background: 'var(--coral)', borderRadius: '0.4cqw' }} />
      </div>
    </>
  );
}

export const CARD_SIZE = { w: CARD_W, h: CARD_H };
