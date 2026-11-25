import { useEffect, useMemo, useState } from 'react';
import { useV2 } from '../settings';
import { nextStep, LEVEL_NAME } from '../progress';
import { useBankroll, money } from '../bankroll';
import { loadStats, onStats, SEAT_POS_LABEL, type SeatPos, type V2Stats } from '../stats';
import { leaks, parseKey } from '../practice';
import { useStrategy } from '../../store/strategy';
import { chartAction, ACTION_LABEL } from '../../engine/strategy/chart';
import { Starburst } from '../icons';

const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) + '%' : '—');

function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="group" style={{ padding: '10px 12px', background: color ?? 'var(--paper)' }}>
      <div className="label">{label}</div>
      <div className="display" style={{ fontSize: 34 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

/** Bankroll over time: single line, ink on paper, start level dashed. */
function BankrollChart({ points, start }: { points: { t: number; b: number }[]; start: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <p className="muted" style={{ margin: 0 }}>Play a few hands to see your bankroll here.</p>;
  const W = 320;
  const H = 120;
  const ys = points.map((p) => p.b);
  const lo = Math.min(start, ...ys);
  const hi = Math.max(start, ...ys);
  const span = hi - lo || 1;
  const X = (i: number) => 4 + (i * (W - 8)) / (points.length - 1);
  const Y = (v: number) => 8 + ((hi - v) * (H - 16)) / span;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.b).toFixed(1)}`).join('');
  const hp = hover !== null ? points[hover] : points[points.length - 1];
  return (
    <div>
      <div className="mono" style={{ fontSize: 12, marginBottom: 4 }}>
        {hover !== null ? `Hand ${hover + 1}: ` : 'Now: '}
        <b>{money(hp.b)}</b> ({hp.b >= start ? '+' : ''}
        {money(hp.b - start).replace('$', '$')} vs start)
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Bankroll over ${points.length} hands, now ${money(hp.b)}`}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.max(0, Math.min(points.length - 1, Math.round((((e.clientX - r.left) / r.width) * W - 4) / ((W - 8) / (points.length - 1))))));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <line x1="0" x2={W} y1={Y(start)} y2={Y(start)} stroke="var(--ink-soft)" strokeDasharray="4 4" />
        <path d={d} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
        {hover !== null && <circle cx={X(hover)} cy={Y(points[hover].b)} r="4.5" fill="var(--mustard)" stroke="var(--ink)" strokeWidth="2" />}
      </svg>
    </div>
  );
}

/** Where you are in the course, and what the next level takes (José offers it at a shoe's end). */
function Course({ stats }: { stats: V2Stats }) {
  const { s } = useV2();
  const p = s.progress;
  const step = nextStep(stats, p);
  return (
    <section className="group course">
      <div className="gh">
        Your level · {p.level}. {LEVEL_NAME[p.level]}
        {p.level === 3 && p.tier < 3 ? ` · count plays ${p.tier === 1 ? 'set 1 of 3' : 'set 2 of 3'}` : ''}
      </div>
      {step ? (
        <>
          <div className="row">
            <span className="hint">
              {step.title}. {step.ready ? (p.auto ? 'You’re ready: José will offer it at the end of a shoe.' : 'You’re ready (José moving you up is off in Settings).') : 'José offers it at the end of a shoe once every line is full.'}
            </span>
          </div>
          {step.checks.map((c) => (
            <div className="row course-check" key={c.label}>
              <div style={{ flex: 1 }}>
                <div className="lbl">
                  {c.ok ? '✓ ' : ''}
                  {c.label}
                </div>
                <div className="hint">
                  {c.have} · need {c.need}
                </div>
                <div className="course-bar" aria-hidden="true">
                  <span style={{ width: `${Math.round(c.frac * 100)}%` }} className={c.ok ? 'ok' : ''} />
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="row">
          <span className="hint">
            The whole course is done: every count play is yours. From here it’s practice, a tune-up before the real thing. <a href="#/real">Before you play for real</a> ·{' '}
            <a href="#/plan">Plan a session</a>
          </span>
        </div>
      )}
    </section>
  );
}

/** True count within one, out of the times you actually gave a true count. */
function trueCountLine(s: V2Stats): string {
  const t = s.tc?.n ? s.tc : s.tcRecent?.length ? { n: s.tcRecent.length, right: s.tcRecent.reduce((a, b) => a + b, 0) } : null;
  if (!t) return 'true count: no answers yet';
  return `true count within one ${Math.round((100 * t.right) / t.n)}% (${t.n} answered)`;
}

export function StatsPage() {
  const { s } = useV2();
  const { br } = useBankroll(s.startBankroll);
  const st = useStrategy(s.rules);
  const [stats, setStats] = useState<V2Stats | null>(null);
  useEffect(() => {
    loadStats().then((x) => setStats({ ...x }));
    return onStats((x) => setStats({ ...x }));
  }, []);
  const todayKey = new Date().toISOString().slice(0, 10);
  const leaky = useMemo(() => (stats ? leaks(stats).sort((a, b) => b.recentMisses - a.recentMisses || a.right / a.n - b.right / b.n) : []), [stats]);
  const mastered = stats ? Object.values(stats.sits).filter((x) => x.recent.length >= 3 && x.recent.slice(-3).every((r) => r === 1)).length : 0;
  if (!stats) return null;
  const today = stats.days[todayKey];
  const rightPlay = (key: string) => {
    const k = parseKey(key);
    if (!k || !st.chart) return null;
    const values = k.kind === 'p' ? [k.n, k.n] : k.kind === 's' ? [1, k.n - 11] : k.n <= 11 ? [k.n - 2, 2] : [10, k.n - 10];
    return ACTION_LABEL[chartAction(st.chart, values, k.up, { canDouble: true, canSplit: k.kind === 'p', canSurrender: s.rules.lateSurrender })];
  };
  return (
    <div className="frame">
      <header className="hud">
        <a className="pill" href="#/">
          ← Table
        </a>
        <span className="spacer" />
        <a className="pill coral" href="#/coach">
          ✦ Ask the coach
        </a>
        <Starburst color="var(--coral)" />
      </header>
      <div className="page">
        <h1>
          Your game <span className="serif" style={{ fontSize: 34 }}>so far</span>
        </h1>
        <Course stats={stats} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Tile label="Right calls" value={pct(stats.right, stats.decisions)} sub={`${stats.right} of ${stats.decisions} decisions`} color="var(--mustard)" />
          <Tile label="Today" value={today ? pct(today.right, today.decisions) : '—'} sub={today ? `${today.hands} hands` : 'no hands yet'} />
          <Tile label="Count checks" value={pct(stats.count.rcRight, stats.count.n)} sub={`running count exact (mid-shoe) · ${trueCountLine(stats)}`} color="var(--pool)" />
          <Tile label="Count plays" value={pct(stats.deviations.right, stats.deviations.n)} sub={`${stats.deviations.n} times the count changed the play`} />
          <Tile label="End of shoe" value={pct(stats.shoeEnd?.right ?? 0, stats.shoeEnd?.n ?? 0)} sub={`count exact at the cut card · ${stats.shoeEnd?.n ?? 0} answered${stats.shoeEnd?.passed ? `, ${stats.shoeEnd.passed} skipped` : ''}`} color="var(--sage)" />
          <Tile label="Insurance" value={pct(stats.insurance.right, stats.insurance.n)} sub={`${stats.insurance.n} decisions`} />
          <Tile label="Bets" value={pct(stats.bets.right, stats.bets.n)} sub="with the bet coach on" color="var(--lilac)" />
        </div>

        <section className="group">
          <div className="gh">Your pace · seconds per decision</div>
          {(['first', 'middle', 'third', 'solo'] as SeatPos[]).map((k) => {
            const p = stats.pace?.[k];
            if (!p?.n) return null;
            return (
              <div className="row" key={k}>
                <div>
                  <div className="lbl">{SEAT_POS_LABEL[k]}</div>
                  <div className="hint">{p.n} decisions</div>
                </div>
                <span className="display" style={{ fontSize: 26 }}>
                  {(p.ms / p.n / 1000).toFixed(1)}s
                </span>
              </div>
            );
          })}
          <div className="row">
            <span className="hint">
              {stats.pace && Object.values(stats.pace).some((p) => p.n)
                ? 'Aim for about 2 seconds a decision. At first base the whole table waits on you; at third base you see everyone’s cards first.'
                : 'Play a few hands: your speed shows up here, by where you sit.'}
            </span>
          </div>
        </section>

        <section className="group">
          <div className="gh">Bankroll</div>
          <div style={{ padding: 12 }}>
            <BankrollChart points={br.history} start={br.start} />
          </div>
        </section>

        <section className="group">
          <div className="gh">
            Hands to work on · {leaky.length} · mastered {mastered}
          </div>
          {leaky.length === 0 ? (
            <div className="row">
              <span>No leaks right now. Keep playing.</span>
            </div>
          ) : (
            leaky.slice(0, 12).map((x) => (
              <div className="row" key={x.key}>
                <div>
                  <div className="lbl">{x.label}</div>
                  <div className="hint">
                    {x.right} of {x.n} right · the play: <b>{rightPlay(x.key) ?? '—'}</b>
                  </div>
                </div>
                <span className="mono" style={{ fontSize: 13 }}>
                  {x.recent.slice(-5).map((r) => (r ? '●' : '○')).join('')}
                </span>
              </div>
            ))
          )}
          <div className="row">
            <span className="hint">With “Practice my misses” on, these come back more often until you get them right three times in a row.</span>
          </div>
        </section>

        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          To reset your stats or start over, see Settings → Start over.
        </p>
      </div>
    </div>
  );
}
