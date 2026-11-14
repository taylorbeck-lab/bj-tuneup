import { useEffect, useRef, useState } from 'react';
import { Seg, Field, CardTile, TopBar, Box } from '../../ui/components';
import { Keypad } from '../../ui/Keypad';
import { dealCountRound, type CountRound } from '../../engine/drills';
import { mulberry32, randomSeed, type Rng } from '../../engine/rng';
import { Shoe } from '../../engine/shoe';
import { hiLoCard } from '../../engine/count';
import { cardLabel, cardName, rankOf, makeCard, type CardId } from '../../engine/cards';
import { DrillIntro, DrillResult, useTally, Progress } from './common';
import { useSettings } from '../../store/SettingsContext';

export type CountMode = 'rc' | 'ace' | 'key';
type Phase = 'intro' | 'run' | 'check' | 'done';

const TITLES: Record<CountMode, string> = { rc: 'Running count', ace: 'Ace side count', key: 'Key cards' };

export function RunningCount({ mode = 'rc', checkpointsTarget = 8, onDone }: { mode?: CountMode; checkpointsTarget?: number; onDone?: (acc: number, avgMs: number) => void }) {
  const { settings } = useSettings();
  const rules = settings.rules;
  const keyCards = settings.count.keyCards.length ? settings.count.keyCards : [makeCard(12, 0), makeCard(11, 1)];
  const [phase, setPhase] = useState<Phase>('intro');
  const [speed, setSpeed] = useState(450);
  const [seats, setSeats] = useState(rules.seats);
  const [round, setRound] = useState<CountRound | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [checks, setChecks] = useState(0);
  const [question, setQuestion] = useState<{ text: string; answer: number; key?: CardId } | null>(null);
  const shoe = useRef<Shoe | null>(null);
  const rng = useRef<Rng>(mulberry32(1));
  const truth = useRef({ rc: 0, aces: 0, key: new Map<CardId, number>(), roundsSinceCheck: 0 });
  const t0 = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const { tally, answer, markStart, reset } = useTally();

  const newRound = () => {
    const s = shoe.current!;
    if (s.cutReached) {
      finish();
      return;
    }
    setRound(dealCountRound(s, seats, rules.h17, rng.current));
    setRevealed(0);
  };
  const finish = () => {
    setElapsed(performance.now() - t0.current);
    setPhase('done');
  };

  const start = () => {
    const seed = randomSeed();
    rng.current = mulberry32(seed);
    shoe.current = new Shoe(rules.decks, rules.penetration, rules.burn, seed);
    truth.current = { rc: 0, aces: 0, key: new Map(), roundsSinceCheck: 0 };
    reset();
    setChecks(0);
    t0.current = performance.now();
    setPhase('run');
    newRound();
  };

  useEffect(() => {
    if (phase !== 'run' || !round) return;
    if (revealed < round.order.length) {
      const id = setTimeout(() => {
        const c = round.order[revealed];
        const tr = truth.current;
        tr.rc += hiLoCard(c);
        if (rankOf(c) === 0) tr.aces++;
        tr.key.set(c, (tr.key.get(c) ?? 0) + 1);
        setRevealed(revealed + 1);
      }, speed);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      const tr = truth.current;
      tr.roundsSinceCheck++;
      const want = tr.roundsSinceCheck >= 4 || rng.current() < 0.35;
      if (want) {
        tr.roundsSinceCheck = 0;
        if (mode === 'rc') setQuestion({ text: 'Running count?', answer: tr.rc });
        else if (mode === 'ace') setQuestion({ text: 'Aces still unseen?', answer: rules.decks * 4 - tr.aces });
        else {
          const k = keyCards[Math.floor(rng.current() * keyCards.length)];
          setQuestion({ text: `How many ${cardName(k)} unseen?`, answer: rules.decks - (tr.key.get(k) ?? 0), key: k });
        }
        markStart();
        setPhase('check');
      } else newRound();
    }, Math.max(500, speed * 1.5));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, revealed, speed]);

  const doneRef = useRef(false);
  useEffect(() => {
    if (phase === 'done' && !doneRef.current) {
      doneRef.current = true;
      onDone?.(tally.total ? tally.correct / tally.total : 0, tally.times.length ? tally.times.reduce((a, b) => a + b, 0) / tally.times.length : 0);
    }
    if (phase === 'run') doneRef.current = false;
  }, [phase, tally, onDone]);

  if (phase === 'intro')
    return (
      <DrillIntro title={TITLES[mode]} onStart={start}>
        <p>
          {mode === 'rc' && 'Keep the Hi-Lo running count while rounds are dealt at game speed. The burn card is not counted. At random checkpoints, enter the count.'}
          {mode === 'ace' && 'Track aces while rounds are dealt. At checkpoints, say how many aces are still unseen (burn card counts as unseen).'}
          {mode === 'key' && `Track your key cards (${keyCards.map(cardLabel).join(' ')}). At checkpoints, say how many copies of one are still unseen.`}
        </p>
        <Field name="Dealer speed" hint="ms per card">
          <Seg options={[800, 600, 450, 300, 200].map((v) => ({ value: v, label: String(v) }))} value={speed} onChange={setSpeed} />
        </Field>
        <Field name="Seats">
          <Seg options={[1, 2, 3, 4, 5, 6].map((v) => ({ value: v, label: String(v) }))} value={seats} onChange={setSeats} />
        </Field>
        <p className="muted mono" style={{ fontSize: 'var(--t-sm)' }}>
          {rules.decks} decks · {checkpointsTarget} checkpoints
        </p>
      </DrillIntro>
    );

  if (phase === 'done') {
    return <DrillResult kind={`drill:${mode === 'rc' ? 'running' : mode === 'ace' ? 'acecount' : 'keycard'}`} title={TITLES[mode]} tally={tally} durationMs={elapsed} metrics={{ speedMs: speed }} onAgain={() => setPhase('intro')} />;
  }

  const r = round!;
  const small = seats > 3;
  const visible = (who: number, pos: number) => r.where.some((w, i) => i < revealed && w.who === who && w.pos === pos);
  return (
    <>
      <TopBar title={TITLES[mode]} />
      <main className="stack">
        <Progress value={checks} max={checkpointsTarget} />
        <div className="stage" style={{ justifyContent: 'space-between' }}>
          <span className="corner label">
            {checks}/{checkpointsTarget}
          </span>
          <div className="seat">
            <div className="row" style={{ gap: 'var(--s1)' }}>
              {r.dealer.map((c, i) => (visible(-1, i) ? <CardTile key={i} card={c} size={small ? 'sm' : undefined} className="deal-in" /> : i === 1 ? <CardTile key={i} faceDown size={small ? 'sm' : undefined} /> : null))}
            </div>
            <span className="label">dealer</span>
          </div>
          <div className="seat-row">
            {r.seats.map((h, si) => (
              <div key={si} className="seat">
                <div className="hand">{h.map((c, i) => (visible(si, i) ? <CardTile key={i} card={c} size={small ? 'sm' : undefined} className="deal-in" /> : null))}</div>
                <span className="label">seat {si + 1}</span>
              </div>
            ))}
          </div>
        </div>
        {phase === 'check' && question && (
          <Box title="Checkpoint">
            <p className="h2" style={{ marginBottom: 'var(--s3)' }}>
              {question.text}
            </p>
            <Keypad
              onSubmit={(n) => {
                const ok = n === question.answer;
                answer(ok, ok ? undefined : { key: `count:${mode}`, label: question.text, detail: `Said ${n}, was ${question.answer}` });
                const nc = checks + 1;
                setChecks(nc);
                setQuestion(null);
                if (nc >= checkpointsTarget) finish();
                else {
                  setPhase('run');
                  newRound();
                }
              }}
            />
          </Box>
        )}
      </main>
    </>
  );
}
