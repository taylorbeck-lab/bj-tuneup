/** Functions callable from the UI through the engine worker. Pure; also used directly in tests. */
import type { Rules } from '../engine/rules';
import { generateBasicStrategy } from '../engine/strategy/generate';
import type { Chart } from '../engine/strategy/chart';
import type { ActionEVs } from '../engine/ev/engine';

export interface StrategyResult {
  chart: Chart;
  cellEVs: Record<string, ActionEVs>;
  exceptions: { a: number; b: number; up: number; chart: string; best: string; gain: number }[];
}

export const handlers = {
  generateStrategy(rules: Rules): StrategyResult {
    const g = generateBasicStrategy(rules);
    return { chart: g.chart, cellEVs: g.cellEVs, exceptions: g.exceptions };
  },
};
export type Handlers = typeof handlers;
