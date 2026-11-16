import { useEffect, useState } from 'react';
import { kvGet, kvSet } from './db';
import { rulesKey, type Rules } from '../engine/rules';
import type { EdgeModel } from '../engine/edge';
import type { Chart } from '../engine/strategy/chart';
import { callBackground } from '../workers/client';

const V = 2;
const pending = new Map<string, Promise<EdgeModel>>();

/** Effect-of-removal edge model for the rules (basic-strategy player), computed once in the worker and cached. */
export function loadEdgeModel(rules: Rules, chart: Chart): Promise<EdgeModel> {
  const k = `edge:v${V}:${rulesKey(rules)}`;
  let p = pending.get(k);
  if (!p) {
    p = (async () => {
      const c = await kvGet<EdgeModel>(k);
      if (c) return c;
      const m = await callBackground('edgeModel', rules, chart);
      await kvSet(k, m);
      return m;
    })();
    pending.set(k, p);
  }
  return p;
}

export function useEdgeModel(rules: Rules, chart: Chart | undefined): EdgeModel | undefined {
  const [m, setM] = useState<EdgeModel>();
  const rk = rulesKey(rules);
  useEffect(() => {
    if (!chart) return;
    let live = true;
    loadEdgeModel(rules, chart).then((x) => live && setM(x));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rk, !!chart]);
  return m;
}
