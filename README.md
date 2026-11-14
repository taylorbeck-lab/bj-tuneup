# Tune-Up

Blackjack advantage-play **training and analysis** app: deviations, counting speed and accuracy, and an honest, math-backed rating of how good your *feel* is when you play beyond the chart.

> Training and analysis only: using any device to count cards or calculate odds at a casino game is illegal in Nevada and many other jurisdictions, so never use this app while gambling.

## Run it

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
The app is then at `https://<owner>.github.io/bj-tuneup/` and can be installed to the home screen (PWA, works offline).

## Privacy

Everything stays on the device in IndexedDB. No accounts, backend, analytics or tracking.
