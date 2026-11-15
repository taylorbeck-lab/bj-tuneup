import type { ReactNode } from 'react';
import { LAYER_LABEL, type Layer, type RoundState } from './round';

/**
 * The coach strip: a fading tick when you're right; when something's off, a light per layer that's
 * switched on (Play, Count, Deviate, Bet) and one short line. Tap it for the full card.
 */
export function RoundCoach({ round, tick, onOpen, detail }: { round: RoundState; tick?: { text: string; id: number; sub?: string }; onOpen?: () => void; detail?: ReactNode }) {
  if (detail) return <>{detail}</>;
  const layers = Object.keys(round.tiles) as Layer[];
  if (round.flagged) {
    if (layers.length <= 1)
      return (
        <button type="button" className="rc-line" onClick={onOpen} aria-label={'Coach: ' + (round.line ?? '') + ' Tap for why.'}>
          <span className="rc-x">✗</span>
          <span className="rc-text">{round.line}</span>
          <span className="rc-why">why ▴</span>
        </button>
      );
    return (
      <button type="button" className="rc-panel" onClick={onOpen} aria-label={'Coach: ' + (round.line ?? '') + ' Tap for why.'}>
        <span className="rc-lights" style={{ gridTemplateColumns: `repeat(${layers.length}, 1fr)` }}>
          {layers.map((l) => {
            const t = round.tiles[l]!;
            return (
              <span key={l} className={'rc-tile ' + t.light}>
                <small>{LAYER_LABEL[l]}</small>
                <b>{t.light === 'ok' ? '✓' : t.light === 'no' ? t.word ?? '✗' : '·'}</b>
              </span>
            );
          })}
        </span>
        <span className="rc-say">
          {round.line}
          <em> why ▴</em>
        </span>
      </button>
    );
  }
  if (tick)
    return (
      <button type="button" key={tick.id} className={'rc-tick' + (tick.sub ? ' preview' : '')} onClick={onOpen} aria-label={tick.text.replace('✓', 'Right:') + (tick.sub ? '. ' + tick.sub : '')}>
        {tick.text}
        {tick.sub && <span className="rc-sub">{tick.sub}</span>}
      </button>
    );
  return null;
}
