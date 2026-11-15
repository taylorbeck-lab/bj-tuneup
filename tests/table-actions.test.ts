import { it, expect } from 'vitest';
import { Table } from '../src/engine/game';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import { DEFAULT_V2 } from '../src/v2/settings';
import { valueOf, handTotal } from '../src/engine/cards';

/** Regression: the owner was not offered Double on 9 vs 3. The engine must offer it on every first-two-card hand. */
it('2-card hands always offer double; pairs offer split (V2 default table)', () => {
  const rules = { ...DEFAULT_V2.rules };
  const { chart } = generateBasicStrategy(rules);
  const t = new Table({ rules, seats: 5, humanSeat: 3, humanSeats: [3], chart, seed: 7, granularity: 0.5, rounding: 'floor', botBet: () => 25, botMistakeRate: 0.06 });
  let checked = 0;
  const bad: string[] = [];
  for (let r = 0; r < 3000; r++) {
    if (t.needsShuffle) t.reshuffle();
    t.placeBet({ 3: 25 });
    let guard = 0;
    while (t.phase !== 'settled' && guard++ < 500) {
      if (t.waitingForHuman) {
        if (t.phase === 'insurance') { t.insure(false); continue; }
        const h = t.seats[t.turn.seat].hands[t.turn.hand];
        const legal = t.legalActions();
        if (h.cards.length === 2) {
          checked++;
          const v = h.cards.map(valueOf);
          if (!legal.includes('double') && !h.splitAces) bad.push('no double ' + v + ' split=' + h.fromSplit);
          if (v[0] === v[1] && !h.fromSplit && !legal.includes('split')) bad.push('no split ' + v);
        }
        t.act(handTotal(h.cards.map(valueOf)).total < 12 ? 'hit' : 'stand');
      } else t.step();
    }
  }
  expect(checked).toBeGreaterThan(2000);
  expect(bad).toEqual([]);
});
