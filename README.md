# Casino Tornillo

A blackjack table in your pocket that teaches you to play like an advantage player, one layer at a time:

1. every hand right,
2. then counting,
3. then the true count,
4. then count plays,
5. then betting the count.

You sit down and play. After each decision, the coach tells you whether it was the right call, the odds behind it, and why.

> Training and analysis only: using any device to count cards or calculate odds at a casino game is illegal in Nevada and many other jurisdictions, so never use this app while gambling.

**App:** https://taylorbeck-lab.github.io/bj-tuneup/

Install it from Safari's share menu or Chrome's menu with *Add to Home Screen*. It works offline, and everything stays on the phone.

## How it plays
- **A real table:**
  - A cream felt with the Casino Tornillo logo, a black padded rail, and up to 6 players in an arc that runs edge to edge.
  - Dealer, shoe, the posted table-limits sign and a smoked acrylic discard tray along the top. The tray stack grows exactly with the cards played, with a tick per deck, so you read decks played the way counters do. You can't see how many cards are left in the shoe, just like a real table.
  - You choose your seat, and play one or two spots.
  - Cards slide out of the shoe to a fixed spot and stay there. Every card stays readable, and nothing jiggles.
- **Dealer pace:** slow, average, fast or extra fast. Finished hands stay on the felt for a realistic beat; tap the felt to move on.
- **Money:** $5 / $25 / $100 / $500 chips in the house colours (terracotta, juniper, black, plum), bets stacked on the felt, and a bankroll that persists (play money). It reloads when you're out.
- **Shuffle up** (under the bet buttons): between hands, ask the dealer for a fresh shoe. The count starts again at 0, exactly like a new shoe at a casino.
- **Other players** bet and play too, and once in a while they misplay, like real tables.

## The coach
- **After every decision:** RIGHT CALL / NOT QUITE, each play's chance to win ("Hit wins 41% · Stand wins 37%", exact for the cards left), and a one-line why. A mistake also shows what it costs per $100 over time.
- **Count?** (top bar): any time, enter the running count, then the true count, using the discard tray to judge decks left. You get the arithmetic and what that count means. The dealer pauses while you think.
- **Learning path** (Settings): five one-tap steps.
  1. *Play every hand right*
  2. *Start counting*: the count is shown, with easy quizzes
  3. *Count on your own*: more quizzes
  4. *Count plays*: the right play changes with the count
  5. *Bet the count*: the bet coach raises and lowers your bet
- **Practice my misses:** hands you got wrong come back more often until you get them right three times in a row. The shoe's composition stays real; only the order of undealt cards changes.
- **Stats (★):**
  - right calls overall and today, and the hands to work on (each with the right play);
  - count check accuracy, count plays, insurance, bets;
  - a bankroll chart.
- **Chart (▦):** the exact basic strategy for your rules, colour-coded like the action buttons, plus the count plays.
- **Ask the coach (AI):** add a Claude API key in Settings to unlock a chat that knows your record, your leaks and your last few hands. You can ask about any hand, get quizzed, or talk through the count. The key stays on your phone and is sent only to Anthropic.

## Rules you can set
- decks (1, 2, 6 or 8)
- dealer hits or stands on soft 17
- blackjack pays 3:2 or 6:5
- double after split; double on any two, 9–11 or 10–11
- split up to 2–4 hands, resplit aces
- late surrender
- penetration
- players, your seat, one or two spots
- dealer speed
- table minimum and bankroll

## Under the hood
- **Engine:** the exact math engine from version 1. Its dealer probabilities, hand EVs, house edges and basic strategy charts are validated against published Wizard of Odds tables.
- **Count plays:** risk-neutral Hi-Lo indices generated for your rules. The Illustrious 18 + Fab 4 are the reference set until generated.
- **Method notes:** `docs/decisions.md`. The brief and plan: `docs/v2/`.

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

TypeScript, React, Vite, a PWA with offline caching, and IndexedDB for local storage. The math runs in a web worker.

## Deploy
Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages.
**One setting:** repository *Settings → Pages → Build and deployment → Source: **GitHub Actions***.

Version 1 (the full analysis suite) is preserved in git history at commit `3d979b7`.
