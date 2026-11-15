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

## M8
- **Edge model** (`src/engine/edge.ts`): effects of removal from the exact engine (EV of the full shoe minus one card of each rank). With a chart, the modelled player follows the chart for every decision (a basic-strategy bettor, via the engine's new `continuation` option); without, play is composition-optimal (as in published EOR tables).
- **EOR validation.** Against Wizard of Odds Appendix 7 (6D, DAS, split once, re-optimised) every rank has the same sign and order and is within 0.02%. Our low-card values are about 10% smaller than that table; our single-deck EORs match Griffin's classic values closely (e.g. 5: +0.73% vs +0.69%, A: −0.58% vs −0.61%, from general knowledge), so the engine is consistent and the 6D table seems to use a different removal convention. Recorded rather than forced.
- **Depth effect.** A neutral 1-deck remainder of a 2-deck shoe plays like a single-deck game (~+0.4% better than 2D off the top). The linear model therefore uses `base(R)` = exact EV of a neutral shoe of the current size (interpolated), not the full-shoe base. Without it the model was biased by ~0.4% at every count.
- **Calibration.** A fixed strategy gains less than linearly at high counts. The linear term is scaled by a factor fitted (least squares) to exact EVs of realistic shoes at TC −6…+8 and three depths.
- **Verified by simulation:** 1.5M simulated 2D H17 rounds (chart play); rounds dealt at TC ≥ +2 (≈320k) average +1.71% vs a model prediction of +2.00% (1.4 SE). Exact EVs of sampled compositions average +1.62%, so the remaining gap is linearisation. Also tested: on realistic depleted shoes the EOR edge is within 0.25% of exact on average, and beats the Hi-Lo-only estimate; the ace-adjusted estimate also beats Hi-Lo alone.
- **Ace adjustment:** two-variable weighted least squares of the EORs on (Hi-Lo tag, ace indicator) gives edge ≈ base + β₂·TC + γ·(aces per deck above 4).
- **Kelly:** f = edge / 1.33 (blackjack variance per hand); full and half Kelly from the EOR edge; shown next to the user's ramp. The Kelly drill now uses the model's Hi-Lo slope instead of the 0.5%/TC placeholder.
- **Goal mode** (`src/engine/goal.ts`): exact outcome distributions per action with the continuation chosen to maximise expected utility (utility = net reproduces EV exactly, tested to 9 decimals; utility = V_{n−1}(bankroll + bet·net) maximises P(goal)). Round outcome distribution from the composition (chart initial play). Bankroll DP over a half-unit grid; composition held constant over the remaining hands; splits in goal mode = two independent max-EV hands (no resplits); doubles/splits only offered when the bankroll covers them.
- **Strike Mode** scenarios (last hand, short bankroll, target in sight, stale shoe with sit-out allowed, end of trip) are set at a scenario true count with the shoe about half dealt; decision hands exclude blackjacks on either side (nothing to decide). Grades A/B/C/D = P(goal) of the choice relative to the best (≥98/90/75%).
- **Feel Lab bet feel:** betting EV = Σ units × EOR edge of each round, compared with the user's ramp at the same counts.

## M9
- **Side-bet engine** (`src/engine/sidebets.ts`) works on the unseen composition *by physical card* (52 types; burn card and hole card count as unseen). Exact enumeration: unordered pairs of card types for two-card bets, unordered triples for 21+3, upcard × pairs for Match the Dealer, Q♥ pair × dealer-blackjack probability for the Lucky Ladies jackpot, and a dealer recursion with card counts for Buster.
- **Paytables** are editable per bet and stored on the device. 21+3 pays the best category a hand qualifies for, so a paytable without a suited-trips line pays suited trips as trips (Wizard's "Xtreme" version). Match the Dealer double matches pay the sum of both matches (as Wizard's numbers imply).
- **Custom pair template:** lines are patterns (any / colored / suited / mixed pair, a pair of a rank, or two specific named cards such as K♠ K♠). The highest-paying matching line wins. The default template has K♠K♠ 250, Q♥Q♥ 100, suited 25, colored 10, any 5.
- **Buster** is valued with the dealer drawing straight from the unseen cards (players' cards and draws unknown when the bet is made). Wizard's figures use the same model; our 6D H17 values match to 1e-6. In the Hunter's *actual results* a Buster bet can show as lost on a round where every player busted (the table engine doesn't play the dealer's hand then); the EV scoring is unaffected.
- **Validation:** every bet matches Wizard of Odds full-shoe values (PP 2/6/8D, 21+3 V1/V4/V5 with category counts, Lucky Ladies A at 2/6D including the jackpot permutations, Match the Dealer 2D/6D, Buster 6D H17/S17), and matches brute-force enumeration of every deal from a small physical shoe.
- **Side Bet Hunter:** the main hand is auto-played at 1 unit with the chart, so the attention goes to tracking key cards and the on/off decision. The exact side-bet EV is recorded before every deal. Timing score = Σ EV of rounds bet ÷ Σ EV of all positive rounds. Also reported: +EV rounds caught, bets made at negative EV, and the actual result. A warning shows when a paytable is positive off the top (probably mis-entered).

## M10
- **Performance:** every screen is a lazily loaded chunk; the initial bundle went from 383 kB to 245 kB (77 kB gzipped, mostly React). All chunks and fonts are precached by the service worker, so lazy loading never needs the network. Heavy math stays in the worker, and its results are cached in IndexedDB:
  - strategy ≈ 1.5 s
  - indices ≈ 15 s
  - edge model ≈ 10–40 s
  - decisions ≤ 25 ms
- **Accessibility:**
  - axe-core (WCAG 2 A/AA) is clean on 15 screens in both themes.
  - The light theme uses a darker accent (`#c8290f`) and a darker positive tone for ≥ 4.5:1 contrast.
  - Progress bars have accessible names; feedback lines are live regions.
  - Keyboard shortcuts: digits / Enter on keypads; H S D P R on action bars; space in the countdown.
  - Reduced-motion users get no animation.
- **Onboarding** is one screen on first launch: what the app is, the legal line, pick your usual game. It can be shown again from Settings.
- **Backup:** Settings → Export my data (JSON). Import is listed in docs/next.md.
- **Offline verified:** after one load the service worker serves everything. Offline, a reload works, lazy screens open, and the worker still computes strategy.

# V2

## V2-1
- **Name:** "MESA" was the placeholder; the app is now **Casino Tornillo** (the owner's brand, see V2-6). Brand strings live in `src/v2/brand.ts` and all colours in `src/v2/theme.css`.
- **V1 retired, engine kept.** The V1 screens were deleted (V1 is in history at `3d979b7`). The engine (`src/engine`), the worker and all engine tests stay; V2 is a new UI in `src/v2`.
- **Fixed card spots.** Positions are computed from (spot, hand, card index) in container units. Each card gets a stable id: once it lands it never re-renders elsewhere or re-animates. A split moves the second card with a short glide, as a dealer does. Cards fan right by half a card width so every corner index stays readable (essential for counting); after four cards a hand wraps to a second row.
- **Sizes:** your cards are larger than the other players' cards (phone legibility). Dealer cards are in between.
- **Pace** (per card / linger before the sweep): slow 1050/3400 ms, average 720/2500, fast 470/1800, extra fast 300/1200. Bots take 1.5× a card's time to decide. Tapping the felt skips the linger.
- **Engine additions:** several human spots (`humanSeats`), per-spot bets (0 = empty spot, not dealt), per-spot insurance, bot bets (`botBet`) and occasional bot misplays on stiff hands (`botMistakeRate`, 6% in the app).
- **Default table:** 6 decks, H17, DAS, 3:2, 75% penetration, 5 players, you in seat 4, $25 minimum ($2,500 max), $1,000 bankroll. These are the most common conditions friends will meet; everything can be changed.
- **The felt is sized to the screen height** (the controls dock has a fixed area), so nothing moves when the controls change.

## V2-2 / V2-3
- **The right play** is the chart for the rules. With *Deviations* on, it's the chart plus the index chart at the player's true count (half-deck estimate, rounded down). The coach names the count play and explains it.
- **Odds in plain words.** Win / push / lose chances come from the exact engine (outcome distributions, rest of the hand played to maximise EV). They're shown as "Hit wins 41%", sorted best play first. The money difference is shown only for mistakes, as dollars per $100 bet. EV is never shown as such.
- **Why-library** (`src/v2/coach/why.ts`): short rule-based reasons per hand class (stiffs vs bust cards, soft doubles, pairs, surrender, count plays, insurance). It quotes rounded rules of thumb; the live percentages in the card are exact.
- **Insurance:** never by the chart. With count plays, take it at the index (+3 for the reference set). The explanation uses the actual share of 10s left (pays above 1/3).
- **Count check grading:** the running count must be exact. The true count is accepted within ±1 of running count ÷ exact decks left. The answer shown uses the half-deck estimate rounded down (same convention as the on-felt helper and the count plays).
- **Quizzes:** offered when the table opens for bets, at least 10 cards into the shoe. "Sometimes" is 18% of rounds, "Often" 45%. The table pauses while the sheet is open.
- **Bet coach spread:** 1 unit at TC ≤ 1, then 2/4/6/8 units at TC 2/3/4/5+ (unit = table minimum). This is a standard, survivable spread for teaching. A bet within ×0.5–×2 of the recommendation is "good".
- **Look:** following the owner's references (editorial neo-brutalist chrome, colour-block cards, desert icons) with a Palm Springs palette:
  - sand page, dark forest felt slab with an ink outline and a hard shadow;
  - coral / mustard / pool / lilac actions, the same colours in the chart;
  - Anton display, Instrument Serif italic accents, Bricolage Grotesque body, JetBrains Mono labels.

  The icons are drawn in-house (no licensed assets). Aesthetics will be refined once the teaching loop is complete.

## V2-4
- **Practice my misses:** when the table opens a round, with probability 35% one of your "leaks" (a situation with a miss in its last three tries, weighted by those misses) is dealt to your first spot. `Table.stackPractice` swaps the needed cards forward in the undealt shoe, so the composition and the count stay real. Only the order changes, and only when the right cards are still in the shoe. The coach marks these hands with ↻ and says "you fixed a leak" when you get one right.
- **Mastered** = right on the last three tries.
- **Stats live on the device** (`v2stats` in IndexedDB): per situation, the totals plus the last 10 results; count checks (running exact, true within ±1); insurance; bets; daily totals.

## V2-5
- **Ask the coach** calls the Anthropic Messages API from the browser with the official SDK (`dangerouslyAllowBrowser: true`). That is acceptable only because the key is the user's own, entered by them and stored on their device. A hosted relay would be needed to give friends the coach without a key (listed under Next).
- **Model:** `claude-opus-5-5` (the default model), adaptive thinking (its default), effort `medium`, streaming. The server-side refusal fallback is on (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). A refusal or API error shows a plain message.
- **Prompt layout for caching:** a stable system prompt (cached), the chat history, then the live context (rules, learning settings, record, leaks, recent coach events) as a mid-conversation system message after the newest user turn.
- **Lazy loading:** the coach page and the SDK are a separate chunk (375 kB), so the table loads without them.

## V2-6 (Casino Tornillo)
- **Brand assets** are the owner's logo, cut out to transparent PNGs in `public/brand/` (full logo for the felt, emblem for the top bar and app icons, a cream version for the dark welcome screen).
- **Palette:** room `#0b1712` (deep green, dim radial light), felt cream `#e9dcc0`, rail `#0d0d0c`, desert orange `#c4561f` for accents and card backs.
- **6 players max.** Few real tables seat 7 full players, and six spots fit a full-width arc on a phone. Old saved settings with 7 are clamped.
- **Chips** keep the denominations people know (red 5, green 25, black 100, purple 500) in earthy tones: terracotta `#b3432b`, juniper `#3c6a4b`, black `#1d1c1a`, plum `#5e3b5b`, ochre `#c58f2e` for 1,000. Drawn in SVG; felt bets are stacks seen from the chair, with the total on the top chip.
- **Discard tray:** height = cards in the tray / (decks × 52) of the tray, so a full shoe fills it; one tick per deck. Every card out of the shoe that is not on the felt is in the tray, the burn card included (that is where it goes at a real table). Smoked acrylic so white card edges read on a cream felt.
- **The shoe hides what's left.** A real player can't see the cards behind the cut card, so the app doesn't show them either; decks left are judged from the tray.
- **Shuffle up** is offered only between hands. It is a real shuffle: all cards back in, new burn card, running count 0. It is the "restart" a player would ask for, not a new game: bankroll and stats carry on.
- **Table limits** sit on a placard at the dealer's edge, where you look for the minimum at a real table.
- **One screen, no scrolling.** The table screen is exactly the screen's height (`100dvh`). The top bar and the control dock have fixed heights, and the felt takes the rest: full width when there's room (home-screen app), scaled down evenly when Safari's bars take height. Nothing moves between phases.
- **Coach strip.** On the table the coach is a fixed two-line strip (verdict plus odds, or the first line of the why) that shares the dock with the play buttons; betting hides it so the chips fit. Tap it to open the whole card over the felt, and tap again to fold it.
- **The buttons are exactly the rules.** Hit, Stand and Double always sit in the same three places on your turn; Double greys out once you have more than two cards (and Hit after split aces). Split joins on any pair, Surrender when the rules offer it. Earlier the screen also hid Double/Split when the bankroll couldn't cover the extra bet, but the coach still graded against the rules, so a player could be marked wrong for a play they were never offered. Play money no longer limits doubles or splits: the bankroll can dip below zero for a hand and reloads between hands. A regression test checks that the engine offers Double on every two-card hand and Split on every pair.
- **Counts are said, not signed.** Counters think "up 3", "down 2", "even", not plus/minus. The count keypad has ▼ Down / Even / ▲ Up and a number pad (direction before or after the number, up to two digits), and every count the app shows (count check, training-wheels badge, bet coach) uses the same words. Logic in `src/v2/count/words.ts`, tested in `tests/count-words.test.ts`.
- **Charts in the familiar layout.** The chart page is laid out like the charts most players learned from: Pair splitting (Y, Y/N, N), Soft totals, Hard totals, Late surrender (when offered) and an Insurance line, dealer upcards across the top, with a familiar colour logic (white hit/no, yellow stand, green double/split/surrender, teal the conditional plays). Y/N is computed by solving the game with and without double after split. "Count plays" is the same grid with the true count written in the cell (4+ = at up 4 or higher, 0− = below 0). Our own colours and type, nothing copied.
- **Cross-checked against the published 6D H17 DAS chart** (`tests/published-h17.test.ts`): every hit/stand/double/split cell matches; surrender adds the usual H17 extras (15 v A, 17 v A, 8,8 v A); all 27 shared count plays are within one point. Differences of one point come from how the true count is rounded and estimated, and are worth almost nothing.
- **Count plays for the table's own rules.** V2 had been using the published reference set (S17 numbers) because nothing generated rule-specific indices. The table and chart now generate them in the background (a second worker, so the coach's odds are never held up; cached per rule set). Added three plays from the common H17 deviation chart: A,8 v 6, 15 v A (stand), 16 v 9 (surrender).
