import { useEffect, useMemo, useState } from 'react';
import { TopBar, Field, Seg, Button, Box, Instrument, Instruments, fmtSigned } from '../ui/components';
import { TrendChart } from '../ui/TrendChart';
import { useSettings } from '../store/SettingsContext';
import { useStrategy } from '../store/strategy';
import { listSessions, type SessionRecord } from '../store/sessions';
import { SimRun } from './sim/SimScreen';
import type { SimSummary } from './sim/summary';
import type { EdgeModel } from '../engine/edge';
import type { SimConfig } from './sim/useSim';
import { toFeelRecord, feelStats, takeaways, situations, isRight, type FeelRecord, type FeelStats } from '../engine/feel';
import { ACTION_LABEL } from '../engine/strategy/chart';
import { navigate } from '../router';
import { useEdgeModel } from '../store/edge';
import { scoreBets } from '../engine/edge';
import { rampBet } from '../engine/drills';

type Tab = 'play' | 'history';

export function feelRecordsFrom(s: SimSummary, at = Date.now()): FeelRecord[] {
  return s.decisions.map((d) =>
    toFeelRecord(
      {
        values: d.snap.values,
        up: d.snap.up,
        tc: d.snap.tc,
        bet: d.bet,
        chosen: d.g.chosen,
        chart: d.g.chart,
        index: d.g.index,
        best: d.g.best,
        evChosen: d.g.evChosen,
        evChart: d.g.evChart,
        evBest: d.g.evBest,
      },
      at,
    ),
  );
}

function FeelSummary({ st, recs }: { st: FeelStats; recs: FeelRecord[] }) {
  const tk = takeaways(recs);
  const sits = situations(recs).sort((a, b) => a.ev - b.ev);
  return (
    <div className="stack">
      <div style={{ border: 'var(--hair) solid var(--fg)', padding: 'var(--s4)' }}>
        <span className="label">Feel rating</span>
        <div className={'display ' + (st.rating < 50 ? 'accent' : '')}>{st.rating.toFixed(0)}</div>
        <span className="mono muted" style={{ fontSize: 'var(--t-xs)' }}>
          50 = plays the chart · 100 = captures every exact-composition gain
        </span>
      </div>
      <Instruments>
        <Instrument label="Fringe plays" value={String(st.fringe)} unit={`${st.fringeIndex} index · ${st.fringeFeel} feel`} />
        <Instrument label="Fringe right" value={st.fringe ? `${st.fringeRight}/${st.fringe}` : '—'} unit="matched the exact play" />
        <Instrument label="Fringe EV" value={fmtSigned(st.fringeEV, 2)} unit="units vs the chart" tone={st.fringeEV < 0 ? 'bad' : st.fringeEV > 0 ? 'pos' : undefined} />
        <Instrument label="Missed" value={'−' + st.missedEV.toFixed(2)} unit="units: chart play when exact differed" />
        <Instrument label="Captured" value={fmtSigned(st.captured, 2)} unit={`of ${st.opportunity.toFixed(2)} units available`} />
      </Instruments>
      {tk.length > 0 && (
        <Box title="Takeaways">
          <div className="stack" style={{ gap: 'var(--s2)' }}>
            {tk.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        </Box>
      )}
      {sits.length > 0 && (
        <Box title="Fringe situations (leaky first)">
          <table className="chart" style={{ fontSize: 'var(--t-sm)' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', paddingLeft: 6 }}>Play</th>
                <th>TC</th>
                <th>Right</th>
                <th>EV</th>
              </tr>
            </thead>
            <tbody>
              {sits.map((s) => (
                <tr key={s.sit}>
                  <td style={{ textAlign: 'left', paddingLeft: 6 }}>
                    {s.label} · {ACTION_LABEL[s.action]}
                  </td>
                  <td>{s.minTc === s.maxTc ? s.minTc : `${s.minTc}…${s.maxTc}`}</td>
                  <td>
                    {s.right}/{s.n}
                  </td>
                  <td className={s.ev < 0 ? 'accent' : 'pos'}>{fmtSigned(s.ev, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
    </div>
  );
}

function BetFeel({ bets, model, ramp }: { bets: SimSummary['bets']; model: EdgeModel; ramp: number[] }) {
  const b = scoreBets(bets, model, (tc) => rampBet(ramp, tc));
  return (
    <Box title="Bet feel">
      <Instruments>
        <Instrument label="Your bets" value={fmtSigned(b.betEV, 2)} unit={`units EV · ${b.units} units bet`} tone={b.betEV < 0 ? 'bad' : 'pos'} />
        <Instrument label="Your ramp" value={fmtSigned(b.rampEV, 2)} unit={`units EV · ${b.rampUnits} units bet`} />
        <Instrument label="Difference" value={fmtSigned(b.diff, 2)} unit="units: feel bets vs ramp" tone={b.diff < 0 ? 'bad' : b.diff > 0 ? 'pos' : undefined} />
      </Instruments>
      <p className="muted" style={{ fontSize: 'var(--t-xs)', marginTop: 'var(--s2)' }}>
        Edge of each round from the effect-of-removal model for the cards left; EV = units × edge.
      </p>
    </Box>
  );
}

export function FeelLabScreen() {
  const { settings } = useSettings();
  const st = useStrategy(settings.rules);
  const model = useEdgeModel(settings.rules, st.chart);
  const [tab, setTab] = useState<Tab>('play');
  const [hands, setHands] = useState(60);
  const [hot, setHot] = useState(0.08);
  const [speed, setSpeed] = useState(400);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState<{ recs: FeelRecord[]; summary: SimSummary } | null>(null);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  useEffect(() => {
    listSessions('feel').then(setHistory);
  }, [done]);
  const cfg = useMemo<SimConfig | null>(
    () =>
      started && st.chart
        ? {
            rules: settings.rules,
            chart: st.chart,
            seats: Math.min(2, settings.rules.seats),
            humanSeat: Math.min(2, settings.rules.seats) - 1,
            speedMs: speed,
            granularity: settings.count.deckGranularity,
            rounding: settings.count.rounding,
            skew: hot,
          }
        : null,
    [started, st.chart, settings.rules, settings.count, speed, hot],
  );

  if (cfg && !done)
    return (
      <SimRun
        cfg={cfg}
        coach="off"
        hands={hands}
        countCheck={false}
        title="Feel Lab"
        kind="feel"
        embedded
        enrich={(s) => {
          const recs = feelRecordsFrom(s);
          const fs = feelStats(recs);
          return {
            metrics: { feelRating: fs.rating, fringe: fs.fringe, fringeRight: fs.fringeRight, fringeEV: fs.fringeEV, missedEV: fs.missedEV },
            extra: { feel: recs },
          };
        }}
        onFinish={(s) => setDone({ recs: feelRecordsFrom(s), summary: s })}
      />
    );

  const allRecs = history.flatMap((h) => h.feel ?? []);
  const overall = feelStats(allRecs.map((r) => r));
  return (
    <>
      <TopBar title="Feel Lab" />
      <main className="stack">
        {done ? (
          <>
            <span className="label">This session · {done.summary.hands} hands</span>
            <FeelSummary st={feelStats(done.recs)} recs={done.recs} />
            {model && <BetFeel bets={done.summary.bets} model={model} ramp={settings.bet.ramp} />}
            <div className="grid2" style={{ gap: 'var(--s2)' }}>
              <Button variant="primary" onClick={() => (setDone(null), setStarted(false))}>
                New session
              </Button>
              <Button onClick={() => navigate('/review')}>Review hands</Button>
            </div>
          </>
        ) : (
          <>
            <Seg options={[{ value: 'play', label: 'PLAY' }, { value: 'history', label: 'OVER TIME' }]} value={tab} onChange={setTab} />
            {tab === 'play' ? (
              <>
                <p>
                  Play on feel. No hints. Every decision is scored against the basic strategy chart, your index chart and the exact composition-perfect play;
                  departures from the chart are your <em>fringe plays</em>.
                </p>
                <div>
                  <Field name="Hands">
                    <Seg options={[30, 60, 100, 200].map((v) => ({ value: v, label: String(v) }))} value={hands} onChange={setHands} />
                  </Field>
                  <Field name="Shoes" hint="Hot: small cards front-loaded; peak TC ≈ +6 (hot), +9 (hotter)">
                    <Seg options={[{ value: 0, label: 'NATURAL' }, { value: 0.08, label: 'HOT' }, { value: 0.15, label: 'HOTTER' }]} value={hot} onChange={setHot} />
                  </Field>
                  <Field name="Dealer speed" hint="ms per card">
                    <Seg options={[800, 600, 400, 250].map((v) => ({ value: v, label: String(v) }))} value={speed} onChange={setSpeed} />
                  </Field>
                </div>
                <Button variant="primary" big block disabled={!st.chart} onClick={() => setStarted(true)}>
                  {st.chart ? 'Play on feel' : 'Computing strategy…'}
                </Button>
              </>
            ) : (
              <>
                <TrendChart title="Feel rating" points={[...history].reverse().map((h) => ({ t: h.at, v: h.metrics?.feelRating ?? 50 }))} fmt={(v) => v.toFixed(0)} target={50} />
                {allRecs.length ? <FeelSummary st={overall} recs={allRecs} /> : <p className="muted">No Feel Lab sessions yet.</p>}
                <p className="muted" style={{ fontSize: 'var(--t-xs)' }}>
                  Feel rating = clamp(50 + 50·C/D, 0, 100), where C = Σ bet·(EV chosen − EV chart), O = Σ bet·max(0, EV exact best − EV chart), D = max(O, 0.5% of total
                  bet). All EVs are exact for the cards remaining at each decision. {allRecs.filter(isRight).length} of {allRecs.length} stored situations were the
                  exact play.
                </p>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
