import { useRef, useState } from 'react';
import { TableScreen } from '../table/TableScreen';
import { useV2 } from '../settings';
import { useStrategy } from '../../store/strategy';
import { useIndexPlays } from '../../store/indices';
import { gradeDecision, gradeInsurance } from '../coach/grade';
import { CoachCard, type CoachMsg } from '../coach/CoachCard';
import { recordDecision, recordHand, recordInsurance, recordBet } from '../stats';
import { call } from '../../workers/client';
import { CountSheet } from '../count/CountSheet';
import { gradeBet } from '../count/bet';
import type { Table } from '../../engine/game';

const signed = (n: number) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');

/** The table plus the teaching layers: strategy coach, count checks, bet coach. */
export function PlayScreen() {
  const { s } = useV2();
  const st = useStrategy(s.rules);
  const { plays } = useIndexPlays(s.rules);
  const [msg, setMsg] = useState<CoachMsg | null>(null);
  const [countOpen, setCountOpen] = useState<{ t: Table; quiz: boolean } | null>(null);
  const tableRef = useRef<Table | null>(null);
  const n = useRef(0);
  const seq = useRef(0);
  const lastQuizSeen = useRef(-1);

  const show = (m: CoachMsg) => {
    if (s.coach.feedback === 'off' && m.kind !== 'count') return;
    if (s.coach.feedback === 'mistakes' && m.ok !== false) return;
    setMsg(m);
  };

  return (
    <>
      <TableScreen
        hooks={{
          paused: !!countOpen,
          hudExtra: (
            <button className="pill coral" onClick={() => tableRef.current && setCountOpen({ t: tableRef.current, quiz: false })} aria-label="Count check">
              Count?
            </button>
          ),
          feltExtra: (t) => {
            tableRef.current = t;
            if (!t || !s.coach.showCount) return null;
            return (
              <div className="count-badge" aria-label="Running count helper">
                <div>
                  RUNNING <b>{signed(t.rc)}</b>
                </div>
                <div>
                  TRUE <b>{signed(t.tcPlayer())}</b>
                </div>
                <div style={{ opacity: 0.7, fontSize: '2.1cqw', marginTop: '0.6cqw' }}>
                  2–6 +1 · 7–9 0
                  <br />
                  10–A −1
                </div>
              </div>
            );
          },
          onBet: (bets, t) => {
            seq.current++;
            setMsg(null);
            if (!s.coach.betCoach) return;
            const tc = t.tcPlayer();
            const amounts = Object.values(bets).filter((b) => b > 0);
            const bet = Math.max(...amounts);
            const v = gradeBet(bet, s.tableMin, tc);
            recordBet(v.right);
            show({ kind: 'bet', ok: v.right, title: v.title, accent: `true count ${signed(tc)}`, text: v.text });
          },
          onDecision: (snap) => {
            if (!st.chart) return;
            const v = gradeDecision(snap, st.chart, plays, s.coach.deviations, n.current++);
            recordDecision(v.key, v.hand, v.right, !!v.countPlay);
            const id = ++seq.current;
            const base: CoachMsg = { kind: 'decision', ok: v.right, title: v.title, accent: v.accent, hand: v.hand, text: v.why, verdict: v };
            show(base);
            call('coachOdds', snap.unseen, snap.values, snap.up, s.rules, snap.avail).then((odds) => {
              if (seq.current === id) show({ ...base, odds });
            });
          },
          onInsurance: (take, t) => {
            const v = gradeInsurance(take, t.unseen(), t.tcPlayer(), plays, s.coach.deviations);
            recordInsurance(v.right);
            ++seq.current;
            show({ kind: 'insurance', ok: v.right, title: v.right ? 'Right call' : 'Not quite', accent: v.shouldTake ? 'take insurance here' : 'skip insurance', text: v.why });
          },
          onRoundEnd: () => {
            recordHand();
          },
          onBetting: (t) => {
            const p = s.coach.countQuiz === 'often' ? 0.45 : s.coach.countQuiz === 'sometimes' ? 0.18 : 0;
            if (p && t.seenCount >= 10 && t.seenCount !== lastQuizSeen.current && Math.random() < p) {
              lastQuizSeen.current = t.seenCount;
              setCountOpen({ t, quiz: true });
            }
          },
          coach: msg ? <CoachCard msg={msg} onClose={() => setMsg(null)} /> : null,
        }}
      />
      {countOpen && <CountSheet table={countOpen.t} quiz={countOpen.quiz} onClose={() => setCountOpen(null)} />}
    </>
  );
}
