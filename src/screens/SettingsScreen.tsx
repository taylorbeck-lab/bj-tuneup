import { TopBar, Field, Seg, Switch, Button } from '../ui/components';
import { useSettings } from '../store/SettingsContext';
import { clearAll } from '../store/db';
import { cardLabel, parseCard } from '../engine/cards';
import { useState } from 'react';

export function SettingsScreen() {
  const { settings, update } = useSettings();
  const c = settings.count;
  const t = settings.targets;
  const b = settings.bet;
  const [kc, setKc] = useState('');

  return (
    <>
      <TopBar title="Settings" />
      <main className="stack">
        <div>
          <div className="label" style={{ padding: 'var(--s2) 0' }}>Display</div>
          <Field name="Theme">
            <Seg options={[{ value: 'dark', label: 'DARK' }, { value: 'light', label: 'LIGHT' }]} value={settings.theme} onChange={(v) => update({ theme: v })} label="Theme" />
          </Field>
          <Field name="Four-colour deck" hint="♠ ♥ ♦ ♣ each its own tone">
            <Switch checked={settings.fourColor} onChange={(v) => update({ fourColor: v })} label="Four-colour deck" />
          </Field>
          <Field name="Haptics on error">
            <Switch checked={settings.haptics} onChange={(v) => update({ haptics: v })} label="Haptics" />
          </Field>
        </div>

        <div>
          <div className="label" style={{ padding: 'var(--s2) 0' }}>Counting</div>
          <Field name="Deck estimation" hint="Granularity used for true count">
            <Seg
              options={[{ value: 1, label: '1' }, { value: 0.5, label: '½' }, { value: 0.25, label: '¼' }, { value: 0, label: 'EXACT' }]}
              value={c.deckGranularity}
              onChange={(v) => update({ count: { ...c, deckGranularity: v } })}
              label="Deck granularity"
            />
          </Field>
          <Field name="True count rounding">
            <Seg
              options={[{ value: 'floor', label: 'FLOOR' }, { value: 'trunc', label: 'TRUNC' }, { value: 'round', label: 'ROUND' }]}
              value={c.rounding}
              onChange={(v) => update({ count: { ...c, rounding: v } })}
              label="Rounding"
            />
          </Field>
          <Field name="Ace side count">
            <Switch checked={c.aceSideCount} onChange={(v) => update({ count: { ...c, aceSideCount: v } })} label="Ace side count" />
          </Field>
          <Field name="Key cards" hint={c.keyCards.length ? c.keyCards.map(cardLabel).join(' ') : 'e.g. KS, QH'}>
            <div className="row">
              <input type="text" value={kc} onChange={(e) => setKc(e.target.value)} placeholder="KS" style={{ width: 70 }} aria-label="Key card" />
              <Button
                onClick={() => {
                  const id = parseCard(kc);
                  if (id >= 0 && !c.keyCards.includes(id)) update({ count: { ...c, keyCards: [...c.keyCards, id] } });
                  setKc('');
                }}
              >
                Add
              </Button>
              {c.keyCards.length > 0 && (
                <Button variant="ghost" onClick={() => update({ count: { ...c, keyCards: [] } })}>
                  Clear
                </Button>
              )}
            </div>
          </Field>
        </div>

        <div>
          <div className="label" style={{ padding: 'var(--s2) 0' }}>Bankroll & ramp</div>
          <Field name="Bankroll">
            <input type="number" value={b.bankroll} min={0} onChange={(e) => update({ bet: { ...b, bankroll: Number(e.target.value) } })} style={{ width: 120 }} aria-label="Bankroll" />
          </Field>
          <Field name="Unit">
            <input type="number" value={b.unit} min={1} onChange={(e) => update({ bet: { ...b, unit: Number(e.target.value) } })} style={{ width: 120 }} aria-label="Unit" />
          </Field>
          <Field name="Ramp (units)" hint="TC ≤1, 2, 3, 4, 5, 6+">
            <input
              type="text"
              value={b.ramp.join(' ')}
              onChange={(e) => {
                const ramp = e.target.value.split(/[\s,]+/).map(Number).filter((x) => isFinite(x) && x > 0);
                if (ramp.length === 6) update({ bet: { ...b, ramp } });
              }}
              style={{ width: 160 }}
              aria-label="Bet ramp"
            />
          </Field>
        </div>

        <div>
          <div className="label" style={{ padding: 'var(--s2) 0' }}>Your targets (READY verdict)</div>
          <Field name="Deck countdown" hint="Seconds per deck">
            <input type="number" value={t.countdownSecPerDeck} onChange={(e) => update({ targets: { ...t, countdownSecPerDeck: Number(e.target.value) } })} style={{ width: 90 }} aria-label="Countdown target" />
          </Field>
          <Field name="Accuracy" hint="% correct in drills">
            <input type="number" value={t.accuracyPct} onChange={(e) => update({ targets: { ...t, accuracyPct: Number(e.target.value) } })} style={{ width: 90 }} aria-label="Accuracy target" />
          </Field>
          <Field name="EV lost" hint="Units per 100 hands, max">
            <input type="number" step={0.5} value={t.evLostPer100} onChange={(e) => update({ targets: { ...t, evLostPer100: Number(e.target.value) } })} style={{ width: 90 }} aria-label="EV lost target" />
          </Field>
        </div>

        <Button
          variant="danger"
          onClick={async () => {
            if (confirm('Delete all local data (history, settings, charts)?')) {
              await clearAll();
              location.reload();
            }
          }}
        >
          Delete all local data
        </Button>
      </main>
    </>
  );
}
