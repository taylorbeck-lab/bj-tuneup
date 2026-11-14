import { useEffect, useRef, useState } from 'react';
import { Seg, Field, CardTile, Box } from '../../ui/components';
import { Keypad } from '../../ui/Keypad';
import { countdownDeck } from '../../engine/drills';
import { mulberry32, randomSeed } from '../../engine/rng';
import { cardLabel } from '../../engine/cards';
import { type Embed, DrillIntro, DrillResult, useTally, Progress } from './common';
import { TopBar } from '../../ui/components';
import { useSettings } from '../../store/SettingsContext';

type Phase = 'intro' | 'run' | 'answer' | 'done';

export function Countdown({ embed }: { embed?: Embed } = {}) {
  const { settings } = useSettings();
  const [phase, setPhase] = useState<Phase>('intro');
  const [removeK, setRemoveK] = useState(1);
  const [group, setGroup] = useState(1);
  const [deck, setDeck] = useState(() => countdownDeck(mulberry32(1), 1));
  const [i, setI] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const t0 = useRef(0);
  const { tally, answer, reset } = useTally();
  const [said, setSaid] = useState<number | null>(null);

  const start = () => {
    setDeck(countdownDeck(mulberry32(randomSeed()), removeK));
    setI(0);
    reset();
    setSaid(null);
    t0.current = performance.now();
    setPhase('run');
  };
  const next = () => {
    const ni = i + group;
    if (ni >= deck.cards.length) {
      setElapsed(performance.now() - t0.current);
      setPhase('answer');
    } else setI(ni);
  };
  useEffect(() => {
    if (phase !== 'run') return;
    const on = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  if (phase === 'intro')
    return (
      <DrillIntro auto={!!embed} title="Deck countdown" onStart={start}>
        <p>Count down one deck as fast as you can. Tap the card (or press space) to flip the next one. Some cards may be removed: give the final running count.</p>
        <Field name="Cards removed" hint="Final count reveals what is missing">
          <Seg options={[0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }))} value={removeK} onChange={setRemoveK} />
        </Field>
        <Field name="Cards per flip">
          <Seg options={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))} value={group} onChange={setGroup} />
        </Field>
        <p className="muted mono" style={{ fontSize: 'var(--t-sm)' }}>Your target: {settings.targets.countdownSecPerDeck}s per deck</p>
      </DrillIntro>
    );

  if (phase === 'run') {
    const shown = deck.cards.slice(i, i + group);
    return (
      <>
        <TopBar title="Countdown" />
        <main className="stack">
          <Progress value={i} max={deck.cards.length} />
          <button className="stage" style={{ background: 'none', cursor: 'pointer', minHeight: '60vh' }} onClick={next} aria-label="Next card">
            <span className="corner label">
              {i + 1}/{deck.cards.length}
            </span>
            <div className="row" style={{ justifyContent: 'center' }}>
              {shown.map((c, k) => (
                <CardTile key={i + '-' + k} card={c} size="xl" className="deal-in" />
              ))}
            </div>
            <span className="label">tap to flip</span>
          </button>
        </main>
      </>
    );
  }

  if (phase === 'answer')
    return (
      <>
        <TopBar title="Countdown" />
        <main className="stack">
          <p className="h2">Final running count?</p>
          <p className="muted mono">{(elapsed / 1000).toFixed(1)}s</p>
          <Keypad
            onSubmit={(n) => {
              const ok = n === deck.answer;
              setSaid(n);
              answer(ok, ok ? undefined : { key: 'countdown', label: 'Deck countdown', detail: `Said ${n}, was ${deck.answer}` });
              setPhase('done');
            }}
          />
        </main>
      </>
    );

  const secPerDeck = (elapsed / 1000) * (52 / deck.cards.length);
  return (
    <DrillResult embed={embed?.onDone}
      kind="drill:countdown"
      title="Countdown"
      tally={{ ...tally, times: [elapsed] }}
      durationMs={elapsed}
      metrics={{ secPerDeck }}
      onAgain={() => setPhase('intro')}
      extra={
        <Box title="Deck">
          <p className="mono">
            {secPerDeck.toFixed(1)}s per deck{' '}
            {secPerDeck <= settings.targets.countdownSecPerDeck ? <span className="tag good">on target</span> : <span className="tag bad">slow</span>}
          </p>
          <p className="mono muted" style={{ fontSize: 'var(--t-sm)' }}>
            Count {deck.answer} · you said {said} · removed {deck.removed.map(cardLabel).join(' ') || 'none'}
          </p>
        </Box>
      }
    />
  );
}
