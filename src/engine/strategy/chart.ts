/**
 * Strategy charts. Columns are dealer upcards in the order 2,3,4,5,6,7,8,9,T,A.
 * Codes: H hit, S stand, D double (else hit), Ds double (else stand), P split,
 * Rh/Rs/Rp surrender (else hit / stand / split).
 */
export type Code = 'H' | 'S' | 'D' | 'Ds' | 'P' | 'Rh' | 'Rs' | 'Rp';
export const CODES: Code[] = ['H', 'S', 'D', 'Ds', 'P', 'Rh', 'Rs', 'Rp'];
export const UPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1] as const;
export const upIndex = (up: number): number => (up === 1 ? 9 : up - 2);

export type Row = Code[];
export interface Chart {
  /** hard totals 4..21 */
  hard: Record<number, Row>;
  /** soft totals 12..21 (12 = A,A when not splitting) */
  soft: Record<number, Row>;
  /** pairs by card value 1..10 (1 = A,A). Non-'P' cells give the play when not splitting. */
  pairs: Record<number, Row>;
}

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender';
export const ACTION_LABEL: Record<Action, string> = { hit: 'Hit', stand: 'Stand', double: 'Double', split: 'Split', surrender: 'Surrender' };
export const ACTION_SHORT: Record<Action, string> = { hit: 'H', stand: 'S', double: 'D', split: 'P', surrender: 'R' };

export const HARD_ROWS = Array.from({ length: 18 }, (_, i) => i + 4); // 4..21
export const SOFT_ROWS = Array.from({ length: 10 }, (_, i) => i + 12); // 12..21
export const PAIR_ROWS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1];

export interface Avail {
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
}

/** Resolve a chart code to a concrete action given what is allowed. */
export function resolveCode(code: Code, a: Avail): Action {
  switch (code) {
    case 'H':
      return 'hit';
    case 'S':
      return 'stand';
    case 'D':
      return a.canDouble ? 'double' : 'hit';
    case 'Ds':
      return a.canDouble ? 'double' : 'stand';
    case 'P':
      return a.canSplit ? 'split' : 'hit';
    case 'Rh':
      return a.canSurrender ? 'surrender' : 'hit';
    case 'Rs':
      return a.canSurrender ? 'surrender' : 'stand';
    case 'Rp':
      return a.canSurrender ? 'surrender' : a.canSplit ? 'split' : 'hit';
  }
}

function handInfo(values: readonly number[]) {
  let sum = 0;
  let ace = false;
  for (const v of values) {
    sum += v;
    if (v === 1) ace = true;
  }
  const soft = ace && sum + 10 <= 21;
  return { total: soft ? sum + 10 : sum, soft };
}

/** The chart's play for a hand (values 1..10) against an upcard. */
export function chartAction(chart: Chart, hand: readonly number[], up: number, a: Avail): Action {
  const col = upIndex(up);
  const { total, soft } = handInfo(hand);
  if (total >= 21) return 'stand';
  if (hand.length === 2 && hand[0] === hand[1] && a.canSplit) {
    const code = chart.pairs[hand[0]][col];
    if (code === 'P' || code === 'Rp') return resolveCode(code, a);
    // Not splitting: pairs row cell may carry its own non-split play (e.g. 5,5 = D).
    return resolveNonSplit(chart, code, total, soft, col, a);
  }
  const row = soft ? chart.soft[total] : chart.hard[Math.max(4, total)];
  return resolveCode(row[col], { ...a, canSplit: false });
}

function resolveNonSplit(chart: Chart, code: Code, total: number, soft: boolean, col: number, a: Avail): Action {
  if (code === 'P') {
    const row = soft ? chart.soft[total] : chart.hard[total];
    return resolveCode(row[col], { ...a, canSplit: false });
  }
  return resolveCode(code, { ...a, canSplit: false });
}

/** Parse a compact chart row like "H H D D D H H H H H". */
export function row(s: string): Row {
  const r = s.trim().split(/\s+/) as Code[];
  if (r.length !== 10 || r.some((c) => !CODES.includes(c))) throw new Error('Bad chart row: ' + s);
  return r;
}

export function cloneChart(c: Chart): Chart {
  return JSON.parse(JSON.stringify(c));
}

export function chartToCSV(c: Chart): string {
  const lines = ['section,hand,2,3,4,5,6,7,8,9,T,A'];
  for (const t of HARD_ROWS) lines.push(`hard,${t},${c.hard[t].join(',')}`);
  for (const t of SOFT_ROWS) lines.push(`soft,${t},${c.soft[t].join(',')}`);
  for (const p of PAIR_ROWS) lines.push(`pair,${p === 1 ? 'A' : p === 10 ? 'T' : p},${c.pairs[p].join(',')}`);
  return lines.join('\n');
}

export function chartFromCSV(csv: string, fallback: Chart): Chart {
  const out = cloneChart(fallback);
  for (const line of csv.split(/\r?\n/)) {
    const cells = line.split(',').map((s) => s.trim());
    if (cells.length !== 12 || cells[0] === 'section') continue;
    const r = row(cells.slice(2).join(' '));
    const key = cells[1] === 'A' ? 1 : cells[1] === 'T' ? 10 : Number(cells[1]);
    if (cells[0] === 'hard' && out.hard[key]) out.hard[key] = r;
    else if (cells[0] === 'soft' && out.soft[key]) out.soft[key] = r;
    else if (cells[0] === 'pair' && out.pairs[key]) out.pairs[key] = r;
    else throw new Error('Unknown chart row: ' + line);
  }
  return out;
}

export function chartFromJSON(json: string, fallback: Chart): Chart {
  const o = JSON.parse(json) as Partial<Chart>;
  const out = cloneChart(fallback);
  for (const sec of ['hard', 'soft', 'pairs'] as const) {
    const s = o[sec];
    if (!s) continue;
    for (const [k, v] of Object.entries(s)) {
      if (!out[sec][Number(k)]) throw new Error(`Unknown ${sec} row ${k}`);
      out[sec][Number(k)] = row((v as string[]).join(' '));
    }
  }
  return out;
}
