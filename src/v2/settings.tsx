import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { kvGet, kvSet } from '../store/db';
import { normalizeRules, DEFAULT_RULES, type Rules } from '../engine/rules';

export type Speed = 'slow' | 'average' | 'fast' | 'xfast';
export const SPEEDS: { id: Speed; label: string; card: number; linger: number }[] = [
  { id: 'slow', label: 'Slow dealer', card: 1050, linger: 3400 },
  { id: 'average', label: 'Average dealer', card: 720, linger: 2500 },
  { id: 'fast', label: 'Fast dealer', card: 470, linger: 1800 },
  { id: 'xfast', label: 'Extra fast', card: 300, linger: 1200 },
];

export interface V2Settings {
  rules: Rules;
  /** Players at the table including you (1..6). */
  players: number;
  /** Your spot, 1 = first base (dealer's left) .. 6 = third base. */
  seat: number;
  /** Spots you play: 1 or 2. */
  spots: 1 | 2;
  speed: Speed;
  tableMin: number;
  startBankroll: number;
  coach: {
    /** When the strategy coach speaks. */
    feedback: 'always' | 'mistakes' | 'off';
    /** Right play changes with the true count (Hi-Lo indices). */
    deviations: boolean;
    /** Show the running count on the table (training wheels). */
    showCount: boolean;
    /** How often the dealer asks "what's the count?" */
    countQuiz: 'off' | 'sometimes' | 'often';
    /** Tell me when the count says to raise or lower my bet. */
    betCoach: boolean;
    /** Hands you miss come back more often. */
    practiceMisses: boolean;
  };
  /** Claude API key for "Ask the coach" (stored only on this device). */
  apiKey?: string;
  onboarded: boolean;
}

export const DEFAULT_V2: V2Settings = {
  rules: { ...DEFAULT_RULES, decks: 6, h17: true, das: true, lateSurrender: false, penetration: 0.75, seats: 7 },
  players: 5,
  seat: 4,
  spots: 1,
  speed: 'average',
  tableMin: 25,
  startBankroll: 1000,
  coach: { feedback: 'always', deviations: false, showCount: false, countQuiz: 'sometimes', betCoach: false, practiceMisses: true },
  onboarded: false,
};

export function mergeV2(s?: Partial<V2Settings>): V2Settings {
  const d = DEFAULT_V2;
  if (!s) return structuredClone(d);
  const players = Math.min(6, Math.max(1, Math.round(s.players ?? d.players)));
  return {
    ...d,
    ...s,
    rules: normalizeRules({ ...d.rules, ...(s.rules ?? {}), seats: 7 }),
    players,
    seat: Math.min(6, Math.max(1, Math.round(s.seat ?? d.seat))),
    spots: s.spots === 2 ? 2 : 1,
    coach: { ...d.coach, ...(s.coach ?? {}) },
  };
}

interface Ctx {
  s: V2Settings;
  set: (p: Partial<V2Settings> | ((s: V2Settings) => Partial<V2Settings>)) => void;
  loaded: boolean;
}
const C = createContext<Ctx>({ s: DEFAULT_V2, set: () => {}, loaded: false });

export function V2SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState(DEFAULT_V2);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    kvGet<V2Settings>('v2settings').then((x) => {
      setS(mergeV2(x));
      setLoaded(true);
    });
  }, []);
  const set = useCallback<Ctx['set']>((p) => {
    setS((prev) => {
      const next = mergeV2({ ...prev, ...(typeof p === 'function' ? p(prev) : p) });
      kvSet('v2settings', next);
      return next;
    });
  }, []);
  return <C.Provider value={{ s, set, loaded }}>{children}</C.Provider>;
}
export const useV2 = () => useContext(C);

/** Table limits for a minimum bet. */
export function tableMax(min: number): number {
  return min * 100 > 10000 ? 10000 : min * 100;
}
