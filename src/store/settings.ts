import { BUILT_IN_PRESETS, DEFAULT_RULES, normalizeRules, type Preset, type Rules } from '../engine/rules';

export type Rounding = 'floor' | 'round' | 'trunc';
export interface CountSettings {
  /** Deck estimation granularity in decks: 1, 0.5 or 0.25 (0 = exact). */
  deckGranularity: number;
  rounding: Rounding;
  aceSideCount: boolean;
  /** Key cards tracked, as card ids. */
  keyCards: number[];
}

export interface Targets {
  /** Running-count drill: seconds per deck at or below which you are "fast". */
  countdownSecPerDeck: number;
  /** Minimum accuracy % for drills. */
  accuracyPct: number;
  /** Max EV lost per 100 hands in the sim (units). */
  evLostPer100: number;
}

export interface BetSettings {
  bankroll: number;
  unit: number;
  /** Bet ramp: units to bet at TC <= 1, 2, 3, 4, 5, 6+ (index 0 = TC<=1). */
  ramp: number[];
}

export interface Settings {
  theme: 'dark' | 'light';
  fourColor: boolean;
  haptics: boolean;
  activePresetId: string;
  customPresets: Preset[];
  rules: Rules;
  count: CountSettings;
  targets: Targets;
  bet: BetSettings;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  fourColor: false,
  haptics: true,
  activePresetId: BUILT_IN_PRESETS[0].id,
  customPresets: [],
  rules: { ...DEFAULT_RULES },
  count: { deckGranularity: 0.5, rounding: 'floor', aceSideCount: false, keyCards: [] },
  targets: { countdownSecPerDeck: 25, accuracyPct: 95, evLostPer100: 2 },
  bet: { bankroll: 10000, unit: 25, ramp: [1, 2, 4, 6, 8, 10] },
  onboarded: false,
};

export function mergeSettings(s: Partial<Settings> | undefined): Settings {
  if (!s) return structuredClone(DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    rules: normalizeRules(s.rules ?? DEFAULT_RULES),
    count: { ...DEFAULT_SETTINGS.count, ...(s.count ?? {}) },
    targets: { ...DEFAULT_SETTINGS.targets, ...(s.targets ?? {}) },
    bet: { ...DEFAULT_SETTINGS.bet, ...(s.bet ?? {}) },
    customPresets: (s.customPresets ?? []).map((p) => ({ ...p, rules: normalizeRules(p.rules) })),
  };
}

export function allPresets(s: Settings): Preset[] {
  return [...BUILT_IN_PRESETS, ...s.customPresets];
}
