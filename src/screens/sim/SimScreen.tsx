import { useEffect, useMemo, useRef, useState } from 'react';
import { TopBar, Field, Seg, Switch, Button, Box } from '../../ui/components';
import { ActionBar } from '../../ui/ActionBar';
import { Keypad } from '../../ui/Keypad';
import { useSettings } from '../../store/SettingsContext';
import { useStrategy } from '../../store/strategy';
import { useIndexPlays } from '../../store/indices';
import { useSim, type SimConfig } from './useSim';
import { TableView } from './TableView';
import { summarize, type SimSummary } from './summary';
import { SimResultsView, persistSession } from './SimResults';
import { gradeDecision } from '../../engine/grade';
import { ACTION_LABEL } from '../../engine/strategy/chart';
import { buzzError } from '../../ui/haptics';
import { navigate } from '../../router';
import { rulesLabel } from '../../engine/rules';
import { bsItemKey } from '../../engine/drills';
import { recordSrs } from '../../store/srs';

type Coach = 'off' | 'whisper';

/** Bet chips from the user's ramp. */
export function BetBar({ ramp, last, onBet }: { ramp: number[]; last: number; onBet: (u: number) => void }) {
  const chips = [...new Set([...ramp, Math.max(...ramp) + 2])].sort((a, b) => a - b);
  return (
    <div className="stack" style={{ gap: 'var(--s2)' }}>
      <span className="label">Bet (units)</span>
      <div className="choice-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {chips.map((u) => (
          <button key={u} className={'btn' + (u === last ? ' selected' : '')} onClick={() => onBet(u)}>
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface SimRunProps {
  cfg: SimConfig;
  coach: Coach;
  hands: number;
  countCheck: boolean;
  title: string;
  kind: string;
  onFinish?: (s: SimSummary) => void;
  /** Hide the final results (caller shows its own). */
  embedded?: boolean;
}

/** Runs a sim session to completion; reusable by Tune-Up / Feel Lab. */
export function SimRun({ cfg, coach, hands, countCheck, title, kind, onFinish, embedded }: SimRunProps) {
  const { settings } = useSettings();
  const { plays } = useIndexPlays(cfg.rules);
  const sim = useSim(cfg);
  const t = sim.table;
  const [lastBet, setLastBet] = useState(settings.bet.ramp[0]);
  const [hint, setHint] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const checks = useRef<{ said: number; truth: number }[]>([]);
  const [summary, setSummary] = useState<SimSummary | null>(null);
  const t0 = useRef(performance.now());
  const [ending, setEnding] = useState(false);

  const handsPlayed = sim.logs.length;
  const finish = async () => {
    setEnding(true);
    const s = await summarize(sim.logs, sim.analyses, cfg.chart, plays, settings.bet.ramp, checks.current);
    // Feed spaced repetition: missed situations come back more often in the flash drills.
    for (const d of s.decisions) {
      if (d.snap.values.length !== 2 || d.snap.splitHands > 1) continue;
      const key = d.g.indexPlayId ? 'dev:' + d.g.indexPlayId : bsItemKey(d.snap.values, d.snap.up);
      recordSrs(key, !d.g.error);
    }
    persistSession(kind, s, sim.logs, cfg.rules, performance.now() - t0.current);
    setSummary(s);
    onFinish?.(s);
  };

  useEffect(() => {
    if (!t || summary || ending) return;
    if (t.phase === 'settled' && handsPlayed >= hands && hands > 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.tick]);

  if (summary && !embedded)
    return (
      <>
        <TopBar title={title} />
        <main className="stack">
          <span className="label">Session results · {rulesLabel(cfg.rules)}</span>
          <SimResultsView summary={summary} />
          <div className="grid2" style={{ gap: 'var(--s2)' }}>
            <Button variant="primary" onClick={() => location.reload()}>
              New session
            </Button>
            <Button onClick={() => navigate('/')}>Home</Button>
          </div>
        </main>
      </>
    );
  if (!t) return null;
  if (ending) return <main className="stack"><p className="mono">Scoring every decision with exact EV…</p></main>;

  const onAct = (a: Parameters<typeof sim.act>[0]) => {
    const an = sim.act(a);
    setHint(null);
    if (!an) return;
    an.evs.then((evs) => {
      const g = gradeDecision(an.snap, evs, cfg.chart, plays);
      if (g.error) buzzError();
      if (coach === 'whisper') {
        const diff = g.evIndex - g.evChosen;
        setHint(
          g.error
            ? { ok: false, text: `${g.indexPlayId ? 'Index' : 'Chart'}: ${ACTION_LABEL[g.index]} · ${diff >= 0 ? '−' : '+'}${Math.abs(diff).toFixed(3)}u` }
            : { ok: true, text: g.fringe ? `✓ deviation (${ACTION_LABEL[g.index]})` : '✓' },
        );
      }
    });
  };

  const betting = t.phase === 'bet' || t.phase === 'settled';
  const needCheck = betting && t.needsShuffle && countCheck && !checking && checks.current.length < t.shoesPlayed + 1;
  return (
    <>
      <TopBar
        title={title}
        right={
          <span className="mono" style={{ fontSize: 'var(--t-xs)' }}>
            {handsPlayed}
            {hands ? '/' + hands : ''}
          </span>
        }
      />
      <main className="stack">
        <TableView table={t} />
        <div className="mono" style={{ minHeight: 24, fontSize: 'var(--t-sm)', textAlign: 'center' }} role="status">
          {coach === 'whisper' && hint ? <span className={hint.ok ? 'muted' : 'accent'}>{hint.text}</span> : null}
          {t.phase === 'settled' && !hint ? <span className="muted">{netLine(t.logs[t.logs.length - 1]?.net ?? 0)}</span> : null}
        </div>
        {t.phase === 'insurance' && (
          <div className="grid2" style={{ gap: 'var(--s2)' }}>
            <Button big onClick={() => sim.insure(true)}>
              Insurance
            </Button>
            <Button big onClick={() => sim.insure(false)}>
              No insurance
            </Button>
          </div>
        )}
        {t.phase === 'play' && t.seats[t.turn.seat]?.human && <ActionBar legal={t.legalActions()} onPick={onAct} />}
        {(needCheck || checking) && (
          <Box title="Shuffle — count check">
            <p style={{ marginBottom: 'var(--s2)' }}>Cut card is out. What is your running count?</p>
            <Keypad
              onSubmit={(n) => {
                checks.current.push({ said: n, truth: t.rc });
                if (n !== t.rc) buzzError();
                setHint({ ok: n === t.rc, text: n === t.rc ? `✓ count ${t.rc}` : `Count was ${t.rc}, you said ${n}` });
                setChecking(false);
                sim.reshuffle();
              }}
            />
          </Box>
        )}
        {betting && !needCheck && !checking && (
          <>
            <BetBar
              ramp={settings.bet.ramp}
              last={lastBet}
              onBet={(u) => {
                setLastBet(u);
                setHint(null);
                sim.placeBet(u);
              }}
            />
            <Button variant="ghost" onClick={finish} disabled={handsPlayed === 0}>
              End session & score
            </Button>
          </>
        )}
      </main>
    </>
  );
}

function netLine(n: number): string {
  return n > 0 ? `+${n} units` : n < 0 ? `−${-n} units` : 'push';
}

export function SimScreen() {
  const { settings } = useSettings();
  const st = useStrategy(settings.rules);
  const r = settings.rules;
  const [seats, setSeats] = useState(r.seats);
  const [seatPos, setSeatPos] = useState<'first' | 'middle' | 'third'>('third');
  const [speed, setSpeed] = useState(450);
  const [coach, setCoach] = useState<Coach>('off');
  const [hands, setHands] = useState(100);
  const [countCheck, setCountCheck] = useState(true);
  const [started, setStarted] = useState(false);
  const cfg = useMemo<SimConfig | null>(() => {
    if (!started || !st.chart) return null;
    const humanSeat = seatPos === 'first' ? 0 : seatPos === 'third' ? seats - 1 : Math.floor((seats - 1) / 2);
    return { rules: r, chart: st.chart, seats, humanSeat, speedMs: speed, granularity: settings.count.deckGranularity, rounding: settings.count.rounding };
  }, [started, st.chart, r, seats, seatPos, speed, settings.count]);

  if (cfg) return <SimRun cfg={cfg} coach={coach} hands={hands} countCheck={countCheck} title="Table sim" kind="sim" />;
  return (
    <>
      <TopBar title="Table sim" />
      <main className="stack">
        <p>
          A full {r.decks}-deck game. You keep the count, bet and play. {coach === 'off' ? 'Errors are logged silently and revealed at the end.' : 'After each decision a quiet hint shows the EV difference.'}
        </p>
        <div>
          <Field name="Seats">
            <Seg options={[1, 2, 3, 4, 5, 6].map((v) => ({ value: v, label: String(v) }))} value={seats} onChange={setSeats} />
          </Field>
          <Field name="Your seat">
            <Seg options={[{ value: 'first', label: '1ST' }, { value: 'middle', label: 'MID' }, { value: 'third', label: '3RD' }]} value={seatPos} onChange={setSeatPos} />
          </Field>
          <Field name="Dealer speed" hint="ms per card">
            <Seg options={[800, 600, 450, 300, 150].map((v) => ({ value: v, label: String(v) }))} value={speed} onChange={setSpeed} />
          </Field>
          <Field name="Coach" hint="Whisper = hint after each decision">
            <Seg options={[{ value: 'off', label: 'OFF' }, { value: 'whisper', label: 'WHISPER' }]} value={coach} onChange={setCoach} />
          </Field>
          <Field name="Hands">
            <Seg options={[{ value: 50, label: '50' }, { value: 100, label: '100' }, { value: 200, label: '200' }, { value: 0, label: '∞' }]} value={hands} onChange={setHands} />
          </Field>
          <Field name="Count check at shuffle">
            <Switch checked={countCheck} onChange={setCountCheck} label="Count check" />
          </Field>
        </div>
        <Button variant="primary" big block disabled={!st.chart} onClick={() => setStarted(true)}>
          {st.chart ? 'Sit down' : 'Computing strategy…'}
        </Button>
      </main>
    </>
  );
}
