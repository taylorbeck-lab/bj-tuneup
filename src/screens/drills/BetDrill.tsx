import { useState } from 'react';
import { TopBar, Field, Seg, Button, Instrument, Instruments } from '../../ui/components';
import { Keypad } from '../../ui/Keypad';
import { rampBet, approxEdge, kellyBet } from '../../engine/drills';
import { mulberry32, randomSeed, randInt, type Rng } from '../../engine/rng';
import { useSettings } from '../../store/SettingsContext';
import { useStrategy } from '../../store/strategy';
import { type Embed, DrillIntro, DrillResult, useTally, Feedback, Progress } from './common';

type Phase = 'intro' | 'run' | 'done';
type Mode = 'ramp' | 'kelly';

const money = (x: number) => '$' + Math.round(x).toLocaleString();

export function BetDrill({ embed }: { embed?: Embed } = {}) {
  const { settings } = useSettings();
  const { bankroll, unit, ramp } = settings.bet;
  const st = useStrategy(settings.rules);
  const base = st.generated?.baseEdge ?? -0.005;
  const [mode, setMode] = useState<Mode>('ramp');
  const [phase, setPhase] = useState<Phase>('intro');
  const [rng, setRng] = useState<Rng>(() => mulberry32(1));
  const [tc, setTc] = useState(0);
  const [i, setI] = useState(0);
  const n = 15;
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const { tally, answer, markStart, reset } = useTally();
  const [t0, setT0] = useState(0);
  const nextTc = (r: Rng) => setTc(randInt(r, 12) - 3);
  const options = [...new Set(ramp)].sort((a, b) => a - b);

  if (phase === 'intro')
    return (
      <DrillIntro auto={!!embed}
        title="Bet sizing"
        onStart={() => {
          const r = mulberry32(randomSeed());
          setRng(() => r);
          nextTc(r);
          reset();
          setI(0);
          setFb(null);
          setT0(performance.now());
          markStart();
          setPhase('run');
        }}
      >
        <Field name="Mode">
          <Seg options={[{ value: 'ramp', label: 'MY RAMP' }, { value: 'kelly', label: '½ KELLY' }]} value={mode} onChange={setMode} />
        </Field>
        {mode === 'ramp' ? (
          <p>
            Pick the bet your ramp calls for. Ramp (units, TC ≤1…6+): <span className="mono">{ramp.join(' ')}</span>. Edit it in Settings.
          </p>
        ) : (
          <p>
            Enter the half-Kelly bet in dollars for a {money(bankroll)} bankroll, rounded to your {money(unit)} unit. Edge model: {(base * 100).toFixed(2)}% off the top
            plus 0.5% per true count; variance 1.33. (The exact composition model arrives with the player-edge milestone.)
          </p>
        )}
      </DrillIntro>
    );
  if (phase === 'done') return <DrillResult embed={embed?.onDone} kind={`drill:bet-${mode}`} title="Bet sizing" tally={tally} durationMs={performance.now() - t0} onAgain={() => setPhase('intro')} />;

  const advance = () => {
    if (i + 1 >= n) setPhase('done');
    else {
      setI(i + 1);
      nextTc(rng);
    }
  };
  const edge = approxEdge(base, tc);
  const kelly = Math.round(kellyBet(bankroll, edge, 0.5) / unit) * unit;
  return (
    <>
      <TopBar title="Bet sizing" />
      <main className="stack">
        <Progress value={i} max={n} />
        <div className="stage">
          <span className="label">True count</span>
          <span className="big-num">{tc > 0 ? '+' + tc : String(tc).replace('-', '−')}</span>
          {mode === 'kelly' && (
            <Instruments>
              <Instrument label="Bankroll" value={money(bankroll)} />
              <Instrument label="Unit" value={money(unit)} />
            </Instruments>
          )}
        </div>
        <Feedback fb={fb} />
        {mode === 'ramp' ? (
          <div className="choice-grid">
            {options.map((u) => (
              <Button
                key={u}
                big
                onClick={() => {
                  const want = rampBet(ramp, tc);
                  const ok = u === want;
                  answer(ok, ok ? undefined : { key: 'ramp', label: `TC ${tc}`, detail: `Bet ${u}u, ramp says ${want}u` });
                  setFb({ ok, text: `TC ${tc} → ${want} units` });
                  advance();
                }}
              >
                {u}u
              </Button>
            ))}
          </div>
        ) : (
          <Keypad
            label="Bet"
            onSubmit={(v) => {
              const ok = Math.abs(v - kelly) <= Math.max(unit, 0.1 * kelly);
              answer(ok, ok ? undefined : { key: 'kelly', label: `TC ${tc}`, detail: `Bet ${money(v)}, half Kelly ≈ ${money(kelly)} (edge ${(edge * 100).toFixed(2)}%)` });
              setFb({ ok, text: `edge ${(edge * 100).toFixed(2)}% → half Kelly ${money(kelly)}` });
              advance();
            }}
          />
        )}
      </main>
    </>
  );
}
