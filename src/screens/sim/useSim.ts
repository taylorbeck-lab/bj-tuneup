import { useCallback, useEffect, useRef, useState } from 'react';
import { Table, type DecisionSnapshot, type RoundLog } from '../../engine/game';
import type { Rules } from '../../engine/rules';
import type { Chart, Action } from '../../engine/strategy/chart';
import type { Rounding } from '../../engine/count';
import { randomSeed } from '../../engine/rng';
import { call } from '../../workers/client';
import type { DecisionEVs } from '../../engine/ev/analyze';

export interface SimConfig {
  rules: Rules;
  chart: Chart;
  seats: number;
  humanSeat: number;
  speedMs: number;
  granularity: number;
  rounding: Rounding;
  seed?: number;
}

export interface Analysed {
  snap: DecisionSnapshot;
  evs: Promise<DecisionEVs>;
}

/** Drives a Table: automatic steps at dealer speed, human actions, background exact analysis. */
export function useSim(cfg: SimConfig | null) {
  const tableRef = useRef<Table | null>(null);
  const [tick, setTick] = useState(0);
  const analyses = useRef<Analysed[]>([]);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!cfg) return;
    tableRef.current = new Table({
      rules: cfg.rules,
      seats: cfg.seats,
      humanSeat: cfg.humanSeat,
      chart: cfg.chart,
      seed: cfg.seed ?? randomSeed(),
      granularity: cfg.granularity,
      rounding: cfg.rounding,
    });
    analyses.current = [];
    bump();
  }, [cfg, bump]);

  const t = tableRef.current;

  // automatic dealing / bots / dealer at dealer speed
  useEffect(() => {
    if (!t || !cfg) return;
    if (t.waitingForHuman) return;
    if (t.phase === 'bet' || t.phase === 'settled') return;
    const id = setTimeout(() => {
      if (t.step()) bump();
    }, cfg.speedMs);
    return () => clearTimeout(id);
  }, [t, tick, cfg, bump]);

  const placeBet = (units: number) => {
    if (!t) return;
    t.placeBet(units);
    bump();
  };
  const insure = (take: boolean) => {
    if (!t) return;
    t.insure(take);
    bump();
  };
  const act = (a: Action): Analysed | null => {
    if (!t || !cfg) return null;
    const snap = t.act(a);
    const evs = call('analyzeDecision', snap.unseen, snap.values, snap.up, cfg.rules, snap.avail, snap.splitHands);
    const an = { snap, evs };
    analyses.current.push(an);
    bump();
    return an;
  };

  return {
    table: t,
    tick,
    placeBet,
    insure,
    act,
    analyses: analyses.current,
    logs: (t?.logs ?? []) as RoundLog[],
    reshuffle: () => {
      t?.reshuffle();
      bump();
    },
  };
}
