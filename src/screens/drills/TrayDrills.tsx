import { useMemo, useState } from 'react';
import { Field, TopBar, Button, Switch } from '../../ui/components';
import { Keypad } from '../../ui/Keypad';
import { DiscardTray } from '../../ui/DiscardTray';
import { discardDecks, randomRc, tcAnswer } from '../../engine/drills';
import { mulberry32, randomSeed, randInt } from '../../engine/rng';
import { type Embed, DrillIntro, DrillResult, useTally, Feedback, Progress } from './common';
import { useSettings } from '../../store/SettingsContext';

type Phase = 'intro' | 'run' | 'done';

function useItems(n: number, decks: number, pen: number) {
  return (seed: number) => {
    const rng = mulberry32(seed);
    const total = decks * 52;
    return Array.from({ length: n }, () => {
      const discarded = 8 + randInt(rng, Math.max(1, Math.floor(total * pen) - 8));
      const remaining = total - discarded;
      return { discarded, remaining, rc: randomRc(rng, discarded, remaining), seed: randInt(rng, 1e9) };
    });
  };
}

/** Deck / discard estimation: read the tray, say how many decks are discarded. */
export function DiscardDrill({ embed }: { embed?: Embed } = {}) {
  const { settings } = useSettings();
  const r = settings.rules;
  const gran = settings.count.deckGranularity || 0.25;
  const [phase, setPhase] = useState<Phase>('intro');
  const [marks, setMarks] = useState(false);
  const [n] = useState(12);
  const make = useItems(n, r.decks, r.penetration);
  const [items, setItems] = useState(() => make(1));
  const [i, setI] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [errSum, setErrSum] = useState(0);
  const { tally, answer, markStart, reset } = useTally();
  const [t0, setT0] = useState(0);
  const total = r.decks * 52;
  const options = useMemo(() => {
    const out: number[] = [];
    for (let d = 0; d < r.decks; d += gran) out.push(Math.round(d * 100) / 100);
    return out;
  }, [gran, r.decks]);

  if (phase === 'intro')
    return (
      <DrillIntro auto={!!embed}
        title="Discard estimation"
        onStart={() => {
          setItems(make(randomSeed()));
          setI(0);
          reset();
          setErrSum(0);
          setFb(null);
          setT0(performance.now());
          markStart();
          setPhase('run');
        }}
      >
        <p>Read the discard tray and pick how many decks have been played, to the nearest {gran === 0.25 ? 'quarter' : gran === 0.5 ? 'half' : 'whole'} deck (your setting).</p>
        <Field name="Learning marks" hint="Show half-deck marks on the tray">
          <Switch checked={marks} onChange={setMarks} label="Marks" />
        </Field>
      </DrillIntro>
    );
  if (phase === 'done')
    return <DrillResult embed={embed?.onDone} kind="drill:discard" title="Discard estimation" tally={tally} durationMs={performance.now() - t0} metrics={{ meanAbsErrDecks: errSum / Math.max(1, tally.total) }} onAgain={() => setPhase('intro')} />;

  const it = items[i];
  const truth = discardDecks(it.discarded, gran);
  return (
    <>
      <TopBar title="Discards" />
      <main className="stack">
        <Progress value={i} max={n} />
        <div className="stage">
          <span className="corner label">{r.decks}-deck tray</span>
          <DiscardTray cards={it.discarded} totalCards={total} marks={marks} seed={it.seed} />
        </div>
        <Feedback fb={fb} />
        <div className="choice-grid">
          {options.map((d) => (
            <Button
              key={d}
              onClick={() => {
                const ok = Math.abs(d - truth) < 1e-9;
                const exact = it.discarded / 52;
                setErrSum((e) => e + Math.abs(d - exact));
                answer(ok, ok ? undefined : { key: 'discard', label: 'Discard estimate', detail: `Said ${d}, was ${truth} (${it.discarded} cards)` });
                setFb({ ok, text: `${it.discarded} cards = ${(it.discarded / 52).toFixed(2)} decks` });
                if (i + 1 >= n) setPhase('done');
                else setI(i + 1);
              }}
            >
              {d}
            </Button>
          ))}
        </div>
      </main>
    </>
  );
}

/** True count conversion with the tray. */
export function TrueCountDrill({ embed }: { embed?: Embed } = {}) {
  const n = embed?.n ?? 15;
  const { settings } = useSettings();
  const r = settings.rules;
  const { deckGranularity: gran, rounding } = settings.count;
  const [phase, setPhase] = useState<Phase>('intro');
  const make = useItems(n, r.decks, r.penetration);
  const [items, setItems] = useState(() => make(1));
  const [i, setI] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const { tally, answer, markStart, reset } = useTally();
  const [t0, setT0] = useState(0);
  const total = r.decks * 52;

  if (phase === 'intro')
    return (
      <DrillIntro auto={!!embed}
        title="True count"
        onStart={() => {
          setItems(make(randomSeed()));
          setI(0);
          reset();
          setFb(null);
          setT0(performance.now());
          markStart();
          setPhase('run');
        }}
      >
        <p>
          Given the running count and the discard tray, enter the true count. Uses your settings: decks estimated to {gran || 'exact'} deck, rounding {rounding}.
        </p>
      </DrillIntro>
    );
  if (phase === 'done') {
    return (
      <DrillResult embed={embed?.onDone}
        kind="drill:truecount"
        title="True count"
        tally={tally}
        durationMs={performance.now() - t0}
        onAgain={() => setPhase('intro')}
      />
    );
  }
  const it = items[i];
  const truth = tcAnswer(it.rc, it.remaining, gran, rounding);
  return (
    <>
      <TopBar title="True count" />
      <main className="stack">
        <Progress value={i} max={n} />
        <div className="stage" style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <div className="stack" style={{ alignItems: 'center', gap: 'var(--s1)' }}>
            <span className="label">Running</span>
            <span className="big-num">{it.rc > 0 ? '+' + it.rc : String(it.rc).replace('-', '−')}</span>
          </div>
          <DiscardTray cards={it.discarded} totalCards={total} seed={it.seed} height={180} />
        </div>
        <Feedback fb={fb} />
        <Keypad
          label="TC"
          onSubmit={(v) => {
            const ok = v === truth;
            const decksLeft = it.remaining / 52;
            answer(ok, ok ? undefined : { key: 'tc', label: `RC ${it.rc}, ${decksLeft.toFixed(2)} decks left`, detail: `Said ${v}, was ${truth}` });
            setFb({ ok, text: `${it.rc} / ${decksLeft.toFixed(2)} decks → TC ${truth}` });
            if (i + 1 >= n) setPhase('done');
            else setI(i + 1);
          }}
        />
      </main>
    </>
  );
}
