import { useMemo, useState } from 'react';
import { TopBar, Seg, Button, Box } from '../ui/components';
import { CurveChart } from '../ui/CurveChart';
import { useSettings } from '../store/SettingsContext';
import { useStrategy } from '../store/strategy';
import { useIndexPlays, loadGeneratedIndices, type IndexSource } from '../store/indices';
import { REFERENCE_INDICES, playLabel, type IndexPlay } from '../engine/indices';
import { ACTION_LABEL } from '../engine/strategy/chart';
import { rulesLabel } from '../engine/rules';

const actName = (a: IndexPlay['atOrAbove'] | IndexPlay['below']) => (a === 'insure' ? 'Insure' : a === 'noinsure' ? 'No insurance' : ACTION_LABEL[a]);
const sgn = (n: number) => (n > 0 ? '+' + n : String(n).replace('-', '−'));

export function IndicesScreen() {
  const { settings } = useSettings();
  const rules = settings.rules;
  const st = useStrategy(rules);
  const ix = useIndexPlays(rules);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<IndexPlay[] | null>(null);

  const rows = useMemo(() => {
    const ids = new Set<string>();
    const out: { id: string; gen?: IndexPlay; ref?: IndexPlay; cur?: IndexPlay }[] = [];
    const add = (p: IndexPlay) => ids.add(p.id);
    (ix.generated ?? []).forEach((g) => add(g.play));
    REFERENCE_INDICES.forEach(add);
    (ix.custom ?? []).forEach(add);
    const current = draft ?? ix.plays;
    for (const id of ids)
      out.push({
        id,
        gen: ix.generated?.find((g) => g.play.id === id)?.play,
        ref: REFERENCE_INDICES.find((r) => r.id === id),
        cur: current.find((p) => p.id === id),
      });
    return out;
  }, [ix.generated, ix.custom, ix.plays, draft]);

  const generate = async () => {
    if (!st.chart) return;
    setBusy(true);
    await loadGeneratedIndices(st.chart, rules);
    setBusy(false);
    ix.setSource('generated');
  };
  const editable = draft ?? ix.plays;
  const edit = (id: string, f: (p: IndexPlay) => IndexPlay | null, template?: IndexPlay) => {
    const base = [...editable];
    const i = base.findIndex((p) => p.id === id);
    if (i >= 0) {
      const n = f(base[i]);
      if (n) base[i] = n;
      else base.splice(i, 1);
    } else if (template) {
      const n = f(template);
      if (n) base.push(n);
    }
    setDraft(base);
  };

  return (
    <>
      <TopBar title="Indices" />
      <main className="stack">
        <p className="mono muted" style={{ fontSize: 'var(--t-sm)' }}>
          Hi-Lo · {rulesLabel(rules)}
        </p>
        <Seg<IndexSource>
          options={[
            { value: 'generated', label: 'GENERATED' },
            { value: 'reference', label: 'I18+FAB4' },
            { value: 'custom', label: 'CUSTOM' },
          ]}
          value={draft ? 'custom' : ix.source}
          onChange={(s) => {
            setDraft(null);
            if (s === 'generated' && !ix.generated) generate();
            else if (s === 'custom' && !ix.custom) ix.saveCustom(ix.plays);
            else ix.setSource(s);
          }}
          label="Index source"
        />
        {!ix.generated && (
          <Box title="Generate for your rules">
            <p style={{ marginBottom: 'var(--s3)' }}>
              Computes risk-neutral Hi-Lo indices for these exact rules with the combinatorial engine (about 10–30 seconds, once; cached on this device).
            </p>
            <Button variant="primary" disabled={busy || !st.chart} onClick={generate}>
              {busy ? 'Computing…' : 'Generate indices'}
            </Button>
          </Box>
        )}
        {draft && (
          <div className="row">
            <Button variant="primary" onClick={() => (ix.saveCustom(draft), setDraft(null))}>
              Save custom chart
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Discard edits
            </Button>
          </div>
        )}
        <table className="chart" style={{ fontSize: 'var(--t-sm)' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingLeft: 6 }}>Play</th>
              <th>Gen</th>
              <th>Ref</th>
              <th>Yours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = r.cur ?? r.gen ?? r.ref!;
              const differs = r.cur && r.gen && r.cur.index !== r.gen.index;
              return (
                <tr key={r.id} onClick={() => setOpen(open === r.id ? null : r.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ textAlign: 'left', paddingLeft: 6 }}>
                    {playLabel(p)} <span className="muted">· {actName(p.atOrAbove)} at ≥</span>
                  </td>
                  <td>{r.gen ? sgn(r.gen.index) : '—'}</td>
                  <td>{r.ref ? sgn(r.ref.index) : '—'}</td>
                  <td className={differs ? 'accent' : ''}>{r.cur ? sgn(r.cur.index) : <span className="muted">off</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {open &&
          (() => {
            const r = rows.find((x) => x.id === open)!;
            const p = r.cur ?? r.gen ?? r.ref!;
            const g = ix.generated?.find((x) => x.play.id === open);
            return (
              <Box title={playLabel(p)} right={<span className="mono">{p.source ?? ''}</span>}>
                <div className="stack">
                  <p>
                    {actName(p.atOrAbove)} at TC ≥ {sgn(p.index)}, otherwise {actName(p.below)}.
                  </p>
                  {g && <CurveChart points={g.curve} index={g.crossing} />}
                  {g && <p className="mono muted" style={{ fontSize: 'var(--t-xs)' }}>Exact crossing: TC {g.crossing.toFixed(2)}</p>}
                  <div className="row">
                    <Button onClick={() => edit(open, (x) => ({ ...x, index: x.index - 1, source: 'user' }), p)}>−1</Button>
                    <span className="mono" style={{ fontSize: 'var(--t-xl)', minWidth: 48, textAlign: 'center' }}>
                      {r.cur ? sgn((draft ?? ix.plays).find((x) => x.id === open)?.index ?? p.index) : 'off'}
                    </span>
                    <Button onClick={() => edit(open, (x) => ({ ...x, index: x.index + 1, source: 'user' }), p)}>+1</Button>
                    {r.cur ? (
                      <Button variant="ghost" onClick={() => edit(open, () => null)}>
                        Turn off
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => edit(open, (x) => x, p)}>
                        Use this play
                      </Button>
                    )}
                  </div>
                </div>
              </Box>
            );
          })()}
        <p className="muted" style={{ fontSize: 'var(--t-xs)' }}>
          Generated: risk-neutral, exact composition EVs on representative shoes at three depths, at the true count you see (your cards and the upcard
          included). Reference: Schlesinger's Illustrious 18 + Fab 4 (multi-deck S17). Drills, the table sim and Feel Lab use the source selected above.
        </p>
      </main>
    </>
  );
}
