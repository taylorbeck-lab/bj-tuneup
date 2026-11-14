import { useEffect, useState, useCallback } from 'react';
import { kvGet, kvSet } from './db';
import { rulesKey, type Rules } from '../engine/rules';
import { REFERENCE_INDICES, type IndexPlay } from '../engine/indices';

/** The user's index chart for these rules: saved/edited plays, else the I18 + Fab 4 reference. */
export function useIndexPlays(rules: Rules) {
  const rk = rulesKey(rules);
  const [plays, setPlays] = useState<IndexPlay[]>(REFERENCE_INDICES);
  const [custom, setCustom] = useState(false);
  useEffect(() => {
    let live = true;
    kvGet<IndexPlay[]>('indexPlays:' + rk).then((p) => {
      if (!live) return;
      setPlays(p ?? REFERENCE_INDICES);
      setCustom(!!p);
    });
    return () => {
      live = false;
    };
  }, [rk]);
  const save = useCallback(
    (p: IndexPlay[] | null) => {
      setPlays(p ?? REFERENCE_INDICES);
      setCustom(!!p);
      kvSet('indexPlays:' + rk, p ?? undefined);
    },
    [rk],
  );
  return { plays, custom, save };
}
