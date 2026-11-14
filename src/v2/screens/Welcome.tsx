import { useV2 } from '../settings';
import { BRAND } from '../brand';
import { Mark } from '../table/Visuals';
import { LEGAL_LINE } from '../../legal';

/** One-screen welcome: what this is, then straight to the table. */
export function Welcome() {
  const { set } = useV2();
  return (
    <div className="frame" style={{ justifyContent: 'center' }}>
      <div className="page" style={{ gap: 22, paddingTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mark size={40} color="var(--gold)" />
          <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '0.3em' }}>{BRAND.name}</span>
        </div>
        <p style={{ fontSize: 20, lineHeight: 1.35, margin: 0 }}>Sit down and play. After each hand you'll know if it was the right call, and why.</p>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Learn every hand of basic strategy by playing it.</li>
          <li>Pick up card counting one easy step at a time.</li>
          <li>Real table, real pace, play money.</li>
        </ul>
        <button className="act primary" onClick={() => set({ onboarded: true })}>
          Take a seat
        </button>
        <p className="muted" style={{ fontSize: 11, lineHeight: 1.45 }}>
          {LEGAL_LINE}
        </p>
      </div>
    </div>
  );
}
