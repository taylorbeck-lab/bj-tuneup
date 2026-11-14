import { TopBar } from '../ui/components';
import { LEGAL_LINE } from '../legal';

export function AboutScreen() {
  return (
    <>
      <TopBar title="About" />
      <main className="stack">
        <h2 className="h2">Tune-Up</h2>
        <p>
          A practice and analysis tool for card counters: counting speed and accuracy, deviations, and an honest, math-backed measure of how good your
          feel is when you play beyond the chart.
        </p>
        <p className="muted">
          All data stays on this device (IndexedDB). No accounts, no backend, no analytics. Works offline once installed.
        </p>
        <p className="legal" role="note">
          {LEGAL_LINE}
        </p>
        <p className="mono muted" style={{ fontSize: 'var(--t-xs)' }}>
          v{__APP_VERSION__}
        </p>
      </main>
    </>
  );
}
