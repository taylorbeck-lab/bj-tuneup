import { useState } from 'react';
import { TopBar, Field, Seg, Switch, Button, Box } from '../ui/components';
import { useSettings } from '../store/SettingsContext';
import { allPresets } from '../store/settings';
import { normalizeRules, rulesLabel, type Rules } from '../engine/rules';
import { uid } from '../store/db';

export function RulesScreen() {
  const { settings, update } = useSettings();
  const r = settings.rules;
  const presets = allPresets(settings);
  const [name, setName] = useState('');

  const set = (patch: Partial<Rules>) => update({ rules: normalizeRules({ ...r, ...patch }), activePresetId: 'custom' });

  return (
    <>
      <TopBar title="Rules" />
      <main className="stack">
        <Box title="Presets">
          <div className="stack" style={{ gap: 'var(--s2)' }}>
            {presets.map((p) => (
              <div key={p.id} className="row" style={{ justifyContent: 'space-between' }}>
                <Button
                  variant="ghost"
                  selected={settings.activePresetId === p.id}
                  style={{ flex: 1, justifyContent: 'flex-start' }}
                  onClick={() => update({ rules: normalizeRules(p.rules), activePresetId: p.id })}
                >
                  <span>{p.name}</span>
                  <span className="mono" style={{ fontSize: 'var(--t-xs)', opacity: 0.7 }}>
                    {rulesLabel(p.rules)}
                  </span>
                </Button>
                {!p.builtIn && (
                  <Button
                    variant="ghost"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => update((s) => ({ customPresets: s.customPresets.filter((x) => x.id !== p.id) }))}
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <div className="row">
              <input type="text" placeholder="Save current as…" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} aria-label="Preset name" />
              <Button
                disabled={!name.trim()}
                onClick={() => {
                  const id = 'p-' + uid();
                  update((s) => ({ customPresets: [...s.customPresets, { id, name: name.trim(), rules: s.rules }], activePresetId: id }));
                  setName('');
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </Box>

        <div>
          <Field name="Decks">
            <Seg options={[1, 2, 6, 8].map((d) => ({ value: d, label: String(d) }))} value={r.decks} onChange={(d) => set({ decks: d as Rules['decks'] })} label="Decks" />
          </Field>
          <Field name="Dealer soft 17">
            <Seg options={[{ value: 'H17', label: 'H17' }, { value: 'S17', label: 'S17' }]} value={r.h17 ? 'H17' : 'S17'} onChange={(v) => set({ h17: v === 'H17' })} label="Soft 17" />
          </Field>
          <Field name="Double on">
            <Seg options={[{ value: 'any', label: 'ANY' }, { value: '9-11', label: '9–11' }, { value: '10-11', label: '10–11' }]} value={r.doubleOn} onChange={(v) => set({ doubleOn: v })} label="Double on" />
          </Field>
          <Field name="Double after split">
            <Switch checked={r.das} onChange={(v) => set({ das: v })} label="Double after split" />
          </Field>
          <Field name="Split to" hint="Max hands from one pair">
            <Seg options={[1, 2, 3, 4].map((n) => ({ value: n, label: n === 1 ? 'NO' : String(n) }))} value={r.maxSplitHands} onChange={(v) => set({ maxSplitHands: v })} label="Split to" />
          </Field>
          <Field name="Resplit aces">
            <Switch checked={r.resplitAces} onChange={(v) => set({ resplitAces: v })} label="Resplit aces" />
          </Field>
          <Field name="Hit split aces">
            <Switch checked={r.hitSplitAces} onChange={(v) => set({ hitSplitAces: v })} label="Hit split aces" />
          </Field>
          <Field name="Late surrender">
            <Switch checked={r.lateSurrender} onChange={(v) => set({ lateSurrender: v })} label="Late surrender" />
          </Field>
          <Field name="Blackjack pays">
            <Seg options={[{ value: 1.5, label: '3:2' }, { value: 1.2, label: '6:5' }]} value={r.bjPayout} onChange={(v) => set({ bjPayout: v as 1.5 | 1.2 })} label="Blackjack pays" />
          </Field>
          <Field name="Penetration" hint={`${Math.round(r.penetration * 100)}% dealt · ${(r.decks * (1 - r.penetration)).toFixed(2)} decks cut off`}>
            <input type="range" min={40} max={90} step={5} value={Math.round(r.penetration * 100)} onChange={(e) => set({ penetration: Number(e.target.value) / 100 })} aria-label="Penetration" />
          </Field>
          <Field name="Seats" hint="Including you">
            <Seg options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))} value={r.seats} onChange={(v) => set({ seats: v })} label="Seats" />
          </Field>
          <Field name="Burn card" hint="Not counted">
            <Switch checked={r.burn > 0} onChange={(v) => set({ burn: v ? 1 : 0 })} label="Burn card" />
          </Field>
        </div>
        <p className="mono muted" style={{ fontSize: 'var(--t-sm)' }}>
          {rulesLabel(r)} · dealer peeks for blackjack (US rules)
        </p>
      </main>
    </>
  );
}
