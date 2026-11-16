/** Table rules. The game is always a US peek game (dealer checks for blackjack with A or T up). */
export type DoubleOn = 'any' | '9-11' | '10-11';

export interface Rules {
  decks: 1 | 2 | 6 | 8;
  /** Dealer hits soft 17. */
  h17: boolean;
  /** Double after split. */
  das: boolean;
  doubleOn: DoubleOn;
  /** Maximum number of hands a pair can become (1 = no splitting, 2 = no resplit, 4 = resplit to 4). */
  maxSplitHands: number;
  resplitAces: boolean;
  hitSplitAces: boolean;
  lateSurrender: boolean;
  /** Blackjack payout: 1.5 (3:2) or 1.2 (6:5). */
  bjPayout: 1.5 | 1.2;
  /** Fraction of the shoe dealt before the cut card (0.5 .. 0.9). */
  penetration: number;
  /**
   * How far a hand-placed cut card wanders from `penetration` (0 = fixed, like a notched tray;
   * 0.06 = a dealer's cut, usually within about ±6% of the shoe, most often close to the mark).
   */
  cutSpread?: number;
  /** Seats at the table including the player (1..6). */
  seats: number;
  /** Cards burned after each shuffle (0 or 1). */
  burn: number;
}

export interface Preset {
  id: string;
  name: string;
  rules: Rules;
  builtIn?: boolean;
}

export const DEFAULT_RULES: Rules = {
  decks: 2,
  h17: true,
  das: true,
  doubleOn: 'any',
  maxSplitHands: 4,
  resplitAces: false,
  hitSplitAces: false,
  lateSurrender: false,
  bjPayout: 1.5,
  penetration: 0.65,
  cutSpread: 0,
  seats: 3,
  burn: 1,
};

export const BUILT_IN_PRESETS: Preset[] = [
  { id: 'dt-2d-h17', name: 'Downtown 2D H17', builtIn: true, rules: { ...DEFAULT_RULES } },
  { id: '2d-s17', name: '2D S17 DAS', builtIn: true, rules: { ...DEFAULT_RULES, h17: false } },
  {
    id: '6d-h17-ls',
    name: '6D H17 DAS LS',
    builtIn: true,
    rules: { ...DEFAULT_RULES, decks: 6, lateSurrender: true, penetration: 0.75, seats: 5 },
  },
  {
    id: '6d-s17-ls',
    name: '6D S17 DAS LS',
    builtIn: true,
    rules: { ...DEFAULT_RULES, decks: 6, h17: false, lateSurrender: true, penetration: 0.75, seats: 5 },
  },
  {
    id: '1d-h17',
    name: 'Single deck H17',
    builtIn: true,
    rules: { ...DEFAULT_RULES, decks: 1, das: false, maxSplitHands: 2, penetration: 0.6, seats: 2 },
  },
  {
    id: '8d-s17',
    name: '8D S17 DAS',
    builtIn: true,
    rules: { ...DEFAULT_RULES, decks: 8, h17: false, penetration: 0.8, seats: 5 },
  },
];

/** Clamp and sanitise a possibly user-edited rules object. */
export function normalizeRules(r: Partial<Rules>): Rules {
  const m = { ...DEFAULT_RULES, ...r };
  const decks = ([1, 2, 6, 8] as const).includes(m.decks) ? m.decks : 2;
  return {
    decks,
    h17: !!m.h17,
    das: !!m.das,
    doubleOn: (['any', '9-11', '10-11'] as const).includes(m.doubleOn) ? m.doubleOn : 'any',
    maxSplitHands: Math.min(4, Math.max(1, Math.round(m.maxSplitHands))),
    resplitAces: !!m.resplitAces,
    hitSplitAces: !!m.hitSplitAces,
    lateSurrender: !!m.lateSurrender,
    bjPayout: m.bjPayout === 1.2 ? 1.2 : 1.5,
    penetration: Math.min(0.92, Math.max(0.4, Number(m.penetration) || 0.65)),
    cutSpread: Math.min(0.12, Math.max(0, Number(m.cutSpread) || 0)),
    seats: Math.min(6, Math.max(1, Math.round(m.seats))),
    burn: m.burn ? 1 : 0,
  };
}

/** Compact rules label like "2D H17 DAS 3:2". */
export function rulesLabel(r: Rules): string {
  const parts = [`${r.decks}D`, r.h17 ? 'H17' : 'S17'];
  if (r.das) parts.push('DAS');
  if (r.doubleOn !== 'any') parts.push(`D${r.doubleOn}`);
  if (r.lateSurrender) parts.push('LS');
  if (r.maxSplitHands < 4) parts.push(r.maxSplitHands === 1 ? 'NoSP' : 'SP2');
  if (r.resplitAces) parts.push('RSA');
  if (r.hitSplitAces) parts.push('HSA');
  parts.push(r.bjPayout === 1.5 ? '3:2' : '6:5');
  return parts.join(' ');
}

/** May the player double a hand with this hard/soft total (2 cards)? */
export function canDoubleTotal(r: Rules, total: number, soft: boolean): boolean {
  if (r.doubleOn === 'any') return true;
  if (soft) return false;
  if (r.doubleOn === '9-11') return total >= 9 && total <= 11;
  return total === 10 || total === 11;
}

/** Stable key for caching computations per rule set (ignores table-only settings). */
export function rulesKey(r: Rules): string {
  return [r.decks, r.h17 ? 1 : 0, r.das ? 1 : 0, r.doubleOn, r.maxSplitHands, r.resplitAces ? 1 : 0, r.hitSplitAces ? 1 : 0, r.lateSurrender ? 1 : 0, r.bjPayout].join('|');
}
