# Casino El Primo

A blackjack table in your pocket, dealt by José, that teaches you to play like an advantage player one level at a time. Version 1.0.

> Training and analysis only: using any device to count cards or calculate odds at a casino game is illegal in Nevada and many other jurisdictions, so never use this app while gambling.

**App:** https://taylorbeck-lab.github.io/bj-tuneup/

Open the link on a phone and add it to the home screen (iPhone: Safari's Share menu, then *Add to Home Screen*; Android: *Install* when Chrome offers it, or from the app's Settings). It works offline. Everything you do stays on the phone; play money only.

## How it plays

José deals a real game: double deck, dealer hits soft 17, $10 to $500, about two-thirds of the shoe dealt, other players coming and going. You bet, you play, and after each move José says whether it was right, in a line. Tap what he says for the odds and the why.

The course has three levels. Everyone starts at the first, and José offers the next at the end of a shoe when your record shows you're ready.

1. **Basic strategy:** every hand right. Soft hands and pairs are checked on their own, because that's where people stay fuzzy.
2. **Count & bet:** keep the Hi-Lo count, get asked for it between hands and at the cut card, and size your bets by the true count.
3. **Full AP:** the plays that change with the count, a few at a time, the most valuable first.

A player who already counts can unlock everything from the first card of the intro.

Around the table:

- **Stats:** your level and what the next one takes, then only the numbers you're graded on at that level, and the hands to work on.
- **Charts:** the exact basic strategy for the rules on the felt, and the count plays.
- **Settings:** your level, José's coaching, the table (pace, other players, seat, limits) and the house rules.
- **Before you play for real:** the do's and don'ts for a live table, and a session planner that says what a game is worth with your spread and how a session is likely to go.

## What's real

- The shoe is dealt down to a cut card and shuffled by hand (or by a machine between shoes). No continuous shufflers.
- Cards come out one at a time at the dealer's pace, including after a split or a double.
- The count is never shown on the table. You keep it; tap the discard tray to be tested or to ask José.
- Feedback comes after you act, never before.

## Under the hood

- **Engine:** dealer probabilities, hand values, house edges and basic strategy charts computed exactly and checked against published tables.
- **Count plays:** Hi-Lo index plays generated for the rules in play.
- **Method notes:** `docs/decisions.md`.

## Develop

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build && npm run preview
```

```bash
npm run smoke
```

The "Ask the coach" chat (which needs each player's own Claude API key) is left out of the build; `VITE_AI_COACH=1 npm run build` puts it back.
