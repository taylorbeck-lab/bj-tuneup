FIRST: Save this entire message, unchanged, as docs/SPEC.md and commit it. Then follow it.

=====================================================================
TUNE-UP: a blackjack advantage-play training and analysis app
=====================================================================

0. HOW TO WORK (read every session)
- docs/SPEC.md is the source of truth. docs/PROGRESS.md is the running log: which milestone is done, what is in flight, what is next, open questions. Read both at the start of every session and continue from where PROGRESS.md says.
- Build the milestones in section 8 strictly in order. Each milestone: plan briefly, build, write tests, make tests pass, update PROGRESS.md, commit, open a pull request. Then start the next milestone without waiting.
- Record judgment calls in docs/decisions.md instead of stopping to ask. Work autonomously.
- Keywords from the owner: "continue" = resume from PROGRESS.md. "sync" = update PROGRESS.md and commit now, then keep working. "close" = finish the current step cleanly, update PROGRESS.md with exactly where things stand and the next step, commit, push.
- Never weaken a test to make it pass. Math correctness beats features.

1. WHAT THIS IS
A practice and analysis app for an experienced card counter. Mostly 2-deck pitch games, Hi-Lo, sometimes an ace side count. He knows perfect basic strategy (Blackjack Apprenticeship-style charts; small chart differences don't matter, the app just needs mathematically correct basic strategy). The value is: deviations, real-time feedback, counting speed and accuracy, and above all measuring how good his FEEL is when he makes count-driven or composition-driven plays beyond the standard chart.

His approach, which the app must support and measure:
1) Perfect basic strategy.
2) Perfect running count (excluding the burn card), fairly accurate true count.
3) Deviate by count, at least the highest-EV indices. Beyond that, play by feel at extreme counts and on composition: e.g. double A,3 vs 4 or split 4,4 vs 4 at very high counts; track aces and press bets when the shoe is ace-rich; hunt side bets (e.g. a pair side bet with a big payout for suited queens or the king of spades) by tracking specific key cards; take a shot when the session is stale or the bankroll is short and the time is right.
The app should be the companion he wishes he had in his head: it trains that instinct in simulation and tells him, with real math, how strong it is.

2. HARD BOUNDARY (do not cross)
Training and analysis only. No "live table" mode, no camera or microphone card capture, no hidden or discreet UI, no features designed to be used while gambling. Using a device to count or calculate odds at a casino game is illegal in Nevada and many other jurisdictions. Put one sentence about this in the README and the About screen.

3. ENGINE
3.1 Rules config: decks 1/2/6/8 (default 2), H17/S17, DAS, double any two / 9-11 / 10-11 only, resplit pairs/aces, hit split aces, late surrender, blackjack 3:2 or 6:5, penetration, number of seats, burn card. Saveable presets ("Downtown 2D H17", etc.).
3.2 Cards and shoe: real shuffled shoes, cut card, burn card handling, exact remaining composition at all times.
3.3 Counting: Hi-Lo running count, true count (configurable deck estimation granularity and rounding), optional ace side count (aces seen vs expected), optional key-card trackers (user picks any specific cards, e.g. K of spades, Q of hearts).
3.4 Basic strategy generator: compute total-dependent and composition-dependent basic strategy for the chosen rules. Validate with tests against established published basic strategy charts for 2D H17 DAS, 2D S17 DAS, 6D H17 DAS LS, 6D S17 DAS LS. Chart editor: user can override any cell and import/export JSON/CSV.
3.5 Index plays: compute Hi-Lo indices for the chosen rules (risk-neutral, by simulation or combinatorial method), plus show the standard Illustrious 18 and Fab 4 as reference. All editable.
3.6 EXACT EV ANALYZER (the heart of the app): for any decision point, given the exact remaining shoe composition and the rules, compute the EV of every legal action (hit, stand, double, split, surrender, insurance) using a combinatorial algorithm (dealer probabilities from the actual remaining cards; splits approximated with a documented, standard method). Must be fast enough for 2 decks in a web worker (cache aggressively). Validate against published EV tables for full shoes at the start of a deck.
3.7 Player edge and betting: estimate the player's edge for the next round from the remaining composition (effect-of-removal model, verified by simulation), with and without ace adjustment. Compute the Kelly and half-Kelly bet for a user bankroll and unit size, and the user's own bet ramp as a reference.
3.8 Side bets: EV calculator from the exact remaining composition for configurable side bets, with user-defined paytables: Perfect Pairs, Lucky Ladies, 21+3, Match the Dealer, Buster Blackjack, and a "custom pair" template (payouts for any pair / colored / suited / specific named cards like K of spades). Show when a side bet turns positive EV.
3.9 Goal mode math: besides EV, compute the probability of reaching a session target (e.g. double the remaining bankroll in N hands, or win this one last hand) for each action and bet size. This is how "time to strike" plays get judged fairly: sometimes the max-EV play and the max-probability-of-goal play differ.

4. MODES
4.1 TUNE-UP (one button, 15 minutes): deck countdown → running count at speed → true count conversion with a discard tray → deviations flash → short 2-deck table sim with betting. Adapts to his recent weak spots. Ends with one screen: speed, accuracy, the 3 specific mistakes, EV lost, and a READY / NOT READY verdict against his own targets.
4.2 DRILLS (timed, scored): deck countdown; running count at game speed with random checkpoints; deck/discard estimation (realistic visual discard tray); true count conversion; basic strategy flash (weighted to misses); deviations flash including insurance (weighted to misses); bet ramp/Kelly sizing; ace side count; key-card tracking ("has the K of spades come out?").
4.3 TABLE SIM: full 2-deck (default) game, 1 to 6 seats, adjustable dealer speed, he keeps the count, bets, plays. Coach OFF by default: errors logged silently and revealed at the end. Coach WHISPER (training only): a subtle hint after a decision (not before) with the EV difference.
4.4 FEEL LAB (signature feature): he plays the sim purely on feel. Every decision and bet is scored three ways: vs basic strategy, vs the index chart, vs the exact composition-perfect play (3.6) and, when goal mode is on, vs the max-probability play (3.9). Tag "fringe plays" (departures from the chart). Show per session and over time: EV gained/lost by fringe plays, hit rate of fringe plays that were actually correct, which situations his feel is sharp vs leaky. Produce a single FEEL RATING (documented formula) with a trend chart. Plain-language takeaways like "Your A,3 doubles vs 4 at TC +5 and higher were right 8 of 9 times; your 4,4 splits vs 4 cost 0.6 units."
4.5 STRIKE MODE (scenarios): stale shoe, last hand, short bankroll, end of trip, target in sight. Sets up the situation, he decides bet and play, the app shows EV vs goal probability and grades the choice.
4.6 SIDE BET HUNTER: pick a side bet and paytable plus key cards to track; play the shoe at min bet; decide when to start betting the side; app scores timing against the exact EV curve and shows the curve after the shoe.
4.7 HAND REVIEW: replay any shoe hand by hand with the count, composition, EV of every option and his choice. Export a shoe as JSON.
4.8 STATS: history per drill and mode, accuracy, speed, EV lost per 100 hands, Feel rating trend. Spaced repetition: missed hands, indices and situations come back more often until mastered.

5. DESIGN
Modern, minimal, brutalist. Not casino-themed: no green felt, chips art, gold, glow or cartoon cards.
- Monochrome base (near-black, off-white, one mid gray) and ONE sharp accent used only for errors and key feedback. A second muted tone allowed only for positive EV.
- Big confident type: one grotesk plus one mono (free licenses), strict grid, visible structure (hairline rules, boxes), generous negative space, no gradients, no shadows, no rounded-corner softness beyond 2px.
- Cards as typographic tiles: large rank, simple suit glyph, suits distinguishable at speed (optional 4-color deck).
- Mobile-first, one-hand use, big tap targets, haptics on error where supported. Dark default, light toggle.
- Numbers presented like instruments: EV in units and %, clean small charts, no clutter.
- Motion only where it carries meaning (dealing speed, card flow).

6. TECH
- TypeScript, Vite, React (or Svelte if clearly better; justify in decisions.md). Heavy math in web workers.
- Installable PWA, offline-first, all data local (IndexedDB). No accounts, backend, analytics or tracking.
- GitHub Actions: run tests on every push; deploy to GitHub Pages from main. README states the one Pages setting the owner must turn on.
- Tests: strategy generator vs published charts; EV analyzer vs published EV values; count/true count math; side bet combinatorics vs brute-force enumeration on small shoes; simulation sanity checks (house edge for standard rules within tolerance of published values).

7. RESEARCH (milestone 1, short)
If the network allows, check advantage-play sources (r/blackjack, Wizard of Odds, published counting and side-bet analysis) for what serious players want from training tools and which side bets are beatable by counting or key-card tracking. Summarize in docs/research.md. If blocked, use your own knowledge and say so.

8. MILESTONES (in order, one PR each)
M1  Repo scaffold, design system (tokens, type, grid, card tile, buttons), rules config + presets, docs/research.md, CI + Pages deploy.
M2  Shoe, counting (Hi-Lo, ace side count, key cards), basic strategy generator + chart editor, tests vs published charts.
M3  Drills: countdown, running count, discard estimation, true count, BS flash, deviations flash, bet ramp.
M4  Table sim (coach off / whisper), betting, insurance, results screen.
M5  Tune-Up flow, stats history, spaced repetition. (First usable release: tell the owner in PROGRESS.md.)
M6  Exact EV analyzer + index generation, validated with tests.
M7  Feel Lab + Hand Review + Feel rating.
M8  Player edge, ace adjustment, Kelly sizing, goal-mode math, Strike Mode scenarios.
M9  Side bet calculators, custom paytables, Side Bet Hunter.
M10 Polish: performance, accessibility, onboarding (one short screen), About/legal line, README, docs/next.md with the best ideas not built.

9. DONE MEANS
All milestones merged; tests green; the app installs on a phone from the GitHub Pages link and works offline; README explains rules setup, custom charts, Feel Lab and how scores are computed.
