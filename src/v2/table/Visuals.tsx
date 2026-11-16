import type { CSSProperties } from 'react';
import { rankOf, suitOf, isRed, RANK_LABELS, SUIT_GLYPHS, cardName } from '../../engine/cards';
import type { Rules } from '../../engine/rules';
import { SHOE, CARD_H, CARD_W, FELT_H } from './layout';
import type { PlacedCard } from './useTableGame';
import { money } from '../bankroll';

/** Card back: the El Primo sun and canyon, cream on desert orange. */
function CardBack() {
  const rays = Array.from({ length: 13 }, (_, i) => Math.PI + (i * Math.PI) / 12);
  return (
    <svg viewBox="0 0 50 70" preserveAspectRatio="none" aria-hidden="true">
      <rect x="3" y="3" width="44" height="64" rx="3" fill="none" stroke="#f6ead3" strokeWidth="1.1" />
      <rect x="5.5" y="5.5" width="39" height="59" rx="2" fill="none" stroke="#f6ead3" strokeOpacity="0.45" strokeWidth="0.6" />
      {rays.map((a, i) => (
        <line key={i} x1={25 + Math.cos(a) * 6} y1={41 + Math.sin(a) * 6} x2={25 + Math.cos(a) * (i % 2 ? 15 : 20)} y2={41 + Math.sin(a) * (i % 2 ? 15 : 20)} stroke="#f6ead3" strokeWidth="1.5" />
      ))}
      <path d="M12 47h26M15.5 47v-6.5h6l2 6.5M34.5 47v-6.5h-6l-2 6.5" fill="#f6ead3" stroke="#f6ead3" strokeWidth="1.2" strokeLinejoin="round" />
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
      <div className={'pc back' + (sweep ? ' sweep' : '')} style={style} aria-label="face-down card" data-hand={p.spot === 0 ? 'dealer' : `${p.spot}:${p.hand}`}>
        <CardBack />
      </div>
    );
  const c = p.card;
  return (
    <div className={'pc' + (isRed(c) ? ' red' : '') + (sweep ? ' sweep' : '') + (dim ? ' dim' : '')} style={style} role="img" aria-label={cardName(c)} data-hand={p.spot === 0 ? 'dealer' : `${p.spot}:${p.hand}`}>
      <span className="r">{RANK_LABELS[rankOf(c)]}</span>
      <span className="s">{SUIT_GLYPHS[suitOf(c)]}</span>
      <span className="big">{SUIT_GLYPHS[suitOf(c)]}</span>
    </div>
  );
}

/** Chip colours: the classic casino denominations (red, green, black, purple) in earthy desert tones. */
export const CHIP_STYLE: Record<number, { base: string; insert: string; ring: string; ink: string }> = {
  1: { base: '#e7dcc6', insert: '#7d6a52', ring: '#7d6a52', ink: '#3a3128' },
  5: { base: '#b3432b', insert: '#f2e6cc', ring: '#f2e6cc', ink: '#8e3220' },
  25: { base: '#3c6a4b', insert: '#e8c77c', ring: '#f2e6cc', ink: '#2c513a' },
  100: { base: '#1d1c1a', insert: '#f2e6cc', ring: '#c4561f', ink: '#1d1c1a' },
  500: { base: '#5e3b5b', insert: '#e8c77c', ring: '#f2e6cc', ink: '#4a2c48' },
  1000: { base: '#c58f2e', insert: '#1d1c1a', ring: '#1d1c1a', ink: '#6e4b10' },
};
export const DENOMS = [5, 25, 100, 500];
const chipStyle = (v: number) => CHIP_STYLE[v] ?? CHIP_STYLE[100];
const short = (v: number) => (v >= 1000 ? v / 1000 + 'K' : String(v));

/** Top-down chip face (viewBox 0 0 100 100): edge inserts, a dashed inner ring and a cream inlay. */
function ChipFace({ value, label }: { value: number; label?: string }) {
  const c = chipStyle(value);
  const circ = 2 * Math.PI * 41;
  return (
    <>
      <circle cx="50" cy="50" r="48" fill={c.base} />
      <circle cx="50" cy="50" r="41" fill="none" stroke={c.insert} strokeWidth="13" strokeDasharray={`${circ / 16} ${circ / 16}`} transform="rotate(-11 50 50)" />
      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1.4" />
      <circle cx="50" cy="50" r="32" fill="none" stroke={c.ring} strokeWidth="1.6" strokeDasharray="3 2.2" />
      <circle cx="50" cy="50" r="27" fill="#f4ead6" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
      <text x="50" y="51" textAnchor="middle" dominantBaseline="central" fontFamily="var(--display)" fontSize={label && label.length > 3 ? 21 : 27} fill={c.ink} letterSpacing="0.5">
        {label ?? short(value)}
      </text>
    </>
  );
}

export function Chip({ value, onClick, disabled }: { value: number; onClick?: () => void; disabled?: boolean }) {
  const face = (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <ChipFace value={value} />
    </svg>
  );
  if (onClick)
    return (
      <button type="button" className="chip lg" onClick={onClick} disabled={disabled} aria-label={`$${value} chip`}>
        {face}
      </button>
    );
  return <span className="chip">{face}</span>;
}

/** Break an amount into chips for display (largest first). */
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

const compact = (n: number) => (n >= 10000 ? '$' + Math.round(n / 1000) + 'K' : n >= 1000 && n % 100 ? '$' + (n / 1000).toFixed(1) + 'K' : '$' + n.toLocaleString('en-US'));

/**
 * A bet on the felt, seen from the player's chair: chips stacked largest at the bottom, the edge
 * inserts showing on each chip's side, and the total on the top chip.
 */
export function BetStack({ amount, x, y }: { amount: number; x: number; y: number }) {
  if (amount <= 0) return null;
  const stack = chipStack(amount).slice(0, 8);
  const RX = 46, RY = 25, T = 9.5, W = 8.8;
  const H = RY * 2 + T * stack.length + 6;
  const ex = (phi: number) => 50 + RX * Math.cos(phi);
  const ey = (phi: number) => RY * Math.sin(phi);
  const stripes = [22.5, 67.5, 112.5, 157.5].map((d) => [((d - 8) * Math.PI) / 180, ((d + 8) * Math.PI) / 180]);
  const top = stack[stack.length - 1];
  const yTop = H - RY - 3 - T * stack.length;
  const u = W / 100;
  return (
    <svg
      className="bet-stack"
      viewBox={`0 0 100 ${H}`}
      style={{ left: `${x - W / 2}cqw`, top: `${y - (H - RY - 3) * u}cqw`, width: `${W}cqw`, height: `${H * u}cqw` }}
      aria-label={`Bet ${money(amount)}`}
      role="img"
    >
      <defs>
        <linearGradient id="chipSide" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.38" />
          <stop offset="0.35" stopColor="#000" stopOpacity="0.05" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0.12" />
          <stop offset="1" stopColor="#000" stopOpacity="0.42" />
        </linearGradient>
      </defs>
      <ellipse cx="51.5" cy={H - RY - 1} rx={RX + 1.5} ry={RY + 1} fill="rgba(40,25,10,0.22)" />
      {stack.map((d, i) => {
        const c = chipStyle(d);
        const yb = H - RY - 3 - i * T;
        const yt = yb - T;
        return (
          <g key={i}>
            <path d={`M4 ${yt} L4 ${yb} A${RX} ${RY} 0 0 0 96 ${yb} L96 ${yt} A${RX} ${RY} 0 0 1 4 ${yt} Z`} fill={c.base} />
            {stripes.map(([a, b], k) => (
              <path key={k} d={`M${ex(a)} ${yb + ey(a)} L${ex(b)} ${yb + ey(b)} L${ex(b)} ${yt + ey(b)} L${ex(a)} ${yt + ey(a)} Z`} fill={c.insert} />
            ))}
            <path d={`M4 ${yt} L4 ${yb} A${RX} ${RY} 0 0 0 96 ${yb} L96 ${yt} A${RX} ${RY} 0 0 1 4 ${yt} Z`} fill="url(#chipSide)" stroke="rgba(0,0,0,0.45)" strokeWidth="0.8" />
          </g>
        );
      })}
      <g transform={`translate(0 ${yTop - RY}) translate(50 ${RY}) scale(${RX / 48} ${RY / 48}) translate(-50 -50)`}>
        <ChipFace value={top} label="" />
      </g>
      <text x="50" y={yTop + 1} textAnchor="middle" dominantBaseline="central" fontFamily="var(--display)" fontSize={compact(amount).length > 5 ? 17 : 21} fill={chipStyle(top).ink}>
        {compact(amount)}
      </text>
    </svg>
  );
}

/** Printed felt: the Casino El Primo logo in the middle and the rules arc below the dealer. */
export function FeltPrint({ rules }: { rules: Rules }) {
  const bj = rules.bjPayout === 1.5 ? 'BLACKJACK PAYS 3 TO 2' : 'BLACKJACK PAYS 6 TO 5';
  const s17 = rules.h17 ? 'Dealer hits soft 17' : 'Dealer stands on all 17s';
  const base = import.meta.env.BASE_URL;
  return (
    <svg className="felt-print" viewBox={`0 0 100 ${FELT_H}`} aria-hidden="true">
      <defs>
        <path id="arc1" d="M 16 28 Q 50 40.5 84 28" />
        <path id="arc2" d="M 19.5 31.9 Q 50 44.1 80.5 31.9" />
      </defs>
      <text fontSize="3.1" fill="var(--felt-ink)" letterSpacing="0.55" fontFamily="var(--font)" fontWeight="700">
        <textPath href="#arc1" startOffset="50%" textAnchor="middle">
          {bj}
        </textPath>
      </text>
      <text fontSize="2.5" fill="var(--felt-ink)" letterSpacing="0.15" fontFamily="var(--serif)" fontStyle="italic">
        <textPath href="#arc2" startOffset="50%" textAnchor="middle">
          {s17} · insurance pays 2 to 1
        </textPath>
      </text>
      <image href={`${base}brand/el-primo-logo.png`} x="31.5" y="41" width="37" height="31.5" opacity="0.92" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}

/** The posted limits sign at the dealer's edge of the table, where you look for the minimum. */
export function LimitPlacard({ min, max }: { min: number; max: number }) {
  return (
    <div className="placard" role="note" aria-label={`Table minimum ${money(min)}, maximum ${money(max)}`}>
      <span className="pl-k">Table minimum</span>
      <span className="pl-v">{money(min)}</span>
      <span className="pl-k">Max {money(max)}</span>
    </div>
  );
}

/**
 * The shoe (closed: you can't see how many cards are left, just like at a real table) and the
 * discard tray, a clear acrylic box where played cards stack on their side. The stack height is
 * exact: a full shoe of discards fills the tray, so you can read decks played off the tray the way
 * counters do.
 */
export function ShoeAndTray({ discards, decks, onTray, onShoe }: { discards: number; decks: number; onTray?: () => void; onShoe?: () => void }) {
  const TH = 23; // tray height (cqw)
  const TW = 10; // tray width (cqw)
  const vb = { w: 100, h: (TH / TW) * 100 };
  const floor = vb.h - 9;
  const inner = floor - 12; // room for a full shoe
  const stack = Math.min(inner, (discards / (decks * 52)) * inner);
  const deckH = inner / decks;
  const decksIn = discards / 52;
  return (
    <>
      <svg
        className="tray"
        viewBox={`0 0 ${vb.w} ${vb.h}`}
        style={{ left: '5cqw', top: '2cqw', width: `${TW}cqw`, height: `${TH}cqw`, cursor: onTray ? 'pointer' : undefined }}
        role={onTray ? 'button' : 'img'}
        tabIndex={onTray ? 0 : undefined}
        onClick={onTray}
        onKeyDown={(e) => onTray && (e.key === 'Enter' || e.key === ' ') && onTray()}
        aria-label={`Discard tray: ${discards} cards, about ${(Math.round(decksIn * 2) / 2).toFixed(1)} decks played${onTray ? '. Tap for the count.' : ''}`}
      >
        <defs>
          <pattern id="cardEdges" width="100" height="2.6" patternUnits="userSpaceOnUse">
            <rect width="100" height="2.6" fill="#fbf7ee" />
            <rect y="1.9" width="100" height="0.7" fill="#a99a7f" />
          </pattern>
          <linearGradient id="acrylic" x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
            <stop offset="0.18" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="0.8" stopColor="#fff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        {/* smoked acrylic back wall */}
        <rect x="6" y="2" width="88" height={floor - 2} rx="3" fill="rgba(28,22,16,0.72)" stroke="#0d0d0c" strokeWidth="1.4" />
        {/* the stack of played cards, edge on, with the top card's orange back showing */}
        {stack > 0.3 && (
          <>
            <rect x="12" y={floor - stack} width="76" height={stack} fill="url(#cardEdges)" />
            <rect x="12" y={floor - stack} width="76" height={stack} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="0.8" />
            <rect x="11" y={floor - stack - 2.4} width="78" height="2.8" rx="0.8" fill="var(--orange)" stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
          </>
        )}
        {/* one faint tick per deck on the side, like the etched lines on a real tray */}
        {Array.from({ length: decks - 1 }, (_, i) => (
          <line key={i} x1="89" x2="94" y1={floor - deckH * (i + 1)} y2={floor - deckH * (i + 1)} stroke="rgba(246,234,211,0.55)" strokeWidth="1.1" />
        ))}
        {/* clear front panel and black base */}
        <rect x="6" y="2" width="88" height={floor - 2} rx="3" fill="url(#acrylic)" />
        <rect x="2" y={floor} width="96" height="8" rx="2.5" fill="#121211" />
      </svg>
      <svg
        className="shoe"
        viewBox="0 0 100 150"
        style={{ right: '5cqw', top: '2cqw', width: '11cqw', height: '16.5cqw', cursor: onShoe ? 'pointer' : undefined }}
        role={onShoe ? 'button' : 'img'}
        tabIndex={onShoe ? 0 : undefined}
        onClick={onShoe}
        onKeyDown={(e) => onShoe && (e.key === 'Enter' || e.key === ' ') && onShoe()}
        aria-label={onShoe ? 'Shoe. Tap to ask the dealer to shuffle up.' : 'Shoe'}
      >
        <path d="M18 8 H92 a6 6 0 0 1 6 6 V140 a6 6 0 0 1 -6 6 H8 a6 6 0 0 1 -6 -6 V60 Z" fill="#1b1a18" stroke="#000" strokeWidth="2" />
        <path d="M22 16 H88 V96 H12 V60 Z" fill="#0e0e0d" />
        <rect x="14" y="62" width="70" height="30" rx="2" fill="var(--orange)" stroke="#000" strokeWidth="1.2" />
        <rect x="18" y="66" width="62" height="22" rx="1.5" fill="none" stroke="#f6ead3" strokeOpacity="0.6" strokeWidth="1" />
        <path d="M2 100 H98" stroke="#2d2b28" strokeWidth="2" />
        <ellipse cx="50" cy="122" rx="24" ry="9" fill="#0e0e0d" />
      </svg>
    </>
  );
}

export const CARD_SIZE = { w: CARD_W, h: CARD_H };
