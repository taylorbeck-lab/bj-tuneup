# Progress

## Status
- **M1 — scaffold, design system, rules + presets, research, CI/Pages:** done, merged (PR #1).
- **M2 — shoe, counting, basic strategy generator + chart editor:** done (PR open).
  - Engine matches Wizard of Odds: dealer outcome tables (1/2/6/8D, S17/H17), composition-dependent stand/hit/double EVs (6 decimals), split EVs (±0.001), optimal house edge for 9 rule sets (±0.01%).
  - Generator reproduces the published 2D H17 DAS, 2D S17 DAS, 6D H17 DAS LS, 6D S17 DAS LS charts cell for cell.
  - Chart editor at `#/strategy`: override any cell, import/export JSON/CSV, CD exceptions.

## Next
- M3: drills (countdown, running count, discard estimation, true count, BS flash, deviations flash, bet ramp).

## Open questions
- Network allowlist blocks Blackjack Apprenticeship, reddit and Jacobson's blog; research used Wizard of Odds + general knowledge (see docs/research.md).
