/** Functions callable from the UI through the engine worker. Pure; also used directly in tests. */
import type { Rules } from '../engine/rules';
import { generateBasicStrategy, roundEV } from '../engine/strategy/generate';
import { fullComp } from '../engine/shoe';
import type { Chart } from '../engine/strategy/chart';
import type { ActionEVs } from '../engine/ev/engine';
import { analyzeDecision, type DecisionEVs } from '../engine/ev/analyze';
import type { Comp } from '../engine/shoe';
import type { Avail, Action } from '../engine/strategy/chart';
import { generateIndices, type GeneratedIndex } from '../engine/indexgen';
import { dealerProbs } from '../engine/ev/dealer';
import { computeEdgeModel, type EdgeModel } from '../engine/edge';
import { GoalSolver, roundOutcomeDist, goalDP, goalUtility, mean, expect as expectU, type Dist } from '../engine/goal';
import { engineFor } from '../engine/ev/analyze';
import { planSession, type PlanInput, type Plan } from '../engine/plan';

export interface StrategyResult {
  chart: Chart;
  cellEVs: Record<string, ActionEVs>;
  exceptions: { a: number; b: number; up: number; chart: string; best: string; gain: number }[];
  /** Player EV per round off the top with this chart (shuffle every hand). Negative = house edge. */
  baseEdge: number;
}

export interface GoalHandResult {
  action: Action;
  ev: number;
  pGoal: number;
  /** P(this hand nets > 0) under the goal-optimal continuation. */
  pWin: number;
}

export interface ActionOdds {
  action: Action;
  win: number;
  push: number;
  lose: number;
  /** Average result per unit bet. */
  ev: number;
}

export const handlers = {
  /** Plan a session: what this game is worth at each spread, and how a session of this length goes. */
  planSession(input: PlanInput, spreads: number[]): Plan {
    return planSession(input, spreads);
  },
  /** Win / push / lose chances of every legal action (rest of the hand played max-EV). */
  coachOdds(unseen: Comp, values: number[], up: number, rules: Rules, avail: Avail): ActionOdds[] {
    const base = unseen.slice();
    for (const v of values) base[v]++;
    const eng = engineFor(base, up, rules);
    const d = new GoalSolver(eng, (n) => n).actions(values, avail);
    return (Object.keys(d) as Action[]).map((a) => {
      const dist = d[a] as Dist;
      let win = 0;
      let push = 0;
      let lose = 0;
      for (const [n, p] of dist) {
        if (n > 0) win += p;
        else if (n < 0) lose += p;
        else push += p;
      }
      return { action: a, win, push, lose, ev: mean(dist) };
    });
  },
  edgeModel(rules: Rules, chart: Chart): EdgeModel {
    return computeEdgeModel(rules, chart);
  },
  /** Round outcome distribution + bankroll DP for a strike scenario. */
  strikeSetup(comp: Comp, rules: Rules, chart: Chart, target: number, hands: number, minBet: number, maxBet: number, sitOut: boolean) {
    const dist = roundOutcomeDist(comp, rules, chart);
    const dp = goalDP(dist, target, hands, minBet, maxBet, sitOut);
    return { dist: [...dist.entries()] as [number, number][], V: dp.V.map((v) => Array.from(v)), bestBet: dp.bestBet.map((v) => Array.from(v)), edge: mean(dist) };
  },
  /** Per action: EV and P(goal) for a dealt hand, continuation chosen to maximise P(goal). */
  goalHand(unseen: Comp, values: number[], up: number, rules: Rules, avail: Avail, bankroll: number, bet: number, target: number, Vnext: number[]): GoalHandResult[] {
    const base = unseen.slice();
    for (const v of values) base[v]++;
    const eng = engineFor(base, up, rules);
    const dp = { V: [Float64Array.from(Vnext)], bestBet: [], target };
    const u = goalUtility(dp, bankroll, bet, 0);
    const goal = new GoalSolver(eng, u).actions(values, avail);
    const evd = new GoalSolver(eng, (n) => n).actions(values, avail);
    const out: GoalHandResult[] = [];
    for (const a of Object.keys(goal) as Action[]) {
      const d = goal[a] as Dist;
      out.push({ action: a, ev: mean(evd[a] as Dist), pGoal: expectU(d, u), pWin: expectU(d, (n) => (n > 0 ? 1 : 0)) });
    }
    return out;
  },
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
