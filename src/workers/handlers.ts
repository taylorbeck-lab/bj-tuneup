/** Functions callable from the UI through the engine worker. Pure; also used directly in tests. */
import type { Rules } from '../engine/rules';
import { generateBasicStrategy, roundEV } from '../engine/strategy/generate';
import { fullComp } from '../engine/shoe';
import type { Chart } from '../engine/strategy/chart';
import type { ActionEVs } from '../engine/ev/engine';
import { analyzeDecision, type DecisionEVs } from '../engine/ev/analyze';
import type { Comp } from '../engine/shoe';
import type { Avail } from '../engine/strategy/chart';
import { generateIndices, type GeneratedIndex } from '../engine/indexgen';
import { dealerProbs } from '../engine/ev/dealer';

export interface StrategyResult {
  chart: Chart;
  cellEVs: Record<string, ActionEVs>;
  exceptions: { a: number; b: number; up: number; chart: string; best: string; gain: number }[];
  /** Player EV per round off the top with this chart (shuffle every hand). Negative = house edge. */
  baseEdge: number;
}

export const handlers = {
  generateIndices(chart: Chart, rules: Rules): GeneratedIndex[] {
    return generateIndices(chart, rules);
  },
  /** Full analysis for the analyzer screen: EVs of every action + dealer outcome distribution. */
  analyzeFull(unseen: Comp, values: number[], up: number, rules: Rules, avail: Avail) {
    const evs = values.length ? analyzeDecision(unseen, values, up, rules, avail, 1) : null;
    const shoe = unseen.slice();
    const dealer = Array.from(dealerProbs(shoe, up, rules.h17, true));
    const n = unseen.reduce((a, b) => a + b, 0);
    const pBJ = up === 1 ? unseen[10] / n : up === 10 ? unseen[1] / n : 0;
    return { evs, dealer, pBJ };
  },
  analyzeDecision(unseen: Comp, values: number[], up: number, rules: Rules, avail: Avail, splitHands: number): DecisionEVs {
    return analyzeDecision(unseen, values, up, rules, avail, splitHands);
  },
  generateStrategy(rules: Rules): StrategyResult {
    const g = generateBasicStrategy(rules);
    return { chart: g.chart, cellEVs: g.cellEVs, exceptions: g.exceptions, baseEdge: roundEV(fullComp(rules.decks), rules, g.chart, g.records) };
  },
};
export type Handlers = typeof handlers;
