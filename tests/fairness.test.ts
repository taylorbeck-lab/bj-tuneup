import { describe, it, expect } from 'vitest';
import { Table } from '../src/engine/game';
import { DEFAULT_RULES } from '../src/engine/rules';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import { chartAction } from '../src/engine/strategy/chart';
import { valueOf, handTotal } from '../src/engine/cards';
import { mulberry32 } from '../src/engine/rng';

/**
 * The deal never looks at your bet. The card order is fixed when the shoe is shuffled and each card
 * dealt is simply the next one; this plays a long session with a big bet on a random quarter of
 * the hands and checks that big and small bets fare the same, and that doubles on 11 win as often as
 * the math says (about 56%, push about 7%, lose about 37%).
 */
describe('a fair deal', () => {
  it('big bets and small bets win and lose at the same rate', () => {
    const rules = { ...DEFAULT_RULES, decks: 2 as const, penetration: 0.65 };
    const chart = generateBasicStrategy(rules).chart;
    const t = new Table({ rules, seats: 4, humanSeat: 1, chart, seed: 20261117, granularity: 0.5, rounding: 'floor', botMistakeRate: 0.06 });
    const coin = mulberry32(99);
    const by = { small: { n: 0, win: 0 }, big: { n: 0, win: 0 } };
    const d11 = { n: 0, win: 0, lose: 0 };
    for (let r = 0; r < 40000; r++) {
      const big = coin() < 0.25;
      t.placeBet(big ? 8 : 1);
      let doubled11 = false;
      let guard = 0;
      while (t.phase !== 'settled' && guard++ < 200) {
        if (t.phase === 'insurance') t.insure(false);
        else if (t.waitingForHuman && t.phase === 'play') {
          const vals = t.seats[1].hands[t.turn.hand].cards.map(valueOf);
          const legal = t.legalActions();
          const a = chartAction(chart, vals, valueOf(t.dealer[0]), { canDouble: legal.includes('double'), canSplit: legal.includes('split'), canSurrender: false });
          const ht = handTotal(vals);
          if (a === 'double' && vals.length === 2 && ht.total === 11 && !ht.soft) doubled11 = true;
          t.act(legal.includes(a) ? a : 'stand');
        } else t.step();
      }
      const net = t.logs[t.logs.length - 1].net;
      const b = by[big ? 'big' : 'small'];
      b.n++;
      if (net > 0) b.win++;
      if (doubled11) {
        d11.n++;
        if (net > 0) d11.win++;
        else if (net < 0) d11.lose++;
      }
      t.logs.length = 0;
    }
    const winBig = by.big.win / by.big.n;
    const winSmall = by.small.win / by.small.n;
    expect(Math.abs(winBig - winSmall)).toBeLessThan(0.015);
    expect(d11.win / d11.n).toBeGreaterThan(0.52);
    expect(d11.win / d11.n).toBeLessThan(0.6);
    expect(d11.lose / d11.n).toBeGreaterThan(0.33);
  }, 120000);
});
