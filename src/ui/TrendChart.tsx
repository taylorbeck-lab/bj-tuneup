import { useState } from 'react';

export interface Point {
  t: number;
  v: number;
}

/**
 * Single-series trend line: 2px line, recessive axis, optional dashed target line (mid grey),
 * crosshair + tooltip on hover/touch. The title names the series, so no legend.
 */
export function TrendChart({ title, points, fmt: fmtRaw = (v) => v.toFixed(1), target, higherIsBetter = true, height = 120 }: { title: string; points: Point[]; fmt?: (v: number) => string; target?: number; higherIsBetter?: boolean; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const fmt = (v: number) => fmtRaw(v).replace(/^-(0(\.0+)?)$/, '$1');
  const W = 320;
  const H = height;
  const pad = { l: 36, r: 8, t: 10, b: 18 };
  if (points.length === 0)
    return (
      <figure className="box" style={{ margin: 0 }}>
        <div className="box-head">
          <span className="label">{title}</span>
        </div>
        <div className="box-body muted" style={{ fontSize: 'var(--t-sm)' }}>
          No data yet.
        </div>
      </figure>
    );
  const vals = points.map((p) => p.v);
  if (target !== undefined) vals.push(target);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 1e-9) {
    hi += 1;
    lo -= 1;
  }
  const span = hi - lo;
  lo -= span * 0.1;
  hi += span * 0.1;
  const n = points.length;
  const x = (i: number) => pad.l + (n === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (n - 1));
  const y = (v: number) => pad.t + ((hi - v) * (H - pad.t - pad.b)) / (hi - lo);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const last = points[n - 1];
  const onMove = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setHover(best);
  };
  const hp = hover !== null ? points[hover] : null;
  const good = target === undefined ? undefined : higherIsBetter ? last.v >= target : last.v <= target;
  return (
    <figure className="box" style={{ margin: 0 }}>
      <div className="box-head">
        <span className="label">{title}</span>
        <span className={'mono ' + (good === false ? 'accent' : '')} style={{ fontSize: 'var(--t-sm)' }}>
          {hp ? `${new Date(hp.t).toLocaleDateString()} · ${fmt(hp.v)}` : fmt(last.v)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`${title}: ${n} sessions, latest ${fmt(last.v)}`}
        style={{ display: 'block', touchAction: 'pan-y' }}
        onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(e) => onMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
        onTouchEnd={() => setHover(null)}
      >
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--line)" />
        <text x={pad.l - 4} y={y(hi - span * 0.1) + 4} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">
          {fmt(hi - (hi - lo) * 0.0833)}
        </text>
        <text x={pad.l - 4} y={H - pad.b} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">
          {fmt(lo + (hi - lo) * 0.0833)}
        </text>
        {target !== undefined && <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke="var(--muted)" strokeDasharray="4 4" />}
        <path d={d} fill="none" stroke="var(--fg)" strokeWidth={2} strokeLinejoin="round" />
        <circle cx={x(n - 1)} cy={y(last.v)} r={4} fill="var(--fg)" stroke="var(--bg)" strokeWidth={2} />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--line)" />
            <circle cx={x(hover)} cy={y(points[hover].v)} r={4} fill="var(--fg)" stroke="var(--bg)" strokeWidth={2} />
          </>
        )}
      </svg>
      <details style={{ padding: '0 var(--s3) var(--s2)' }}>
        <summary className="label" style={{ cursor: 'pointer' }}>
          Table
        </summary>
        <table className="chart">
          <tbody>
            {points
              .slice(-12)
              .reverse()
              .map((p, i) => (
                <tr key={i}>
                  <td>{new Date(p.t).toLocaleString()}</td>
                  <td>{fmt(p.v)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
