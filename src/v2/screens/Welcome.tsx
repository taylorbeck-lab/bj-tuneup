import { useV2, tableMax } from '../settings';
import { BRAND } from '../brand';
import { MODES } from '../modes';
import { money } from '../bankroll';
import { LEGAL_LINE } from '../../legal';

/** First visit: José says hello, you pick where to start, and the table's few tricks in one list. */
export function Welcome() {
  const { s, set } = useV2();
  const deck = s.rules.decks === 1 ? 'single deck' : s.rules.decks === 2 ? 'double deck' : `${s.rules.decks} decks`;
  return (
    <div className="frame" style={{ justifyContent: 'center' }}>
      <div className="page" style={{ gap: 18, paddingTop: 28 }}>
        <img src={`${import.meta.env.BASE_URL}brand/el-primo-logo-cream.png`} alt={BRAND.long} style={{ width: '78%', maxWidth: 320, alignSelf: 'center' }} />
        <div className="jose">
          <span className="jose-name">José · your dealer</span>
          <p>
            Sit down, primo. It's a real game: {deck}, {money(s.tableMin)} to {money(tableMax(s.tableMin))}, play money. After every hand I'll tell you if you played it right. Learn it
            with me, then learn to play without me.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="label" style={{ color: 'var(--on-dark-soft)' }}>
            Where do you want to start?
          </span>
          {MODES.map((m, i) => (
            <button
              key={m.title}
              className={'act ' + (i === 0 ? 'stand' : 'quiet')}
              style={{ textAlign: 'left', padding: '9px 14px', minHeight: 0 }}
              onClick={() => set({ onboarded: true, coach: { ...s.coach, ...m.coach } })}
            >
              <span className="display" style={{ fontSize: 19 }}>
                {m.title}
              </span>{' '}
              <span className="serif" style={{ fontSize: 16, textTransform: 'none' }}>
                {m.sub}
              </span>
            </button>
          ))}
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
            <b>⚙</b> for decks, rules, seats and speed. <b>▦</b> for the charts, <b>★</b> for your stats.
          </li>
        </ul>
        <p className="muted" style={{ fontSize: 11, lineHeight: 1.45, margin: 0 }}>
          {LEGAL_LINE}
        </p>
      </div>
    </div>
  );
}
