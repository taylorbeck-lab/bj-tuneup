# V2 plan: MESA (placeholder name)

*Mesa*: a desert table mountain, and Spanish for "table". Warm desert-modern boutique look on a dark sage felt. Every name, colour and logo is in one place (`src/v2/brand.ts`, `src/v2/theme.css`) so it can change.

## Product
One screen: the table. You sit down and play. A quiet coach teaches in layers, through repetition and plain language:
1. **Play right:** basic strategy feedback after every decision, with the *why* and the win chances.
2. **Count:** one tap on "Count?" asks for the running count, then the true count, with a short explainer. Optional quizzes and an optional on-screen count helper for beginners.
3. **Deviations:** turned on, the right play changes with the true count and the coach explains why.
4. **Bet:** bet coaching ("count is +3: this is where you raise your bet") and a real-dollar bankroll that shows how it shakes out.

## Table realism
- **Felt and seats:** portrait felt. The dealer, shoe and discard tray are at the top; 1–7 seats sit in an arc; you choose your seat and play 1 or 2 spots.
- **Fixed card spots:** cards slide from the shoe to a fixed spot and never move after landing. Split hands open to the side; nothing reflows.
- **Dealer pace:** slow, average, fast or extra fast. It sets the time per card, how long finished hands stay on the table, and the sweep.
- **Other players:** bots bet realistic chips and play basic strategy with an occasional misplay.
- **Chips and limits:** $5 / $25 / $100 / $500 chips, table limits, a persistent bankroll.
- **Rules:** decks, H17/S17, DAS, double rules, splits, surrender, 3:2 / 6:5, penetration, burn card.

## Language
No EV jargon. Feedback reads like:

> ✓ Right call. Hit 12 vs 3: you win 40%, standing wins 37%.
>
> Why: the dealer's 3 makes 17+ more often than a 4–6 does; at 12 only a ten busts you.

Money appears as "per $100 bet, on average": for example, "standing gives back $8 more per $100".

## Milestones (one PR each)
- **V2-1 Table:**
  - V1 UI retired; new brand and theme.
  - Fixed-position table with realistic dealing and timing; 1–2 spots; chips and bankroll.
  - Settings page; chart sheet.
  - Engine: multi-spot, bot bets and misplays.
- **V2-2 Coach:**
  - Feedback after every decision: right or wrong, win chances, the why.
  - Deviations toggle; insurance and bet feedback; a hands log.
- **V2-3 Count:**
  - Count check (running → true, with an explainer and a discard-tray reading).
  - Quizzes; count helper; training levels.
- **V2-4 Progress:** stats (strategy %, count %, deviations %, most-missed hands, bankroll chart); hands you miss come back more often.
- **V2-5 Ask the coach:** key-gated AI chat with the hand and stats context; PWA polish; README.
