/**
 * The true count the way you work it out at a table: read the decks left off the discard tray to the
 * nearest half deck, divide the running count by it, round down.
 *
 * It's an estimate, so it's graded like one. The taught answer is always right. So is the whole
 * number on the other side of the line when the division lands close to a line (within a quarter
 * point: up 2.9 can be called up 3, up 3.1 can be called up 2), and so is a sharper read of the tray
 * (the exact cards left). What's not right is rounding the wrong way when it isn't close: up 3.5 is
 * up 3, not up 4. Rounding up is betting on an edge you don't have. Deep in a down count (below
 * down 2) either whole number counts: nothing rides on it.
 */
export const TC_SLACK = 0.25;
/** Below this, rounding a down count toward even is as good as rounding it down (see trueCountCheck). */
export const DEEP_DOWN = -2;

export type TcGrade = 'exact' | 'close' | 'oneOff' | 'off';

export function trueCountCheck(rc: number, unseen: number, answer?: number | null) {
  const decksLeft = Math.max(0.5, Math.round((unseen / 52) * 2) / 2);
  const raw = rc / decksLeft;
  const shown = Math.floor(raw);
  const exact = (rc * 52) / Math.max(1, unseen);
  // every whole number a careful player could land on
  // (the quarter point either side applies to the division you were shown; the exact value is exact)
  const lo = Math.min(Math.floor(raw - TC_SLACK), Math.floor(exact));
  let hi = Math.max(Math.floor(raw + TC_SLACK), Math.floor(exact));
  // Deep in a down count the whole number nearer even counts too (down 3.3 as down 3): you're at the
  // minimum either way, and no count play is numbered that low. Down to down 2 it has to be rounded
  // down, because that's where the plays numbered down 1 and down 2 change.
  const deepDown = raw < DEEP_DOWN;
  if (deepDown) hi = Math.max(hi, Math.ceil(raw));
  const given = answer !== null && answer !== undefined;
  const right = given && answer >= lo && answer <= hi;
  /** How far outside the accepted answers (0 when right). */
  const miss = !given ? Infinity : answer < lo ? lo - answer : answer > hi ? answer - hi : 0;
  const grade: TcGrade = !given ? 'off' : answer === shown ? 'exact' : right ? 'close' : miss === 1 ? 'oneOff' : 'off';
  /** Right only because it's deep in a down count, where the nearer whole number is as good. */
  const nearerEven = deepDown && given && right && answer === Math.ceil(raw) && answer !== shown && answer > Math.max(Math.floor(raw + TC_SLACK), Math.floor(exact));
  return { decksLeft, raw, shown, exact, lo, hi, right, miss, grade, nearerEven };
}

const say = (n: number) => (n === 0 ? 'even' : `${n > 0 ? 'up' : 'down'} ${Math.abs(n)}`);
const decksWord = (n: number) => `${n} ${n === 1 ? 'deck' : 'decks'}`;

/** The division as you'd say it: "up 5 ÷ 1.5 decks left = up 3.3, so up 3 (round down)". */
export function tcWorking(rc: number, unseen: number): string {
  const c = trueCountCheck(rc, unseen);
  if (rc === 0) return 'Running count even, so the true count is even too';
  const whole = Math.abs(c.raw - Math.round(c.raw)) < 1e-9;
  const left = `${say(rc)} ÷ ${decksWord(c.decksLeft)} left`;
  return whole ? `${left} = ${say(c.shown)}` : `${left} = ${c.raw > 0 ? 'up' : 'down'} ${Math.abs(c.raw).toFixed(1)}, so ${say(c.shown)} (round down)`;
}

/**
 * José's word on your true count: how it was graded and, when it's wrong, what most likely went
 * wrong (rounded up, gave the running count, divided by the decks in the tray, carried a running count
 * that was off, or came out bigger than the running count with more than a deck left).
 */
export function tcVerdict(o: { rc: number; unseen: number; totalCards: number; answer: number; rcAnswer?: number | null }): { ok: boolean; title: string; line: string } {
  const c = trueCountCheck(o.rc, o.unseen, o.answer);
  const work = tcWorking(o.rc, o.unseen);
  const you = `You said ${say(o.answer)}`;
  if (c.grade === 'exact') return { ok: true, title: 'Nailed it', line: `${work}.` };
  if (c.nearerEven) return { ok: true, title: 'Close enough', line: `${work}. ${you}: this far down it changes nothing (you’re at the minimum either way), so it counts.` };
  if (c.grade === 'close') {
    const sharper = Math.floor(c.exact) === o.answer && Math.floor(c.raw) !== o.answer;
    return { ok: true, title: 'Close enough', line: `${work}. ${you}: ${sharper ? 'a sharper read of the tray gets you there, so it counts' : 'that close to the line the tray could read either way, so it counts'}.` };
  }
  // right arithmetic on a running count that was off
  if (o.rcAnswer !== null && o.rcAnswer !== undefined && o.rcAnswer !== o.rc && trueCountCheck(o.rcAnswer, o.unseen, o.answer).right)
    return { ok: false, title: 'Right sum, wrong count', line: `${work}. ${you}, which is right for the ${say(o.rcAnswer)} you were carrying: your division is fine, the running count threw it.` };
  if (o.answer === o.rc && c.decksLeft !== 1) return { ok: false, title: c.miss === 1 ? 'One off' : `Off by ${c.miss}`, line: `${work}. ${you}: that's the running count. Divide it by the decks left.` };
  const played = Math.max(0.5, Math.round(((o.totalCards - o.unseen) / 52) * 2) / 2);
  if (played !== c.decksLeft && o.answer === Math.floor(o.rc / played)) return { ok: false, title: c.miss === 1 ? 'One off' : `Off by ${c.miss}`, line: `${work}. ${you}: that's dividing by the decks in the tray. Divide by the decks left in the shoe.` };
  if (c.grade === 'oneOff') {
    const up = o.answer > c.hi;
    return { ok: false, title: 'One off', line: `${work}. ${you}: ${up ? (c.shown < 0 ? 'that’s rounding toward even. This close to even it matters: the plays at down 1 and down 2 go by the rounded-down count' : 'that’s rounding up. Round down, so you never bet on an edge you don’t have') : 'one too low. It only rounds down as far as the whole number below'}.` };
  }
  // a sanity check worth carrying to the table
  if (c.decksLeft > 1 && Math.abs(o.answer) > Math.abs(o.rc)) return { ok: false, title: `Off by ${c.miss}`, line: `${work}. ${you}. With more than a deck left, the true count is always smaller than the running count.` };
  return { ok: false, title: `Off by ${c.miss}`, line: `${work}. ${you}.` };
}

/** José's word on your running count. */
export function rcVerdict(rc: number, answer: number): { ok: boolean; title: string; line?: string } {
  const d = Math.abs(answer - rc);
  if (d === 0) return { ok: true, title: 'Spot on' };
  if (d <= 2) return { ok: false, title: d === 1 ? 'Off by one' : 'Off by 2', line: `You said ${say(answer)}. It happens: find your rhythm by pairing cards that cancel (a 10 and a 5 = 0) and counting the leftovers.` };
  return { ok: false, title: `Off by ${d}`, line: `You said ${say(answer)}. That's more than a card or two: usually a whole hand went by uncounted, often the dealer's or a split. Count every card as it's turned.` };
}
