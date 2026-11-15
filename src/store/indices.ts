import { useEffect, useState, useCallback, useRef } from 'react';
import { kvGet, kvSet } from './db';
import { rulesKey, type Rules } from '../engine/rules';
import { REFERENCE_INDICES, type IndexPlay } from '../engine/indices';
import type { GeneratedIndex } from '../engine/indexgen';
import type { Chart } from '../engine/strategy/chart';
import { callBackground } from '../workers/client';

export type IndexSource = 'generated' | 'reference' | 'custom';
const GEN_VERSION = 3;
const genKey = (rk: string) => `indices-gen:v${GEN_VERSION}:${rk}`;
const pending = new Map<string, Promise<GeneratedIndex[]>>();

/** Generate (or load cached) indices for these rules. Takes ~10–30 s the first time, in the worker. */
export function loadGeneratedIndices(chart: Chart, rules: Rules): Promise<GeneratedIndex[]> {
  const k = genKey(rulesKey(rules));
  let p = pending.get(k);
  if (!p) {
    p = (async () => {
      const cached = await kvGet<GeneratedIndex[]>(k);
      if (cached) return cached;
      const g = await callBackground('generateIndices', chart, rules);
      await kvSet(k, g);
      return g;
    })();
    pending.set(k, p);
  }
  return p;
}

export async function cachedGeneratedIndices(rules: Rules): Promise<GeneratedIndex[] | undefined> {
  return kvGet<GeneratedIndex[]>(genKey(rulesKey(rules)));
}

/**
 * The user's index chart for these rules. Source: 'generated' (engine, for these rules),
 * 'reference' (Illustrious 18 + Fab 4) or 'custom' (edited). Default: generated when it has been
 * computed, else the reference.
 */
export function useIndexPlays(rules: Rules, chart?: Chart) {
  const rk = rulesKey(rules);
  const [plays, setPlays] = useState<IndexPlay[]>(REFERENCE_INDICES);
  const [source, setSourceState] = useState<IndexSource>('reference');
  const [generated, setGenerated] = useState<GeneratedIndex[] | undefined>();
  const [custom, setCustomState] = useState<IndexPlay[] | undefined>();
  const [ver, setVer] = useState(0);
  useEffect(() => {
    let live = true;
    (async () => {
      const [src, cust, gen] = await Promise.all([kvGet<IndexSource>('indexSource:' + rk), kvGet<IndexPlay[]>('indexPlays:' + rk), cachedGeneratedIndices(rules)]);
      if (!live) return;
      setGenerated(gen);
      setCustomState(cust);
      const s: IndexSource = src ?? (gen ? 'generated' : 'reference');
      setSourceState(s);
      setPlays(s === 'custom' && cust ? cust : s === 'generated' && gen ? gen.map((g) => g.play) : REFERENCE_INDICES);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rk, ver]);
  const setSource = useCallback(
    (s: IndexSource) => {
      kvSet('indexSource:' + rk, s).then(() => setVer((v) => v + 1));
    },
    [rk],
  );
  const saveCustom = useCallback(
    (p: IndexPlay[]) => {
      Promise.all([kvSet('indexPlays:' + rk, p), kvSet('indexSource:' + rk, 'custom')]).then(() => setVer((v) => v + 1));
    },
    [rk],
  );
  const refresh = useCallback(() => setVer((v) => v + 1), []);
  // With a chart, build the count plays for these exact rules in the background (cached after the
  // first time); until then the published reference set is used.
  const chartRef = useRef(chart);
  chartRef.current = chart;
  const hasChart = !!chart;
  useEffect(() => {
    if (!hasChart || generated || !chartRef.current) return;
    let live = true;
    loadGeneratedIndices(chartRef.current, rules)
      .then(() => live && refresh())
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChart, rk, !!generated]);
  return { plays, source, setSource, generated, custom, saveCustom, refresh };
}
