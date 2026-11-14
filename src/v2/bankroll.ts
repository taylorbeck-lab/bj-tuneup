import { useCallback, useEffect, useState } from 'react';
import { kvGet, kvSet } from '../store/db';

export interface Bankroll {
  balance: number;
  start: number;
  /** Balance after each round (capped history). */
  history: { t: number; b: number }[];
  hands: number;
}

export function useBankroll(startDefault: number) {
  const [br, setBr] = useState<Bankroll>({ balance: startDefault, start: startDefault, history: [], hands: 0 });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    kvGet<Bankroll>('v2bankroll').then((b) => {
      if (b) setBr(b);
      setLoaded(true);
    });
  }, []);
  const save = (b: Bankroll) => {
    setBr(b);
    kvSet('v2bankroll', b);
  };
  const settle = useCallback((net: number) => {
    setBr((prev) => {
      const b = { ...prev, balance: prev.balance + net, hands: prev.hands + 1, history: [...prev.history, { t: Date.now(), b: prev.balance + net }].slice(-2000) };
      kvSet('v2bankroll', b);
      return b;
    });
  }, []);
  const reset = (amount: number) => save({ balance: amount, start: amount, history: [{ t: Date.now(), b: amount }], hands: 0 });
  return { br, loaded, settle, reset };
}

export const money = (x: number) => (x < 0 ? '−$' : '$') + Math.abs(Math.round(x)).toLocaleString();
