import { useState } from 'react';
import { useV2 } from '../settings';
import { useStrategy } from '../../store/strategy';
import { useIndexPlays } from '../../store/indices';
import { UPS, type Code } from '../../engine/strategy/chart';
import { valueLabel } from '../../engine/cards';
import { playLabel } from '../../engine/indices';
import { rulesLabel } from '../../engine/rules';

const HARD = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const SOFT = [13, 14, 15, 16, 17, 18, 19, 20];
const PAIRS = [1, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const NAME: Record<Code, string> = { H: 'H', S: 'S', D: 'D', Ds: 'Ds', P: 'P', Rh: 'R', Rs: 'R', Rp: 'R' };

export function ChartPage() {
  const { s } = useV2();
  const st = useStrategy(s.rules);
  const { plays } = useIndexPlays(s.rules);
  const [tab, setTab] = useState<'hard' | 'soft' | 'pairs' | 'count'>('hard');
  const c = st.chart;
  const rows = tab === 'hard' ? HARD : tab === 'soft' ? SOFT : PAIRS;
  const label = (r: number) => (tab === 'hard' ? (r === 8 ? '≤8' : r === 17 ? '17+' : String(r)) : tab === 'soft' ? `A,${r - 11}` : `${valueLabel(r)},${valueLabel(r)}`);
  return (
    <div className="frame">
      <header className="hud">
        <a className="pill" href="#/">
          ← Table
        </a>
        <span className="spacer" />
        <span className="muted mono" style={{ fontSize: 12 }}>
          {rulesLabel(s.rules)}
        </span>
      </header>
      <div className="page">
        <div className="seg" role="group" aria-label="Chart section" style={{ alignSelf: 'flex-start' }}>
          {(['hard', 'soft', 'pairs', 'count'] as const).map((x) => (
            <button key={x} aria-pressed={tab === x} onClick={() => setTab(x)}>
              {x === 'count' ? 'Count plays' : x[0].toUpperCase() + x.slice(1)}
            </button>
          ))}
        </div>
        {!c ? (
          <p className="muted">Working out the exact strategy for these rules…</p>
        ) : tab === 'count' ? (
          <div className="group">
            <div className="gh">When the count changes the play (Hi-Lo true count)</div>
            {plays.map((p) => (
              <div key={p.id} className="row">
                <span className="lbl">{playLabel(p)}</span>
                <span className="mono" style={{ fontSize: 13 }}>
                  {p.atOrAbove === 'insure' ? 'Take insurance' : p.atOrAbove[0].toUpperCase() + p.atOrAbove.slice(1)} at {p.index > 0 ? '+' : ''}
                  {p.index} or more
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <table className="grid">
              <thead>
                <tr>
                  <th>You</th>
                  {UPS.map((u) => (
                    <th key={u}>{valueLabel(u)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const src = tab === 'hard' ? c.hard[r] : tab === 'soft' ? c.soft[r] : c.pairs[r];
                  return (
                    <tr key={r}>
                      <th>{label(r)}</th>
                      {src.map((code, i) => (
                        <td key={i} className={code}>
                          {NAME[code]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
              H hit · S stand · D double (otherwise hit) · Ds double (otherwise stand) · P split · R surrender. Columns are the dealer's upcard. Made for these exact
              rules.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
