/**
 * José, the dealer. A first flat pass: he stands behind the table (a portrait when there's room, a
 * round face and a speech bubble when space is tight) and says a short line at the natural moments:
 * bets, your action, the result, the shuffle. He never says the count; the feedback card teaches.
 */
import type { ReactNode } from 'react';

const pick = (lines: string[], seed: number) => lines[Math.abs(seed) % lines.length];

export type JoseMoment =
  | { kind: 'betting'; first: boolean; seed: number }
  | { kind: 'yourTurn'; waiting: boolean }
  | { kind: 'insurance' }
  | { kind: 'dealer' }
  | { kind: 'result'; net: number; blackjack: boolean; seed: number }
  | { kind: 'shuffling' }
  | { kind: 'quiet' };

export function joseLine(m: JoseMoment): string | null {
  switch (m.kind) {
    case 'betting':
      return m.first ? 'Sit down, primo. Bets in the circle.' : pick(['Bets, primo.', 'Place your bets.', 'Let’s go again.', 'Chips in the circle.', 'Another one?'], m.seed);
    case 'yourTurn':
      return m.waiting ? 'Table’s waiting, primo.' : 'Your action.';
    case 'insurance':
      return 'Insurance, anyone?';
    case 'dealer':
      return 'Dealer’s turn.';
    case 'result':
      if (m.blackjack) return 'Blackjack. Beautiful.';
      if (m.net > 0) return pick(['Nice hand, primo.', 'There it is.', 'Pay the man.', 'Good one.'], m.seed);
      if (m.net < 0) return pick(['Next one, primo.', 'Tough one.', 'It happens.', 'Shake it off.'], m.seed);
      return 'Push. Nobody wins.';
    case 'shuffling':
      return 'Shuffling up. Count’s back to zero.';
    case 'quiet':
      return null;
  }
}

/**
 * José behind the table. Everything at the table comes from him: his own line, or (passed in as
 * `says`) the feedback on your play and bet, or the count when you ask him for it.
 */
export function JoseZone({ line, says }: { line: string | null; says?: ReactNode }) {
  const base = import.meta.env.BASE_URL;
  const bubble = says ?? (line ? (
    <div className="jose-say" key={line}>
      <small>José</small>
      {line}
    </div>
  ) : null);
  return (
    <div className="jose-zone">
      <img className="jose-portrait" src={`${base}brand/jose-portrait.jpg`} alt="José, your dealer" />
      <img className="jose-face" src={`${base}brand/jose-avatar.jpg`} alt="" />
      <div className="jose-slot" aria-live="polite">
        {bubble}
      </div>
    </div>
  );
}
