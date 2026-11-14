import { useEffect, useMemo, useRef, useState } from 'react';
import { TopBar, Seg, Button, Box, Field, Instrument, Instruments, fmtSigned } from '../ui/components';
import { useSettings } from '../store/SettingsContext';
import { useStrategy } from '../store/strategy';
import { kvGet, kvSet } from '../store/db';
import { saveSession } from '../store/sessions';
import { SIDE_BETS, sideBetEV, withPays, resolveSideBet, type SideBet } from '../engine/sidebets';
import { Table } from '../engine/game';
import { chartAction } from '../engine/strategy/chart';
import { valueOf, cardLabel } from '../engine/cards';
import { randomSeed } from '../engine/rng';
import { TableView } from './sim/TableView';

type Phase = 'setup' | 'play' | 'done';

interface RoundRec {
  round: number;
  ev: number;
  bet: boolean;
  net: number;
}

/** EV curve: x = round, y = exact side-bet EV (%); dots where the side bet was made. */
function EvCurve({ recs }: { recs: RoundRec[] }) {
  if (recs.length < 2) return null;
  const W = 320;
  const H = 160;
  const pad = { l: 34, r: 8, t: 8, b: 18 };
  const ys = recs.map((r) => r.ev * 100);
  const y0 = Math.min(0, ...ys) * 1.1;
  const y1 = Math.max(0.5, ...ys) * 1.1;
  const X = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (recs.length - 1);
  const Y = (v: number) => pad.t + ((y1 - v) * (H - pad.t - pad.b)) / (y1 - y0);
  const d = recs.map((r, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(r.ev * 100).toFixed(1)}`).join('');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Exact side-bet EV by round, with your bets marked" style={{ display: 'block' }}>
      <line x1={pad.l} x2={W - pad.r} y1={Y(0)} y2={Y(0)} stroke="var(--line)" />
      <text x={pad.l - 4} y={Y(0) + 3} fontSize="9" textAnchor="end" fill="var(--muted)" fontFamily="var(--font-mono)">
        0%
      </text>
      <text x={pad.l - 4} y={Y(y1 / 1.1) + 3} fontSize="9" textAnchor="end" fill="var(--muted)" fontFamily="var(--font-mono)">
        {(y1 / 1.1).toFixed(0)}%
      </text>
      <text x={pad.l} y={H - 4} fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">
        round 1
      </text>
      <text x={W - pad.r} y={H - 4} fontSize="9" textAnchor="end" fill="var(--muted)" fontFamily="var(--font-mono)">
        {recs.length}
      </text>
      <path d={d} fill="none" stroke="var(--fg)" strokeWidth={2} />
      {recs.map((r, i) =>
        r.bet ? <circle key={i} cx={X(i)} cy={Y(r.ev * 100)} r={4} fill={r.ev > 0 ? 'var(--pos)' : 'var(--bg)'} stroke={r.ev > 0 ? 'var(--bg)' : 'var(--accent)'} strokeWidth={2} /> : null,
      )}
    </svg>
  );
}

export function SideBetScreen() {
  const { settings } = useSettings();
  const rules = settings.rules;
  const st = useStrategy(rules);
  const [kind, setKind] = useState<SideBet['kind']>('luckyLadies');
  const [pays, setPays] = useState<Record<string, Record<string, number>>>({});
  const [phase, setPhase] = useState<Phase>('setup');
  const [speed, setSpeed] = useState(250);
  const [sideOn, setSideOn] = useState(false);
  const [recs, setRecs] = useState<RoundRec[]>([]);
  const tableRef = useRef<Table | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    kvGet<Record<string, Record<string, number>>>('sidebetPays').then((p) => p && setPays(p));
  }, []);
  const bet = useMemo(() => {
    const b = SIDE_BETS.find((x) => x.kind === kind)!;
    return { ...withPays(b, pays[kind] ?? {}), h17: rules.h17 };
  }, [kind, pays, rules.h17]);
  const offTop = useMemo(() => sideBetEV(bet, new Array(52).fill(rules.decks)), [bet, rules.decks]);

  const t = tableRef.current;
  // automatic stepping; main hand auto-played with the chart at 1 unit
  useEffect(() => {
    if (phase !== 'play' || !t || !st.chart) return;
    if (t.phase === 'bet' || t.phase === 'settled') return;
    const id = setTimeout(() => {
      if (t.phase === 'insurance') t.insure(false);
      else if (t.phase === 'play' && t.seats[t.turn.seat]?.human) {
        const s = t.human;
        const h = s.hands[t.turn.hand];
        const a = chartAction(st.chart!, h.cards.map(valueOf), valueOf(t.dealer[0]), t.availFor(h, s));
        t.act(t.legalActions().includes(a) ? a : 'stand');
      } else t.step();
      if (t.phase === 'settled') {
        const last = recs[recs.length - 1];
        if (last && last.bet && last.round === t.round) {
          const h = t.human.hands[0];
          const firstTwo = t.current!.dealt.filter((d) => d.who === t.opts.humanSeat).slice(0, 2).map((d) => d.card);
          const net = resolveSideBet(bet, firstTwo.length === 2 ? firstTwo : h.cards.slice(0, 2), t.dealer.slice(0, 2), t.dealer);
          setRecs((r) => r.map((x, i) => (i === r.length - 1 ? { ...x, net } : x)));
        }
      }
      setTick((k) => k + 1);
    }, speed);
    return () => clearTimeout(id);
  }, [phase, t, tick, speed, st.chart, recs, bet]);

  const deal = () => {
    if (!t) return;
    if (t.needsShuffle) {
      finish();
      return;
    }
    const ev = sideBetEV(bet, t.unseenByCard()).ev;
    setRecs((r) => [...r, { round: t.round + 1, ev, bet: sideOn, net: 0 }]);
    t.placeBet(1);
    setTick((k) => k + 1);
  };
  const finish = () => {
    setPhase('done');
  };

  const summary = useMemo(() => {
    const avail = recs.reduce((s, r) => s + Math.max(0, r.ev), 0);
    const captured = recs.reduce((s, r) => s + (r.bet ? r.ev : 0), 0);
    const plusRounds = recs.filter((r) => r.ev > 0).length;
    const caught = recs.filter((r) => r.ev > 0 && r.bet).length;
    const bad = recs.filter((r) => r.ev <= 0 && r.bet);
    return {
      avail,
      captured,
      plusRounds,
      caught,
      badN: bad.length,
      badEV: bad.reduce((s, r) => s + r.ev, 0),
      net: recs.reduce((s, r) => s + (r.bet ? r.net : 0), 0),
      bets: recs.filter((r) => r.bet).length,
      timing: avail > 0 ? captured / avail : recs.some((r) => r.bet) ? -1 : 1,
    };
  }, [recs]);

  const saved = useRef(false);
  useEffect(() => {
    if (phase !== 'done' || saved.current) return;
    saved.current = true;
    saveSession({
      kind: 'sidebet',
      durationMs: 0,
      total: recs.length,
      correct: recs.filter((r) => (r.ev > 0) === r.bet).length,
      accuracy: recs.length ? recs.filter((r) => (r.ev > 0) === r.bet).length / recs.length : 0,
      evLost: Math.max(0, summary.avail - summary.captured),
      metrics: { timing: summary.timing, captured: summary.captured, available: summary.avail, plusRounds: summary.plusRounds },
      mistakes: summary.badN ? [{ key: 'sidebet:' + kind, label: bet.name, detail: `${summary.badN} side bets at negative EV (${(summary.badEV * 100).toFixed(1)}% total)` }] : [],
    });
  }, [phase, recs, summary, kind, bet.name]);

  if (phase === 'setup')
    return (
      <>
        <TopBar title="Side bet hunter" />
        <main className="stack">
          <p>
            Pick a side bet and its paytable. You play the shoe at the minimum (main hand auto-played by your chart) and decide each round whether to make the side
            bet, by tracking the key cards yourself. After the shoe you see the exact EV curve and how well your timing caught the positive spots.
          </p>
          <div className="choice-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {SIDE_BETS.map((b) => (
              <Button key={b.kind} selected={b.kind === kind} onClick={() => setKind(b.kind)}>
                {b.name}
              </Button>
            ))}
          </div>
          <Box title="Paytable (to 1)" right={<span className={'mono ' + (offTop.ev > 0 ? 'pos' : '')}>off the top {fmtSigned(offTop.ev * 100, 2)}%</span>}>
            {bet.lines.map((l) => (
              <Field key={l.id} name={l.label}>
                <input
                  type="number"
                  min={0}
                  value={l.pays}
                  style={{ width: 90 }}
                  aria-label={l.label}
                  onChange={(e) => {
                    const next = { ...pays, [kind]: { ...(pays[kind] ?? {}), [l.id]: Number(e.target.value) } };
                    setPays(next);
                    kvSet('sidebetPays', next);
                  }}
                />
              </Field>
            ))}
            {offTop.ev > 0 && <p className="accent" style={{ marginTop: 'var(--s2)' }}>Positive off the top: check the paytable or deck count.</p>}
          </Box>
          <Field name="Dealer speed" hint="ms per card">
            <Seg options={[500, 350, 250, 120].map((v) => ({ value: v, label: String(v) }))} value={speed} onChange={setSpeed} />
          </Field>
          <Button
            variant="primary"
            big
            block
            disabled={!st.chart}
            onClick={() => {
              tableRef.current = new Table({ rules, seats: Math.min(3, rules.seats), humanSeat: Math.min(3, rules.seats) - 1, chart: st.chart!, seed: randomSeed(), granularity: settings.count.deckGranularity, rounding: settings.count.rounding });
              setRecs([]);
              saved.current = false;
              setPhase('play');
              setTick((k) => k + 1);
            }}
          >
            {st.chart ? 'Start the shoe' : 'Computing strategy…'}
          </Button>
        </main>
      </>
    );

  if (phase === 'done' || !t)
    return (
      <>
        <TopBar title="Side bet hunter" />
        <main className="stack">
          <span className="label">
            {bet.name} · {recs.length} rounds
          </span>
          <Box title="Exact EV by round (dots = your side bets)">
            <EvCurve recs={recs} />
          </Box>
          <Instruments>
            <Instrument label="Timing" value={summary.timing < 0 ? '—' : (summary.timing * 100).toFixed(0) + '%'} unit="EV captured / available" tone={summary.timing < 0.5 ? 'bad' : undefined} />
            <Instrument label="+EV rounds" value={`${summary.caught}/${summary.plusRounds}`} unit="caught" />
            <Instrument label="Captured" value={fmtSigned(summary.captured, 2)} unit={`of ${summary.avail.toFixed(2)} units available`} tone={summary.captured > 0 ? 'pos' : undefined} />
            <Instrument label="Bad bets" value={String(summary.badN)} unit={`${fmtSigned(summary.badEV, 2)} units EV`} tone={summary.badN ? 'bad' : undefined} />
            <Instrument label="Actual result" value={fmtSigned(summary.net, 0)} unit={`units on ${summary.bets} side bets`} />
          </Instruments>
          <p className="muted" style={{ fontSize: 'var(--t-xs)' }}>
            EV per round is exact for the unseen cards (by rank and suit) before the deal, per unit of side bet. Timing = Σ EV of rounds you bet ÷ Σ EV of all
            positive rounds.
          </p>
          <div className="grid2" style={{ gap: 'var(--s2)' }}>
            <Button variant="primary" onClick={() => setPhase('setup')}>
              Another shoe
            </Button>
            <Button onClick={() => history.back()}>Done</Button>
          </div>
        </main>
      </>
    );

  const betting = t.phase === 'bet' || t.phase === 'settled';
  const last = recs[recs.length - 1];
  return (
    <>
      <TopBar
        title="Side bet hunter"
        right={
          <span className="mono" style={{ fontSize: 'var(--t-xs)' }}>
            {recs.length}
          </span>
        }
      />
      <main className="stack">
        <TableView table={t} />
        <div className="mono" style={{ minHeight: 24, textAlign: 'center', fontSize: 'var(--t-sm)' }}>
          {t.phase === 'settled' && last?.bet ? <span className={last.net > 0 ? 'pos' : 'muted'}>side bet {last.net > 0 ? `+${last.net}` : '−1'}</span> : null}
        </div>
        {betting && (
          <>
            <Button big block selected={sideOn} onClick={() => setSideOn(!sideOn)} aria-pressed={sideOn}>
              Side bet: {sideOn ? 'ON' : 'OFF'}
            </Button>
            <Button variant="primary" big block onClick={deal}>
              {t.needsShuffle ? 'Cut card — see results' : 'Deal'}
            </Button>
            <Button variant="ghost" onClick={finish}>
              End shoe now
            </Button>
          </>
        )}
        {settings.count.keyCards.length > 0 && <p className="muted mono" style={{ fontSize: 'var(--t-xs)' }}>Your key cards: {settings.count.keyCards.map(cardLabel).join(' ')}</p>}
      </main>
    </>
  );
}
