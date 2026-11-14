import { useMemo } from 'react';
import { mulberry32 } from '../engine/rng';

/**
 * A realistic side view of a discard tray: cards stack from the bottom, edges slightly ragged, no
 * scale marks (unless `marks`). Height of the tray = the whole shoe.
 */
export function DiscardTray({ cards, totalCards, marks, seed = 1, height = 220 }: { cards: number; totalCards: number; marks?: boolean; seed?: number; height?: number }) {
  const lines = useMemo(() => {
    const rng = mulberry32(seed);
    const per = height / totalCards;
    const out: { y: number; x: number; w: number }[] = [];
    for (let i = 0; i < cards; i++) {
      out.push({ y: height - (i + 1) * per, x: 6 + rng() * 6, w: 0.78 + rng() * 0.08 });
    }
    return out;
  }, [cards, totalCards, seed, height]);
  const decks = totalCards / 52;
  return (
    <svg className="tray" viewBox={`0 0 120 ${height + 4}`} width={120} height={height + 4} role="img" aria-label="Discard tray">
      <rect x="1" y="1" width="118" height={height + 2} fill="none" stroke="currentColor" strokeWidth="1" />
      {lines.map((l, i) => (
        <line key={i} x1={l.x} x2={l.x + 104 * l.w} y1={l.y + 1} y2={l.y + 1} stroke="currentColor" strokeOpacity={0.55} strokeWidth={Math.max(0.6, (height / totalCards) * 0.7)} />
      ))}
      {marks &&
        Array.from({ length: decks * 2 - 1 }, (_, i) => {
          const y = height - ((i + 1) * height) / (decks * 2) + 1;
          return <line key={'m' + i} x1={112} x2={119} y1={y} y2={y} stroke="var(--accent)" strokeWidth={i % 2 ? 1.5 : 0.8} />;
        })}
    </svg>
  );
}
