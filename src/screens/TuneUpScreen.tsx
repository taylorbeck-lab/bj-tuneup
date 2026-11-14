import { useEffect, useMemo, useRef, useState } from 'react';
import { TopBar, Button, Box, Instrument, Instruments } from '../ui/components';
import { useSettings } from '../store/SettingsContext';
import { useStrategy } from '../store/strategy';
import { listSessions, saveSession } from '../store/sessions';
import { planTuneUp, tuneUpVerdict, type Stage, type StageOutcome, type RecentAccuracy } from '../engine/tuneup';
import { Countdown } from './drills/Countdown';
import { RunningCount } from './drills/RunningCount';
import { TrueCountDrill } from './drills/TrayDrills';
import { BsFlash, DevFlash } from './drills/FlashDrills';
import { SimRun } from './sim/SimScreen';
import type { StageResult } from './drills/common';
import type { SimSummary } from './sim/summary';
import type { SimConfig } from './sim/useSim';
import { navigate } from '../router';

/** Recent accuracy per kind over the last 14 days (mean of up to 5 latest sessions). */
async function recentAccuracy(): Promise<RecentAccuracy> {
  const since = Date.now() - 14 * 86400e3;
  const all = (await listSessions()).filter((s) => s.at >= since);
  const by: Record<string, number[]> = {};
  for (const s of all) {
    const k = s.kind.startsWith('sim') ? 'sim' : s.kind;
    (by[k] ??= []).push(s.accuracy);
  }
  const out: RecentAccuracy = {};
  for (const [k, v] of Object.entries(by)) out[k] = v.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, v.length);
  return out;
}

export function TuneUpScreen() {
  const { settings } = useSettings();
  const st = useStrategy(settings.rules);
  const [plan, setPlan] = useState<Stage[] | null>(null);
  const [idx, setIdx] = useState(-1);
  const [outcomes, setOutcomes] = useState<StageOutcome[]>([]);
  const t0 = useRef(0);
  useEffect(() => {
    recentAccuracy().then((r) => setPlan(planTuneUp(r, settings.targets)));
  }, [settings.targets]);

  const simCfg = useMemo<SimConfig | null>(
    () =>
      st.chart
        ? {
            rules: settings.rules,
            chart: st.chart,
            seats: Math.min(3, settings.rules.seats),
            humanSeat: Math.min(3, settings.rules.seats) - 1,
            speedMs: 400,
            granularity: settings.count.deckGranularity,
            rounding: settings.count.rounding,
          }
        : null,
    [st.chart, settings.rules, settings.count],
  );

  const stage = plan && idx >= 0 ? plan[idx] : null;
  const advance = (o: StageOutcome) => {
    setOutcomes((xs) => [...xs, o]);
    setIdx((i) => i + 1);
  };
  const fromDrill = (id: Stage['id']) => (r: StageResult) =>
    advance({ id, total: r.total, correct: r.correct, avgMs: r.avgMs, evLost: r.evLost, mistakes: r.mistakes, metrics: r.metrics });
  const fromSim = (s: SimSummary) =>
    advance({
      id: 'sim',
      total: s.decisions.length + s.hands + s.insurance.length,
      correct: s.decisions.length + s.hands + s.insurance.length - s.playErrors - s.betErrors - s.insErrors,
      avgMs: 0,
      evLost: s.evLost,
      mistakes: s.mistakes,
      metrics: { hands: s.hands, net: s.net },
    });

  const finished = plan && idx >= plan.length;
  const verdict = useMemo(() => (finished ? tuneUpVerdict(outcomes, settings.targets) : null), [finished, outcomes, settings.targets]);
  const saved = useRef(false);
  useEffect(() => {
    if (!verdict || saved.current) return;
    saved.current = true;
    const total = outcomes.reduce((s, o) => s + o.total, 0);
    saveSession({
      kind: 'tuneup',
      durationMs: performance.now() - t0.current,
      total,
      correct: outcomes.reduce((s, o) => s + o.correct, 0),
      accuracy: verdict.accuracy,
      evLost: verdict.evLost,
      metrics: { ready: verdict.ready ? 1 : 0, secPerDeck: verdict.secPerDeck ?? 0, evLostPer100: verdict.evLostPer100, avgDecisionMs: verdict.avgDecisionMs },
      mistakes: verdict.top3,
    });
  }, [verdict, outcomes]);

  if (!plan) return <main className="stack"><p className="mono muted">Planning…</p></main>;

  if (idx < 0)
    return (
      <>
        <TopBar title="Tune-Up" />
        <main className="stack">
          <h2 className="display" style={{ fontSize: 'var(--t-2xl)' }}>
            15 minutes.
            <br />
            Ready or not.
          </h2>
          <ol className="menu" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {plan.map((s, i) => (
              <li key={s.id} className="field">
                <span>
                  <span className="mono muted">{String(i + 1).padStart(2, '0')} </span>
                  {s.title}
                </span>
                <span className="mono muted">{s.id === 'countdown' ? '1 deck' : s.id === 'sim' ? `${s.n} hands` : s.id === 'running' ? `${s.n} checks` : `${s.n}`}</span>
              </li>
            ))}
          </ol>
          <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
            Adapted to your last two weeks: weak areas get more reps. Targets: {settings.targets.countdownSecPerDeck}s/deck, {settings.targets.accuracyPct}% accuracy,
            ≤ {settings.targets.evLostPer100} units lost per 100 hands.
          </p>
          <Button
            variant="primary"
            big
            block
            disabled={!st.chart}
            onClick={() => {
              t0.current = performance.now();
              setIdx(0);
            }}
          >
            {st.chart ? 'Go' : 'Computing strategy…'}
          </Button>
        </main>
      </>
    );

  if (stage) {
    const key = `${stage.id}-${idx}`;
    switch (stage.id) {
      case 'countdown':
        return <Countdown key={key} embed={{ onDone: fromDrill('countdown') }} />;
      case 'running':
        return <RunningCount key={key} mode="rc" embed={{ onDone: fromDrill('running'), n: stage.n }} />;
      case 'truecount':
        return <TrueCountDrill key={key} embed={{ onDone: fromDrill('truecount'), n: stage.n }} />;
      case 'bs':
        return <BsFlash key={key} embed={{ onDone: fromDrill('bs'), n: stage.n }} />;
      case 'dev':
        return <DevFlash key={key} embed={{ onDone: fromDrill('dev'), n: stage.n }} />;
      case 'sim':
        return simCfg ? <SimRun key={key} cfg={simCfg} coach="off" hands={stage.n} countCheck={false} title="Tune-Up · table" kind="sim:tuneup" embedded onFinish={fromSim} /> : null;
    }
  }

  const v = verdict!;
  return (
    <>
      <TopBar title="Tune-Up" />
      <main className="stack">
        <div className={v.ready ? '' : 'flash-bad'} style={{ border: 'var(--hair) solid var(--fg)', padding: 'var(--s5) var(--s4)' }}>
          <span className="label">Verdict</span>
          <h2 className={'display ' + (v.ready ? '' : 'accent')}>{v.ready ? 'READY' : 'NOT READY'}</h2>
        </div>
        <Instruments>
          <Instrument label="Speed" value={v.secPerDeck !== undefined ? v.secPerDeck.toFixed(1) + 's' : '—'} unit="per deck" />
          <Instrument label="Decision" value={(v.avgDecisionMs / 1000).toFixed(2) + 's'} unit="avg, flash + TC" />
          <Instrument label="Accuracy" value={(v.accuracy * 100).toFixed(1) + '%'} tone={v.accuracy * 100 < settings.targets.accuracyPct ? 'bad' : undefined} />
          <Instrument label="EV lost" value={'−' + v.evLost.toFixed(2)} unit={`units · ${v.evLostPer100.toFixed(2)}/100 hands`} tone={v.evLostPer100 > settings.targets.evLostPer100 ? 'bad' : undefined} />
        </Instruments>
        <Box title="Targets">
          {v.checks.map((c) => (
            <div key={c.name} className="field">
              <span>{c.name}</span>
              <span className={'mono ' + (c.pass ? '' : 'accent')}>
                {c.value} <span className="muted">({c.target})</span> {c.pass ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </Box>
        <Box title="Your 3 mistakes">
          {v.top3.length === 0 ? (
            <p className="pos">None. Clean run.</p>
          ) : (
            v.top3.map((m, i) => (
              <div key={i} className="field">
                <div>
                  <div className="name">
                    {i + 1}. {m.label}
                  </div>
                  <div className="hint">{m.detail}</div>
                </div>
                {m.evLost ? <span className="mono accent">{'−' + m.evLost.toFixed(3)}</span> : <span />}
              </div>
            ))
          )}
        </Box>
        <div className="grid2" style={{ gap: 'var(--s2)' }}>
          <Button variant="primary" onClick={() => location.reload()}>
            Again
          </Button>
          <Button onClick={() => navigate('/stats')}>Stats</Button>
        </div>
      </main>
    </>
  );
}
