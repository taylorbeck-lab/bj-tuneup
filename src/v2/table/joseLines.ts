/**
 * What José says, and when. He reacts like a dealer who likes you: the deal, your action, wins,
 * losses, busts, blackjacks, a big bet going out, a hot or cold run, the shuffle and the cut. He
 * calls you primo most of the time (not every line, so it stays natural), with a little Spanish.
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
    }
  | { kind: 'shuffling'; seed: number; cut: number; pen: number }
  /** Someone sat down or got up (table traffic); `alone` = it's just you and José now. */
  | { kind: 'traffic'; seed: number; joined: number; left: number; alone: boolean }
  | { kind: 'quiet' };

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

export function joseLine(m: JoseMoment): string | null {
  switch (m.kind) {
    case 'betting': {
      if (m.first) return 'Welcome to El Primo. Bets in the circle, primo.';
      if (m.streak >= 3 && m.seed % 2 === 0) return pick(['You’re running hot, primo. Stay humble.', 'Look at you go, primo.', 'Hot hand, primo. The math still decides.'], m.seed);
      if (m.streak <= -3 && m.seed % 2 === 0) return pick(['Cold run, primo. The math comes back around.', 'Rough stretch. Stick to the plan, primo.', 'Variance, primo. It’s not personal.'], m.seed);
      // now and then a dealer's nudge; it has nothing to do with the count
      if (m.seed % 7 === 3)
        return pick(['The house loves a big bet, primo. Make sure it’s the right time.', 'Table max is five hundred, primo. Just saying.', 'Bet small when you should, big when you should. That’s all I’ll say, primo.', 'You know what they say, primo: scared money don’t make money. Smart money does.'], m.seed);
      return pick(['Bets, primo.', 'Place your bet, amigo.', 'Chips in the circle, primo.', 'Another one, primo?', '¿Otra? Let’s go, primo.', 'Bets in, primo.', 'Let’s play, primo.'], m.seed);
    }
    case 'dealing':
      if (m.bigBet) return pick(['Big bet. Pit boss just looked over, primo.', 'Órale, big money out, primo.', 'Careful, primo. The eye in the sky likes big bets.', 'Somebody’s feeling it. Good luck, primo.'], m.seed);
      return pick(['Here they come, primo.', 'Good luck, primo.', 'Cards out.', 'Here we go.'], m.seed, 1);
    case 'practice':
      return pick(['Here’s one you missed earlier, primo.', 'Practice hand, primo: you missed this one before.', 'This one again, primo. Take your time.'], m.seed, 27);
    case 'yourTurn':
      if (m.waiting) return pick(['Table’s waiting, primo.', 'Anytime now, primo.', 'Clock’s ticking, amigo.', 'Take your time… but not all of it, primo.'], m.seed, 2);
      return pick(['Your action, primo.', 'What’ll it be, primo?', 'Up to you, primo.', 'Your call, primo.'], m.seed, 3);
    case 'insurance':
      return pick(['Ace up. Insurance, primo?', 'Insurance open.', 'Insurance, anyone?'], m.seed, 4);
    case 'peek':
      return m.ace ? pick(['Insurance is closed. Checking…', 'Let me check for blackjack…', 'Checking under the ace…'], m.seed, 19) : pick(['Ten up. Checking for blackjack…', 'Let me check, primo…', 'Checking…'], m.seed, 20);
    case 'peekClear':
      return pick(['No blackjack. Play on, primo.', 'Nothing there. Let’s play.', 'No blackjack. Your money’s still alive, primo.'], m.seed, 21);
    case 'dealer':
      return pick(['Dealer’s turn.', 'Let’s see what I’ve got.', 'Here we go, primo.', 'My turn.'], m.seed, 5);
    case 'result': {
      const run = Math.abs(m.streak);
      if (m.blackjack) return pick(['Blackjack! Three to two, primo.', 'Órale, blackjack! Pay the man.', 'Twenty-one, first try. Beautiful, primo.'], m.seed, 6);
      if (m.dealerBlackjack && m.net < 0) return pick(['Blackjack for the house. Sorry, primo.', 'I’ve got it. Sorry, primo.', 'Dealer blackjack. Nothing to do there, primo.'], m.seed, 7);
      if (m.surrendered) return pick(['Half back. Live to fight another hand, primo.', 'Surrender taken. Half back, primo.'], m.seed, 8);
      if (m.net > 0 && m.streak >= 3 && m.seed % 2 === 1) return `That’s ${inWords(run)} in a row, primo. Don’t get comfortable.`;
      if (m.net < 0 && m.streak <= -4 && m.seed % 2 === 1) return `${inWords(run).replace(/^./, (c) => c.toUpperCase())} straight. Ay, primo. It turns.`;
      if (m.bust && m.net < 0) return pick(['Too many, primo.', 'Bust. It happens, primo.', 'Over twenty-one. Next one, primo.'], m.seed, 9);
      if (m.dealerBust && m.net > 0) return pick(['I bust. Pay everybody!', 'Too many for me. Your money, primo.', 'Dealer busts. Qué suerte, primo.'], m.seed, 10);
      if (m.doubled && m.net > 0) return pick(['Doubled and paid. Love it, primo.', 'Double down, double paid, primo.', 'That’s how you double, primo.'], m.seed, 11);
      if (m.doubled && m.net < 0) return pick(['Ouch. Doubles don’t always land, primo.', 'Doubled and lost. It evens out, primo.'], m.seed, 12);
      if (m.net > 0) return pick(['Nice hand, primo.', 'There it is.', 'Winner, primo.', 'That’s yours, primo.', 'Pay the man.'], m.seed, 13);
      if (m.net < 0) return pick(['House wins this one.', 'Sorry, primo. Next one.', 'Tough one, primo.', 'Shake it off, primo.'], m.seed, 14);
      return pick(['Push. Nobody wins.', 'Push, primo. Money stays.', 'Tie. Let’s go again, primo.'], m.seed, 15);
    }
    case 'shuffling':
      // the cut is something you watch for: deeper means more hands before the next shuffle
      if (m.cut >= m.pen + 0.03) return pick(['Shuffling. Nice deep cut this time, primo.', 'Fresh shoe, count back to zero. Cut card’s deep, primo.'], m.seed, 16);
      if (m.cut <= m.pen - 0.03) return pick(['Shuffling. Shallow cut, primo. Sorry.', 'Fresh shoe, count back to zero. Cut’s a little shallow.'], m.seed, 17);
      return pick(['Shuffling. Count’s back to zero, primo.', 'Fresh shoe, primo. Count starts over.'], m.seed, 18);
    case 'traffic':
      if (m.left && m.alone) return pick(['Just us now, primo. Heads up.', 'Everybody left. Your table now, primo.'], m.seed, 22);
      if (m.left && m.joined) return pick(['One out, one in. Bets, primo.', 'Musical chairs. Bets, primo.'], m.seed, 23);
      if (m.left) return pick(['We lost one. More cards for you, primo.', 'Somebody’s done for the night.', 'One less at the table, primo.'], m.seed, 24);
      return pick(['New player, primo. Bets in.', 'Somebody sat down. Table’s filling up.', 'Company, primo. Bets in.'], m.seed, 25);
    case 'quiet':
      return null;
  }
}
