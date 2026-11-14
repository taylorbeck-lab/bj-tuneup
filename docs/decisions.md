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

## M3
- **Drill scoring.** Every drill saves a session record (`sessions` store) with accuracy, average answer time, mistakes and, where meaningful, EV lost. BS-flash EV loss uses the exact full-shoe EVs of that chart cell (probability-weighted over its two-card compositions).
- **Weighted to misses** = Leitner spaced repetition (`src/store/srs.ts`): a miss sends the item to box 0; hits move it up; selection weight 10/5/3/2/1/0.6 by box, ×2 when due. M5 reuses this.
- **BS items** are one per decision class (hard total / soft total / pair × upcard). Trivial cells (hard ≤ 8, hard 17+ unless surrender, soft 20) are excluded.
- **Deviation items** draw the true count from index −2…+2, so the drill trains the boundary. Until rule-specific indices are generated (M6), the index chart is the Illustrious 18 + Fab 4 reference (multi-deck S17 values, as published).
- **Index precedence:** surrender indices first (when offered), then other matching plays; a pair the chart splits is not overridden by hard-total indices (8,8 isn't hard 16); doubling indices only apply to two-card hands.
- **Running-count rounds** are dealt with a simple realistic player policy (hit stiffs vs 7+, etc.) plus an occasional random stand; the dealer doesn't draw if every seat busted. The burn card is never shown.
- **Kelly drill** uses a placeholder edge model (off-the-top edge from the generated chart + 0.5% per TC, variance 1.33) until M8 replaces it with the effect-of-removal model.
- **Discard tray** renders a side view with ragged card edges and no scale (optional half-deck "learning marks"). Answers are graded to the user's deck-estimation granularity.

## M4
- **Table engine** (`src/engine/game.ts`) is pure and step-driven: the UI calls `step()` at dealer speed so dealing is animated, and blocks only on human decisions (bet, insurance, play, count check). Bots play the generated basic strategy and flat-bet 1 unit.
- **Unseen composition at a decision** = remaining shoe + burn card + the dealer's unrevealed hole card. Every human decision is snapshotted with it; the exact analyzer scores it in the worker (cached per base composition, so a whole hand reuses one engine).
- **Errors** are measured against the user's strategy: chart + index plays at the *player's* true count (settings granularity + rounding, computed from the cards actually seen). "EV lost" is the exact EV gap between that play and the chosen one, times the bet (only when positive). The gap to the exact composition-perfect play is reported separately ("vs exact best").
- **Bet errors** = bet differs from the user's ramp at the player's true count. Their EV cost needs the edge model (M8), so for now they are counted, not costed.
- **Insurance / even money** offered whenever the dealer shows an ace; graded by the insurance index and costed with the exact ten density.
- **Count check** at each shuffle (optional): the player enters the running count before the reshuffle.
- **Coach whisper** shows its hint only after the decision is made, once the worker returns (typically < 30 ms in 2 decks).
- **Simulation sanity tests:** a shuffle-every-round simulation (1.5M rounds) must match the exact combinatorial round EV within 3 standard errors; a cut-card simulation (2M rounds, 6D S17 DAS LS, one seat) must be within 3.5 SE of Wizard's "basic strategy with cut card" figure. Sessions and their rounds are stored so Hand Review (M7) can replay them.

## M5
- **Tune-Up plan** (`src/engine/tuneup.ts`): countdown (1 deck) → running count at speed (4 checkpoints) → true count with tray (8) → [basic strategy flash (15), only if BS accuracy in the last 14 days is below target] → deviations flash (15) → table (30 hands, coach off, betting). Each stage whose recent accuracy is below target gets more reps. Deviation and BS items are already weighted to misses by spaced repetition. Roughly 12–16 minutes at normal pace.
- **Tune-Up table** uses the active rules (2D by default) rather than forcing 2 decks, so the chart, indices and the game always agree.
- **READY** = every check passes: countdown ≤ target s/deck *and* correct, overall accuracy ≥ target (all scored answers across stages: drill items, table decisions, bets, insurance), table EV lost per 100 hands ≤ target. The "3 mistakes" are the three most costly distinct mistakes (by exact EV), then the first uncosted ones (count, bet).
- **Spaced repetition is fed by table play too**: every two-card table decision updates the BS item (or the index play's item when an index applied), hit or miss.
- **Stats** trends are single-series lines (dataviz rules: 2px line, recessive axis, dashed mid-grey target line, crosshair tooltip, table view under each chart). The accent is used only when the latest value misses the target.

## M6
- **Index generation method** (`src/engine/indexgen.ts`, risk-neutral, combinatorial): for each true count, a representative remaining shoe is built at three depths (20/50/80% of the way to the cut card) by removing a neutral cross-section of seen cards whose Hi-Lo running count is exactly t × decks remaining (extra low cards spread over 2–6, missing high cards over T/A 4:1). The exact engine values the deviation and the chart play for every two-card composition of the hand (plus three-card hands for hard hit/stand plays, weighted by how often the player reaches them by hitting). Each composition's EV curve is mapped onto the true count *the player observes at the decision* (including his cards and the upcard), the compositions and depths are averaged, and the index is the zero crossing rounded to the nearest integer.
- **Validation:** against the published Illustrious 18 + Fab 4 (multi-deck S17) for 6D S17 DAS LS every play comes out in the same direction and within ±1, mean |difference| ≤ 0.5. With a looser rounding of the seen cards (running count off by up to ~2) 19/22 matched exactly; making the running count exact (the principled construction) gives 15/22 exact. I kept the exact construction and test "all within ±1, mean ≤ 0.5" rather than an exact-match count chosen after the fact.
- **Two decks differ from the multi-deck reference** (e.g. 2D H17: 12 v 3 ≈ +4, 16 v T ≈ +1, insurance ≈ +2): removal effects of the player's own cards are much larger with 2 decks, and the reference set is not 2D-specific. The app shows generated and reference side by side and lets the user pick or edit.
- **Rounding convention:** nearest integer of the crossing (reproduces the reference best); the play is "deviate at TC ≥ index" (or "≤" for plays whose deviation is the low-count one, e.g. hitting 12 v 4).

## M7
- **Feel Lab scoring** (`src/engine/feel.ts`): each decision is graded vs the chart, vs the index chart (at the player's TC) and vs the exact composition-perfect play. *Fringe play* = any departure from the chart; it's an "index" play if it matches the index chart, otherwise a "feel" play. A fringe play is "right" when its exact EV equals the best available.
- **FEEL RATING** (0–100) = clamp(50 + 50·C/D, 0, 100) with C = Σ bet·(EV chosen − EV chart), O = Σ bet·max(0, EV best − EV chart), D = max(O, 0.5% of Σ bet). 50 = chart play; 100 = every exact-composition gain captured; below 50 = departures (and missed plays) cost more than they won. Using C/O rewards finding the right spots and penalises leaks on the same scale; the floor stops a session with almost no opportunities from swinging to 0 or 100 on one hand.
- **Situations** are grouped by hand class (pair / two-card soft / hard total) × upcard × chosen action; takeaways name the sharpest (≥ 2 plays, ≥ 60% right, most EV) and the leakiest situations, plus the biggest missed opportunity.
- **Hot shoes** (Feel Lab): small cards from the back of the dealt region are swapped into the front half with probability `skew`, so the count runs high later. HOT = 0.08, HOTTER = 0.15 give a median peak true count of about +6 / +9 in 2D (natural ≈ +3); higher values produced absurd counts (TC 20+), so they're not offered. The deck itself is unchanged (still balanced).
- **Bets in Feel Lab** are scored with the table summary (ramp errors). Their EV scoring by the exact edge model comes with M8.
- **Hand Review** replays any stored table/Feel Lab/Tune-Up session round by round: bet with TC and the unseen composition before the deal, dealer and player hands, insurance with its exact EV, and for every decision the exact EV of each legal action with *you / chart / index* marked. Export = the stored JSON (rules, every round's deal order, decisions with unseen compositions, EVs).
