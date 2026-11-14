import { useV2 } from '../settings';
import { BRAND } from '../brand';
import { Mark, Palm, Saguaro, Sun } from '../icons';
import { LEGAL_LINE } from '../../legal';

/** One-screen welcome: what this is, then straight to the table. */
export function Welcome() {
  const { set } = useV2();
  return (
    <div className="frame" style={{ justifyContent: 'center' }}>
      <div className="page" style={{ gap: 22, paddingTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, color: 'var(--ink)' }}>
          <Palm size={64} color="var(--good)" />
          <Sun size={44} color="var(--coral)" />
          <Saguaro size={58} color="var(--ink)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mark size={44} />
          <span className="display" style={{ fontSize: 64 }}>
            {BRAND.name}
          </span>
        </div>
        <p style={{ fontSize: 30, lineHeight: 1.05, margin: 0 }} className="display">
          Play the hand. <span className="serif" style={{ fontSize: 34 }}>Learn the edge.</span>
        </p>
        <p style={{ fontSize: 17, lineHeight: 1.4, margin: 0 }}>Sit down and play. After every decision you'll know if it was the right call, the odds behind it, and why.</p>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Learn every hand of basic strategy by playing it.</li>
          <li>Pick up card counting one easy step at a time.</li>
          <li>Real table, real pace, play money.</li>
        </ul>
        <button className="act stand" onClick={() => set({ onboarded: true })}>
          Take a seat
        </button>
        <p className="muted" style={{ fontSize: 11, lineHeight: 1.45 }}>
          {LEGAL_LINE}
        </p>
      </div>
    </div>
  );
}
