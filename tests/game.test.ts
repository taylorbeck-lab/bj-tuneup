import { describe, it, expect, beforeAll } from 'vitest';
import { Table } from '../src/engine/game';
import { BUILT_IN_PRESETS, DEFAULT_RULES, type Rules } from '../src/engine/rules';
import { generateBasicStrategy, roundEV } from '../src/engine/strategy/generate';
import { fullComp } from '../src/engine/shoe';
import { chartAction, type Chart } from '../src/engine/strategy/chart';
import { makeCard, valueOf, type CardId } from '../src/engine/cards';

// card helpers: value -> a card of that value (spades), T = king
const C = (v: number, suit = 0): CardId => makeCard(v === 1 ? 0 : v === 10 ? 12 : v - 1, suit);

let chart2: Chart;
beforeAll(() => {
  chart2 = generateBasicStrategy(DEFAULT_RULES).chart;
});

function table(rules: Partial<Rules> = {}, seats = 1, stack: number[] = []) {
  const r = { ...DEFAULT_RULES, burn: 0, ...rules };
  const t = new Table({ rules: r, seats, humanSeat: 0, chart: chart2, seed: 1, granularity: 0, rounding: 'floor' });
  // stack: values in deal order; use different suits to avoid running out
  const used = new Map<number, number>();
  t.shoe.stack(
    stack.map((v) => {
      const n = used.get(v) ?? 0;
      used.set(v, n + 1);
      return C(v, n % 4);
    }),
  );
  return t;
}

describe('table engine scenarios (stacked shoe, 1 seat: P1, D-up, P2, D-hole, ...)', () => {
  it('double down win pays 2 units', () => {
    const t = table({}, 1, [6, 6, 5, 10, 10, 10]); // player 6,5 vs 6; hole T; double gets T -> 21; dealer 16 draws T bust
    t.placeBet(1);
    t.runToHuman();
    expect(t.legalActions()).toContain('double');
    t.act('double');
    t.runToHuman();
    expect(t.phase).toBe('settled');
    expect(t.logs[0].net).toBe(2);
  });
  it('blackjack pays 3:2, and 6:5 when configured', () => {
    const t = table({}, 1, [1, 9, 10, 8]);
    t.placeBet(2);
    t.runToHuman();
    expect(t.logs[0].net).toBe(3);
    const t2 = table({ bjPayout: 1.2 }, 1, [1, 9, 10, 8]);
    t2.placeBet(5);
    t2.runToHuman();
    expect(t2.logs[0].net).toBe(6);
  });
  it('dealer blackjack after insurance: insurance pays 2:1, only original bet lost', () => {
    const t = table({}, 1, [10, 1, 9, 10]);
    t.placeBet(2);
    t.runToHuman();
    expect(t.phase).toBe('insurance');
    t.insure(true);
    expect(t.phase).toBe('settled');
    expect(t.logs[0].net).toBe(-2 + 2); // lose 2, insurance 1 stake pays 2
    expect(t.logs[0].dealerBJ).toBe(true);
  });
  it('even money on blackjack vs ace', () => {
    const t = table({}, 1, [1, 1, 10, 7]);
    t.placeBet(2);
    t.runToHuman();
    t.insure(true);
    t.runToHuman();
    expect(t.logs[0].net).toBe(2);
    expect(t.logs[0].insurance?.evenMoney).toBe(true);
  });
  it('late surrender loses half', () => {
    const t = table({ lateSurrender: true }, 1, [10, 10, 6, 7]);
    t.placeBet(4);
    t.runToHuman();
    t.act('surrender');
    t.runToHuman();
    expect(t.logs[0].net).toBe(-2);
  });
  it('split 8s with DAS, double one hand', () => {
    // P 8, D 6, P 8, hole 10 | split: hand1 gets 3 (11) -> double gets 10 (21); hand2 gets 10 (18) stand; dealer 16 hits 10 bust
    const t = table({}, 1, [8, 6, 8, 10, 3, 10, 10, 10]);
    t.placeBet(1);
    t.runToHuman();
    t.act('split');
    expect(t.human.hands.length).toBe(2);
    expect(t.legalActions()).toContain('double');
    t.act('double');
    t.runToHuman();
    t.act('stand');
    t.runToHuman();
    expect(t.phase).toBe('settled');
    expect(t.logs[0].net).toBe(3);
    expect(t.logs[0].decisions.length).toBe(3);
    expect(t.logs[0].decisions[1].splitHands).toBe(2);
  });
  it('split aces get one card each; A+T after split pays 1:1', () => {
    const t = table({}, 1, [1, 7, 1, 10, 10, 9, 10]);
    t.placeBet(1);
    t.runToHuman();
    t.insure; // no insurance for 7 up
    t.act('split');
    t.runToHuman();
    expect(t.phase).toBe('settled');
    // hand1 A,T = 21 (not BJ) wins 1; hand2 A,9 = 20 vs 17 wins 1
    expect(t.logs[0].net).toBe(2);
  });
  it('resplit limit honoured', () => {
    const t = table({ maxSplitHands: 2 }, 1, [8, 6, 8, 10, 8, 8]);
    t.placeBet(1);
    t.runToHuman();
    t.act('split');
    expect(t.legalActions()).not.toContain('split');
  });
  it('counts every seen card except the burn and the unrevealed hole card', () => {
    const t = table({ burn: 1 }, 3, []);
    t.placeBet(1);
    t.runToHuman();
    const seen = t.current!.dealt.filter((d) => !(d.who === -1 && d === t.current!.dealt.filter((x) => x.who === -1)[1]));
    if (!t.holeRevealed) expect(t.rc).toBe(seen.reduce((s, d) => s + ([2, 3, 4, 5, 6].includes(valueOf(d.card)) ? 1 : [1, 10].includes(valueOf(d.card)) ? -1 : 0), 0));
    // unseen composition sums to unseen count
    const u = t.unseen();
    expect(u.reduce((a, b) => a + b, 0)).toBe(t.unseenCount());
  });
});

function playChart(t: Table, chart: Chart): number {
  for (;;) {
    t.runToHuman();
    if (t.phase === 'insurance') {
      t.insure(false);
      continue;
    }
    if (t.phase !== 'play') break;
    const s = t.human;
    const h = s.hands[t.turn.hand];
    const a = chartAction(chart, h.cards.map(valueOf), valueOf(t.dealer[0]), t.availFor(h, s));
    t.act(t.legalActions().includes(a) ? a : 'stand');
  }
  const r = t.logs[t.logs.length - 1].net;
  t.logs.length = 0;
  return r;
}

describe('simulation sanity', () => {
  it('shuffle-every-round simulation matches the exact combinatorial round EV (2D H17 DAS)', () => {
    const rules = { ...DEFAULT_RULES, burn: 0 };
    const g = generateBasicStrategy(rules);
    const exact = roundEV(fullComp(2), rules, g.chart, g.records);
    const t = new Table({ rules, seats: 1, humanSeat: 0, chart: g.chart, seed: 31, granularity: 0.5, rounding: 'floor' });
    let net = 0;
    let sq = 0;
    const N = 1500000;
    for (let i = 0; i < N; i++) {
      t.reshuffle();
      t.placeBet(1);
      const r = playChart(t, g.chart);
      net += r;
      sq += r * r;
    }
    const mean = net / N;
    const se = Math.sqrt(sq / N - mean * mean) / Math.sqrt(N);
    expect(Math.abs(mean - exact)).toBeLessThan(3 * se);
  });

  it('basic strategy house edge with a cut card is near the published value (6D S17 DAS LS)', () => {
    const rules = BUILT_IN_PRESETS.find((p) => p.id === '6d-s17-ls')!.rules;
    const chart = generateBasicStrategy(rules).chart;
    const t = new Table({ rules: { ...rules, seats: 1 }, seats: 1, humanSeat: 0, chart, seed: 2024, granularity: 0.5, rounding: 'floor' });
    let net = 0;
    let sq = 0;
    const N = 2000000;
    for (let i = 0; i < N; i++) {
      t.placeBet(1);
      for (;;) {
        t.runToHuman();
        if (t.phase === 'insurance') {
          t.insure(false);
          continue;
        }
        if (t.phase !== 'play') break;
        const s = t.human;
        const h = s.hands[t.turn.hand];
        const a = chartAction(chart, h.cards.map(valueOf), valueOf(t.dealer[0]), t.availFor(h, s));
        t.act(t.legalActions().includes(a) ? a : 'stand');
      }
      const r = t.logs[t.logs.length - 1].net;
      net += r;
      sq += r * r;
      t.logs.length = 0;
    }
    const mean = net / N;
    const sd = Math.sqrt(sq / N - mean * mean);
    const se = sd / Math.sqrt(N);
    // Wizard of Odds calculator, 6D S17 DAS LS, basic strategy with cut card: 0.353612% house edge.
    expect(Math.abs(mean - -0.00353612)).toBeLessThan(3.5 * se);
    expect(sd).toBeGreaterThan(1.1);
    expect(sd).toBeLessThan(1.2);
  });
});

describe('V2 table: two spots, dollar bets, bots', () => {
  it('deals two human spots, asks insurance per spot, and sums the result', () => {
    const r = { ...DEFAULT_RULES, burn: 0 };
    const t = new Table({ rules: r, seats: 3, humanSeat: 0, humanSeats: [0, 1], chart: chart2, seed: 3, granularity: 0, rounding: 'floor', botBet: () => 25 });
    // deal order: s0, s1, s2, dealer up, s0, s1, s2, hole
    t.shoe.stack([C(10), C(9), C(5), C(1), C(10, 1), C(9, 1), C(6), C(7)]);
    t.placeBet({ 0: 50, 1: 100 });
    expect(t.seats[2].baseBet).toBe(25);
    t.runToHuman();
    expect(t.phase).toBe('insurance');
    expect(t.pendingInsurance).toEqual([0, 1]);
    t.insure(false);
    expect(t.phase).toBe('insurance');
    t.insure(false);
    t.runToHuman();
    // human 20 and 18 vs dealer A,7 = soft 18
    t.act('stand');
    t.act('stand');
    t.runToHuman();
    expect(t.phase).toBe('settled');
    const log = t.logs[t.logs.length - 1];
    expect(log.playerHands.length).toBe(2);
    expect(log.net).toBe(50 + 0);
  });
  it('an empty human spot (bet 0) is not dealt', () => {
    const t = new Table({ rules: { ...DEFAULT_RULES, burn: 0 }, seats: 2, humanSeat: 0, humanSeats: [0, 1], chart: chart2, seed: 4, granularity: 0, rounding: 'floor' });
    t.placeBet({ 0: 25, 1: 0 });
    t.runToHuman();
    expect(t.seats[1].hands.length).toBe(0);
    expect(t.current!.dealt.filter((d) => d.who === 1).length).toBe(0);
  });
});

describe('practice stacking', () => {
  it('deals the requested hand and upcard to the first human spot', () => {
    for (let k = 0; k < 20; k++) {
      const t = new Table({ rules: { ...DEFAULT_RULES, burn: 1 }, seats: 4, humanSeat: 2, humanSeats: [2], chart: chart2, seed: 100 + k, granularity: 0, rounding: 'floor' });
      t.placeBet({ 2: 25 });
      expect(t.stackPractice([10, 6], 10)).toBe(true);
      t.runToHuman();
      if (t.phase !== 'play') continue; // dealer blackjack etc.
      expect(t.seats[2].hands[0].cards.map(valueOf)).toEqual([10, 6]);
      expect(valueOf(t.dealer[0])).toBe(10);
    }
  });
});

describe('shoe snapshot (survives a reload)', () => {
  it('restores the shoe, the position and the count exactly, and the next hand deals the same cards', async () => {
    const { Table } = await import('../src/engine/game');
    const { generateBasicStrategy } = await import('../src/engine/strategy/generate');
    const { DEFAULT_V2 } = await import('../src/v2/settings');
    const rules = DEFAULT_V2.rules;
    const chart = generateBasicStrategy(rules).chart;
    const mk = (seed: number) => new Table({ rules, seats: 3, humanSeat: 1, chart, seed, granularity: 0.5, rounding: 'floor' });
    const a = mk(11);
    for (let r = 0; r < 4; r++) {
      a.placeBet(10);
      let g = 0;
      while (a.phase !== 'settled' && g++ < 400) {
        if (a.waitingForHuman) {
          if (a.phase === 'insurance') a.insure(false);
          else a.act('stand');
        } else a.step();
      }
    }
    const snap = JSON.parse(JSON.stringify(a.snapshotShoe()));
    const b = mk(999);
    expect(b.restoreShoe(snap)).toBe(true);
    expect(b.rc).toBe(a.rc);
    expect(b.shoe.remaining).toBe(a.shoe.remaining);
    expect(b.shoe.remainingByValue).toEqual(a.shoe.remainingByValue);
    expect(b.tcPlayer()).toBe(a.tcPlayer());
    a.placeBet(10);
    b.placeBet(10);
    while (a.phase === 'deal') a.step();
    while (b.phase === 'deal') b.step();
    expect(b.dealer[0]).toBe(a.dealer[0]);
    expect(b.seats[1].hands[0].cards).toEqual(a.seats[1].hands[0].cards);
  });
  it('refuses a snapshot from a different shoe size', async () => {
    const { Table } = await import('../src/engine/game');
    const { generateBasicStrategy } = await import('../src/engine/strategy/generate');
    const { DEFAULT_V2 } = await import('../src/v2/settings');
    const two = DEFAULT_V2.rules;
    const six = { ...two, decks: 6 as const };
    const t2 = new Table({ rules: two, seats: 2, humanSeat: 0, chart: generateBasicStrategy(two).chart, seed: 1, granularity: 0.5, rounding: 'floor' });
    const t6 = new Table({ rules: six, seats: 2, humanSeat: 0, chart: generateBasicStrategy(six).chart, seed: 1, granularity: 0.5, rounding: 'floor' });
    expect(t6.restoreShoe(t2.snapshotShoe())).toBe(false);
  });
});
