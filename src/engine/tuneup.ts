/** Tune-Up planning and the READY / NOT READY verdict (pure, unit-tested). */
import type { Mistake } from '../store/sessions';

export interface Targets {
  countdownSecPerDeck: number;
  accuracyPct: number;
  evLostPer100: number;
}

export type StageId = 'countdown' | 'running' | 'truecount' | 'bs' | 'dev' | 'sim';
export interface Stage {
  id: StageId;
  title: string;
  n: number;
}

/** Recent accuracy per drill kind (0..1), e.g. { 'drill:truecount': 0.8 }. */
export type RecentAccuracy = Record<string, number>;

/**
 * Build the ~15-minute plan. Stages whose recent accuracy is below target get more items; basic
 * strategy flash is only included when it has been leaking.
 */
export function planTuneUp(recent: RecentAccuracy, targets: Targets): Stage[] {
  const goal = targets.accuracyPct / 100;
  const weak = (kind: string) => recent[kind] !== undefined && recent[kind] < goal;
  const stages: Stage[] = [
    { id: 'countdown', title: 'Deck countdown', n: 1 },
    { id: 'running', title: 'Running count at speed', n: weak('drill:running') ? 6 : 4 },
    { id: 'truecount', title: 'True count + discard tray', n: weak('drill:truecount') ? 12 : 8 },
  ];
  if (weak('drill:bs')) stages.push({ id: 'bs', title: 'Basic strategy (leaks)', n: 15 });
  stages.push({ id: 'dev', title: 'Deviations flash', n: weak('drill:dev') ? 20 : 15 });
  stages.push({ id: 'sim', title: '2-deck table, with betting', n: weak('sim') ? 40 : 30 });
  return stages;
}

export interface StageOutcome {
  id: StageId;
  total: number;
  correct: number;
  avgMs: number;
  evLost: number;
  mistakes: Mistake[];
  metrics?: Record<string, number>;
}

export interface Check {
  name: string;
  value: string;
  target: string;
  pass: boolean;
}

export interface Verdict {
  ready: boolean;
  checks: Check[];
  accuracy: number;
  secPerDeck?: number;
  avgDecisionMs: number;
  evLost: number;
  evLostPer100: number;
  top3: Mistake[];
}

export function tuneUpVerdict(outcomes: StageOutcome[], targets: Targets): Verdict {
  const total = outcomes.reduce((s, o) => s + o.total, 0);
  const correct = outcomes.reduce((s, o) => s + o.correct, 0);
  const accuracy = total ? correct / total : 0;
  const cd = outcomes.find((o) => o.id === 'countdown');
  const sim = outcomes.find((o) => o.id === 'sim');
  const flash = outcomes.filter((o) => o.id === 'dev' || o.id === 'bs' || o.id === 'truecount');
  const flashN = flash.reduce((s, o) => s + o.total, 0);
  const avgDecisionMs = flashN ? flash.reduce((s, o) => s + o.avgMs * o.total, 0) / flashN : 0;
  const evLost = outcomes.reduce((s, o) => s + o.evLost, 0);
  const hands = sim?.metrics?.hands ?? 0;
  const evLostPer100 = hands ? (100 * (sim?.evLost ?? 0)) / hands : 0;
  const checks: Check[] = [];
  const secPerDeck = cd?.metrics?.secPerDeck;
  if (cd && secPerDeck !== undefined) {
    checks.push({ name: 'Countdown speed', value: `${secPerDeck.toFixed(1)}s/deck`, target: `≤ ${targets.countdownSecPerDeck}s`, pass: secPerDeck <= targets.countdownSecPerDeck });
    checks.push({ name: 'Countdown correct', value: cd.correct === cd.total ? 'yes' : 'no', target: 'yes', pass: cd.correct === cd.total });
  }
  checks.push({ name: 'Accuracy', value: `${(accuracy * 100).toFixed(1)}%`, target: `≥ ${targets.accuracyPct}%`, pass: accuracy * 100 >= targets.accuracyPct });
  if (sim) checks.push({ name: 'EV lost / 100 hands', value: evLostPer100.toFixed(2), target: `≤ ${targets.evLostPer100}`, pass: evLostPer100 <= targets.evLostPer100 });
  // Top 3: most costly first, then the rest in order; one per key.
  const all = outcomes.flatMap((o) => o.mistakes);
  const sorted = [...all].sort((a, b) => (b.evLost ?? 0) - (a.evLost ?? 0));
  const seen = new Set<string>();
  const top3: Mistake[] = [];
  for (const m of sorted) {
    const k = m.key + '|' + m.label;
    if (seen.has(k)) continue;
    seen.add(k);
    top3.push(m);
    if (top3.length === 3) break;
  }
  return { ready: checks.every((c) => c.pass), checks, accuracy, secPerDeck, avgDecisionMs, evLost, evLostPer100, top3 };
}
