/** Session summary for the table sim (shared with Tune-Up and Feel Lab). */
import type { RoundLog } from '../../engine/game';
import type { Chart } from '../../engine/strategy/chart';
import { ACTION_LABEL } from '../../engine/strategy/chart';
import type { IndexPlay } from '../../engine/indices';
import { gradeDecision, gradeInsurance, type DecisionGrade, type InsuranceGrade } from '../../engine/grade';
import type { DecisionEVs } from '../../engine/ev/analyze';
import type { Analysed } from './useSim';
import type { Mistake } from '../../store/sessions';
import { rampBet } from '../../engine/drills';
import { valueLabel, handTotal } from '../../engine/cards';

export interface GradedDecision {
  round: number;
  bet: number;
  snap: Analysed['snap'];
  evs: DecisionEVs;
  g: DecisionGrade;
}

export interface SimSummary {
  hands: number;
  net: number;
  decisions: GradedDecision[];
  playErrors: number;
  betErrors: number;
  insErrors: number;
  insurance: { round: number; g: InsuranceGrade; bet: number }[];
  /** EV given up vs the user's strategy (units, only mistakes). */
  evLost: number;
  evLostPer100: number;
  /** EV given up vs exact best play (units). */
  evLostVsBest: number;
  mistakes: Mistake[];
  accuracy: number;
  countChecks: { said: number; truth: number }[];
}

export function handName(values: readonly number[]): string {
  if (values.length === 2 && values[0] === values[1]) return `${valueLabel(values[0])},${valueLabel(values[1])}`;
  const t = handTotal(values);
  const comp = values.map(valueLabel).join(',');
  return `${t.soft ? 'soft ' : ''}${t.total} (${comp})`;
}

export async function summarize(logs: RoundLog[], analyses: Analysed[], chart: Chart, plays: IndexPlay[], ramp: number[], countChecks: { said: number; truth: number }[] = []): Promise<SimSummary> {
  const evs = await Promise.all(analyses.map((a) => a.evs));
  const betByRound = new Map(logs.map((l) => [l.round, l.bet.units]));
  const decisions: GradedDecision[] = analyses.map((a, i) => ({
    round: a.snap.round,
    bet: betByRound.get(a.snap.round) ?? 1,
    snap: a.snap,
    evs: evs[i],
    g: gradeDecision(a.snap, evs[i], chart, plays),
  }));
  const mistakes: Mistake[] = [];
  let evLost = 0;
  let evLostVsBest = 0;
  let playErrors = 0;
  for (const d of decisions) {
    evLostVsBest += d.g.lostVsBest * d.bet;
    if (d.g.error) {
      playErrors++;
      const lost = Math.max(0, d.g.lostVsIndex) * d.bet;
      evLost += lost;
      mistakes.push({
        key: `play:${d.snap.values.join(',')}v${d.snap.up}`,
        label: `${handName(d.snap.values)} v ${valueLabel(d.snap.up)} @ TC ${d.snap.tc}`,
        detail: `You: ${ACTION_LABEL[d.g.chosen]} · ${d.g.indexPlayId ? 'Index' : 'Chart'}: ${ACTION_LABEL[d.g.index]} · exact best: ${ACTION_LABEL[d.g.best]}`,
        evLost: lost,
      });
    }
  }
  let betErrors = 0;
  for (const l of logs) {
    const want = rampBet(ramp, l.bet.tc);
    if (want !== l.bet.units) {
      betErrors++;
      mistakes.push({ key: 'bet', label: `Bet @ TC ${l.bet.tc}`, detail: `Bet ${l.bet.units}u, ramp says ${want}u` });
    }
  }
  const insurance = logs
    .filter((l) => l.insurance)
    .map((l) => ({ round: l.round, g: gradeInsurance(l.insurance!, plays), bet: l.bet.units }));
  let insErrors = 0;
  for (const i of insurance) {
    evLostVsBest += i.g.lostVsBest * i.bet;
    if (i.g.error) {
      insErrors++;
      evLost += i.g.lostVsBest * i.bet;
      mistakes.push({
        key: 'ins',
        label: `Insurance @ TC ${logs.find((l) => l.round === i.round)?.insurance?.tc}`,
        detail: `You: ${i.g.take ? 'took it' : 'declined'} · index says ${i.g.shouldTake ? 'take' : 'decline'} · EV ${(i.g.ev * 100).toFixed(1)}%`,
        evLost: i.g.lostVsBest * i.bet,
      });
    }
  }
  for (const c of countChecks) if (c.said !== c.truth) mistakes.push({ key: 'count', label: 'Running count check', detail: `Said ${c.said}, was ${c.truth}` });
  const hands = logs.length;
  const decisionsTotal = decisions.length + logs.length + insurance.length + countChecks.length;
  const errorsTotal = playErrors + betErrors + insErrors + countChecks.filter((c) => c.said !== c.truth).length;
  mistakes.sort((a, b) => (b.evLost ?? 0) - (a.evLost ?? 0));
  return {
    hands,
    net: logs.reduce((s, l) => s + l.net, 0),
    decisions,
    playErrors,
    betErrors,
    insErrors,
    insurance,
    evLost,
    evLostPer100: hands ? (100 * evLost) / hands : 0,
    evLostVsBest,
    mistakes,
    accuracy: decisionsTotal ? 1 - errorsTotal / decisionsTotal : 1,
    countChecks,
  };
}
