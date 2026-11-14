# Next: best ideas not built yet

Ordered by how much they would help this player, roughly.

1. **Import a backup.** Settings can export everything as JSON. Importing it (merge or replace) would make moving to a new phone painless.
2. **Exact edge per round in the table sim.** Show the exact round EV (not the linear model) in Hand Review, using the round-EV engine in the worker. It takes ~0.3–1.5 s per round, so it would run lazily per reviewed round.
3. **Index generation with resplit and surrender interactions, and a "playing efficiency" report.** Show how much of the possible composition EV the user's index set captures for his game (e.g. "your 22 indices capture 84% of the exact play gain in 2D H17").
4. **Composition-dependent drills.** Flash cards for the composition-dependent exceptions themselves: 3-card 16 vs T, 10,2 vs 4, 8,3 vs A in 2D. Also extreme-count composition plays (A,3 vs 4, 4,4 vs 4) drawn from Feel Lab's leakiest situations.
5. **Count-specific side-bet triggers.** Fit a one-parameter key-card count for each side bet from its exact EV (e.g. a tens-and-Q♥ count for Lucky Ladies), and show the trigger value on the Hunter's setup screen.
6. **Camouflage cost.** Let the user define cover plays and bet patterns, and show their exact EV cost per 100 hands in the sim results.
7. **Variance and risk of ruin.** Simulated SCORE, N0 and risk of ruin for the user's ramp, spread, penetration and bankroll, plus a bankroll trend chart for the table sim.
8. **Multi-hand play.** Let the human play two spots, with exact EV accounting for the cards the other spot removes.
9. **Distraction mode for count drills.** Chatter prompts and "what was the dealer's upcard two rounds ago?" questions during the running-count drill.
10. **ENHC (no-peek) rules and other variants:** European no-hole-card rules, early surrender, double-after-split restrictions per pair, and 5-card Charlie.
11. **Better split modelling.** Exact post-split values that track the cards drawn to earlier split hands (currently the standard approximation: within 0.001 of Wizard's figures except 10,10 vs 10 under forced resplits).
12. **A precomputed chart cache.** Ship generated charts and indices for the built-in presets in the bundle, so the first launch on a slow phone has nothing to compute.
