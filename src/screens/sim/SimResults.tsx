import { Instrument, Instruments, fmtSigned } from '../../ui/components';
import type { SimSummary } from './summary';
import { saveSession } from '../../store/sessions';
import { put, uid } from '../../store/db';
import type { RoundLog } from '../../engine/game';
import type { Rules } from '../../engine/rules';

export interface StoredShoe {
  id: string;
  at: number;
  kind: string;
  rules: Rules;
  logs: RoundLog[];
  /** Exact EVs of each decision, aligned with logs' decisions in order. */
  evs: unknown[];
}

/** Persist a session + its rounds (for Hand Review). Returns the shoe id. */
export function persistSession(kind: string, summary: SimSummary, logs: RoundLog[], rules: Rules, durationMs: number, extraMetrics?: Record<string, number>): string {
  const shoeId = uid();
  const shoe: StoredShoe = { id: shoeId, at: Date.now(), kind, rules, logs, evs: summary.decisions.map((d) => d.evs) };
  put('shoes', shoe);
  saveSession({
    kind,
    durationMs,
    total: summary.decisions.length,
    correct: summary.decisions.length - summary.playErrors,
    accuracy: summary.accuracy,
    evLost: summary.evLost,
    hands: summary.hands,
    shoeId,
    metrics: {
      net: summary.net,
      playErrors: summary.playErrors,
      betErrors: summary.betErrors,
      insErrors: summary.insErrors,
      evLostPer100: summary.evLostPer100,
      evLostVsBest: summary.evLostVsBest,
      ...extraMetrics,
    },
    mistakes: summary.mistakes.slice(0, 60),
  });
  return shoeId;
}

export function SimResultsView({ summary }: { summary: SimSummary }) {
  const s = summary;
  return (
    <div className="stack">
      <Instruments>
        <Instrument label="Hands" value={String(s.hands)} />
        <Instrument label="Result" value={fmtSigned(s.net, 1)} unit="units" />
        <Instrument label="Accuracy" value={(s.accuracy * 100).toFixed(1) + '%'} tone={s.accuracy < 0.95 ? 'bad' : undefined} />
        <Instrument label="EV lost" value={'−' + s.evLost.toFixed(2)} unit="units vs your strategy" tone={s.evLost > 0 ? 'bad' : undefined} />
        <Instrument label="Per 100 hands" value={'−' + s.evLostPer100.toFixed(2)} unit="units" />
        <Instrument label="Play errors" value={String(s.playErrors)} tone={s.playErrors ? 'bad' : undefined} />
        <Instrument label="Bet errors" value={String(s.betErrors)} tone={s.betErrors ? 'bad' : undefined} />
        <Instrument label="Insurance" value={`${s.insurance.length - s.insErrors}/${s.insurance.length}`} />
        <Instrument label="Vs exact best" value={'−' + s.evLostVsBest.toFixed(2)} unit="units, all decisions" />
      </Instruments>
      {s.mistakes.length > 0 ? (
        <div className="stack" style={{ gap: 0 }}>
          <span className="label" style={{ paddingBottom: 'var(--s2)' }}>
            Errors (most costly first)
          </span>
          {s.mistakes.slice(0, 20).map((m, i) => (
            <div key={i} className="field">
              <div>
                <div className="name">{m.label}</div>
                <div className="hint">{m.detail}</div>
              </div>
              {m.evLost !== undefined && m.evLost > 0 ? <span className="mono accent">{'−' + m.evLost.toFixed(3)}</span> : <span />}
            </div>
          ))}
        </div>
      ) : (
        <p className="pos">No errors. Clean session.</p>
      )}
      <p className="muted" style={{ fontSize: 'var(--t-xs)' }}>
        Errors are measured against your strategy (chart + index plays at the true count you should have had). EV values are exact, from the cards remaining at
        each decision.
      </p>
    </div>
  );
}
