import { useMemo, useState } from 'react';
import { TopBar, Seg, Button, Box, Instrument, Instruments, fmtSigned } from '../ui/components';
import { useSettings } from '../store/SettingsContext';
import { useStrategy, diffOverrides, type Section } from '../store/strategy';
import { CODES, UPS, chartToCSV, chartFromCSV, chartFromJSON, type Code } from '../engine/strategy/chart';
import { rulesLabel } from '../engine/rules';
import { valueLabel } from '../engine/cards';

const ROWS: Record<Section, number[]> = {
  hard: Array.from({ length: 16 }, (_, i) => i + 5),
  soft: Array.from({ length: 8 }, (_, i) => i + 13),
  pairs: [1, 10, 9, 8, 7, 6, 5, 4, 3, 2],
};
const rowLabel = (sec: Section, r: number) => (sec === 'hard' ? String(r) : sec === 'soft' ? 'A,' + (r - 11) : `${valueLabel(r)},${valueLabel(r)}`);
const evKey = (sec: Section, r: number, up: number) => `${sec === 'pairs' ? 'pair' : sec}:${r}:${up}`;

function download(name: string, text: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function StrategyScreen() {
  const { settings } = useSettings();
  const st = useStrategy(settings.rules);
  const [sec, setSec] = useState<Section>('hard');
  const [sel, setSel] = useState<{ row: number; col: number } | null>(null);
  const [importText, setImportText] = useState('');
  const [err, setErr] = useState('');

  const ev = useMemo(() => {
    if (!sel || !st.generated) return null;
    return st.generated.cellEVs[evKey(sec, sel.row, UPS[sel.col])];
  }, [sel, sec, st.generated]);

  if (!st.chart || !st.generated) {
    return (
      <>
        <TopBar title="Strategy" />
        <main className="stack">
          <p className="mono">Computing exact basic strategy for {rulesLabel(settings.rules)}…</p>
          <p className="muted">Runs once per rule set, then cached on this device.</p>
        </main>
      </>
    );
  }
  const chart = st.chart;
  const base = st.generated.chart;
  const setCell = (code: Code | null) => {
    if (!sel) return;
    const k = `${sec}:${sel.row}:${sel.col}`;
    const ov = { ...st.overrides };
    if (code === null || base[sec][sel.row][sel.col] === code) delete ov[k];
    else ov[k] = code;
    st.setOverrides(ov);
  };
  const nOv = Object.keys(st.overrides).length;

  return (
    <>
      <TopBar title="Strategy" />
      <main className="stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="mono muted" style={{ fontSize: 'var(--t-sm)' }}>
            {rulesLabel(settings.rules)}
          </span>
          <span className="tag">{nOv ? `${nOv} override${nOv > 1 ? 's' : ''}` : 'generated'}</span>
        </div>
        <Seg
          options={[{ value: 'hard', label: 'HARD' }, { value: 'soft', label: 'SOFT' }, { value: 'pairs', label: 'PAIRS' }]}
          value={sec}
          onChange={(v) => {
            setSec(v);
            setSel(null);
          }}
        />
        <div className="scroll-x">
          <table className="chart">
            <thead>
              <tr>
                <th></th>
                {UPS.map((u) => (
                  <th key={u}>{valueLabel(u)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS[sec].map((r) => (
                <tr key={r}>
                  <th>{rowLabel(sec, r)}</th>
                  {chart[sec][r].map((code, col) => {
                    const over = st.overrides[`${sec}:${r}:${col}`] !== undefined;
                    const isSel = sel?.row === r && sel.col === col;
                    return (
                      <td key={col} className={`a-${code} ${over ? 'override' : ''}`} style={isSel ? { outline: '2px solid var(--accent)', outlineOffset: -2 } : undefined}>
                        <button aria-label={`${rowLabel(sec, r)} vs ${valueLabel(UPS[col])}: ${code}`} onClick={() => setSel({ row: r, col })}>
                          {code}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 'var(--t-xs)' }}>
          H hit · S stand · D double else hit · Ds double else stand · P split · Rh/Rs/Rp surrender else hit/stand/split. Accent border = your override.
        </p>

        {sel && (
          <Box title={`${rowLabel(sec, sel.row)} vs ${valueLabel(UPS[sel.col])}`} right={<span className="mono">{base[sec][sel.row][sel.col]} generated</span>}>
            <div className="stack">
              {ev && (
                <Instruments>
                  {(['stand', 'hit', 'double', 'split', 'surrender'] as const).map((k) =>
                    ev[k] === undefined ? null : <Instrument key={k} label={k} value={fmtSigned(ev[k]!, 4)} unit="units, full shoe" />,
                  )}
                </Instruments>
              )}
              <div className="grid4" style={{ gap: 'var(--s2)' }}>
                {CODES.map((c) => (
                  <Button key={c} selected={chart[sec][sel.row][sel.col] === c} onClick={() => setCell(c)}>
                    {c}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" onClick={() => setCell(null)}>
                Reset cell
              </Button>
            </div>
          </Box>
        )}

        <Box title="Import / export">
          <div className="stack">
            <div className="row">
              <Button onClick={() => download('strategy.json', JSON.stringify(chart, null, 1), 'application/json')}>Export JSON</Button>
              <Button onClick={() => download('strategy.csv', chartToCSV(chart), 'text/csv')}>Export CSV</Button>
              {nOv > 0 && (
                <Button variant="danger" onClick={() => st.setOverrides({})}>
                  Reset all
                </Button>
              )}
            </div>
            <textarea placeholder="Paste JSON or CSV here" value={importText} onChange={(e) => setImportText(e.target.value)} aria-label="Import chart" />
            <div className="row">
              <Button
                disabled={!importText.trim()}
                onClick={() => {
                  try {
                    const t = importText.trim();
                    const parsed = t.startsWith('{') ? chartFromJSON(t, base) : chartFromCSV(t, base);
                    st.setOverrides(diffOverrides(base, parsed));
                    setImportText('');
                    setErr('');
                  } catch (e) {
                    setErr(String(e));
                  }
                }}
              >
                Import
              </Button>
              <label className="btn ghost">
                File…
                <input
                  type="file"
                  accept=".json,.csv,text/csv,application/json"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setImportText(await f.text());
                  }}
                />
              </label>
            </div>
            {err && <p className="accent mono" style={{ fontSize: 'var(--t-sm)' }}>{err}</p>}
          </div>
        </Box>

        <Box title={`Composition-dependent exceptions (${st.generated.exceptions.length})`}>
          {st.generated.exceptions.length === 0 ? (
            <p className="muted">None for these rules.</p>
          ) : (
            <table className="chart">
              <thead>
                <tr>
                  <th>Hand</th>
                  <th>Up</th>
                  <th>Chart</th>
                  <th>Best</th>
                  <th>Gain</th>
                </tr>
              </thead>
              <tbody>
                {st.generated.exceptions.map((e, i) => (
                  <tr key={i}>
                    <td>
                      {valueLabel(e.a)},{valueLabel(e.b)}
                    </td>
                    <td>{valueLabel(e.up)}</td>
                    <td>{e.chart}</td>
                    <td>{e.best}</td>
                    <td className="pos">{fmtSigned(e.gain, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 'var(--s2)' }}>
            Exact EV gain per hand off the top of a full shoe.
          </p>
        </Box>
      </main>
    </>
  );
}
