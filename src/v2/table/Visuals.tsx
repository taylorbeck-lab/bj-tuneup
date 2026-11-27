import type { CSSProperties } from 'react';
import { rankOf, suitOf, isRed, RANK_LABELS, SUIT_GLYPHS, cardName } from '../../engine/cards';
import type { Rules } from '../../engine/rules';
import { SHOE, TRAY, CARD_H, CARD_W, FELT_H, FRONT, RAIL, LOGO_BOX } from './layout';
import type { PlacedCard } from './useTableGame';
import { money } from '../bankroll';

/** Card back: the El Primo sun and canyon, cream on desert orange. */
/** The back of the cards: the Casino El Primo wordmark, centred, inside a thin cream frame. Nothing else. */
function CardBack() {
  // the wordmark image is 480 x 155
  const w = 37;
  const h = (w * 155) / 480;
  return (
    <svg viewBox="0 0 50 70" preserveAspectRatio="none" aria-hidden="true">
      <rect x="3" y="3" width="44" height="64" rx="3" fill="none" stroke="#f6ead3" strokeWidth="1.1" />
      <image href={`${import.meta.env.BASE_URL}brand/el-primo-wordmark-cream.png`} x={25 - w / 2} y={35 - h / 2} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}

/**
 * A card on the felt. The dealer's hole card slides into the peeker while he checks for blackjack
 * (`peek`), and flips over when it's turned up.
 */
export function PlayingCard({ p, sweep, dur, dim, peek }: { p: PlacedCard; sweep?: boolean; dur: number; dim?: boolean; peek?: boolean }) {
  const style = {
    '--w': `${p.w}cqw`,
    zIndex: p.mine ? 3 : p.spot === 0 ? 2 : 1,
    '--tx': `${p.x}cqw`,
    '--ty': `${p.y}cqw`,
    // cards leave from the mouth of the shoe (the front, facing you)
    '--sx': `${SHOE.x + 2.5}cqw`,
    '--sy': `${SHOE.y + 12}cqw`,
    '--dur': `${sweep ? 420 : Math.max(180, Math.min(360, dur * 0.45))}ms`,
  } as CSSProperties;
  if (p.faceDown)
    return (
      <div className={'pc back' + (sweep ? ' sweep' : '') + (peek ? ' peek' : '')} style={style} aria-label={peek ? 'the dealer checks the face-down card for blackjack' : 'face-down card'} data-hand={p.spot === 0 ? 'dealer' : `${p.spot}:${p.hand}`}>
        <CardBack />
      </div>
    );
  const c = p.card;
  return (
    <div className={'pc' + (isRed(c) ? ' red' : '') + (sweep ? ' sweep' : '') + (dim ? ' dim' : '') + (p.spot === 0 && p.hand === 1 ? ' hole' : '')} style={style} role="img" aria-label={cardName(c)} data-hand={p.spot === 0 ? 'dealer' : `${p.spot}:${p.hand}`}>
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

/**
 * Printed felt: the rules in two straight lines below the dealer, the Casino El Primo logo nested in
 * the arc of betting circles, centred between the rules and the circles (LOGO_BOX in layout.ts).
 */
export function FeltPrint({ rules }: { rules: Rules }) {
  const bj = rules.bjPayout === 1.5 ? 'BLACKJACK PAYS 3 TO 2' : 'BLACKJACK PAYS 6 TO 5';
  const s17 = rules.h17 ? 'Dealer hits soft 17' : 'Dealer stands on all 17s';
  const base = import.meta.env.BASE_URL;
  return (
    <svg className="felt-print" viewBox={`0 0 100 ${FELT_H}`} aria-hidden="true">
      <text x="50" y="38.5" textAnchor="middle" fontSize="3.74" fill="var(--felt-ink)" letterSpacing="0.7" fontFamily="var(--font)" fontWeight="700">
        {bj}
      </text>
      <text x="50" y="43.7" textAnchor="middle" fontSize="3.13" fill="var(--felt-ink)" letterSpacing="0.15" fontFamily="var(--serif)" fontStyle="italic">
        {s17} · insurance pays 2 to 1
      </text>
      <image href={`${base}brand/el-primo-logo.png`} x={LOGO_BOX.x} y={LOGO_BOX.y} width={LOGO_BOX.w} height={LOGO_BOX.h} opacity="0.92" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}

/**
 * The padded rail along the front of the table: cognac leather, rolled, with a stitched seam. Drawn
 * as concentric strokes of the table's front ellipse so it keeps an even thickness all the way round
 * (the layout keeps every card inside it: `RAIL` in layout.ts).
 */
export function Rail() {
  const R = RAIL;
  // one stroke of the rail: `d` = distance in from the outer edge to the stroke's centre line
  const ring = (d: number, w: number, color: string, extra: Record<string, string | number> = {}) => (
    <ellipse cx={FRONT.cx} cy={FRONT.cy} rx={FRONT.rx - d} ry={FRONT.ry - d} fill="none" stroke={color} strokeWidth={w} {...extra} />
  );
  return (
    <svg className="felt-rail" viewBox={`0 0 100 ${FELT_H}`} aria-hidden="true">
      <defs>
        <filter id="rail-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.45" />
        </filter>
        <filter id="rail-softer" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>
      {/* the rail's shadow on the felt */}
      {ring(R + 0.5, 1.6, 'rgba(70, 35, 12, 0.32)', { filter: 'url(#rail-softer)' })}
      {/* the leather */}
      {ring(R / 2, R, '#7c3f1b')}
      {/* the underside rolls away from the light */}
      {ring(R * 0.18, R * 0.36, '#4f260e', { filter: 'url(#rail-soft)' })}
      {/* the crown catches it */}
      {ring(R * 0.64, R * 0.3, '#b9713a', { filter: 'url(#rail-soft)', opacity: 0.9 })}
      {ring(R * 0.68, 0.22, '#eab07a', { opacity: 0.45 })}
      {/* stitched seam */}
      {ring(R * 0.3, 0.16, '#e9c79c', { opacity: 0.6, strokeDasharray: '0.75 0.55' })}
      {/* where the felt tucks under, and the outer edge */}
      {ring(R - 0.14, 0.32, '#2b1407')}
      {ring(0.1, 0.22, '#1d0d04')}
    </svg>
  );
}

/** The posted limits sign at the dealer's edge of the table, where you look for the minimum. */
/** Casinos colour their limit signs by the minimum (a red table, a green table…), like the chips. */
const PLACARD_COLOUR: Record<number, string> = { 5: '#b3432b', 10: '#c4561f', 25: '#3c6a4b', 50: '#5e3b5b', 100: '#1d1c1a' };

/** The posted table-limits sign: a printed card in a tinted acrylic stand at the dealer's edge. */
export function LimitPlacard({ min, max }: { min: number; max: number }) {
  return (
    <div className="placard" role="note" aria-label={`Table minimum ${money(min)}, maximum ${money(max)}`} style={{ '--pl': PLACARD_COLOUR[min] ?? 'var(--orange)' } as CSSProperties}>
      <span className="pl-k pl-band">Table minimum</span>
      <span className="pl-v">{money(min)}</span>
      <span className="pl-k">Max {money(max)}</span>
    </div>
  );
}

/** Size of the tray and shoe drawings (cqw). */
const TRAY_SIZE = { w: 16.5, h: 25.3 };
const SHOE_SIZE = { w: 16, h: 22 };

/**
 * The discard tray and the shoe, in orange-tinted acrylic.
 *
 * The tray is the counter's ruler: played cards lie flat in it and the pile's height is exact (a
 * full shoe of discards fills it), with a line etched on the acrylic for each deck, so you read decks
 * played off it the way you would at a table. The shoe is smoked: you can't see how many cards are
 * left in it, just like a real one. Tap the tray for the count, the shoe to ask for a shuffle.
 */
export function ShoeAndTray({ discards, decks, onTray, onShoe }: { discards: number; decks: number; onTray?: () => void; onShoe?: () => void }) {
  // --- tray, drawn in a 150 x 230 box: front edge along the bottom, depth going up and to the right
  const FLOOR = 204; // where the pile sits (front bottom edge)
  const FULL = 166; // pile height for a whole shoe
  const X0 = 30; // pile front, left and right
  const X1 = 96;
  const D = { x: 26, y: -14 }; // the pile's depth on the page
  const h = Math.min(FULL, (discards / (decks * 52)) * FULL);
  const deckH = FULL / decks;
  const decksIn = discards / 52;
  const top = FLOOR - h;
  // numbers on the deck lines: every deck up to six decks, every other one in an eight-deck game
  const labelled = (k: number) => decks <= 6 || k % 2 === 0;
  return (
    <>
      <svg
        className="tray"
        viewBox="0 0 150 230"
        style={{ left: `${TRAY.x}cqw`, top: `${TRAY.y}cqw`, width: `${TRAY_SIZE.w}cqw`, height: `${TRAY_SIZE.h}cqw`, cursor: onTray ? 'pointer' : undefined }}
        role={onTray ? 'button' : 'img'}
        tabIndex={onTray ? 0 : undefined}
        onClick={onTray}
        onKeyDown={(e) => onTray && (e.key === 'Enter' || e.key === ' ') && onTray()}
        aria-label={`Discard tray: ${discards} cards, about ${(Math.round(decksIn * 2) / 2).toFixed(1)} decks played${onTray ? '. Tap for the count.' : ''}`}
      >
        <defs>
          <pattern id="trayEdges" width="100" height="2.4" patternUnits="userSpaceOnUse">
            <rect width="100" height="2.4" fill="#fbf7ee" />
            <rect y="1.7" width="100" height="0.7" fill="#b7a88c" />
          </pattern>
          <pattern id="trayEdgesSide" width="100" height="2.4" patternUnits="userSpaceOnUse">
            <rect width="100" height="2.4" fill="#e9dfca" />
            <rect y="1.7" width="100" height="0.7" fill="#9d8f76" />
          </pattern>
          <linearGradient id="trayWall" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e9772f" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="#c4561f" stopOpacity="0.34" />
            <stop offset="1" stopColor="#9a3f12" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="traySide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f08a45" stopOpacity="0.62" />
            <stop offset="1" stopColor="#b84c18" stopOpacity="0.42" />
          </linearGradient>
          <linearGradient id="trayGloss" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* where it sits on the felt */}
        <ellipse cx="78" cy="212" rx="62" ry="12" fill="rgba(60,30,10,0.22)" />
        {/* base plate */}
        <path d={`M20 ${FLOOR + 2} H106 L${106 + D.x + 4} ${FLOOR + 2 + D.y - 2} H${20 + D.x + 4} Z`} fill="#8a3710" />
        <path d={`M20 ${FLOOR + 2} H106 V${FLOOR + 10} H20 Z`} fill="#6f2b0b" />
        <path d={`M106 ${FLOOR + 2} L${106 + D.x + 4} ${FLOOR + D.y} V${FLOOR + D.y + 8} L106 ${FLOOR + 10} Z`} fill="#5c2308" />
        {/* back wall and the wall on the left: tinted acrylic you see the felt through */}
        <path d={`M${20 + D.x + 4} ${FLOOR + D.y} H${106 + D.x + 4} V${14} a4 4 0 0 0 -4 -4 H${24 + D.x + 4} a4 4 0 0 0 -4 4 Z`} fill="url(#trayWall)" stroke="#8a3710" strokeWidth="1.6" />
        <path d={`M20 ${FLOOR + 2} L${20 + D.x + 4} ${FLOOR + D.y} V12 L20 ${12 - D.y + 2} Z`} fill="url(#traySide)" stroke="#8a3710" strokeWidth="1.6" strokeLinejoin="round" />
        {/* the pile of played cards, lying flat: edges on the front and side, the top card's back on top */}
        {h > 0.4 && (
          <>
            <rect x={X0} y={top} width={X1 - X0} height={h} fill="url(#trayEdges)" />
            <path d={`M${X1} ${top} L${X1 + D.x} ${top + D.y} V${FLOOR + D.y} L${X1} ${FLOOR} Z`} fill="url(#trayEdgesSide)" />
            <path d={`M${X0} ${top} H${X1} L${X1 + D.x} ${top + D.y} H${X0 + D.x} Z`} fill="var(--orange)" />
            <path d={`M${X0 + 7} ${top - 2.2} H${X1 - 3} L${X1 + D.x - 7} ${top + D.y + 2.2} H${X0 + D.x + 3} Z`} fill="none" stroke="#f6ead3" strokeOpacity="0.75" strokeWidth="1.2" />
            <path d={`M${X0} ${top} H${X1} L${X1 + D.x} ${top + D.y} V${FLOOR + D.y} L${X1} ${FLOOR} H${X0} Z M${X1} ${top} V${FLOOR}`} fill="none" stroke="rgba(40,25,10,0.55)" strokeWidth="1" strokeLinejoin="round" />
          </>
        )}
        {/* a line etched for each deck, numbered: decks played */}
        {Array.from({ length: decks - 1 }, (_, i) => {
          const y = FLOOR - deckH * (i + 1);
          return (
            <g key={i}>
              <path d={`M20 ${y + 2} L${20 + D.x + 4} ${y + D.y}`} stroke="#fff3df" strokeOpacity="0.9" strokeWidth="1.6" />
              <path d={`M12 ${y + 2} H22`} stroke="#5c2308" strokeWidth="1.8" strokeLinecap="round" />
              {labelled(i + 1) && (
                <text x="7" y={y + 10} textAnchor="middle" fontFamily="var(--mono)" fontWeight="700" fontSize="22" fill="#5c2308">
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
        {/* the low lip along the front, and the light catching the acrylic */}
        <path d={`M20 ${FLOOR - 12} H106 V${FLOOR + 2} H20 Z`} fill="#e9772f" fillOpacity="0.38" stroke="#8a3710" strokeWidth="1.4" />
        <path d={`M106 ${FLOOR - 12} L${106 + D.x + 4} ${FLOOR + D.y - 14} V${FLOOR + D.y} L106 ${FLOOR + 2} Z`} fill="#b84c18" fillOpacity="0.4" stroke="#8a3710" strokeWidth="1.4" />
        <path d={`M${20 + D.x + 4} ${FLOOR + D.y} H${106 + D.x + 4} V${14} a4 4 0 0 0 -4 -4 H${24 + D.x + 4} a4 4 0 0 0 -4 4 Z`} fill="url(#trayGloss)" pointerEvents="none" />
        <path d={`M22 ${14 - D.y + 2} L${20 + D.x + 2} 14`} stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" />
        <path d={`M${26 + D.x + 4} 11.5 H${100 + D.x + 4}`} stroke="#fff" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <svg
        className="shoe"
        viewBox="0 0 160 220"
        style={{ left: `${SHOE.x}cqw`, top: `${SHOE.y}cqw`, width: `${SHOE_SIZE.w}cqw`, height: `${SHOE_SIZE.h}cqw`, cursor: onShoe ? 'pointer' : undefined }}
        role={onShoe ? 'button' : 'img'}
        tabIndex={onShoe ? 0 : undefined}
        onClick={onShoe}
        onKeyDown={(e) => onShoe && (e.key === 'Enter' || e.key === ' ') && onShoe()}
        aria-label={onShoe ? 'Shoe. Tap to ask José to shuffle.' : 'Shoe'}
      >
        <defs>
          <linearGradient id="shoeLid" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f08a45" stopOpacity="0.74" />
            <stop offset="0.5" stopColor="#c4561f" stopOpacity="0.7" />
            <stop offset="1" stopColor="#9a3f12" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="shoeFace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a2441a" />
            <stop offset="1" stopColor="#6f2b0b" />
          </linearGradient>
          <linearGradient id="shoeGloss" x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <pattern id="shoeCards" width="100" height="3.4" patternUnits="userSpaceOnUse">
            <rect width="100" height="3.4" fill="#fbf3e1" />
            <rect y="2.3" width="100" height="1.1" fill="#b39c7c" />
          </pattern>
          <clipPath id="shoeSlot">
            <path d="M46 196 V166 a34 34 0 0 1 68 0 V196 Z" />
          </clipPath>
        </defs>
        {/* where it sits on the felt */}
        <ellipse cx="84" cy="203" rx="76" ry="13" fill="rgba(60,30,10,0.24)" />
        {/* the body runs away from you: the cards stand on edge under a smoked orange lid */}
        <path d="M36 14 H124 L150 130 H10 Z" fill="#5c2308" />
        <path d="M44 44 H116 L140 126 H20 Z" fill="url(#shoeCards)" />
        {/* the weight that pushes the cards toward the mouth */}
        <path d="M42 30 H118 L121 44 H39 Z" fill="#2a1a0f" />
        <path d="M36 14 H124 L150 130 H10 Z" fill="url(#shoeLid)" stroke="#5c2308" strokeWidth="2" strokeLinejoin="round" />
        <path d="M36 14 H124 L150 130 H10 Z" fill="url(#shoeGloss)" />
        <path d="M39 18 L15 126" stroke="#fff" strokeOpacity="0.65" strokeWidth="2" strokeLinecap="round" />
        <path d="M42 16.5 H118" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.6" strokeLinecap="round" />
        {/* the faceplate, with the next card's back showing in the finger slot */}
        <path d="M10 130 H150 V192 a6 6 0 0 1 -6 6 H16 a6 6 0 0 1 -6 -6 Z" fill="url(#shoeFace)" stroke="#4a1c06" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 132 H148" stroke="#ffd9b0" strokeOpacity="0.6" strokeWidth="1.8" />
        <g clipPath="url(#shoeSlot)">
          <rect x="46" y="130" width="68" height="68" fill="var(--orange)" />
          <rect x="46" y="130" width="68" height="68" fill="#e9772f" fillOpacity="0.35" />
          {/* the bottom of the card back's cream frame */}
          <rect x="53" y="110" width="54" height="80" rx="5" fill="none" stroke="#f6ead3" strokeOpacity="0.85" strokeWidth="1.8" />
        </g>
        <path d="M46 196 V166 a34 34 0 0 1 68 0 V196" fill="none" stroke="#3a1505" strokeWidth="2.2" />
        {/* the card waiting at the mouth, and the base */}
        <path d="M30 196 H130 L134 205 H26 Z" fill="#fbf7ee" stroke="#4a1c06" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </>
  );
}

export const CARD_SIZE = { w: CARD_W, h: CARD_H };
