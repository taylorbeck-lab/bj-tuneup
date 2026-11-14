import { useEffect, useMemo, useState } from 'react';
import { TopBar, Seg, Box, Instrument, Instruments, Button } from '../ui/components';
import { TrendChart } from '../ui/TrendChart';
import { listSessions, type SessionRecord } from '../store/sessions';
import { loadSrs, MASTERED_BOX, type SrsItem } from '../store/srs';
import { useSettings } from '../store/SettingsContext';
import { DRILLS } from './drills/DrillsMenu';
import { navigate } from '../router';

const KIND_LABEL: Record<string, string> = {
  tuneup: 'Tune-Up',
  sim: 'Table sim',
  'sim:tuneup': 'Tune-Up table',
  feel: 'Feel Lab',
  strike: 'Strike mode',
  sidebet: 'Side bet hunter',
  ...Object.fromEntries(DRILLS.map((d) => [d.kind, d.title])),
  'drill:bet-ramp': 'Bet sizing (ramp)',
  'drill:bet-kelly': 'Bet sizing (Kelly)',
};
const label = (k: string) => KIND_LABEL[k] ?? k;

type Tab = 'overview' | 'history' | 'repetition';

export function StatsScreen() {
  const { settings } = useSettings();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [srs, setSrs] = useState<SrsItem[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    listSessions().then(setSessions);
    loadSrs().then((m) => setSrs([...m.values()]));
  }, []);

  const byKind = useMemo(() => {
    const m: Record<string, SessionRecord[]> = {};
    for (const s of [...sessions].reverse()) (m[s.kind] ??= []).push(s);
    return m;
  }, [sessions]);
  const series = (kind: string, f: (s: SessionRecord) => number | undefined) =>
    (byKind[kind] ?? []).map((s) => ({ t: s.at, v: f(s) })).filter((p): p is { t: number; v: number } => p.v !== undefined && isFinite(p.v));

  const simAll = [...(byKind['sim'] ?? []), ...(byKind['sim:tuneup'] ?? []), ...(byKind['feel'] ?? [])].sort((a, b) => a.at - b.at);
  const hands = simAll.reduce((s, x) => s + (x.hands ?? 0), 0);
  const evLost = simAll.reduce((s, x) => s + (x.evLost ?? 0), 0);
  const leaks = srs.filter((i) => i.box <= 1 && i.misses > 0).sort((a, b) => b.misses - a.misses || a.box - b.box);
  const mastered = srs.filter((i) => i.box >= MASTERED_BOX).length;

  return (
    <>
      <TopBar title="Stats" />
      <main className="stack">
        <Seg
          options={[{ value: 'overview', label: 'TRENDS' }, { value: 'history', label: 'HISTORY' }, { value: 'repetition', label: 'REPEAT' }]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'overview' && (
          <>
            <Instruments>
              <Instrument label="Sessions" value={String(sessions.length)} />
              <Instrument label="Hands played" value={String(hands)} />
              <Instrument label="EV lost / 100" value={hands ? (100 * evLost / hands).toFixed(2) : '—'} unit="units, all table play" tone={hands && (100 * evLost) / hands > settings.targets.evLostPer100 ? 'bad' : undefined} />
              <Instrument label="Ready rate" value={byKind['tuneup']?.length ? Math.round((100 * byKind['tuneup'].filter((s) => s.metrics?.ready).length) / byKind['tuneup'].length) + '%' : '—'} unit="Tune-Ups" />
            </Instruments>
            <TrendChart title="Feel rating" points={series('feel', (s) => s.metrics?.feelRating)} fmt={(v) => v.toFixed(0)} />
            <TrendChart title="Table EV lost / 100 hands" points={simAll.map((s) => ({ t: s.at, v: s.metrics?.evLostPer100 ?? 0 }))} fmt={(v) => v.toFixed(2)} target={settings.targets.evLostPer100} higherIsBetter={false} />
            <TrendChart title="Countdown s / deck" points={series('drill:countdown', (s) => s.metrics?.secPerDeck)} target={settings.targets.countdownSecPerDeck} higherIsBetter={false} />
            {['drill:running', 'drill:truecount', 'drill:bs', 'drill:dev', 'drill:discard'].map((k) => (
              <TrendChart key={k} title={`${label(k)} accuracy %`} points={series(k, (s) => s.accuracy * 100)} fmt={(v) => v.toFixed(0)} target={settings.targets.accuracyPct} />
            ))}
            <TrendChart title="Deviation answer time (s)" points={series('drill:dev', (s) => (s.avgMs ?? 0) / 1000)} fmt={(v) => v.toFixed(2)} higherIsBetter={false} />
          </>
        )}
        {tab === 'history' && (
          <div className="menu">
            {sessions.length === 0 && <p className="muted" style={{ padding: 'var(--s3) 0' }}>No sessions yet.</p>}
            {sessions.slice(0, 200).map((s) => (
              <div key={s.id}>
                <button onClick={() => setOpen(open === s.id ? null : s.id)} style={{ width: '100%' }}>
                  <div>
                    <div className="title" style={{ fontSize: 'var(--t-md)' }}>
                      {label(s.kind)}
                    </div>
                    <div className="sub">
                      {new Date(s.at).toLocaleString()} · {s.total} items{s.hands ? ` · ${s.hands} hands` : ''}
                    </div>
                  </div>
                  <span className={'num ' + (s.accuracy < settings.targets.accuracyPct / 100 ? 'accent' : '')}>
                    {Math.round(s.accuracy * 100)}%{s.evLost ? ` · −${s.evLost.toFixed(2)}u` : ''}
                    {s.kind === 'tuneup' ? (s.metrics?.ready ? ' · READY' : ' · NOT READY') : ''}
                  </span>
                </button>
                {open === s.id && (
                  <Box title="Mistakes" right={s.shoeId ? <Button variant="ghost" onClick={() => navigate('/review/' + s.shoeId)}>Review hands</Button> : undefined}>
                    {s.mistakes.length === 0 ? (
                      <p className="muted">None.</p>
                    ) : (
                      s.mistakes.slice(0, 15).map((m, i) => (
                        <div key={i} className="field">
                          <div>
                            <div className="name">{m.label}</div>
                            <div className="hint">{m.detail}</div>
                          </div>
                          {m.evLost ? <span className="mono accent">−{m.evLost.toFixed(3)}</span> : <span />}
                        </div>
                      ))
                    )}
                  </Box>
                )}
              </div>
            ))}
          </div>
        )}
        {tab === 'repetition' && (
          <>
            <Instruments>
              <Instrument label="Tracked" value={String(srs.length)} />
              <Instrument label="Leaking" value={String(leaks.length)} tone={leaks.length ? 'bad' : undefined} />
              <Instrument label="Mastered" value={String(mastered)} tone={mastered ? 'pos' : undefined} />
            </Instruments>
            <p className="muted" style={{ fontSize: 'var(--t-sm)' }}>
              Every miss (in drills and at the table) puts that situation back in box 0. Low boxes come up far more often in the flash drills until you get them
              right repeatedly.
            </p>
            <div className="grid2" style={{ gap: 'var(--s2)' }}>
              <Button onClick={() => navigate('/drills/bs')}>Drill BS leaks</Button>
              <Button onClick={() => navigate('/drills/dev')}>Drill index leaks</Button>
            </div>
            <div className="menu">
              {leaks.slice(0, 40).map((i) => (
                <div key={i.key} className="field">
                  <div>
                    <div className="name">{i.label ?? i.key}</div>
                    <div className="hint mono">
                      box {i.box} · {i.hits} right · {i.misses} wrong
                    </div>
                  </div>
                  <span className="tag bad">leak</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
