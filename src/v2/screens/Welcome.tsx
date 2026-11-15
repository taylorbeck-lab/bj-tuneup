import { useV2, tableMax } from '../settings';
import { BRAND } from '../brand';
import { MODES, modeMatches } from '../modes';
import { money } from '../bankroll';
import { LEGAL_LINE } from '../../legal';

/**
 * The front door, shown each time the app opens and any time from the emblem in the top bar: what
 * this is, for a complete newbie, in three short beats, then pick where to play. One tap deals you in.
 */
export function Welcome({ onEnter }: { onEnter: () => void }) {
  const { s, set } = useV2();
  const deck = s.rules.decks === 1 ? 'single deck' : s.rules.decks === 2 ? 'double deck' : `${s.rules.decks} decks`;
  const returning = s.onboarded;
  const enter = (coach?: Partial<typeof s.coach>) => {
    set({ onboarded: true, ...(coach ? { coach: { ...s.coach, ...coach } } : {}) });
    onEnter();
  };
  return (
    <div className="frame">
      <div className="page" style={{ gap: 18, paddingTop: 22 }}>
        {returning && (
          <button className="act stand" onClick={() => enter()}>
            Deal me in
          </button>
        )}
        <img src={`${import.meta.env.BASE_URL}brand/el-primo-logo-cream.png`} alt={BRAND.long} style={{ width: '72%', maxWidth: 300, alignSelf: 'center' }} />
        <div className="jose">
          <span className="jose-name">José · your dealer</span>
          <p>
            Sit down, primo. Real game: {deck}, {money(s.tableMin)} to {money(tableMax(s.tableMin))}, play money. Here's the whole secret, then we play.
          </p>
        </div>

        <ol className="beats">
          <li>
            <b>Blackjack is a solved game.</b> Every hand has one right play, worked out by the math. That's what the <a href="#/chart">charts</a> show, and what I'll
            check after every decision.
          </li>
          <li>
            <b>Counting cards is easy.</b> 2–6 count up one, 7–9 nothing, 10s and aces down one. Divide by the decks left and you have the true count.{' '}
            <em>There you go: now you know how to count cards.</em> Knowing isn't the hard part. Staying sharp at speed, through the noise of a real table, is. That's
            what this table is for.
          </li>
          <li>
            <b>Then you use it.</b> When the count runs up, a few plays change, and above all you raise your bet, so you win more when the odds are on your side.
          </li>
        </ol>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="label" style={{ color: 'var(--on-dark-soft)' }}>
            {returning ? 'Play in' : 'Where do you want to start?'}
          </span>
          {MODES.map((m, i) => {
            const on = returning ? modeMatches(s.coach, m.coach) : i === 0;
            return (
              <button key={m.title} className={'act ' + (on ? 'stand' : 'quiet')} style={{ textAlign: 'left', padding: '9px 14px', minHeight: 0 }} onClick={() => enter(m.coach)}>
                <span className="display" style={{ fontSize: 19 }}>
                  {m.title}
                </span>{' '}
                <span className="serif" style={{ fontSize: 16, textTransform: 'none' }}>
                  {m.sub}
                </span>
              </button>
            );
          })}
        </div>
        <ul className="muted tips">
          <li>
            <b>Tap the discard tray</b> to test your count, or just ask José.
          </li>
          <li>
            <b>Tap the shoe</b> to have him shuffle up (count back to zero).
          </li>
          <li>
            <b>Red card?</b> Read it, then swipe it away. Tap any card for the full why.
          </li>
          <li>
            <b>The emblem</b> brings you back here. <b>⚙</b> decks, rules, seats, speed · <b>▦</b> charts · <b>★</b> your stats.
          </li>
        </ul>
        <p className="muted" style={{ fontSize: 11, lineHeight: 1.45, margin: 0 }}>
          {LEGAL_LINE}
        </p>
      </div>
    </div>
  );
}
