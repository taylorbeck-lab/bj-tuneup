import { useEffect } from 'react';
import type { Action } from '../engine/strategy/chart';
import { ACTION_LABEL } from '../engine/strategy/chart';

const KEYS: Record<string, Action> = { h: 'hit', s: 'stand', d: 'double', p: 'split', r: 'surrender' };

/** Big action buttons (keyboard: H S D P R). */
export function ActionBar({ legal, onPick, disabled }: { legal: Action[]; onPick: (a: Action) => void; disabled?: boolean }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const a = KEYS[e.key.toLowerCase()];
      if (a && legal.includes(a) && !disabled) onPick(a);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [legal, onPick, disabled]);
  const order: Action[] = ['hit', 'stand', 'double', 'split', 'surrender'];
  return (
    <div className="choice-grid" style={{ gridTemplateColumns: `repeat(${Math.min(3, legal.length)}, 1fr)` }}>
      {order
        .filter((a) => legal.includes(a))
        .map((a) => (
          <button key={a} type="button" className="btn big" disabled={disabled} onClick={() => onPick(a)}>
            {ACTION_LABEL[a]}
          </button>
        ))}
    </div>
  );
}
