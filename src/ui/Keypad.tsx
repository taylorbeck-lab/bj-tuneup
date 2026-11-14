import { useEffect, useState } from 'react';
import { buzzTap } from './haptics';

/** Big signed-integer keypad (one-hand use). Calls onSubmit with the number. */
export function Keypad({ onSubmit, allowDecimal, label = 'Enter' }: { onSubmit: (n: number) => void; allowDecimal?: boolean; label?: string }) {
  const [s, setS] = useState('');
  const press = (k: string) => {
    buzzTap();
    if (k === '±') setS((x) => (x.startsWith('-') ? x.slice(1) : '-' + x));
    else if (k === '⌫') setS((x) => x.slice(0, -1));
    else if (k === '.') setS((x) => (x.includes('.') ? x : x + '.'));
    else setS((x) => (x.replace('-', '').length >= 4 ? x : x + k));
  };
  const submit = () => {
    if (s === '' || s === '-') return;
    const n = Number(s);
    if (!isFinite(n)) return;
    onSubmit(n);
    setS('');
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === '-') press('±');
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === '.' && allowDecimal) press('.');
      else if (e.key === 'Enter') submit();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '±', '0', allowDecimal ? '.' : '⌫'];
  return (
    <div className="keypad">
      <div className="keypad-display mono" aria-live="polite">
        {s === '' ? <span className="muted">—</span> : s.replace('-', '−')}
      </div>
      <div className="keypad-grid">
        {keys.map((k) => (
          <button key={k} type="button" className="btn" onClick={() => press(k)}>
            {k}
          </button>
        ))}
        {allowDecimal && (
          <button type="button" className="btn" onClick={() => press('⌫')}>
            ⌫
          </button>
        )}
        <button type="button" className="btn primary" style={{ gridColumn: allowDecimal ? 'span 2' : 'span 3' }} onClick={submit}>
          {label}
        </button>
      </div>
    </div>
  );
}
