/**
 * What José says, and when. He reacts like a dealer who likes you: the deal, your action, wins,
 * losses, busts, blackjacks, a big bet going out, a hot or cold run, the shuffle and the cut. He
 * calls his own hand ("Nineteen. House takes it."), calls you primo often but not every line, with a
 * little Spanish, and most hands he just waits for you to act.
 *
 * Two rules: he never says or hints at the count (his nudges have nothing to do with it), and he
 * never tells you what to do before you decide; the feedback after your move does the teaching.
 */

export type JoseMoment =
  | { kind: 'betting'; first: boolean; seed: number; streak: number }
  | { kind: 'dealing'; seed: number; bigBet: boolean }
  /** This deal was set up: a hand you missed earlier, for practice. */
  | { kind: 'practice'; seed: number }
  | { kind: 'yourTurn'; waiting: boolean; seed: number }
  | { kind: 'insurance'; seed: number }
  /** Ace or ten up: the dealer checks the hole card for blackjack. */
  | { kind: 'peek'; seed: number; ace: boolean }
  /** He checked: no blackjack, play on. */
  | { kind: 'peekClear'; seed: number }
  | { kind: 'dealer'; seed: number }
  | {
      kind: 'result';
      seed: number;
      net: number;
      blackjack: boolean;
      dealerBlackjack: boolean;
      dealerBust: boolean;
      bust: boolean;
      doubled: boolean;
      surrendered: boolean;
      /** Wins (+) or losses (−) in a row, this hand included. */
      streak: number;
      /** What the dealer finished on (17 to 21), when he played his hand out and you had one hand against it. */
      dealerTotal?: number;
    }
  | { kind: 'shuffling'; seed: number; cut: number; pen: number }
  /** Someone sat down or got up (table traffic); `alone` = it's just you and José now. */
  | { kind: 'traffic'; seed: number; joined: number; left: number; alone: boolean }
  /** You just moved up (or took the quiet table): his first word back at the table. */
  | { kind: 'levelUp'; what: LevelNote }
  | { kind: 'quiet' };

export type LevelNote = 'count' | 'plays' | 'tier' | 'headsUp';
let leveled: { what: LevelNote; round: number | null } | null = null;
/** You said yes to José's offer: he has a word for you when the next shoe opens for bets. */
export const noteLevelUp = (what: LevelNote) => {
  leveled = { what, round: null };
};
/** That word, for the one betting round after the move (then it's gone). */
export function levelNoteFor(round: number): LevelNote | null {
  if (!leveled) return null;
  if (leveled.round === null) leveled.round = round;
  if (leveled.round !== round) {
    leveled = null;
    return null;
  }
  return leveled.what;
}

/** A steady pick from a list: the same moment says the same thing, the next round something else. */
function pick(lines: string[], seed: number, salt = 0): string {
  const h = Math.imul((seed + 1) * 2654435761 + salt * 40503, 1) >>> 0;
  return lines[h % lines.length];
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n: number) => WORDS[n] ?? String(n);

/** Where the cut card sits, the way you'd judge it by eye. */
export function cutWords(p: number): string {
  if (p < 0.55) return 'about halfway in';
  if (p < 0.62) return 'a little past halfway';
  if (p < 0.7) return 'about two-thirds in';
  if (p < 0.78) return 'about three-quarters in';
  return 'deep, about four-fifths in';
}

let streak = { round: -1, n: 0 };
/** Keep the run of wins (+) and losses (−) going; a push leaves it alone. Same round twice = no change. */
export function noteRound(round: number, net: number): number {
  if (round === streak.round) return streak.n;
  const n = net > 0 ? (streak.n > 0 ? streak.n + 1 : 1) : net < 0 ? (streak.n < 0 ? streak.n - 1 : -1) : streak.n;
  streak = { round, n };
  return n;
}
/** The current run, as of the last hand (for the betting line). */
export const currentStreak = () => streak.n;
/** A fresh shoe or a new table starts the run over. */
export const resetStreak = () => {
  streak = { round: -1, n: 0 };
};

/** A hand total the way a dealer calls it. */
const TOTALS: Record<number, string> = { 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty', 21: 'twenty-one' };
const cap = (t: string) => t.replace(/^./, (c) => c.toUpperCase());

export function joseLine(m: JoseMoment): string | null {
  switch (m.kind) {
    case 'betting': {
      if (m.first) return 'Welcome to El Primo. Tap a chip to bet, primo.';
      if (m.streak >= 3 && m.seed % 2 === 0) return pick(['You’re running hot, primo. Stay humble.', 'Look at you go, primo.', 'Hot hand. The math still decides, primo.'], m.seed);
      if (m.streak <= -3 && m.seed % 2 === 0) return pick(['Cold run. It comes back around, primo.', 'Rough stretch. Stick to the plan, primo.', 'It’s not personal, primo. It’s just cards.'], m.seed);
      // now and then a dealer's nudge; it has nothing to do with the count
      if (m.seed % 7 === 3)
        return pick(['The house loves a big bet, primo. Make sure it’s the right time.', 'Bet small when you should, big when you should. That’s all I’ll say.', 'You know what they say, primo: scared money don’t make money. Smart money does.'], m.seed);
      return pick(['Bets, primo.', 'Place your bets.', 'Chips in the circle, primo.', 'Another one, primo?', '¿Otra? Let’s go, primo.', 'Bets down, primo.', 'Let’s play.'], m.seed);
    }
    case 'dealing':
      if (m.bigBet) return pick(['Big bet. The pit boss just looked over.', 'Órale, big money out.', 'Careful, primo. The eye in the sky likes big bets.', 'Somebody’s feeling it. Good luck.'], m.seed);
      return pick(['Here they come.', 'Good luck, primo.', 'Cards out.', 'Good luck.'], m.seed, 1);
    case 'practice':
      return pick(['Here’s one you missed earlier, primo.', 'Practice hand: you missed this one before.', 'This one again, primo. Take your time.'], m.seed, 27);
    case 'yourTurn':
      if (m.waiting) return pick(['Table’s waiting, primo.', 'Any time now.', 'Clock’s ticking, amigo.', 'Take your time… but not all of it.'], m.seed, 2);
      // most hands a dealer just waits on you
      if (m.seed % 3 !== 0) return null;
      return pick(['Your action, primo.', 'What’ll it be?', 'Up to you, primo.', 'Your call.'], m.seed, 3);
    case 'insurance':
      return pick(['Ace up. Insurance, primo?', 'Insurance is open.', 'Insurance, anyone?'], m.seed, 4);
    case 'peek':
      return m.ace ? pick(['Insurance is closed. Checking…', 'Let me check for blackjack…', 'Checking under the ace…'], m.seed, 19) : pick(['Ten up. Checking for blackjack…', 'Let me check…', 'Checking…'], m.seed, 20);
    case 'peekClear':
      return pick(['No blackjack. Play on.', 'Nothing there. Let’s play.', 'No blackjack. Your money’s still alive, primo.'], m.seed, 21);
    case 'dealer':
      return pick(['Dealer’s turn.', 'Let’s see what I’ve got.', 'My turn.'], m.seed, 5);
    case 'result': {
      const run = Math.abs(m.streak);
      // he calls his own hand, like any dealer
      const mine = m.dealerTotal ? TOTALS[m.dealerTotal] : undefined;
      if (m.blackjack) return pick(['Blackjack! Three to two, primo.', 'Órale, blackjack! Pay the man.', 'Twenty-one, first try. Beautiful.'], m.seed, 6);
      if (m.dealerBlackjack && m.net < 0) return pick(['Blackjack for the house. Sorry, primo.', 'I’ve got it. Sorry, primo.', 'Dealer blackjack. Nothing you could do.'], m.seed, 7);
      if (m.surrendered) return pick(['Half back. Live to fight another hand.', 'Surrender. Half back, primo.'], m.seed, 8);
      if (m.net > 0 && m.streak >= 3 && m.seed % 2 === 1) return `That’s ${inWords(run)} in a row, primo. Don’t get comfortable.`;
      if (m.net < 0 && m.streak <= -4 && m.seed % 2 === 1) return `${cap(inWords(run))} straight. Ay, primo. It turns.`;
      if (m.bust && m.net < 0) return pick(['Too many.', 'Bust. It happens, primo.', 'Over twenty-one. Next one.'], m.seed, 9);
      if (m.dealerBust && m.net > 0) return pick(['Too many for me. Pay the table!', 'I bust. Your money, primo.', 'Dealer busts. Qué suerte.'], m.seed, 10);
      if (m.doubled && m.net > 0) return pick(['Doubled and paid. Love it.', 'Double down, double paid, primo.', 'That’s how you double.'], m.seed, 11);
      if (m.doubled && m.net < 0) return pick(['Ouch. Doubles don’t always land.', 'Doubled and lost. It evens out, primo.'], m.seed, 12);
      if (m.net > 0) return pick(mine ? [`${cap(mine)}. You’ve got me beat.`, 'Nice hand, primo.', `Dealer has ${mine}. Winner.`, 'That’s yours, primo.', 'Pay the man.'] : ['Nice hand, primo.', 'Winner.', 'That’s yours, primo.', 'Pay the man.'], m.seed, 13);
      if (m.net < 0) return pick(mine ? [`${cap(mine)}. House takes it.`, `Dealer has ${mine}. Sorry, primo.`, 'Tough one.', `${cap(mine)}. Next one, primo.`] : ['House wins this one.', 'Sorry, primo. Next one.', 'Tough one.'], m.seed, 14);
      return pick(mine ? [`${cap(mine)} and ${mine}. Push.`, 'Push. Money stays.', 'Push, primo. Nobody wins.'] : ['Push. Nobody wins.', 'Push, primo. Money stays.'], m.seed, 15);
    }
    case 'shuffling':
      // the cut is something you watch for: deeper means more hands before the next shuffle
      if (m.cut >= m.pen + 0.03) return pick(['Shuffling. Nice deep cut this time, primo.', 'Fresh shoe, count back to zero. Cut card’s deep.'], m.seed, 16);
      if (m.cut <= m.pen - 0.03) return pick(['Shuffling. Shallow cut this time. Sorry, primo.', 'Fresh shoe, count back to zero. Cut’s a little shallow.'], m.seed, 17);
      return pick(['Shuffling. Count’s back to zero.', 'Fresh shoe, primo. Count starts over.'], m.seed, 18);
    case 'traffic':
      if (m.left && m.alone) return pick(['Just us now, primo.', 'Everybody left. Your table now, primo.'], m.seed, 22);
      if (m.left && m.joined) return pick(['One out, one in. Bets down.', 'Musical chairs. Bets, primo.'], m.seed, 23);
      if (m.left) return pick(['We lost one. More cards for you, primo.', 'Somebody’s done for the night.', 'One less at the table.'], m.seed, 24);
      return pick(['New player. Bets in.', 'Somebody sat down. Table’s filling up.', 'Company, primo. Bets in.'], m.seed, 25);
    case 'levelUp':
      return {
        count: 'Level two, primo. Count from the first card out.',
        plays: 'Level three. Watch the count on the close ones, primo.',
        tier: 'New plays are in, primo. Same game, sharper.',
        headsUp: 'Your own table, primo. Twice the hands.',
      }[m.what];
    case 'quiet':
      return null;
  }
}
