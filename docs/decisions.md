# Decisions

Judgment calls made while building, newest at the bottom of each milestone.

## M1
- **React over Svelte.** The spec defaults to React; nothing here makes Svelte clearly better. React 19 + Vite 8 + TypeScript.
- **No router library.** A ~30-line hash router (`src/router.ts`) works on GitHub Pages without 404 tricks and offline.
- **Fonts:** Space Grotesk (grotesk, OFL) + JetBrains Mono (mono, OFL), self-hosted via `@fontsource`, latin subset only, so they are precached for offline use.
- **Palette:** near-black `#0d0d0d`, off-white `#f2f0eb`, mid grey `#8a8984`; the single sharp accent is `#ff3b1f` (errors / key feedback only); muted sage `#7d9c86` only for positive EV.
- **Two-colour deck** renders red suits in mid grey (not red) so the accent stays reserved for errors; suit glyph shapes do the rest. A four-colour deck (muted hues, none equal to the accent) is opt-in.
- **Peek game only.** All math assumes US rules: the dealer checks for blackjack under an A or ten-value upcard. No ENHC option for now.
- **Split rules** are modelled as "split to N hands" (1 = no split, 2 = no resplit, up to 4) plus resplit-aces and hit-split-aces flags.
- **Persistence:** IndexedDB through `idb` with an in-memory fallback (tests, private browsing). Stores: `kv` (settings), `sessions`, `srs`, `shoes`.
- **Pull requests:** the harness gives one working branch (`claude/sharp-knuth-9wvek2`). Each milestone is opened as a PR from that branch into `main` and merged once CI is green, so the next milestone's PR contains only its own commits. Merging is needed for the spec's "all milestones merged" and for the Pages deploy from `main`.

## M2
- **Exact peek conditioning.** With an A (T) up, the hole card is known not to be a T (A). Dealer outcomes *and the player's draw probabilities* are conditioned on that: P(next = c) = m_c (M − 1 − m_x + [c = x]) / ((M − 1)(M − m_x)). Without the player-side conditioning, 11 vs A in 2D S17 came out "hit" instead of the published "double". With it, stand/hit/double EVs match Wizard of Odds Appendix 9 to 6 decimals.
- **Dealer engine** = a precomputed state graph per (upcard, H17) evaluated by a forward pass over the remaining composition (7x faster than memoised recursion; the recursive version stays as a test reference).
- **Splits:** the standard approximation (Wizard of Odds Appendix 9 uses the same): each split hand is valued from the shoe with the upcard and the pair cards already split removed, ignoring other cards drawn to other split hands; resplit counts follow a branching process. The app resplits **optimally** (only when it beats playing on). Wizard's published split values assume **always** resplitting; tests compare in that mode, within 0.001. Known gap: 10,10 vs 10 under forced resplitting differs from Wizard by ~0.07 (a split nobody makes); excluded from the test and noted here.
- **Basic strategy convention:** total-dependent cells are the probability-weighted best action over the *initial two-card hands* forming that row (hard rows use non-pair hands), as Wizard of Odds does. Hit EVs assume optimal composition-dependent continuation. Composition-dependent exceptions are listed separately.
- **2D H17 A,3 vs 4 = double.** Our generator says double by 0.0005; Wizard's Appendix 9 gives the same numbers (hit 0.086531, double 0.087059). The published-chart fixture uses D.
- **Unseen composition:** the burn card is unknown to the player, so all player-side math uses "remaining shoe + burned cards".
- **Strategy cache:** generated charts are cached in IndexedDB per rule set (`strategy:v<gen>:<rulesKey>`); user overrides are stored per rule set as a cell → code map, so regenerating never loses edits.
