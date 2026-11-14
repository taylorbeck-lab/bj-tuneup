import type { CSSProperties } from 'react';
import { rankOf, suitOf, isRed, RANK_LABELS, SUIT_GLYPHS, cardName } from '../../engine/cards';
import { BRAND } from '../brand';
import type { Rules } from '../../engine/rules';
import { SHOE, CARD_H, CARD_W, FELT_H } from './layout';
import type { PlacedCard } from './useTableGame';

/** The MESA mark: a sun over a flat-topped mesa. */
export function Mark({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="13" r="6" fill="none" stroke={color} strokeWidth="2" />
      <path d="M3 25h26M7 25l4-6h10l4 6" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CardBack() {
  return (
    <svg viewBox="0 0 50 70" preserveAspectRatio="none" aria-hidden="true">
      <rect x="3" y="3" width="44" height="64" rx="3" fill="none" stroke="#f0d9b8" strokeOpacity="0.55" strokeWidth="1" />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M3 ${14 + i * 6} L25 ${8 + i * 6} L47 ${14 + i * 6}`} fill="none" stroke="#f0d9b8" strokeOpacity="0.18" strokeWidth="1" />
      ))}
      <circle cx="25" cy="31" r="6" fill="none" stroke="#f0d9b8" strokeWidth="1.6" />
      <path d="M13 43h24M16 43l3-5h12l3 5" fill="none" stroke="#f0d9b8" strokeWidth="1.6" strokeLinejoin="round" />
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
      <text fontSize="3.3" fill="var(--felt-ink)" letterSpacing="0.6" fontFamily="var(--font)" fontWeight="600">
        <textPath href="#arc1" startOffset="50%" textAnchor="middle">
          {bj}
        </textPath>
      </text>
      <text fontSize="2.3" fill="var(--felt-ink)" letterSpacing="0.45" fontFamily="var(--font)">
        <textPath href="#arc2" startOffset="50%" textAnchor="middle">
          {s17} · INSURANCE PAYS 2 TO 1
        </textPath>
      </text>
      <g transform="translate(50 64) scale(0.8)" opacity="0.18">
        <circle cx="0" cy="-5" r="4.4" fill="none" stroke="var(--sand)" strokeWidth="0.8" />
        <path d="M-10 3h20M-7 3l3-4.6h8l3 4.6" fill="none" stroke="var(--sand)" strokeWidth="0.8" strokeLinejoin="round" />
        <text y="10.5" fontSize="4" textAnchor="middle" fill="var(--sand)" letterSpacing="1.6" fontFamily="var(--font)" fontWeight="700">
          {BRAND.name}
        </text>
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
      <div style={{ position: 'absolute', left: '3cqw', top: '2.5cqw', width: '7cqw', height: `${h + 1}cqw`, border: '0.3cqw solid rgba(233,220,198,0.28)', borderTop: 0, borderRadius: '0 0 1cqw 1cqw' }} aria-label={`Discard tray: about ${(discards / 52).toFixed(1)} decks played`} role="img">
        <div style={{ position: 'absolute', left: '0.6cqw', right: '0.6cqw', bottom: '0.5cqw', height: `${trayFill}cqw`, background: 'repeating-linear-gradient(0deg, #e7dcc8 0 0.35cqw, #cfc3ad 0.35cqw 0.5cqw)', borderRadius: '0.3cqw' }} />
      </div>
      <div style={{ position: 'absolute', right: '3cqw', top: '2.5cqw', width: '11cqw', height: `${h + 1}cqw`, borderRadius: '1.2cqw', background: 'rgba(16,24,20,0.55)', border: '0.3cqw solid rgba(233,220,198,0.28)' }} aria-label="Shoe" role="img">
        <div style={{ position: 'absolute', left: '1.2cqw', right: '1.2cqw', bottom: '0.8cqw', height: `${shoeFill}cqw`, background: 'var(--clay)', borderRadius: '0.4cqw', opacity: 0.85 }} />
      </div>
    </>
  );
}

export const CARD_SIZE = { w: CARD_W, h: CARD_H };
