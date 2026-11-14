# Progress

## Status
- **M1 — scaffold, design system, rules + presets, research, CI/Pages:** done, merged (PR #1).
- **M2 — shoe, counting, basic strategy generator + chart editor:** done, merged (PR #2).
  - Engine matches Wizard of Odds: dealer outcome tables (1/2/6/8D, S17/H17), composition-dependent stand/hit/double EVs (6 decimals), split EVs (±0.001), optimal house edge for 9 rule sets (±0.01%).
  - Generator reproduces the published 2D H17 DAS, 2D S17 DAS, 6D H17 DAS LS, 6D S17 DAS LS charts cell for cell.
  - Chart editor at `#/strategy`: override any cell, import/export JSON/CSV, CD exceptions.

- **M3 — drills:** done, merged (PR #3). `#/drills`: deck countdown, running count (game speed, random checkpoints), discard estimation (visual tray), true count, basic strategy flash and deviations flash (weighted to misses via spaced repetition), bet sizing (ramp / half Kelly), ace side count, key cards.

- **M4 — table sim:** done, merged (PR #4). `#/sim`: 1–6 seats, seat position, dealer speed, coach off/whisper, insurance/even money, splits/doubles/surrender, count check at shuffle; results screen with exact EV lost per error, bet and insurance errors; sessions + rounds stored for review.

- **M5 — Tune-Up, stats, spaced repetition:** done, merged (PR #5).

> **FIRST USABLE RELEASE.** Open https://taylorbeck-lab.github.io/bj-tuneup/ on your phone and use *Add to Home Screen* (it then works offline). Start with **Start 15-minute Tune-Up** on the home screen. Set your targets, bankroll and ramp in **Settings** and your game in **Table rules** first. Everything is stored only on that device.

- **M6 — exact EV analyzer + index generation:** done, merged (PR #6). `#/analyzer`: any composition / hand / upcard → exact EV of hit, stand, double, split, surrender, insurance, dealer outcome table, chart vs index vs exact play. `#/indices`: risk-neutral Hi-Lo indices generated for your rules (≈15 s in the worker, cached), I18 + Fab 4 reference, custom edits; EV-gain curve per play. Drills/sim use the selected source.

- **M7 — Feel Lab + Hand Review + Feel rating:** done, merged (PR #7). `#/feel`: play on feel (natural or hot shoes), every decision scored vs chart / index / exact; fringe plays, hit rate, EV gained/lost, missed EV, Feel rating (documented formula) with trend, sharp/leaky situations and plain-language takeaways. `#/review`: replay any session hand by hand with exact EVs; export JSON.

- **M8 — player edge, ace adjustment, Kelly, goal mode, Strike Mode:** done, merged (PR #8). EOR edge model (depth-corrected, calibrated, verified by simulation) with Hi-Lo and ace-adjusted estimates; Kelly / half Kelly vs your ramp in the analyzer; Kelly drill uses the model; Feel Lab scores bets; `#/strike`: five scenarios graded on P(goal) vs EV for bet and play.

- **M9 — side bets:** done, merged (PR #9). Exact EV by card for Perfect Pairs, Lucky Ladies, 21+3, Match the Dealer, Buster and a custom pair template (K♠/Q♥ jackpots), editable paytables, off-the-top EV with a positive-EV warning; `#/sidebets`: Side Bet Hunter with the exact EV curve and timing score.

- **M10 — polish:** done, merged (PR #10):
  - route code-splitting
  - accessibility pass (axe clean, light-theme contrast fixes)
  - one-screen onboarding
  - About with "how scores are computed" and the legal line
  - data export
  - full README
  - docs/next.md
  - offline verified

**V1 complete** — all ten milestones merged. V1 is preserved at merge commit `3d979b7` (the tag could not be pushed from this environment).

# V2: MESA (see docs/v2/BRIEF.md and docs/v2/PLAN.md)

## Status
- **V2-1 Table:** done, merged (PR #11).
  - V1 UI retired; the engine, worker and tests are kept.
  - MESA brand (placeholder) and desert-modern theme.
  - Portrait felt with fixed card spots. Cards slide in from the shoe and never move; every corner index stays visible; long hands wrap.
  - Dealer speeds: slow, average, fast, extra fast. Results linger, then the sweep.
  - 1–7 players; your seat; 1 or 2 spots.
  - $5, $25, $100 and $500 chips, table limits, a persistent bankroll.
  - Bots bet chips and occasionally misplay.
  - Shoe and discard tray; settings page; chart page with count plays.

- **V2-2 Coach + V2-3 Count:** done (PR open).
  - Coach card after every decision:
    - right or not, with a short why;
    - each play's chance to win (exact, for the cards left);
    - what a mistake costs per $100.
  - Count plays (deviations) when switched on; insurance feedback.
  - Count check, available any time: running count → true count, with the discard-tray reading, the arithmetic and what it means.
  - Dealer quizzes between rounds.
  - Count badge (training wheels).
  - Bet coach with a 1-2-4-6-8 spread.
  - One-tap learning path (1 Play right → 5 Bet the count).
  - Look refresh from the owner's references: Palm Springs palette, ink outlines and hard shadows, Anton plus Instrument Serif italic, desert icons drawn in-house, action colours shared with the chart.
  - The table pauses while the count sheet is open.

## Next
- V2-4 Progress: stats page (strategy %, most-missed hands, count %, deviations, bets, bankroll chart) and a "practice my misses" mode.
- V2-5 Ask the coach (key-gated AI chat), PWA polish, README.
- Aesthetics: refine fonts and look once the teaching loop is complete (owner is open to more serif/fancy type).

## Open questions
- Network allowlist blocks Blackjack Apprenticeship, reddit and Jacobson's blog; research used Wizard of Odds + general knowledge (see docs/research.md).
