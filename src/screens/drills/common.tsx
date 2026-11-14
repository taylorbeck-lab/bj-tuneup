import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Instrument, Instruments, TopBar, fmtNum } from '../../ui/components';
import { saveSession, type Mistake, type SessionRecord } from '../../store/sessions';
import { buzzError } from '../../ui/haptics';
import { navigate } from '../../router';

export interface Tally {
  total: number;
  correct: number;
  times: number[];
  mistakes: Mistake[];
  evLost: number;
}
export const emptyTally = (): Tally => ({ total: 0, correct: 0, times: [], mistakes: [], evLost: 0 });

/** Track answers; returns helpers. */
export function useTally() {
  const [t, setT] = useState<Tally>(emptyTally);
  const startRef = useRef(performance.now());
  const markStart = () => {
    startRef.current = performance.now();
  };
  const answer = (ok: boolean, mistake?: Mistake) => {
    const dt = performance.now() - startRef.current;
    if (!ok) buzzError();
    setT((x) => ({
      total: x.total + 1,
      correct: x.correct + (ok ? 1 : 0),
      times: [...x.times, dt],
      mistakes: ok || !mistake ? x.mistakes : [...x.mistakes, mistake],
      evLost: x.evLost + (ok ? 0 : mistake?.evLost ?? 0),
    }));
    startRef.current = performance.now();
  };
  const reset = () => setT(emptyTally());
  return { tally: t, answer, markStart, reset };
}

export function DrillIntro({ title, children, onStart, startLabel = 'Start' }: { title: string; children: ReactNode; onStart: () => void; startLabel?: string }) {
  return (
    <>
      <TopBar title={title} />
      <main className="stack">
        {children}
        <Button variant="primary" big block onClick={onStart}>
          {startLabel}
        </Button>
      </main>
    </>
  );
}

export function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Saves the session once and shows the result. */
export function DrillResult({
  kind,
  title,
  tally,
  durationMs,
  metrics,
  extra,
  onAgain,
  onSaved,
}: {
  kind: string;
  title: string;
  tally: Tally;
  durationMs: number;
  metrics?: Record<string, number>;
  extra?: ReactNode;
  onAgain: () => void;
  onSaved?: (s: SessionRecord) => void;
}) {
  const saved = useRef(false);
  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    saveSession({
      kind,
      durationMs,
      total: tally.total,
      correct: tally.correct,
      accuracy: tally.total ? tally.correct / tally.total : 0,
      avgMs: avg(tally.times),
      evLost: tally.evLost || undefined,
      metrics,
      mistakes: tally.mistakes.slice(0, 50),
    }).then((s) => onSaved?.(s));
  }, [kind, durationMs, tally, metrics, onSaved]);
  const acc = tally.total ? (100 * tally.correct) / tally.total : 0;
  return (
    <>
      <TopBar title={title} />
      <main className="stack">
        <span className="label">Result</span>
        <Instruments>
          <Instrument label="Accuracy" value={fmtNum(acc, 0) + '%'} tone={acc < 90 ? 'bad' : undefined} big />
          <Instrument label="Correct" value={`${tally.correct}/${tally.total}`} />
          <Instrument label="Avg time" value={fmtNum(avg(tally.times) / 1000, 2) + 's'} />
          <Instrument label="Total time" value={fmtNum(durationMs / 1000, 1) + 's'} />
          {tally.evLost > 0 && <Instrument label="EV lost" value={'−' + tally.evLost.toFixed(3)} unit="units" tone="bad" />}
        </Instruments>
        {extra}
        {tally.mistakes.length > 0 && (
          <div className="stack" style={{ gap: 0 }}>
            <span className="label" style={{ paddingBottom: 'var(--s2)' }}>
              Mistakes
            </span>
            {tally.mistakes.slice(0, 12).map((m, i) => (
              <div key={i} className="field" style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="name">{m.label}</div>
                  <div className="hint">{m.detail}</div>
                </div>
                {m.evLost !== undefined && m.evLost > 0 && <span className="mono accent">{'−' + m.evLost.toFixed(3)}</span>}
              </div>
            ))}
          </div>
        )}
        <div className="grid2" style={{ gap: 'var(--s2)' }}>
          <Button variant="primary" onClick={onAgain}>
            Again
          </Button>
          <Button onClick={() => navigate('/drills')}>Drills</Button>
        </div>
      </main>
    </>
  );
}

/** Feedback line under a flash card. */
export function Feedback({ fb }: { fb: { ok: boolean; text: string } | null }) {
  if (!fb) return <div style={{ minHeight: 48 }} />;
  return (
    <div className={'mono ' + (fb.ok ? '' : 'accent')} style={{ minHeight: 48, fontSize: 'var(--t-sm)', textAlign: 'center' }} role="status">
      {fb.ok ? '✓ ' : '✗ '}
      {fb.text}
    </div>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <i style={{ width: `${Math.min(100, (100 * value) / max)}%` }} />
    </div>
  );
}
