import { useRef, useState, type PointerEvent } from 'react';

export interface Card {
  id: number;
  ok: boolean;
  /** The play, e.g. "Double", "Stand", "Bet bigger". */
  title: string;
  /** The hand, e.g. "11 vs 6". */
  hand?: string;
  /** Second line: the reason on a miss, or a next-level hint on a right play. */
  line?: string;
  /** Green cards from an earlier hand fade back. */
  stale?: boolean;
}

/**
 * The one feedback card. Green: glance and keep playing (it stays until the next card). Red: it
 * stays put, even into the next hand, until you swipe it away. Tap either for the full why.
 */
export function FeedbackCard({ card, onOpen, onDismiss }: { card: Card; onOpen: () => void; onDismiss: () => void }) {
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState(false);
  const start = useRef<number | null>(null);
  const moved = useRef(false);
  const down = (e: PointerEvent) => {
    start.current = e.clientX;
    moved.current = false;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (start.current === null || card.ok) return;
    const d = e.clientX - start.current;
    if (Math.abs(d) > 6) moved.current = true;
    setDx(d);
  };
  const up = () => {
    if (start.current === null) return;
    start.current = null;
    if (!card.ok && Math.abs(dx) > 70) {
      setGone(true);
      setDx(dx > 0 ? 500 : -500);
      setTimeout(onDismiss, 180);
      return;
    }
    setDx(0);
    if (!moved.current) onOpen();
  };
  return (
    <div
      className={'fb ' + (card.ok ? 'ok' : 'no') + (card.stale ? ' stale' : '')}
      style={{ transform: dx ? `translateX(${dx}px)` : undefined, opacity: gone ? 0 : dx ? Math.max(0.3, 1 - Math.abs(dx) / 300) : undefined, transition: start.current === null ? 'transform 180ms ease, opacity 180ms ease' : 'none' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        start.current = null;
        setDx(0);
      }}
      role="status"
      aria-live="polite"
    >
      <div className="fb-top">
        <span className="fb-mark" aria-hidden="true">
          {card.ok ? '✓' : '✗'}
        </span>
        <span className="fb-title">{card.title}</span>
        {card.hand && <span className="fb-hand">{card.hand}</span>}
        {!card.ok && (
          <button
            type="button"
            className="fb-x"
            aria-label="Dismiss"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            swipe ✕
          </button>
        )}
      </div>
      {card.line && <div className="fb-line">{card.line}</div>}
    </div>
  );
}
