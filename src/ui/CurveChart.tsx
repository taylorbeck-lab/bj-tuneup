import { useState } from 'react';

/**
 * EV gain of a deviation vs true count: 2px line, zero baseline, dashed index marker, hover readout.
 * Single series, titled by the caller (no legend).
 */
export function CurveChart({ points, index, height = 140, unit = '%' }: { points: { t: number; diff: number }[]; index?: number; height?: number; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = points.filter((p) => isFinite(p.diff));
  if (pts.length < 2) return null;
  const W = 320;
  const H = height;
  const pad = { l: 34, r: 8, t: 8, b: 20 };
  const xs = pts.map((p) => p.t);
  const ys = pts.map((p) => p.diff * 100);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  let y0 = Math.min(0, ...ys);
  let y1 = Math.max(0, ...ys);
  const sp = (y1 - y0) || 1;
  y0 -= sp * 0.08;
  y1 += sp * 0.08;
  const X = (t: number) => pad.l + ((t - x0) * (W - pad.l - pad.r)) / (x1 - x0);
  const Y = (v: number) => pad.t + ((y1 - v) * (H - pad.t - pad.b)) / (y1 - y0);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.diff * 100).toFixed(1)}`).join('');
  const hp = hover !== null ? pts[hover] : null;
  return (
    <div>
      <div className="mono muted" style={{ fontSize: 'var(--t-xs)', minHeight: 16 }}>
        {hp ? `TC ${hp.t > 0 ? '+' : ''}${hp.t}: deviation ${hp.diff >= 0 ? '+' : '−'}${Math.abs(hp.diff * 100).toFixed(2)}${unit}` : 'EV of the deviation minus the chart play'}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="EV gain of the deviation by true count"
        style={{ display: 'block' }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          let b = 0;
          for (let i = 1; i < pts.length; i++) if (Math.abs(X(pts[i].t) - px) < Math.abs(X(pts[b].t) - px)) b = i;
          setHover(b);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <line x1={pad.l} x2={W - pad.r} y1={Y(0)} y2={Y(0)} stroke="var(--line)" />
        {[x0, 0, x1].map((t) => (
          <text key={t} x={X(t)} y={H - 4} fontSize="9" textAnchor="middle" fill="var(--muted)" fontFamily="var(--font-mono)">
            {t > 0 ? '+' + t : t}
          </text>
        ))}
        <text x={pad.l - 4} y={Y(0) + 3} fontSize="9" textAnchor="end" fill="var(--muted)" fontFamily="var(--font-mono)">
          0
        </text>
        {index !== undefined && <line x1={X(index)} x2={X(index)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeDasharray="3 3" />}
        <path d={d} fill="none" stroke="var(--fg)" strokeWidth={2} />
        {hp && <circle cx={X(hp.t)} cy={Y(hp.diff * 100)} r={4} fill="var(--fg)" stroke="var(--bg)" strokeWidth={2} />}
      </svg>
    </div>
  );
}
