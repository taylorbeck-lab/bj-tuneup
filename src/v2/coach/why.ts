/**
 * Plain-language reasons behind basic strategy and count plays. Short, concrete, no jargon.
 * Probabilities quoted are rounded rules of thumb (the live odds come from the exact engine).
 */
import { handTotal } from '../../engine/cards';
import type { Action } from '../../engine/strategy/chart';
import type { IndexPlay } from '../../engine/indices';

const upName = (u: number) => (u === 1 ? 'an ace' : u === 10 ? 'a 10' : u === 8 ? 'an 8' : `a ${u}`);
const weak = (u: number) => u >= 2 && u <= 6;

/** Why the basic-strategy play is right for this hand. */
export function whyBasic(values: number[], up: number, play: Action): string {
  const pair = values.length === 2 && values[0] === values[1];
  const { total, soft } = handTotal(values);
  const U = upName(up);

  if (play === 'surrender') return `This hand wins less than 1 time in 4 against ${U}. Giving up half your bet costs less than playing it out.`;

  if (pair && play === 'split') {
    const v = values[0];
    if (v === 1) return 'Always split aces: two hands that start with an ace beat one soft 12 by a mile.';
    if (v === 8) return '16 is the worst hand in blackjack. Two hands starting with 8 lose far less than one 16.';
    if (v === 9) return `Your 18 is good but not safe against ${U}: two hands starting with 9 make more money.`;
    if (weak(up)) return `The dealer's ${up} is a bust card. Splitting puts more money out while the dealer is weak.`;
    return `Each hand starts fresh with a ${v}: two decent starts beat one weak total against ${U}.`;
  }
  if (pair && values[0] === 10) return 'Never break up 20. It already wins about 4 times in 5.';
  if (pair && values[0] === 5) return 'Two 5s are a 10, not a pair to split: play it like 10.';

  if (soft) {
    if (play === 'double')
      return `You can't bust with one card on a soft hand, and ${U} is a weak dealer card. Double to get more money out while you're ahead.`;
    if (total >= 19) return `Soft ${total} already wins most hands. Stand.`;
    if (total === 18) {
      if (play === 'stand') return `18 beats the 17 the dealer often makes with ${U}. Keep it.`;
      return `18 isn't enough against ${U}: the dealer makes 19 or better often, and hitting can't bust you.`;
    }
    return `A soft ${total} can't bust with one hit and can't win as is: always improve it.`;
  }

  if (play === 'double') {
    if (total === 11) return `11 is the best double: a 10-value card (about 4 in 13) makes 21, and most cards make 18 or better.`;
    if (total === 10) return `10 lands on 20 with any 10-value card. Against ${U}, doubling makes more money than hitting.`;
    if (total === 9) return `9 vs a weak dealer card: you'll often end on 19, while the dealer has to draw and may bust.`;
    return `Double here: the dealer is weak and you have the better start.`;
  }
  if (total <= 8) return 'Nothing can bust you with one card. Always hit.';
  if (total >= 17) return '17 or more: most cards bust you. Stand.';
  if (total >= 12 && total <= 16) {
    if (play === 'stand') {
      if (total === 12 && (up === 2 || up === 3)) return `Close call, but with ${U} the right play is to stand here.`;
      return `${cap(U)} is a bust card: the dealer must hit and busts about 40% of the time. Don't risk busting first.`;
    }
    if (total === 12 && (up === 2 || up === 3)) return `Only a 10 busts 12 (about 31%). The dealer's ${up} makes a hand more often than a 4–6, so take a card.`;
    if (up >= 7 || up === 1) return `${cap(U)} usually finishes on 17–21. Standing on ${total} only wins if they bust (about 1 in 4), so hitting is the better risk.`;
    return `Take a card: against ${U} standing on ${total} loses too often.`;
  }
  if (total === 9 || total === 10 || total === 11) return `Hit: you can't bust, and against ${U} doubling isn't worth it.`;
  return play === 'hit' ? 'Take a card.' : 'Stand.';
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Why a count play changes the decision. */
export function whyIndex(p: IndexPlay, tc: number, play: Action | 'insure' | 'noinsure'): string {
  // said the way the count is said everywhere else: up 3, even, down 1
  const at = p.index === 0 ? 'even' : `${p.index > 0 ? 'up' : 'down'} ${Math.abs(p.index)}`;
  const high = tc >= p.index;
  if (p.hand.kind === 'insurance')
    return high
      ? `At a true count of ${at} or higher, over a third of the cards left are 10s, so the insurance bet pays for itself.`
      : `Insurance only pays when the hidden card is a 10. Until the true count reaches ${at}, fewer than a third of the cards left are 10s: skip it.`;
  if (play === 'surrender') return `At a true count of ${at} or higher this hand loses so often that giving up half the bet is cheaper.`;
  if (play === 'split') return `Very high count: the dealer busts so often that two hands starting with a 10 earn more than one 20.`;
  if (play === 'double') return high ? `True count ${at} or higher: lots of 10s left, so your double lands on a strong total more often.` : `The count is low: fewer 10s left, so doubling isn't worth it.`;
  if (play === 'stand') return `True count ${at} or higher: the shoe is rich in 10s. Hitting busts you more often and the dealer busts more, so stand.`;
  if (play === 'hit') return `Low count: few 10s left, so a hit rarely busts you and the dealer busts less. Take a card.`;
  return '';
}

/**
 * Why insurance was right or wrong, in words that never contradict the verdict. Insurance pays when
 * more than a third of the cards left are 10s; the count is how a player knows. The share of 10s right
 * now is quoted only when it agrees with what the count says.
 */
export function whyInsurance(o: { take: boolean; right: boolean; tenShare: number; tc: number; countSaysTake: boolean; heldToCount: boolean; counting: boolean }): string {
  const pct = Math.round(o.tenShare * 100);
  const tc = o.tc === 0 ? 'even' : `${o.tc > 0 ? 'up' : 'down'} ${Math.abs(o.tc)}`;
  // the share of 10s right now, only when it agrees with what the count says
  const tens = o.tenShare > 1 / 3 === o.countSaysTake ? ` Right now ${pct}% of the cards left are 10s.` : '';
  if (o.take && o.right) return `Insurance pays when more than a third of the cards left are 10s, and at a true count of ${tc} they are.${tens} ${o.heldToCount ? 'Good insurance.' : 'A count play: good insurance.'}`;
  if (!o.take && o.right) {
    if (o.countSaysTake && !o.counting) return `At this level you never take insurance. The count did favour it here (true count ${tc}).${tens} Taking it is a count play you’ll learn later.`;
    if (o.countSaysTake) return `No insurance is the basic play, so that’s fine. The count did favour it here (true count ${tc}).${tens} Taking it is a count play worth knowing.`;
    return `Insurance wins only if the hidden card is a 10, and it needs more than a third of the cards left to be 10s. At a true count of ${tc} they aren’t.${tens} Skip it.`;
  }
  if (o.take && !o.right) {
    if (o.countSaysTake) return `The count did favour it (true count ${tc}).${tens} But taking insurance is a count play you’ll learn later; at this level, no insurance.`;
    return `Insurance needs more than a third of the cards left to be 10s, and at a true count of ${tc} they aren’t.${tens} Skip it.`;
  }
  return `At a true count of ${tc} more than a third of the cards left are 10s: that’s when insurance pays.${tens} Take it.`;
}
