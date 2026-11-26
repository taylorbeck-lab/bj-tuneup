/**
 * Counts the way counters say them in their heads: "up 3", "down 2", "even" (never plus/minus).
 */
export function countWords(n: number): string {
  if (n === 0) return 'even';
  return (n > 0 ? 'up ' : 'down ') + Math.abs(n);
}

export type Dir = 'up' | 'down' | 'even' | null;

/** Keypad state: a direction (tapped before or after the number) and up to two digits. */
export interface PadState {
  dir: Dir;
  digits: string;
}

export const EMPTY_PAD: PadState = { dir: null, digits: '' };

export function padPress(s: PadState, key: 'up' | 'down' | 'even' | 'del' | string): PadState {
  if (key === 'even') return { dir: 'even', digits: '' };
  if (key === 'up' || key === 'down') return { dir: key, digits: s.dir === 'even' ? '' : s.digits };
  if (key === 'del') return s.digits ? { ...s, digits: s.digits.slice(0, -1) } : { dir: null, digits: '' };
  if (!/^\d$/.test(key)) return s;
  const digits = (s.digits === '0' ? '' : s.digits) + key;
  return { dir: s.dir === 'even' ? null : s.dir, digits: digits.length > 2 ? s.digits : digits };
}

/** The number entered, or null while it is incomplete (a direction and a number are both needed). */
export function padValue(s: PadState): number | null {
  if (s.dir === 'even') return 0;
  if (s.digits === '') return null;
  const n = Number(s.digits);
  if (n === 0) return 0;
  if (!s.dir) return null;
  return s.dir === 'up' ? n : -n;
}

/** What the display reads while typing. */
export function padText(s: PadState): string {
  if (s.dir === 'even') return 'EVEN';
  const n = s.digits === '' ? '?' : String(Number(s.digits));
  if (n === '0') return 'EVEN';
  return s.dir ? `${s.dir.toUpperCase()} ${n}` : n === '?' ? '?' : `${n}: up or down?`;
}
