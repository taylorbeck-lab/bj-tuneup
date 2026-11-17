import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { kvGet, kvSet } from '../store/db';
import { normalizeRules, DEFAULT_RULES, type Rules } from '../engine/rules';
import { DEFAULT_PROGRESS, type Progress } from './progress';
import type { Traffic } from './table/traffic';
import { MODES, modeMatches } from './modes';

/** A dealer's hand cut: the cut card usually lands within about ±6% of the shoe from the mark. */
export const HAND_CUT = 0.06;

export type Speed = 'slow' | 'average' | 'fast' | 'xfast';
export const SPEEDS: { id: Speed; label: string; card: number; linger: number }[] = [
  { id: 'slow', label: 'Slow', card: 1050, linger: 3400 },
  { id: 'average', label: 'Average', card: 720, linger: 2500 },
  { id: 'fast', label: 'Fast', card: 470, linger: 1800 },
  { id: 'xfast', label: 'Extra fast', card: 300, linger: 1200 },
];

export interface V2Settings {
  rules: Rules;
  /** Players at the table including you (1..6), when the table is fixed (traffic off). */
  players: number;
  /** How busy the table runs: players come and go (quiet, normal, busy), or a fixed number (off). */
  traffic: Traffic;
  /**
   * How the cards are shuffled between shoes: by hand, built from the last shoe ('hand'), or by a
   * shuffle machine ('machine'). Never a continuous shuffler: counting means nothing there.
   */
  shuffle: 'hand' | 'machine';
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
  /** Where you are in the course (José moves you up), see progress.ts. */
  progress: Progress;
  /** Claude API key for "Ask the coach" (stored only on this device). */
  apiKey?: string;
  onboarded: boolean;
  /** Which set of defaults these settings started from (2 = double deck, $10). */
  defaultsVersion?: number;
}

/**
 * The house game: a double-deck locals game (think Mesquite), dealer hits soft 17, double after
 * split, about two-thirds dealt, $10 to $500. Double deck is the sweet spot to learn counting: the
 * true count is easy to work out, and single deck barely exists any more. Six decks is one tap away.
 */
export const DEFAULT_V2: V2Settings = {
  rules: { ...DEFAULT_RULES, decks: 2, h17: true, das: true, lateSurrender: false, penetration: 0.65, cutSpread: HAND_CUT, seats: 7 },
  players: 4,
  seat: 4,
  spots: 1,
  speed: 'average',
  tableMin: 10,
  startBankroll: 1000,
  coach: { feedback: 'always', deviations: false, showCount: false, countQuiz: 'off', betCoach: false, practiceMisses: true },
  onboarded: false,
  progress: { ...DEFAULT_PROGRESS },
  traffic: 'normal',
  shuffle: 'hand',
  defaultsVersion: 2,
};

/** Settings saved before the course existed: start the course at the level the coach was already set to. */
function progressFrom(s: Partial<V2Settings>, coach: V2Settings['coach']): Progress {
  if (s.progress) return { ...DEFAULT_PROGRESS, ...s.progress };
  if (!s.onboarded) return { ...DEFAULT_PROGRESS };
  const at = MODES.findIndex((m) => modeMatches(coach, m.coach));
  const level = (at >= 0 ? at + 1 : coach.deviations ? 3 : coach.betCoach ? 2 : 1) as Progress['level'];
  return { ...DEFAULT_PROGRESS, level, tier: level === 3 ? 3 : 1 };
}

/** Saved settings that still sit on the old untouched 6-deck $25 default move to the new house game. */
function upgradeDefaults(s: Partial<V2Settings>): Partial<V2Settings> {
  if (s.defaultsVersion && s.defaultsVersion >= 2) return s;
  const r = s.rules;
  const untouched = (!r || (r.decks === 6 && r.h17 && r.das && !r.lateSurrender && r.penetration === 0.75)) && (s.tableMin ?? 25) === 25;
  if (!untouched) return { ...s, defaultsVersion: 2 };
  return { ...s, rules: { ...(r ?? DEFAULT_V2.rules), ...DEFAULT_V2.rules }, tableMin: DEFAULT_V2.tableMin, players: s.players === 5 ? DEFAULT_V2.players : s.players, defaultsVersion: 2 };
}

export function mergeV2(s?: Partial<V2Settings>): V2Settings {
  const d = DEFAULT_V2;
  if (!s) return structuredClone(d);
  s = upgradeDefaults(s);
  const players = Math.min(6, Math.max(1, Math.round(s.players ?? d.players)));
  return {
    ...d,
    ...s,
    rules: normalizeRules({ ...d.rules, ...(s.rules ?? {}), seats: 7 }),
    players,
    seat: Math.min(6, Math.max(1, Math.round(s.seat ?? d.seat))),
    spots: s.spots === 2 ? 2 : 1,
    coach: { ...d.coach, ...(s.coach ?? {}) },
    progress: progressFrom(s, { ...d.coach, ...(s.coach ?? {}) }),
    // settings saved before traffic: a player count someone chose on purpose stays fixed
    traffic: s.traffic ?? (s.players !== undefined && s.players !== d.players ? 'off' : 'normal'),
    shuffle: s.shuffle === 'machine' ? 'machine' : 'hand',
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
    // Never leave the app blank: if saved settings can't be read, carry on with the defaults.
    let done = false;
    const finish = (x?: Partial<V2Settings>) => {
      if (done) return;
      done = true;
      setS(mergeV2(x));
      setLoaded(true);
    };
    kvGet<V2Settings>('v2settings').then(finish, () => finish());
    const id = setTimeout(() => finish(), 5000);
    return () => clearTimeout(id);
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
/** The posted maximum for a table minimum (locals-casino style: $10 tables top out at $500). */
export function tableMax(min: number): number {
  const posted: Record<number, number> = { 5: 500, 10: 500, 25: 2500, 50: 5000, 100: 10000 };
  return posted[min] ?? Math.min(10000, min * 100);
}
