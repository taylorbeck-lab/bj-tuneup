/**
 * José, the dealer. A first flat pass: he stands behind the table (a portrait when there's room, a
 * round face and a speech bubble when space is tight) and says a short line at the natural moments:
 * bets, your action, the result, the shuffle. He never says the count; the feedback card teaches.
 */
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

export function JoseZone({ line }: { line: string | null }) {
  const base = import.meta.env.BASE_URL;
  return (
    <div className="jose-zone" aria-live="polite">
      <img className="jose-portrait" src={`${base}brand/jose-portrait.jpg`} alt="José, your dealer" />
      <div className="jose-compact">
        <img src={`${base}brand/jose-avatar.jpg`} alt="José, your dealer" />
        {line && (
          <div className="jose-say" key={line}>
            <small>José</small>
            {line}
          </div>
        )}
      </div>
      {line && (
        <div className="jose-say jose-say-wide" key={'w' + line}>
          <small>José</small>
          {line}
        </div>
      )}
    </div>
  );
}
