/**
 * Effective strategy for the active rules: the generated basic strategy (computed once per rule set
 * in the worker and cached in IndexedDB) with the user's cell overrides applied.
 */
import { useEffect, useState, useCallback } from 'react';
import { kvGet, kvSet } from './db';
import { rulesKey, type Rules } from '../engine/rules';
import { cloneChart, type Chart, type Code } from '../engine/strategy/chart';
import type { StrategyResult } from '../workers/handlers';
import { call } from '../workers/client';

export type Section = 'hard' | 'soft' | 'pairs';
/** Overrides: key `${section}:${row}:${col}` -> code */
export type Overrides = Record<string, Code>;

const GEN_VERSION = 3; // bump when the generator changes

const memCache = new Map<string, Promise<StrategyResult>>();

export function loadGenerated(rules: Rules): Promise<StrategyResult> {
  const key = `strategy:v${GEN_VERSION}:${rulesKey(rules)}`;
  let p = memCache.get(key);
  if (!p) {
    p = (async () => {
      const cached = await kvGet<StrategyResult>(key);
      if (cached) return cached;
      const r = await call('generateStrategy', rules);
      await kvSet(key, r);
      return r;
    })();
    memCache.set(key, p);
  }
  return p;
}

export function applyOverrides(chart: Chart, ov: Overrides): Chart {
  const c = cloneChart(chart);
  for (const [k, code] of Object.entries(ov)) {
    const [sec, row, col] = k.split(':');
    const r = c[sec as Section]?.[Number(row)];
    if (r) r[Number(col)] = code;
  }
  return c;
}

export function diffOverrides(base: Chart, edited: Chart): Overrides {
  const ov: Overrides = {};
  for (const sec of ['hard', 'soft', 'pairs'] as Section[]) {
    for (const [row, cells] of Object.entries(edited[sec])) {
      cells.forEach((code, col) => {
        if (base[sec][Number(row)]?.[col] !== code) ov[`${sec}:${row}:${col}`] = code;
      });
    }
  }
  return ov;
}

export interface StrategyState {
  loading: boolean;
  generated?: StrategyResult;
  chart?: Chart;
  overrides: Overrides;
  setOverrides: (ov: Overrides) => void;
}

export function useStrategy(rules: Rules): StrategyState {
  const [generated, setGenerated] = useState<StrategyResult>();
  const [overrides, setOv] = useState<Overrides>({});
  const rk = rulesKey(rules);
  useEffect(() => {
    let live = true;
    setGenerated(undefined);
    loadGenerated(rules).then((g) => live && setGenerated(g));
    kvGet<Overrides>('overrides:' + rk).then((o) => live && setOv(o ?? {}));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rk]);
  const setOverrides = useCallback(
    (ov: Overrides) => {
      setOv(ov);
      kvSet('overrides:' + rk, ov);
    },
    [rk],
  );
  return {
    loading: !generated,
    generated,
    chart: generated ? applyOverrides(generated.chart, overrides) : undefined,
    overrides,
    setOverrides,
  };
}
