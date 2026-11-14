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
