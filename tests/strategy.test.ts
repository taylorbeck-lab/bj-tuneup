import { describe, it, expect, beforeAll } from 'vitest';
import { BUILT_IN_PRESETS } from '../src/engine/rules';
import { generateBasicStrategy, type GeneratedStrategy } from '../src/engine/strategy/generate';
import { chartAction, chartToCSV, chartFromCSV, chartFromJSON, type Chart } from '../src/engine/strategy/chart';
import { CHART_2D_H17_DAS, CHART_2D_S17_DAS, CHART_6D_H17_DAS_LS, CHART_6D_S17_DAS_LS, type PublishedChart } from './fixtures/charts';

const cases: [string, PublishedChart][] = [
  ['dt-2d-h17', CHART_2D_H17_DAS],
  ['2d-s17', CHART_2D_S17_DAS],
  ['6d-h17-ls', CHART_6D_H17_DAS_LS],
  ['6d-s17-ls', CHART_6D_S17_DAS_LS],
];

const generated: Record<string, GeneratedStrategy> = {};

describe('basic strategy generator vs published charts', () => {
  beforeAll(() => {
    for (const [id] of cases) generated[id] = generateBasicStrategy(BUILT_IN_PRESETS.find((p) => p.id === id)!.rules);
  });
  for (const [id, pub] of cases) {
    it(`${id} matches every published cell`, () => {
      const g = generated[id].chart;
      const diffs: string[] = [];
      for (const sec of ['hard', 'soft', 'pairs'] as const) {
        for (const [row, cells] of Object.entries(pub[sec])) {
          const want = cells.split(' ');
          const got = g[sec][Number(row)];
          want.forEach((w, i) => {
            if (got[i] !== w) diffs.push(`${sec} ${row} col ${i}: got ${got[i]} want ${w}`);
          });
        }
      }
      expect(diffs).toEqual([]);
    });
  }
  it('2D S17 composition-dependent exceptions include published ones', () => {
    // Wizard of Odds, 2D S17 CD strategy: 12 (10+2) vs 4 = Hit; 11 (8+3) vs A = Hit; 11 (9+2) vs A = Hit.
    const ex = generated['2d-s17'].exceptions.map((e) => `${e.a},${e.b} v ${e.up} ${e.best}`);
    expect(ex).toContain('2,10 v 4 hit');
    expect(ex).toContain('3,8 v 1 hit');
    expect(ex).toContain('2,9 v 1 hit');
  });
  it('chart lookup resolves fallbacks', () => {
    const c = generated['6d-h17-ls'].chart;
    expect(chartAction(c, [8, 8], 1, { canDouble: true, canSplit: true, canSurrender: true })).toBe('surrender');
    expect(chartAction(c, [8, 8], 1, { canDouble: true, canSplit: true, canSurrender: false })).toBe('split');
    expect(chartAction(c, [1, 7], 3, { canDouble: false, canSplit: false, canSurrender: false })).toBe('stand');
    expect(chartAction(c, [5, 5], 6, { canDouble: true, canSplit: true, canSurrender: false })).toBe('double');
    expect(chartAction(c, [10, 6], 10, { canDouble: true, canSplit: false, canSurrender: true })).toBe('surrender');
    expect(chartAction(c, [10, 3, 3], 10, { canDouble: false, canSplit: false, canSurrender: false })).toBe('hit');
    expect(chartAction(c, [1, 1], 6, { canDouble: true, canSplit: false, canSurrender: false })).toBe('double');
  });
  it('CSV and JSON round-trip', () => {
    const c = generated['dt-2d-h17'].chart;
    const back: Chart = chartFromCSV(chartToCSV(c), generated['2d-s17'].chart);
    expect(back).toEqual(c);
    expect(chartFromJSON(JSON.stringify(c), generated['2d-s17'].chart)).toEqual(c);
    expect(() => chartFromCSV('hard,12,X,S,S,S,S,H,H,H,H,H', c)).toThrow();
  });
});
