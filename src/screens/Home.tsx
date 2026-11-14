import { useSettings } from '../store/SettingsContext';
import { rulesLabel } from '../engine/rules';
import { allPresets } from '../store/settings';

interface Entry {
  path: string;
  title: string;
  sub: string;
  ready: boolean;
}

export const MODES: Entry[] = [
  { path: '/strategy', title: 'Strategy chart', sub: 'Exact basic strategy for your rules, editable', ready: false },
  { path: '/drills', title: 'Drills', sub: 'Countdown, running count, discards, true count, flash cards, bets', ready: false },
  { path: '/sim', title: 'Table sim', sub: 'Full game, 1–6 seats, coach off or whisper', ready: false },
  { path: '/feel', title: 'Feel Lab', sub: 'Play on feel, scored against exact math', ready: false },
  { path: '/strike', title: 'Strike mode', sub: 'Stale shoe, last hand, short bankroll', ready: false },
  { path: '/sidebets', title: 'Side bet hunter', sub: 'Key cards, exact side-bet EV curve', ready: false },
  { path: '/review', title: 'Hand review', sub: 'Replay shoes with EV of every option', ready: false },
  { path: '/stats', title: 'Stats', sub: 'History, trends, spaced repetition', ready: false },
  { path: '/analyzer', title: 'EV analyzer', sub: 'Exact EV of every action for any shoe', ready: false },
  { path: '/indices', title: 'Indices', sub: 'Hi-Lo indices generated for your rules, editable', ready: false },
];

export function Home({ ready = {} }: { ready?: Record<string, boolean> }) {
  const { settings } = useSettings();
  const preset = allPresets(settings).find((p) => p.id === settings.activePresetId);
  return (
    <main className="stack" style={{ gap: 'var(--s5)' }}>
      <div className="stack" style={{ gap: 'var(--s2)', paddingTop: 'var(--s4)' }}>
        <span className="label">Blackjack advantage-play training</span>
        <h2 className="display">TUNE&#8209;UP</h2>
      </div>
      <a className="btn primary big block" href="#/tuneup" aria-disabled={!ready['/tuneup']} style={{ textDecoration: 'none' }}>
        Start 15-minute Tune-Up
      </a>
      <a href="#/rules" className="box" style={{ textDecoration: 'none', display: 'block' }}>
        <div className="box-head">
          <span className="label">Table rules</span>
          <span className="label">Edit →</span>
        </div>
        <div className="box-body">
          <div style={{ fontWeight: 600 }}>{preset?.name ?? 'Custom'}</div>
          <div className="mono muted" style={{ fontSize: 'var(--t-sm)' }}>
            {rulesLabel(settings.rules)} · pen {Math.round(settings.rules.penetration * 100)}% · {settings.rules.seats} seats
          </div>
        </div>
      </a>
      <nav className="menu" aria-label="Modes">
        {MODES.map((m, i) => (
          <a key={m.path} href={'#' + m.path}>
            <div>
              <div className="title">{m.title}</div>
              <div className="sub">{m.sub}</div>
            </div>
            <span className="num">{ready[m.path] ? String(i + 1).padStart(2, '0') : 'soon'}</span>
          </a>
        ))}
        <a href="#/settings">
          <div>
            <div className="title">Settings</div>
            <div className="sub">Count, targets, bankroll, theme</div>
          </div>
          <span className="num">→</span>
        </a>
        <a href="#/about">
          <div>
            <div className="title">About</div>
            <div className="sub">How scores are computed, legal</div>
          </div>
          <span className="num">→</span>
        </a>
      </nav>
    </main>
  );
}
