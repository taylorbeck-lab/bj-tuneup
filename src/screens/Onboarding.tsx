import { Button } from '../ui/components';
import { useSettings } from '../store/SettingsContext';
import { BUILT_IN_PRESETS, normalizeRules, rulesLabel } from '../engine/rules';
import { LEGAL_LINE } from '../legal';

/** One short first-run screen: what this is, the legal line, pick your game. */
export function Onboarding() {
  const { settings, update } = useSettings();
  return (
    <main className="stack" style={{ gap: 'var(--s5)', paddingTop: 'var(--s6)' }}>
      <div className="stack" style={{ gap: 'var(--s2)' }}>
        <span className="label">Blackjack advantage-play training</span>
        <h1 className="display">TUNE&#8209;UP</h1>
      </div>
      <ul className="stack" style={{ gap: 'var(--s2)', paddingLeft: 'var(--s4)', margin: 0 }}>
        <li>Count, convert and deviate at game speed, with the misses coming back until they stick.</li>
        <li>Every decision scored with exact EV for the cards that are left.</li>
        <li>Feel Lab rates the plays you make beyond the chart, with real math.</li>
      </ul>
      <div className="stack" style={{ gap: 'var(--s2)' }}>
        <span className="label">Your usual game</span>
        {BUILT_IN_PRESETS.map((p) => (
          <Button
            key={p.id}
            variant="ghost"
            selected={settings.activePresetId === p.id}
            style={{ justifyContent: 'space-between' }}
            onClick={() => update({ rules: normalizeRules(p.rules), activePresetId: p.id })}
          >
            <span>{p.name}</span>
            <span className="mono" style={{ fontSize: 'var(--t-xs)', opacity: 0.7 }}>
              {rulesLabel(p.rules)}
            </span>
          </Button>
        ))}
        <span className="muted" style={{ fontSize: 'var(--t-xs)' }}>
          Fine-tune every rule, your ramp and targets later in Settings.
        </span>
      </div>
      <p className="legal" role="note">
        {LEGAL_LINE}
      </p>
      <Button variant="primary" big block onClick={() => update({ onboarded: true })}>
        Start
      </Button>
    </main>
  );
}
