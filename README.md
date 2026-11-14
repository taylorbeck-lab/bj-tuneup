# Tune-Up

Blackjack advantage-play **training and analysis** app: deviations, counting speed and accuracy, and an honest, math-backed rating of how good your *feel* is when you play beyond the chart.

> Training and analysis only: using any device to count cards or calculate odds at a casino game is illegal in Nevada and many other jurisdictions, so never use this app while gambling.

**App:** https://taylorbeck-lab.github.io/bj-tuneup/

On a phone, open the link and use *Add to Home Screen* (Safari share menu / Chrome menu). After the first load it works fully offline. Everything is stored only on that device.

## Getting started
1. **Pick your game.** The first screen offers presets ("Downtown 2D H17", 2D S17, 6D H17/S17 with late surrender, 1D, 8D). *Table rules* on the home screen sets every rule:
   - decks: 1 / 2 / 6 / 8
   - H17 / S17
   - DAS
   - doubling: any two cards, 9–11 only, or 10–11 only
   - split-to-N, resplit aces, hit split aces
   - late surrender
   - blackjack pays 3:2 / 6:5
   - penetration, seats, burn card

   Save your own presets there too.
2. **Set yourself up in Settings:**
   - **Counting:** true-count granularity (1, ½ or ¼ deck, or exact), rounding (floor, trunc or round), ace side count, key cards.
   - **Money:** bankroll, unit, bet ramp.
   - **Your targets:** used for the READY verdict.
   - **Display:** theme and four-colour deck.
3. **Press "Start 15-minute Tune-Up".**

## Modes
- **Tune-Up:** about 15 minutes, ending in one screen with speed, accuracy, your 3 costliest mistakes, EV lost, and **READY / NOT READY** against your targets.
  - The stages: deck countdown → running count at speed → true count with a discard tray → deviations → a short table session with betting.
  - It adapts to your last two weeks: weak areas get more reps.
- **Drills:** timed and scored:
  - deck countdown and running count with random checkpoints
  - discard-tray estimation and true count conversion
  - basic strategy flash and deviations flash (both weighted to your misses)
  - bet sizing, by your ramp or half Kelly
  - ace side count and key cards
- **Table sim:**
  - 1–6 seats, adjustable dealer speed; you keep the count, bet and play.
  - Coach OFF (errors revealed at the end) or WHISPER (a hint *after* each decision, with the EV difference).
- **Feel Lab:**
  - Play on feel, on natural or "hot" shoes with more extreme counts. Every decision is scored against your chart, your index chart and the exact composition-perfect play. Departures from the chart are your **fringe plays**.
  - You get a **Feel rating**, fringe hit rate, EV gained or lost, sharp and leaky situations, and plain-language takeaways ("Your A,3 doubles vs 4 at TC +5 and higher were right 8 of 9 times").
  - Bets are scored too, against the exact edge of each round.
- **Strike mode:** five scenarios: last hand, short bankroll, target in sight, stale shoe, end of trip. You choose the bet and the play; the app shows EV vs probability of reaching the goal and grades both.
- **Side bet hunter:**
  - Bets: Perfect Pairs, Lucky Ladies, 21+3, Match the Dealer, Buster, or a custom pair bet (e.g. K♠K♠ / Q♥Q♥ jackpots). Every paytable is editable.
  - Track key cards and decide when to bet; after the shoe you see the exact EV curve and your timing score.
- **Hand review:** replay any session hand by hand with the count, the unseen composition and the exact EV of every option. Export as JSON.
- **Stats:** trends (Feel rating, EV lost per 100 hands, countdown speed, accuracy per drill), full history, and spaced repetition. Missed situations come back until mastered.
- **EV analyzer:** any shoe, hand and upcard. It shows:
  - the exact EV of every action and insurance
  - dealer outcomes
  - the chart play vs the index play vs the exact play
  - next-round edge (effect of removal, Hi-Lo, ace-adjusted), with Kelly and half Kelly next to your ramp

## Custom charts
- **Strategy chart** shows exact basic strategy generated for your rules (all drills and the sim use it).
  - Tap any cell to see the full-shoe EV of every action and override it. Overrides are outlined.
  - Export or import as JSON or CSV. CSV rows are `section,hand,2,3,4,5,6,7,8,9,T,A`, with codes `H S D Ds P Rh Rs Rp`.
  - Composition-dependent exceptions are listed under the chart.
- **Indices** shows Hi-Lo indices generated for your rules (about 15 s once, then cached), the Illustrious 18 + Fab 4 for reference, and your custom edits.
  - Pick which set the drills, sim and Feel Lab use.
  - Each play shows its EV-gain curve.

## How scores are computed
- **Exact EV:** a combinatorial analyzer computes each decision from the cards still unseen (remaining shoe, burn card and the dealer's hole card). It is conditioned exactly on no dealer blackjack (US peek). Splits use the standard approximation.
  - It matches Wizard of Odds' published dealer tables, composition-dependent EVs (to 5–6 decimals) and house edges (within 0.01%), and reproduces the published 2D/6D H17/S17 basic strategy charts cell for cell.
- **Errors / EV lost:** a play that differs from *your* strategy (chart + index plays at the true count you should have had). EV lost = the exact EV gap × your bet. The gap to the composition-perfect play is shown separately.
- **READY:** every target met: countdown speed and correctness, accuracy across all scored answers, and table EV lost per 100 hands.
- **Feel rating:** `clamp(50 + 50·C / max(O, 0.5% of total bet), 0, 100)`.
  - `C = Σ bet·(EV chosen − EV chart)` and `O = Σ bet·max(0, EV best − EV chart)`.
  - 50 = you played the chart, 100 = you captured every composition gain, below 50 = your departures cost more than they won.
- **Indices:** risk-neutral. Exact EVs on representative shoes at three depths, at the true count the player observes; the crossing is rounded to the nearest integer. Against the published I18 + Fab 4 (6D S17), every play is within ±1.
- **Player edge:** effects of removal computed exactly for your rules, with a depth correction and calibration. Verified by simulation. Kelly = bankroll × edge / 1.33.
- **Goal probability:** exact outcome distributions, with the rest of the hand played to maximise the chance of reaching the target. A dynamic program over bankroll and hands left.
- **Side bets:** exact from the unseen cards by rank and suit; checked against published values and brute-force enumeration.

Method details and judgment calls: [docs/decisions.md](docs/decisions.md). Published reference values used by the tests: [docs/reference-values.md](docs/reference-values.md).

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

Stack: TypeScript, React, Vite, vite-plugin-pwa, IndexedDB (idb), with heavy math in a web worker. Tests are run with Vitest.

## Deploy (GitHub Pages)
Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes `dist/` to Pages.
**The one setting to turn on:** repository *Settings → Pages → Build and deployment → Source: **GitHub Actions***.

## Privacy
Everything stays on the device in IndexedDB. There are no accounts, backend, analytics or tracking. *Settings → Export my data* downloads a JSON backup.
