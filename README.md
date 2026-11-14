# Tune-Up

Blackjack advantage-play **training and analysis** app: deviations, counting speed and accuracy, and an honest, math-backed rating of how good your *feel* is when you play beyond the chart.

> Training and analysis only: using any device to count cards or calculate odds at a casino game is illegal in Nevada and many other jurisdictions, so never use this app while gambling.

**App:** https://taylorbeck-lab.github.io/bj-tuneup/ (install it with *Add to Home Screen*; it works offline).

## What's in it
- **Tune-Up** — one button, about 15 minutes, ending in a READY / NOT READY verdict:
  1. deck countdown
  2. running count at speed
  3. true count with a discard tray
  4. deviations
  5. a short table session with betting
- **Drills:**
  - countdown and running count
  - discard estimation and true count
  - basic strategy flash and deviations flash (both weighted to your misses)
  - bet sizing
  - ace side count and key cards
- **Table sim:** 1–6 seats, adjustable dealer speed, with the coach off or whispering. Every decision is scored with exact EV.
- **Strategy:** exact basic strategy generated for your rules. You can edit any cell and import/export JSON or CSV.
- **Stats:** trends, history and spaced repetition.

## Run it locally

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes `dist/` to Pages.
**One setting to turn on:** repository *Settings → Pages → Build and deployment → Source: **GitHub Actions***.

## Privacy

Everything stays on the device in IndexedDB. No accounts, backend, analytics or tracking.
