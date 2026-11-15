import { useState, type ReactNode } from 'react';
import { useV2 } from '../settings';
import { useStrategy } from '../../store/strategy';
import { useIndexPlays } from '../../store/indices';
import { UPS, type Chart, type Code, type Action } from '../../engine/strategy/chart';
import { valueLabel } from '../../engine/cards';
import { rulesLabel } from '../../engine/rules';
import type { IndexPlay } from '../../engine/indices';

/**
 * Strategy charts laid out the way most players learned them: pair splitting (Y, Y/N, N), soft
 * totals, hard totals, late surrender and insurance, dealer upcards across the top. The "Count
 * plays" view is the same grid with the true count that changes each play written in the cell.
 * Everything is computed for the table's exact rules.
 */
type Cls = 'h' | 's' | 'd' | 'ds' | 'y' | 'yn' | 'n' | 'sur' | 'blank';
interface Cell {
  text: string;
  cls: Cls;
  /** The play this cell stands for when the count is neutral. */
  basic: Action | 'none';
  dev?: string;
}

const PAIRS = [1, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const SOFT = [20, 19, 18, 17, 16, 15, 14, 13];
const HARD = [17, 16, 15, 14, 13, 12, 11, 10, 9, 8];
const SUR_ROWS = [17, 16, 15, 14];

const isSplit = (c: Code) => c === 'P' || c === 'Rp';
const isSur = (c: Code) => c === 'Rh' || c === 'Rs' || c === 'Rp';

function pairCell(c: Chart, other: Chart | undefined, v: number, col: number, das: boolean): Cell {
  const here = isSplit(c.pairs[v][col]);
  // `other` is the same game with double-after-split flipped: Y/N marks the splits that depend on it.
  const there = other ? isSplit(other.pairs[v][col]) : here;
  const withDas = das ? here : there;
  const withoutDas = das ? there : here;
  if (withDas && withoutDas) return { text: 'Y', cls: 'y', basic: 'split' };
  if (withDas) return { text: 'Y/N', cls: 'yn', basic: here ? 'split' : 'none' };
  return { text: 'N', cls: 'n', basic: 'none' };
}

function playCell(code: Code): Cell {
  switch (code) {
    case 'S':
    case 'Rs':
      return { text: 'S', cls: 's', basic: 'stand' };
    case 'D':
      return { text: 'D', cls: 'd', basic: 'double' };
    case 'Ds':
      return { text: 'Ds', cls: 'ds', basic: 'double' };
    default:
      return { text: 'H', cls: 'h', basic: 'hit' };
  }
}

const fmt = (n: number) => (n < 0 ? '−' + Math.abs(n) : String(n));

/** Where a count play goes on the chart and how it reads ("4+" = at 4 or higher, "0−" = below 0). */
function devKey(p: IndexPlay): string | null {
  const sur = p.atOrAbove === 'surrender' || p.below === 'surrender';
  if (p.hand.kind === 'insurance') return null;
  if (sur) return p.hand.kind === 'pair' ? `sur:p${p.hand.value}:${p.up}` : p.hand.kind === 'hard' ? `sur:${p.hand.total}:${p.up}` : null;
  if (p.hand.kind === 'pair') return `pairs:${p.hand.value}:${p.up}`;
  return `${p.hand.kind}:${p.hand.total}:${p.up}`;
}

function Grid({ title, rows, label, cell, keys }: { title: string; rows: (number | string)[]; label: (r: number | string) => string; cell: (r: number | string, col: number, up: number) => Cell; keys: [Cls, string, string][] }) {
  return (
    <section className="bs-sec">
      <h2 className="bs-title">{title}</h2>
      <table className="bs">
        <thead>
          <tr>
            <th className="corner" />
            <th colSpan={10} className="cap">
              Dealer upcard
            </th>
          </tr>
          <tr>
            <th className="corner" />
            {UPS.map((u) => (
              <th key={u}>{valueLabel(u)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th>{label(r)}</th>
              {UPS.map((u, col) => {
                const c = cell(r, col, u);
                return (
                  <td key={u} className={c.cls}>
                    {c.dev ? <b className="dev">{c.dev}</b> : c.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="bs-key">
        {keys.map(([cls, k, text]) => (
          <span key={k}>
            <i className={cls}>{k}</i>
            {text}
          </span>
        ))}
      </div>
    </section>
  );
}

export function ChartPage() {
  const { s } = useV2();
  const r = s.rules;
  const st = useStrategy(r);
  const alt = useStrategy({ ...r, das: !r.das });
  const { plays, source } = useIndexPlays(r, st.chart);
  const [view, setView] = useState<'basic' | 'count'>('basic');
  const c = st.chart;

  const devs = new Map<string, IndexPlay>();
  if (view === 'count') for (const p of plays) if (!(p.surrender && !r.lateSurrender)) devKey(p) && devs.set(devKey(p)!, p);
  const ins = plays.find((p) => p.hand.kind === 'insurance');
  const withDev = (key: string, cell: Cell): Cell => {
    const p = devs.get(key);
    if (!p) return cell;
    // the number is where the play switches; + means switch at that count or higher, − below it
    const suffix = p.atOrAbove === cell.basic ? '−' : '+';
    return { ...cell, dev: fmt(p.index) + suffix };
  };

  let body: ReactNode = <p className="muted">Working out the exact strategy for these rules…</p>;
  if (c) {
    const surCells = (row: number | string, col: number, up: number): Cell => {
      const code = typeof row === 'number' ? c.hard[row][col] : c.pairs[8][col];
      const cell: Cell = isSur(code) ? { text: 'SUR', cls: 'sur', basic: 'surrender' } : { text: '', cls: 'blank', basic: code === 'S' ? 'stand' : code === 'P' ? 'split' : 'hit' };
      return withDev(`sur:${typeof row === 'number' ? row : 'p8'}:${up}`, cell);
    };
    const surRows: (number | string)[] = [...SUR_ROWS, ...(c.pairs[8].some((x) => x === 'Rp') ? ['8,8'] : [])];
    body = (
      <>
        <Grid
          title="Pair splitting"
          rows={PAIRS}
          label={(v) => (v === 10 ? 'T,T' : `${valueLabel(v as number)},${valueLabel(v as number)}`)}
          cell={(v, col, up) => withDev(`pairs:${v}:${up}`, pairCell(c, alt.chart, v as number, col, r.das))}
          keys={[
            ['y', 'Y', 'Split'],
            ['yn', 'Y/N', r.das ? 'Split (only because you can double after splitting)' : 'Split only if double after split is offered (it isn’t here)'],
            ['n', 'N', 'Don’t split'],
          ]}
        />
        <Grid
          title="Soft totals"
          rows={SOFT}
          label={(t) => `A,${(t as number) - 11}`}
          cell={(t, col, up) => withDev(`soft:${t}:${up}`, playCell(c.soft[t as number][col]))}
          keys={[
            ['h', 'H', 'Hit'],
            ['s', 'S', 'Stand'],
            ['d', 'D', 'Double, otherwise hit'],
            ['ds', 'Ds', 'Double, otherwise stand'],
          ]}
        />
        <Grid
          title="Hard totals"
          rows={HARD}
          label={(t) => (t === 17 ? '17+' : String(t))}
          cell={(t, col, up) => withDev(`hard:${t}:${up}`, playCell(c.hard[t as number][col]))}
          keys={[
            ['h', 'H', 'Hit'],
            ['s', 'S', 'Stand'],
            ['d', 'D', 'Double, otherwise hit'],
          ]}
        />
        {r.lateSurrender && (
          <Grid title="Late surrender" rows={surRows} label={(x) => String(x)} cell={surCells} keys={[['sur', 'SUR', 'Surrender (when it isn’t offered, use the chart above)']]} />
        )}
        <div className="bs-ins">
          Insurance or even money:{' '}
          {view === 'count' && ins ? (
            <>
              take at <b className="dev">{fmt(ins.index)}+</b>
            </>
          ) : (
            'don’t take'
          )}
        </div>
        {view === 'count' && (
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
            Red numbers are the Hi-Lo <b>true count</b> where the play changes. <b>4+</b> = make the change at up 4 or higher. <b>0−</b> = make the change once the count drops below 0
            (down 1 or lower). Cells without a number never change with the count.{' '}
            {source === 'generated' ? 'Worked out for these exact rules.' : 'Showing the published reference set while the count plays for these exact rules are worked out (about half a minute, once).'}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="frame">
      <header className="hud">
        <a className="pill" href="#/">
          ← Table
        </a>
        <span className="spacer" />
        <span className="muted mono" style={{ fontSize: 11, textAlign: 'right' }}>
          {rulesLabel(r)}
        </span>
      </header>
      <div className="page" style={{ gap: 14 }}>
        <div className="seg" role="group" aria-label="Chart" style={{ alignSelf: 'flex-start' }}>
          <button aria-pressed={view === 'basic'} onClick={() => setView('basic')}>
            Basic strategy
          </button>
          <button aria-pressed={view === 'count'} onClick={() => setView('count')}>
            Count plays
          </button>
        </div>
        {body}
      </div>
    </div>
  );
}
