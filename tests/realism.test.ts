import { describe, it, expect, beforeAll } from 'vitest';
import { Table } from '../src/engine/game';
import { DEFAULT_RULES } from '../src/engine/rules';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import { chartAction, type Chart } from '../src/engine/strategy/chart';
import { valueOf, isBlackjack, handTotal } from '../src/engine/cards';
import { mulberry32 } from '../src/engine/rng';
import { initialBots, betweenHands, atShuffle } from '../src/v2/table/traffic';
import { addRound, EMPTY_CARDS, type CardsRecord } from '../src/v2/stats';

/**
 * Does the game feel like blackjack because it is blackjack? This plays the app the way it's played
 * (the house game, your seat, other players coming and going, the table rebuilt with the shoe carried
 * over when they do) for hundreds of thousands of hands, once with José's hand shuffle and once with
 * a perfectly random one, and checks the things a player notices: losing runs, how often the count
 * gets hot, what a hot count is worth, blackjacks, twenties, pairs to split. The hand shuffle has to
 * match the perfect one, and both have to match the arithmetic. The numbers on the stats page ("the
 * odds") are checked here too.
 */
const rules = { ...DEFAULT_RULES, decks: 2 as const, h17: true, das: true, lateSurrender: false, penetration: 0.65, cutSpread: 0.06, seats: 7 };
let chart: Chart;
beforeAll(() => {
  chart = generateBasicStrategy(rules).chart;
});

interface Run {
  cards: CardsRecord;
  shoes: number;
  hotShoes: number;
  net: number;
  hotNet: number;
  /** Correlation between one hand's result and the next. */
  lag1: number;
  runs: Record<number, number>;
}

function play(shuffle: 'hand' | 'machine', rounds: number, seed: number): Run {
  const rng = mulberry32(seed);
  const mine = [4];
  let bots = initialBots('normal', mine, rng);
  const build = (prev?: Table) => {
    const spots = [...mine, ...bots].sort((a, b) => a - b);
    const t = new Table({ rules, seats: spots.length, humanSeat: spots.indexOf(4), chart, seed: Math.floor(rng() * 2 ** 31), granularity: 0.5, rounding: 'floor', botMistakeRate: 0.06, shuffleStyle: shuffle, cardPause: true, peekPause: true });
    if (prev) {
      if (!t.restoreShoe(prev.snapshotShoe())) throw new Error('the shoe was not carried to the new table');
      t.logs = prev.logs;
    }
    return t;
  };
  let t = build();
  const cards = EMPTY_CARDS();
  const hotShoes = new Set<number>();
  const signs: number[] = [];
  const runs: Record<number, number> = {};
  let net = 0;
  let hotNet = 0;
  let run = 0;
  for (let r = 0; r < rounds; r++) {
    t.placeBet(1);
    let split = false;
    let guard = 0;
    while (t.phase !== 'settled' && guard++ < 400) {
      if (t.phase === 'insurance') t.insure(false);
      else if (t.waitingForHuman && t.phase === 'play') {
        const vals = t.human.hands[t.turn.hand].cards.map(valueOf);
        const legal = t.legalActions();
        const a = chartAction(chart, vals, valueOf(t.dealer[0]), { canDouble: legal.includes('double'), canSplit: legal.includes('split'), canSurrender: false });
        if (a === 'split' && legal.includes('split')) split = true;
        t.act(legal.includes(a) ? a : 'stand');
      } else t.step();
    }
    const log = t.logs[t.logs.length - 1];
    const first = log.dealt.filter((d) => d.who === t.humanSeats[0] && d.hand === 0).slice(0, 2).map((d) => valueOf(d.card));
    addRound(cards, { net: log.net, bj: isBlackjack(first), twenty: handTotal(first).total === 20, pair: first[0] === first[1], split, tc: log.bet.tc });
    net += log.net;
    if (log.bet.tc >= 2) {
      hotNet += log.net;
      hotShoes.add(t.shoesPlayed);
    }
    signs.push(Math.sign(log.net));
    if (log.net < 0) run++;
    else {
      if (run) runs[run] = (runs[run] ?? 0) + 1;
      run = 0;
    }
    // between hands, exactly as the screen does it: the shuffle at the cut card, then who comes and goes
    const cut = t.needsShuffle;
    if (cut) t.reshuffle();
    const ch = (cut ? atShuffle : betweenHands)(bots, 'normal', mine, rng);
    if (ch.joined || ch.left) {
      bots = ch.bots;
      t = build(t);
    }
    if (t.logs.length > 400) t.logs.splice(0, t.logs.length - 200);
  }
  const m = signs.reduce((a, b) => a + b, 0) / rounds;
  let v = 0;
  let ac = 0;
  for (let i = 0; i < rounds; i++) {
    v += (signs[i] - m) ** 2;
    if (i) ac += (signs[i] - m) * (signs[i - 1] - m);
  }
  return { cards, shoes: t.shoesPlayed + 1, hotShoes: hotShoes.size, net, hotNet, lag1: ac / v, runs };
}

describe('the deal feels like blackjack because it is blackjack', () => {
  const N = 300000;
  let hand: Run;
  let machine: Run;
  beforeAll(() => {
    hand = play('hand', N, 20261127);
    machine = play('machine', N, 20261128);
  });
  const each = (f: (r: Run, name: string) => void) => {
    f(hand, 'hand shuffle');
    f(machine, 'machine shuffle');
  };
  const runsOf = (r: Run, L: number) => Object.entries(r.runs).filter(([len]) => Number(len) >= L).reduce((a, [, n]) => a + n, 0);

  it('you win about 43%, lose about 48% and tie about 9% of hands, with either shuffle', () => {
    each((r) => {
      expect(r.cards.win / N).toBeGreaterThan(0.425);
      expect(r.cards.win / N).toBeLessThan(0.44);
      expect(r.cards.lose / N).toBeGreaterThan(0.473);
      expect(r.cards.lose / N).toBeLessThan(0.487);
      // the house edge by the chart: about half a percent
      expect(r.net / N).toBeGreaterThan(-0.011);
      expect(r.net / N).toBeLessThan(0.002);
    });
    expect(Math.abs(hand.cards.lose - machine.cards.lose) / N).toBeLessThan(0.006);
  });
  it('losing runs come as often as chance says and no more: six in a row about every 160 hands', () => {
    each((r) => {
      const p = r.cards.lose / N;
      // runs that reach L, counted where they start: after a hand that wasn't a loss
      for (const L of [4, 6, 8]) {
        const chance = N * (1 - p) * p ** L;
        // (allowing the scatter you'd expect in a count that size: three standard deviations, plus a little)
        const tol = 3 / Math.sqrt(chance) + 0.03;
        expect(runsOf(r, L) / chance).toBeGreaterThan(1 - tol);
        expect(runsOf(r, L) / chance).toBeLessThan(1 + tol);
      }
      expect(N / runsOf(r, 6)).toBeGreaterThan(140);
      expect(N / runsOf(r, 6)).toBeLessThan(180);
      // one hand's result says nothing about the next
      expect(Math.abs(r.lag1)).toBeLessThan(0.006);
    });
  });
  it('the count gets hot as often with the hand shuffle as with a perfect one: about 23% of bets at up 2 or more', () => {
    each((r) => {
      expect(r.cards.hot.n / N).toBeGreaterThan(0.215);
      expect(r.cards.hot.n / N).toBeLessThan(0.245);
      // more than half of all shoes give you at least one bet at up 2 or more
      expect(r.hotShoes / r.shoes).toBeGreaterThan(0.5);
    });
    expect(Math.abs(hand.cards.hot.n - machine.cards.hot.n) / N).toBeLessThan(0.006);
  });
  it('a hot count pays, but not by winning more hands: more blackjacks, and the edge with them', () => {
    each((r) => {
      const h = r.cards.hot;
      // you still lose more hands than you win at up 2 or more
      expect(h.win / h.n).toBeGreaterThan(0.425);
      expect(h.win / h.n).toBeLessThan(0.455);
      expect(h.lose / h.n).toBeGreaterThan(0.46);
      expect(h.lose / h.n).toBeLessThan(0.485);
      // blackjacks: about 1 in 21 overall, clearly more at a hot count
      expect(r.cards.bj / N).toBeGreaterThan(0.045);
      expect(r.cards.bj / N).toBeLessThan(0.051);
      expect(h.bj / h.n).toBeGreaterThan(0.053);
      // and the money is on your side there
      expect(r.hotNet / h.n).toBeGreaterThan(0.005);
    });
  });
  it('twenties about 10% of hands, a pair to split about once in 43', () => {
    each((r) => {
      expect(r.cards.twenty / N).toBeGreaterThan(0.099);
      expect(r.cards.twenty / N).toBeLessThan(0.109);
      expect(N / r.cards.split).toBeGreaterThan(38);
      expect(N / r.cards.split).toBeLessThan(48);
    });
    expect(Math.abs(hand.cards.split - machine.cards.split) / N).toBeLessThan(0.002);
  });
});
