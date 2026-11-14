# Research notes (milestone 1)

Short survey for SPEC section 7: what serious advantage players want from training tools, and which side bets can be beaten by counting or key-card tracking. Researched on 2026-11-14.

## Sources: what was actually reached

| Source | Status | Used for |
|---|---|---|
| Wizard of Odds (wizardofodds.com), many pages: Hi-Lo, Ask the Wizard (card counting, side bets), side-bet analyses, appendices | **Read directly** | Most claims below; all numbers in `reference-values.md` |
| Wikipedia, *Card counting* | **Read directly** | Count tag tables, the BC/PE/IC definitions |
| Web search result summaries (app store listings, guides) | Seen only as search snippets; pages **not opened** | Feature lists of existing trainer apps (weak evidence) |
| r/blackjack (reddit), Blackjack Apprenticeship, Eliot Jacobson (apheat.net / 888casino blog), bjstrat.net, QFIT, Wizard of Vegas forum, Las Vegas Advisor | **Blocked** by this session's network allowlist | Not used. Claims attributed to them below are general knowledge or come from search snippets, and are marked that way |

In the text below, **[WoO]** means read on Wizard of Odds this session, **[snippet]** means seen only in a search-result summary, and **[GK]** means general knowledge, not verified this session.

## 1. What serious players want from training tools

**Evidence read this session.**

- **Prioritise index plays.** Schlesinger's Illustrious 18 and Fab 4 give "80% to 85% of the value of knowing every index number, based on a six-deck game", and "the difference is more in single and double-deck games" [WoO Hi-Lo page]. Insurance is #1 on the list. For this owner's 2-deck game, a full index set matters more than it would in a shoe game.
- **Penetration and spread outweigh extra indices.** In Wizard's CVCX table for 6D S17 DAS LS RSA, with a 1–10 spread:
  - All indices at 4.5 decks penetration: 0.608%. I18+F4 at the same penetration: 0.587%.
  - Moving from 4 to 5 decks penetration: 0.368% → 0.837% [WoO].

  Drills on deck and discard estimation and on bet ramps are therefore worth as much as drills on deviations.
- **Camouflage has a measurable cost.** Wizard notes that betting patterns from books "set off red flags" and that win/loss-dependent ramps cost profitability [WoO]. This supports Strike Mode and the ramp drills measuring the EV given up for cover.
- **True-count precision.** Wizard's simulation rounded to the nearest half deck. Wizard says "a rough estimate will do" except at borderline indices [WoO]. This supports configurable TC granularity and measuring TC error mostly near index boundaries.
- **What existing trainer apps offer** [snippet]: speed-counting drills, betting practice, mistake tracking, deviation flashcards, true count conversion, and deck countdown timing. One guide criticises free trainers because they "rarely simulate true count conversion under deck-estimation pressure", treating deviations as flashcards rather than live shoe events.

**General knowledge [GK]:**

- Common benchmarks are a deck countdown under about 25–30 s and running count at game speed with distractions.
- Players want feedback measured in **EV lost**, not "% correct": a wrong 16 vs 10 at TC 0 is nearly free, while a missed insurance at TC +5 is not.
- Players want spaced repetition on their own misses, realistic multi-seat dealing and discard trays, Kelly sizing and risk-of-ruin awareness, and simulation-backed confidence numbers (CVCX/CVData style) for their own game.
- There is broad suspicion of trainers whose basic strategy or indices are hard-coded for the wrong rules (H17 vs S17, 2D vs 6D).

## 2. Which side bets are beatable

| Bet | Verdict | Basis |
|---|---|---|
| **Super Sevens** (7-keyed) | Strongly beatable by a key-card count | [WoO] Count 7s as −12 and all other cards +1. In 6D with 75% penetration, TC ≥ 5 occurs 23.2% of the time, with an average player advantage of 27.3% when it does (29.1% with the three-card guarantee). |
| **Lucky Ladies** (20s, Q♥ pair jackpot) | Beatable at deep penetration with a ten-weighted count | [WoO, citing Snyder's *Big Book of Blackjack*] Using the Red Seven count, bet in 6D only in the last two decks at +10 or more, and in 2D only in the last deck at +6 or more. Jacobson's ten-count for Lucky Ladies [snippet, unverified]. Off-the-top house edge is 5.87–24.71% depending on pay table (6D), so the opportunities are deep in the shoe and rare. |
| **Royal Match** (suited first two cards; K-Q suited) | Beatable by suit counting, mainly in single deck | [WoO] Snyder's method is "vulnerable ... in a single-deck game". Note Wizard's table for Version 2 (easy match 3:1, royal 10:1): the house edge is **negative** at 4+ decks (−1.113% at 6D). That pay table is presumably meant only for 1 deck (3.77%). |
| **Over/Under 13** | Very beatable | [WoO] "extremely vulnerable to card counters"; use a count that treats aces as low (Snyder). |
| **Specific-card bets** (suited diamond BJ, Triple 7s, Field of Gold aces) | Beatable by key-card tracking where the bet is offered mid-shoe | [WoO] A casino limited a $300 diamond-suited-BJ bet to the first hand after the shuffle because "a card counter could take advantage" otherwise. Triple 7s "would seem very countable". For an ace-keyed bet, count A = −12 and everything else +1. |
| **Pair bets with named-card pays** (KK/QQ/JJ bets, K♦ pair 200:1; Lucky Ladies Q♥ pair) | Partly: tracking the named card adds value only on top of the "any 20" or pair EV, and the big pay carries little EV (KK 6D: K♦ pair contributes 0.061835 of return) | [WoO] tables. Whether it turns positive depends on several components moving together; this needs the exact-composition calculator (SPEC 3.8), not a rule of thumb [GK]. |
| **Perfect Pairs / Lucky Pairs / any-pair bets** | Essentially not practical | [WoO] To gain an edge "you would pretty much need to eliminate all cards of at least one rank", which needs 13 counts, and "profitable opportunities don't happen often enough". Deep 2-deck penetration helps more than in shoes [GK]. |
| **Match the Dealer** | Not practical | [WoO] "A traditional count is not going to be useful"; it needs unusual rank imbalances, and 13 counts are impractical. |
| **21+3** | Countable in theory (suit/flush and rank counts), thin and rare edges | Jacobson built a flush-oriented suit count; edges are small and hard to play [snippet, unverified]. The house edge is 3.24% for 6D 9:1 and 2.74% for 8D [WoO], so it needs large suit imbalances [GK]. |
| **Buster Blackjack** | Countable with a dedicated count; modest edges | Jacobson analysed bust-type side bets ("Bust It") [snippet, title only]. Payouts rise with the number of cards, so a small-card-rich shoe raises the long-bust pays while tens raise the bust rate; Hi-Lo is a poor proxy [GK]. The house edge is 6.21% with 6D H17 [WoO]. |
| **In-Between** | Not worth it | [WoO] "I don't think it would be enough to warrant bothering with." |

## 3. Recommendations for the app

- **Track card identity, not just rank.** The shoe model should hold rank+suit counts (SPEC 3.2). Royal Match, Perfect Pairs, KK/QQ, Lucky Ladies Q♥ and 21+3 flushes all depend on suits or on specific cards.
- **Use exact side-bet EV from the remaining shoe.** Make the exact-composition EV the source of truth (SPEC 3.8), and test it against the off-the-top Wizard tables in `reference-values.md`.
- **Ship key-card count presets** with their documented trigger points:
  - Super Sevens: 7 = −12, others +1, bet at TC ≥ 5
  - Ace-keyed bets: A = −12, others +1
  - Lucky Ladies: Red Seven trigger from Snyder (6D last two decks at +10 or more; 2D last deck at +6 or more)

  Also let the user define custom tags. Report how well each count's signal correlates with the exact EV.
- **Side Bet Hunter metrics.** Report four things, matching Wizard's Super Sevens figures (23.2% of the time, 27.3% average advantage):
  - the fraction of rounds the bet was +EV
  - the average edge when it was +EV
  - the EV captured versus missed by the user's timing
  - expected units per 100 rounds at the table's side-bet maximum
- **Flag rules that are positive off the top.** When a user-entered pay table is +EV from the first hand (e.g. Royal Match 3:1/10:1 at 4+ decks), warn that the table is probably mis-entered or meant for another deck count.
- **Generate indices; don't hard-code them.** Generate H17 and 2-deck indices with the engine (SPEC 3.5), and show the Wizard/Schlesinger I18 + Fab 4 only as a labelled reference. H17 versions could not be sourced this session.
- **Weight drills by EV cost.** The order is insurance first, then 16 vs 10, 15 vs 10, and so on, for both deviation flashcards and Tune-Up weak-spot selection.
- **Keep CD and TD strategy separate.** Show composition-dependent exceptions, such as 10,2 vs 4 = hit and 8,3 vs A = hit in 2D S17, as their own layer, so that Feel Lab can credit "feel" plays that are actually correct by composition.
- **Treat penetration and discard estimation as first-class drills.** In Wizard's table, going from 4 to 5 decks penetration is worth more than going from I18 to all indices.
- **Report EV lost per 100 hands** next to accuracy everywhere, and let the user's own targets drive READY / NOT READY.
- **Keep the legal line** (SPEC 2): nothing here should be usable at a table.
