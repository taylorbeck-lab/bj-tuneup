import { useEffect, useMemo, useState } from 'react';
import { TopBar, Button, Box, Instrument, Instruments, CardTile, Hand, fmtSigned } from '../ui/components';
import { Keypad } from '../ui/Keypad';
import { ActionBar } from '../ui/ActionBar';
import { useSettings } from '../store/SettingsContext';
import { useStrategy } from '../store/strategy';
import { SCENARIOS, scenarioComp, dealFrom, grade, type Scenario } from '../engine/strike';
import { call } from '../workers/client';
import type { GoalHandResult } from '../workers/handlers';
import { goalProbAfter, type GoalDP, type Dist } from '../engine/goal';
import { ACTION_LABEL, type Action } from '../engine/strategy/chart';
import { valueOf, handTotal } from '../engine/cards';
import { canDoubleTotal } from '../engine/rules';
import { randomSeed } from '../engine/rng';
import { saveSession } from '../store/sessions';

type Phase = 'pick' | 'setup' | 'bet' | 'play' | 'result';

interface Setup {
  dist: Dist;
  dp: GoalDP;
  edge: number;
}

const pct = (x: number) => (x * 100).toFixed(1) + '%';

export function StrikeScreen() {
  const { settings } = useSettings();
  const rules = settings.rules;
  const st = useStrategy(rules);
  const [phase, setPhase] = useState<Phase>('pick');
  const [sc, setSc] = useState<Scenario | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [bet, setBet] = useState(0);
  const [deal, setDeal] = useState<ReturnType<typeof dealFrom> | null>(null);
  const [hand, setHand] = useState<GoalHandResult[] | null>(null);
  const [chosen, setChosen] = useState<Action | null>(null);

  const start = async (s: Scenario) => {
    if (!st.chart) return;
    setSc(s);
    setPhase('setup');
    const comp = scenarioComp(s, rules.decks);
    const r = await call('strikeSetup', comp, rules, st.chart, s.target, s.hands, s.minBet, Math.min(s.maxBet, s.target), s.sitOut);
    setSetup({ dist: new Map(r.dist), dp: { V: r.V.map((v) => Float64Array.from(v)), bestBet: r.bestBet.map((v) => Int16Array.from(v)), target: s.target }, edge: r.edge });
    setDeal(dealFrom(comp, randomSeed()));
    setHand(null);
    setChosen(null);
    setPhase('bet');
  };

  const betTable = useMemo(() => {
    if (!sc || !setup) return [];
    const out: { x: number; p: number; ev: number }[] = [];
    if (sc.sitOut) out.push({ x: 0, p: setup.dp.V[sc.hands - 1][Math.round(sc.bankroll * 2)], ev: 0 });
    for (let x = sc.minBet; x <= Math.min(sc.maxBet, sc.bankroll); x++) out.push({ x, p: goalProbAfter(setup.dp, sc.bankroll, x, setup.dist, sc.hands - 1), ev: x * setup.edge });
    return out;
  }, [sc, setup]);

  useEffect(() => {
    if (phase !== 'play' || !deal || !sc || !setup || hand || bet === 0) return;
    const values = deal.player.map(valueOf);
    const t = handTotal(values);
    const avail = { canDouble: canDoubleTotal(rules, t.total, t.soft) && sc.bankroll >= 2 * bet, canSplit: values[0] === values[1] && rules.maxSplitHands > 1 && sc.bankroll >= 2 * bet, canSurrender: rules.lateSurrender };
    call('goalHand', deal.unseen, values, valueOf(deal.up), rules, avail, sc.bankroll, bet, sc.target, Array.from(setup.dp.V[sc.hands - 1])).then(setHand);
  }, [phase, deal, sc, setup, hand, bet, rules]);

  if (phase === 'pick')
    return (
      <>
        <TopBar title="Strike mode" />
        <main className="stack">
          <p>Sometimes the max-EV play and the play most likely to reach your goal differ. Decide the bet and the play; the app shows EV vs goal probability and grades both.</p>
          <nav className="menu">
            {SCENARIOS.map((s) => (
              <button key={s.id} onClick={() => start(s)} disabled={!st.chart}>
                <div>
                  <div className="title">{s.title}</div>
                  <div className="sub">
                    {s.bankroll}u → {s.target}u · {s.hands} hand{s.hands > 1 ? 's' : ''} · TC {s.tc > 0 ? '+' : ''}
                    {s.tc}
                  </div>
                </div>
                <span className="num">→</span>
              </button>
            ))}
          </nav>
          <p className="muted" style={{ fontSize: 'var(--t-xs)' }}>
            Goal probabilities: exact hand outcome distributions for the cards left, and a dynamic program over bankroll and hands left (the composition is held
            constant for the remaining hands). Splits in goal mode: two independent hands, no resplits.
          </p>
        </main>
      </>
    );
  if (!sc || !setup || !deal) return <main className="stack"><p className="mono muted">Setting up the scenario…</p></main>;

  const bestP = Math.max(...betTable.map((b) => b.p));
  const bestBet = betTable.find((b) => b.p === bestP)!;
  const evBest = betTable.reduce((a, b) => (b.ev > a.ev ? b : a), betTable[0]);
  const mine = betTable.find((b) => b.x === bet);

  const header = (
    <>
      <Box title={sc.title}>
        <p>{sc.story}</p>
      </Box>
      <Instruments>
        <Instrument label="Bankroll" value={sc.bankroll + 'u'} />
        <Instrument label="Target" value={sc.target + 'u'} />
        <Instrument label="Hands" value={String(sc.hands)} />
        <Instrument label="Edge" value={fmtSigned(setup.edge * 100, 2) + '%'} unit={`TC ${sc.tc}`} tone={setup.edge > 0 ? 'pos' : undefined} />
      </Instruments>
    </>
  );

  if (phase === 'bet')
    return (
      <>
        <TopBar title="Strike mode" />
        <main className="stack">
          {header}
          <p className="h2">Your bet?</p>
          <Keypad
            label="Bet"
            onSubmit={(x) => {
              const v = Math.max(sc.sitOut ? 0 : sc.minBet, Math.min(Math.round(x), Math.min(sc.maxBet, sc.bankroll)));
              setBet(v);
              setPhase(v === 0 ? 'result' : 'play');
            }}
          />
          <p className="muted mono" style={{ fontSize: 'var(--t-xs)' }}>
            {sc.minBet}–{Math.min(sc.maxBet, sc.bankroll)} units{sc.sitOut ? ', 0 = sit out' : ''}
          </p>
        </main>
      </>
    );

  const handBest = hand ? hand.reduce((a, b) => (b.pGoal > a.pGoal ? b : a)) : null;
  const handEV = hand ? hand.reduce((a, b) => (b.ev > a.ev ? b : a)) : null;
  const mineHand = hand && chosen ? hand.find((h) => h.action === chosen) : null;

  if (phase === 'play' && !chosen)
    return (
      <>
        <TopBar title="Strike mode" />
        <main className="stack">
          {header}
          <p className="mono">
            You bet {bet}u: P(goal) {pct(mine?.p ?? 0)} — best bet {bestBet.x}u gives {pct(bestP)}.
          </p>
          <div className="stage" style={{ minHeight: 0 }}>
            <CardTile card={deal.up} />
            <Hand cards={deal.player} spread />
          </div>
          {hand ? (
            <ActionBar legal={hand.map((h) => h.action)} onPick={(a) => (setChosen(a), setPhase('result'))} />
          ) : (
            <p className="mono muted">Computing…</p>
          )}
        </main>
      </>
    );

  const betRatio = bestP > 0 ? (mine?.p ?? 0) / bestP : 1;
  const playRatio = handBest && mineHand ? (handBest.pGoal > 0 ? mineHand.pGoal / handBest.pGoal : 1) : 1;
  return (
    <>
      <TopBar title="Strike mode" />
      <main className="stack">
        {header}
        <StrikeSave sc={sc} betRatio={betRatio} playRatio={playRatio} evCost={(evBest.ev - (mine?.ev ?? 0)) + (handEV && mineHand ? (handEV.ev - mineHand.ev) * bet : 0)} />
        <Box title={`Bet · grade ${grade(betRatio)}`}>
          <table className="chart" style={{ fontSize: 'var(--t-sm)' }}>
            <thead>
              <tr>
                <th>Bet</th>
                <th>P(goal)</th>
                <th>EV (u)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {betTable
                .filter((b) => b.x === bet || b.x === bestBet.x || b.x === evBest.x || b.x === sc.minBet || b.x === 0 || b.x === Math.min(sc.maxBet, sc.bankroll))
                .map((b) => (
                  <tr key={b.x} style={b.x === bet ? { outline: '2px solid var(--fg)', outlineOffset: -2 } : undefined}>
                    <td>{b.x === 0 ? 'sit out' : b.x + 'u'}</td>
                    <td>{pct(b.p)}</td>
                    <td>{fmtSigned(b.ev, 3)}</td>
                    <td className="muted">{[b.x === bet && 'you', b.x === bestBet.x && 'max goal', b.x === evBest.x && 'max EV'].filter(Boolean).join(' · ')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Box>
        {hand && chosen && (
          <Box title={`Play · grade ${grade(playRatio)}`}>
            <table className="chart" style={{ fontSize: 'var(--t-sm)' }}>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>P(goal)</th>
                  <th>P(win hand)</th>
                  <th>EV</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {hand.map((h) => (
                  <tr key={h.action} style={h.action === chosen ? { outline: '2px solid var(--fg)', outlineOffset: -2 } : undefined}>
                    <td>{ACTION_LABEL[h.action]}</td>
                    <td>{pct(h.pGoal)}</td>
                    <td>{pct(h.pWin)}</td>
                    <td>{fmtSigned(h.ev, 3)}</td>
                    <td className="muted">{[h.action === chosen && 'you', h === handBest && 'max goal', h === handEV && 'max EV'].filter(Boolean).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {handBest && handEV && handBest.action !== handEV.action && (
              <p className="accent" style={{ marginTop: 'var(--s2)' }}>
                Here the goal play ({ACTION_LABEL[handBest.action]}) and the EV play ({ACTION_LABEL[handEV.action]}) differ.
              </p>
            )}
          </Box>
        )}
        <div className="grid2" style={{ gap: 'var(--s2)' }}>
          <Button variant="primary" onClick={() => start(sc)}>
            Same scenario
          </Button>
          <Button onClick={() => setPhase('pick')}>Scenarios</Button>
        </div>
      </main>
    </>
  );
}

function StrikeSave({ sc, betRatio, playRatio, evCost }: { sc: Scenario; betRatio: number; playRatio: number; evCost: number }) {
  useEffect(() => {
    saveSession({
      kind: 'strike',
      durationMs: 0,
      total: 2,
      correct: (betRatio >= 0.98 ? 1 : 0) + (playRatio >= 0.98 ? 1 : 0),
      accuracy: (betRatio + playRatio) / 2,
      evLost: Math.max(0, evCost),
      metrics: { betRatio, playRatio },
      mistakes: betRatio < 0.98 ? [{ key: 'strike:' + sc.id, label: sc.title, detail: `Bet efficiency ${(betRatio * 100).toFixed(0)}%, play ${(playRatio * 100).toFixed(0)}%` }] : [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Instruments>
      <Instrument label="Bet grade" value={grade(betRatio)} unit={`${(betRatio * 100).toFixed(0)}% of best P(goal)`} tone={betRatio < 0.9 ? 'bad' : undefined} />
      <Instrument label="Play grade" value={grade(playRatio)} unit={`${(playRatio * 100).toFixed(0)}% of best P(goal)`} tone={playRatio < 0.9 ? 'bad' : undefined} />
      <Instrument label="EV given up" value={'−' + Math.max(0, evCost).toFixed(3)} unit="units, vs max-EV bet & play" />
    </Instruments>
  );
}
