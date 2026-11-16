import { useEffect, useRef, useState } from 'react';
import { TableScreen } from '../table/TableScreen';
import { useV2 } from '../settings';
import { useStrategy } from '../../store/strategy';
import { useIndexPlays } from '../../store/indices';
import { gradeDecision, gradeInsurance } from '../coach/grade';
import { CoachCard, type CoachMsg } from '../coach/CoachCard';
import { recordPace, recordDecision, recordHand, recordInsurance, recordBet, loadStats, onStats, type V2Stats } from '../stats';
import { pickPractice } from '../practice';
import { pushEvent } from '../coach/history';
import { call } from '../../workers/client';
import { CountSheet } from '../count/CountSheet';
import { EndOfShoe } from '../count/EndOfShoe';
import { useEdgeModel } from '../../store/edge';
import { countWords } from '../count/words';
import { gradeBet, recommendedUnits } from '../count/bet';
import { FeedbackCard, type Card } from '../coach/FeedbackCard';
import { countPlayPreview, shouldPreview } from '../coach/preview';
import { kvGet, kvSet } from '../../store/db';
import { ACTION_LABEL } from '../../engine/strategy/chart';
import { decisionFeedback, betFeedback, insuranceFeedback } from '../coach/round';
import type { Table } from '../../engine/game';


const firstSentence = (t: string) => (t.match(/^(.+?[.!?])(\s|$)/)?.[1] ?? t).trim();
const BET_TITLE: Record<string, string> = { '↑ BET': 'Bet bigger', '↓ MIN': 'Bet the minimum', '↓ BET': 'Bet less' };

/** José's last word on your play (kept while you look at the chart, so a miss isn't lost). */
let lastCard: (Card & { msg: CoachMsg }) | null = null;

/**
 * The table plus the teaching layers. José answers each of your moves in his speech bubble, chosen
 * by the mode you play in: a right play (✓) or a miss (✗, with the right play and why). Each one
 * stays until your next move brings the next; a right play also gives way to his own lines once the
 * hand is over. A miss stays through the deal until you act again. Tap it for the full why and odds.
 */
export function PlayScreen() {
  const { s } = useV2();
  const st = useStrategy(s.rules);
  const { plays } = useIndexPlays(s.rules, st.chart);
  const edgeModel = useEdgeModel(s.rules, st.chart);
  const [card, setCardState] = useState<(Card & { msg: CoachMsg }) | null>(() => lastCard);
  const setCard: typeof setCardState = (v) =>
    setCardState((cur) => {
      const next = typeof v === 'function' ? v(cur) : v;
      lastCard = next;
      return next;
    });
  const [detailOpen, setDetailOpen] = useState(false);
  /** How often each next-level preview has been shown (kept on the device). */
  const previews = useRef<Record<string, number>>({});
  useEffect(() => {
    kvGet<Record<string, number>>('v2previews').then((x) => (previews.current = x ?? {}));
  }, []);
  const cardId = useRef(0);
  const [countOpen, setCountOpen] = useState<{ t: Table; quiz: boolean } | null>(null);
  const [countMenu, setCountMenu] = useState(false);
  const [reveal, setReveal] = useState<{ rc: number; tc: number } | null>(null);
  const tableRef = useRef<Table | null>(null);
  const n = useRef(0);
  const lastQuizSeen = useRef(-1);
  const stats = useRef<V2Stats | null>(null);
  const practiceKey = useRef<string | null>(null);
  useEffect(() => {
    loadStats().then((x) => (stats.current = x));
    return onStats((x) => (stats.current = x));
  }, []);

  /** José's word on your latest move: it replaces whatever he said about the one before. */
  const show = (c: Omit<Card, 'id'> & { msg: CoachMsg }): number => {
    if (s.coach.feedback === 'off') return -1;
    if (c.ok && s.coach.feedback === 'mistakes') {
      // mistakes only: a right move quietly retires the last miss
      setCard(null);
      return -1;
    }
    const id = ++cardId.current;
    setCard({ ...c, id });
    if (c.ok) navigator.vibrate?.(8);
    return id;
  };
  // José's whisper of the count fades on its own; the game doesn't stop for it
  useEffect(() => {
    if (!reveal) return;
    const id = setTimeout(() => setReveal(null), 6000);
    return () => clearTimeout(id);
  }, [reveal]);

  return (
    <>
      <TableScreen
        hooks={{
          paused: !!countOpen,
          practiceHand: () => {
            practiceKey.current = null;
            if (!s.coach.practiceMisses || !stats.current || Math.random() > 0.35) return null;
            const p = pickPractice(stats.current, Math.random);
            if (p) practiceKey.current = p.key;
            return p;
          },
          // the count lives in the discard tray: tap it to be tested, or to ask
          onTray: () => tableRef.current && setCountMenu(true),
          // the end-of-shoe count check and shoe review are for counters (Count & bet, Full AP); in Basic
          // strategy José just shuffles up
          endOfShoe: (t, done) => (s.coach.countQuiz !== 'off' || s.coach.betCoach || s.coach.deviations ? <EndOfShoe table={t} model={edgeModel} onDone={done} /> : null),
          feltExtra: (t) => {
            tableRef.current = t;
            if (!t || !s.coach.showCount) return null;
            return (
              <div className="count-badge" aria-label="Running count helper">
                <div>
                  RUNNING <b>{countWords(t.rc)}</b>
                </div>
                <div>
                  TRUE <b>{countWords(t.tcPlayer())}</b>
                </div>
              </div>
            );
          },
          onBet: (bets, t) => {
            setDetailOpen(false);
            if (!s.coach.betCoach) return;
            const tc = t.tcPlayer();
            const amounts = Object.values(bets).filter((b) => b > 0);
            const bet = Math.max(...amounts);
            const v = gradeBet(bet, s.tableMin, tc);
            recordBet(v.right);
            pushEvent(`Bet ${bet} dollars at true count ${tc}: ${v.right ? 'good' : v.title.toLowerCase()}.`);
            const f = betFeedback(v.right, bet, v.rec, recommendedUnits(tc));
            const msg: CoachMsg = { kind: 'bet', ok: v.right, title: v.title, accent: `true count ${countWords(tc)}`, text: v.text };
            if (!v.right) show({ ok: false, title: BET_TITLE[f.word ?? ''] ?? 'Bet', line: f.line, msg });
            else if (recommendedUnits(tc) > 1) show({ ok: true, title: 'Bet up', line: 'Good size for this shoe.', msg });
          },
          onDecision: (snap, _spot, t, ms) => {
            if (!st.chart) return;
            // your pace, by where you sit: first base acts first, third base last
            const order = t.seats.map((x, i) => (x.hands.length ? i : -1)).filter((i) => i >= 0);
            const me = order.findIndex((i) => t.seats[i].human);
            recordPace(order.length <= 1 ? 'solo' : me === 0 ? 'first' : me === order.length - 1 ? 'third' : 'middle', ms);
            const v = gradeDecision(snap, st.chart, plays, s.coach.deviations, n.current++);
            recordDecision(v.key, v.hand, v.right, !!v.countPlay);
            pushEvent(`${v.hand} at true count ${snap.tc}: chose ${v.chosen}, ${v.right ? 'right' : `should ${v.correct}`}${v.countPlay ? ' (count play)' : ''}.`);
            const practiced = practiceKey.current === v.key;
            let msg: CoachMsg = { kind: 'decision', ok: v.right, title: v.title, accent: practiced && v.right ? 'you fixed a leak' : v.accent, hand: (practiced ? '↻ ' : '') + v.hand, text: v.why, verdict: v };
            const f = decisionFeedback(v, practiced && v.right);
            let line: string | undefined;
            if (v.right) {
              // before count plays are on, hint at them on right plays (the rule, never the current count)
              if (!s.coach.deviations) {
                const pv = countPlayPreview(plays, st.chart, snap.values, snap.up, snap.avail);
                if (pv && shouldPreview(previews.current[pv.play.id] ?? 0, Math.random())) {
                  previews.current = { ...previews.current, [pv.play.id]: (previews.current[pv.play.id] ?? 0) + 1 };
                  kvSet('v2previews', previews.current);
                  line = `When counting: ${ACTION_LABEL[pv.action].toLowerCase()} here at ${pv.when}.`;
                  msg = { ...msg, text: `${v.why} Next level: this is a count play. Counters ${ACTION_LABEL[pv.action].toLowerCase()} ${v.hand} when the true count is ${pv.when}; you'll learn it with count plays.` };
                }
              }
              if (!line && v.countPlay) line = 'Count play: the count changed this one.';
              if (!line && practiced) line = 'You fixed a leak.';
            } else line = f.layer === 'play' ? firstSentence(v.why) : f.line;
            const id = show({ ok: v.right, title: ACTION_LABEL[v.right ? v.chosen : v.correct], hand: v.hand, line, msg });
            call('coachOdds', snap.unseen, snap.values, snap.up, s.rules, snap.avail).then((odds) => {
              setCard((cur) => (cur && cur.id === id ? { ...cur, msg: { ...cur.msg, odds } } : cur));
            });
          },
          onInsurance: (take, t) => {
            const v = gradeInsurance(take, t.unseen(), t.tcPlayer(), plays, s.coach.deviations);
            recordInsurance(v.right);
            pushEvent(`Insurance at true count ${t.tcPlayer()}: ${take ? 'took it' : 'declined'}, ${v.right ? 'right' : 'wrong'}.`);
            const f = insuranceFeedback(v.right, v.shouldTake, s.coach.deviations);
            const msg: CoachMsg = { kind: 'insurance', ok: v.right, title: v.right ? 'Right call' : 'Not quite', accent: v.shouldTake ? 'take insurance here' : 'skip insurance', text: v.why };
            show({ ok: v.right, title: v.shouldTake ? 'Take insurance' : 'No insurance', line: v.right ? undefined : f.line, msg });
          },
          onRoundEnd: () => {
            recordHand();
            // a right play has been said; José moves on to the result. A miss stays until your next move.
            setCard((cur) => (cur && cur.ok ? null : cur));
          },
          onBetting: (t) => {
            const p = s.coach.countQuiz === 'often' ? 0.45 : s.coach.countQuiz === 'sometimes' ? 0.18 : 0;
            if (p && t.seenCount >= 10 && t.seenCount !== lastQuizSeen.current && Math.random() < p) {
              lastQuizSeen.current = t.seenCount;
              setCountOpen({ t, quiz: true });
            }
          },
          // everything said at the table comes from José: the count when you ask, then your feedback
          jose: reveal ? (
            <button type="button" className="jose-say jose-count" onClick={() => setReveal(null)} aria-label={`Running count ${countWords(reveal.rc)}, true count ${countWords(reveal.tc)}`}>
              <small>José · leans in</small>
              Running <b>{countWords(reveal.rc)}</b> · true <b>{countWords(reveal.tc)}</b>
            </button>
          ) : card && s.coach.feedback !== 'off' ? (
            <FeedbackCard key={card.id} card={card} onOpen={() => setDetailOpen(true)} />
          ) : undefined,
        }}
      />
      {countMenu && tableRef.current && (
        <div className="sheet-back" onClick={() => setCountMenu(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="The count">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="display" style={{ fontSize: 28 }}>
                Ask José
              </span>
              <span className="serif" style={{ fontSize: 20 }}>
                test me, or just tell me
              </span>
            </div>
            <button
              className="act stand"
              onClick={() => {
                setCountMenu(false);
                setCountOpen({ t: tableRef.current!, quiz: false });
              }}
            >
              Test me
            </button>
            <button
              className="act"
              onClick={() => {
                const t = tableRef.current!;
                setCountMenu(false);
                setReveal({ rc: t.rc, tc: t.tcPlayer() });
              }}
            >
              What's the count?
            </button>
          </div>
        </div>
      )}
      {detailOpen && card && (
        <div className="sheet-back" onClick={() => setDetailOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Why">
            <CoachCard
              msg={card.msg}
              startOpen
              onClose={() => setDetailOpen(false)}
              askHref={s.apiKey && card.msg.hand ? '#/coach?q=' + encodeURIComponent(`Why is the play ${card.msg.verdict?.correct ?? ''} on ${card.msg.hand.replace('↻ ', '')}?`) : undefined}
            />
          </div>
        </div>
      )}
      {countOpen && <CountSheet table={countOpen.t} quiz={countOpen.quiz} onClose={() => setCountOpen(null)} />}
    </>
  );
}
