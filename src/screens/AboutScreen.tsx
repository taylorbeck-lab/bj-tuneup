import { TopBar, Box } from '../ui/components';
import { LEGAL_LINE } from '../legal';

const Item = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <div className="stack" style={{ gap: 'var(--s1)' }}>
    <span style={{ fontWeight: 600 }}>{t}</span>
    <span className="muted" style={{ fontSize: 'var(--t-sm)' }}>
      {children}
    </span>
  </div>
);

export function AboutScreen() {
  return (
    <>
      <TopBar title="About" />
      <main className="stack">
        <h2 className="h2">Tune-Up</h2>
        <p>
          A practice and analysis tool for card counters: counting speed and accuracy, deviations, and an honest, math-backed measure of how good your feel is
          when you play beyond the chart.
        </p>
        <p className="legal" role="note" style={{ fontSize: 'var(--t-sm)', color: 'var(--fg)' }}>
          {LEGAL_LINE}
        </p>
        <Box title="How scores are computed">
          <div className="stack">
            <Item t="Exact EV">
              Every decision is valued with a combinatorial analyzer from the exact cards still unseen (remaining shoe, burn card, dealer's hole card). Dealer
              outcomes and your draws are conditioned on the dealer not having blackjack (US peek). Splits use the standard approximation (count the pair cards
              already split, ignore other hands' cards). Validated against Wizard of Odds tables.
            </Item>
            <Item t="Errors and EV lost">
              An error is a play that differs from your strategy: your chart plus your index plays at the true count you should have had. EV lost = the exact EV of
              that play minus the EV of yours, times the bet. "Vs exact best" is measured against the composition-perfect play.
            </Item>
            <Item t="READY / NOT READY">
              READY when every target in Settings is met in the Tune-Up: countdown speed and correctness, overall accuracy, and EV lost per 100 hands at the table.
            </Item>
            <Item t="Feel rating">
              Over your decisions with bet b: C = Σ b·(EV chosen − EV chart), O = Σ b·max(0, EV best − EV chart). Feel = clamp(50 + 50·C / max(O, 0.5% of Σ b), 0, 100).
              50 means you played the chart; 100 means you captured every composition gain; below 50 your departures cost more than they won.
            </Item>
            <Item t="Indices">
              Generated for your rules: exact EVs on representative shoes at three depths, at the true count you actually see (your cards and the upcard
              included), crossing rounded to the nearest integer. The Illustrious 18 and Fab 4 are shown as reference.
            </Item>
            <Item t="Edge and Kelly">
              Effects of removal computed exactly for your rules, corrected for shoe depth and calibrated against exact EVs; verified by simulation. Kelly bet =
              bankroll × edge / 1.33.
            </Item>
            <Item t="Goal probability">
              Exact outcome distributions per action, with the rest of the hand played to maximise the chance of reaching your target, and a dynamic program over
              bankroll and hands left.
            </Item>
            <Item t="Side bets">Exact from the unseen cards by rank and suit; checked against brute-force enumeration and published values.</Item>
          </div>
        </Box>
        <p className="muted">All data stays on this device (IndexedDB). No accounts, no backend, no analytics. Works offline once installed.</p>
        <p className="mono muted" style={{ fontSize: 'var(--t-xs)' }}>
          v{__APP_VERSION__}
        </p>
      </main>
    </>
  );
}
