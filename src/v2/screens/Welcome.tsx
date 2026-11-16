import { useRef, useState, type ReactNode } from 'react';
import { useV2, tableMax, type V2Settings } from '../settings';
import { levelSettings } from '../course/LevelUp';
import { LEVEL_NAME } from '../progress';
import { BRAND } from '../brand';
import { MODES } from '../modes';
import { money } from '../bankroll';
import { LEGAL_LINE } from '../../legal';

/**
 * The front door, shown each time the app opens and any time from the logo on the felt. José lets
 * you in on the secret in a few short cards, in the same order as the three modes you'll play:
 * the right play for every hand (Basic strategy), the count and betting with it (Count & bet), then
 * the plays that change with the count (Full AP). The last card picks where to start. You're taught
 * how it works in a couple of minutes, before the first hand.
 */
export function Welcome({ onEnter }: { onEnter: () => void }) {
  const { s, set } = useV2();
  const deck = s.rules.decks === 1 ? 'single deck' : s.rules.decks === 2 ? 'double deck' : `${s.rules.decks} decks`;
  const returning = s.onboarded;
  const [i, setI] = useState(0);
  const [apOpen, setApOpen] = useState(false);
  const enter = (patch: Partial<V2Settings> = {}) => {
    set({ onboarded: true, ...patch });
    onEnter();
  };

  const cards: { key: string; level?: string; body: ReactNode }[] = [
    {
      key: 'secret',
      body: (
        <>
          <img src={`${import.meta.env.BASE_URL}brand/el-primo-logo-cream.png`} alt={BRAND.long} className="intro-logo" />
          <h1 className="intro-h">Welcome to Casino El Primo</h1>
          <Jose>Hey primo. I’m going to let you in on a little secret, the one they don’t want you to know: you can beat blackjack.</Jose>
          <p className="intro-p">
            A real game: {deck}, {money(s.tableMin)} to {money(tableMax(s.tableMin))}, play money. A couple of minutes on how it works, then we play.
          </p>
        </>
      ),
    },
    {
      key: 'solved',
      level: `Level 1 · ${MODES[0].title}`,
      body: (
        <>
          <h1 className="intro-h">It’s a solved game</h1>
          <Jose>Every hand has one right play. Computers worked them all out years ago.</Jose>
          <p className="intro-p">
            When to hit, stand, double or split, against every card the dealer shows. Play every hand right and the casino’s edge shrinks to about half a percent. Learn this
            first: it’s the base everything else stands on.
          </p>
          <p className="intro-p">
            The <a href="#/chart">charts</a> are one tap away, and José tells you how each move went, right after you make it.
          </p>
        </>
      ),
    },
    {
      key: 'count',
      level: `Level 2 · ${MODES[1].title}`,
      body: (
        <>
          <h1 className="intro-h">¿Qué más? Counting is easier than you think</h1>
          <div className="hilo" role="table" aria-label="The Hi-Lo count">
            <div role="row" className="hilo-col up">
              <b role="cell">Up 1</b>
              <span role="cell">2 3 4 5 6</span>
            </div>
            <div role="row" className="hilo-col even">
              <b role="cell">Nothing</b>
              <span role="cell">7 8 9</span>
            </div>
            <div role="row" className="hilo-col down">
              <b role="cell">Down 1</b>
              <span role="cell">10 J Q K A</span>
            </div>
          </div>
          <p className="intro-p">
            See a low card, 2 through 6: the count goes <b>up one</b>. A ten or an ace: <b>down one</b>. 7, 8 and 9 don’t count.
          </p>
          <p className="intro-p">
            As the cards come out, scan them, then look for pairs: a high card and a low card cancel out. Add up what’s left and keep one number in your head, up or down.
          </p>
          <Jose>I’ll help you, and now and then I’ll test you.</Jose>
          <p className="intro-credit">This is the Hi-Lo count, first published by Harvey Dubner in 1963 and made famous by Stanford Wong. It’s what most pros use.</p>
        </>
      ),
    },
    {
      key: 'bet',
      level: `Level 2 · ${MODES[1].title}`,
      body: (
        <>
          <h1 className="intro-h">Then bet with it</h1>
          <Jose>When the count runs up, the cards left are on your side. That’s when you bet more.</Jose>
          <p className="intro-p">
            A count that’s up means more tens and aces still to come: more blackjacks, better doubles, more dealer busts. Bet small when it’s down, raise your bet when it’s up.
            That’s where most of a counter’s edge comes from.
          </p>
          <p className="intro-p">
            One step: divide the count by the decks left in the shoe (look at the discard tray). That’s the <b>true count</b>, the one you bet on.
          </p>
        </>
      ),
    },
    {
      key: 'plays',
      level: `Level 3 · ${MODES[2].title}`,
      body: (
        <>
          <h1 className="intro-h">Last, bend the rules</h1>
          <Jose>At the right count, a few plays change. Some are quiet. Some get you noticed.</Jose>
          <p className="intro-p">
            Stand on 16 against a 10 when the count is up. Take insurance when it’s high. Nobody looks twice at the quiet ones; splitting tens on a big bet gets the pit boss
            walking over. Pick your spots, primo.
          </p>
        </>
      ),
    },
    {
      key: 'start',
      body: (
        <>
          <h1 className="intro-h">{returning ? 'Back to the table' : 'Where everyone starts'}</h1>
          {returning ? (
            <button className="act stand intro-choice" onClick={() => enter()}>
              <span className="display" style={{ fontSize: 19 }}>
                Keep playing
              </span>{' '}
              <span className="serif" style={{ fontSize: 16, textTransform: 'none' }}>
                Level {s.progress.level} · {LEVEL_NAME[s.progress.level]}
              </span>
            </button>
          ) : (
            <>
              <Jose>Everybody starts with the hands, even people who say they know them. When your play shows you’re ready, I’ll move you up: counting, then the count plays.</Jose>
              <button className="act stand intro-choice" onClick={() => enter(levelSettings(s, 1, { tier: 1, auto: true, askAfter: 0 }))}>
                <span className="display" style={{ fontSize: 19 }}>
                  Start at the beginning
                </span>{' '}
                <span className="serif" style={{ fontSize: 16, textTransform: 'none' }}>
                  Level 1 · Basic strategy
                </span>
              </button>
            </>
          )}
          {s.progress.level < 3 &&
            (apOpen ? (
              <div className="intro-ap">
                <p className="intro-p">
                  <b>Full AP from the first hand.</b> You already count Hi-Lo, size your bets by the true count and know the count plays. Every hand is graded against the
                  count, every bet against your edge, and I’ll check your count at every shoe.
                </p>
                <button className="act hit intro-choice" onClick={() => enter(levelSettings(s, 3, { tier: 3, auto: true }))}>
                  <span className="display" style={{ fontSize: 19 }}>
                    That’s me: unlock it all
                  </span>
                </button>
              </div>
            ) : (
              <button className="intro-skip intro-ap-link" onClick={() => setApOpen(true)}>
                I’m already an advantage player ›
              </button>
            ))}
          <ul className="muted tips">
            <li>
              <b>Tap the discard tray</b> to be tested on the count, or just ask José.
            </li>
            <li>
              <b>Tap the shoe</b> and he shuffles (count back to zero).
            </li>
            <li>
              <b>Tap José’s note</b> for the full why on any move.
            </li>
            <li>
              <b>Tap the logo</b> on the table to come back here. Down by your chips: <b>★</b> stats and your progress · <b>▦</b> charts · <b>⚙</b> settings.
            </li>
          </ul>
          <p className="muted" style={{ fontSize: 11, lineHeight: 1.45, margin: 0 }}>
            {LEGAL_LINE}
          </p>
        </>
      ),
    },
  ];

  const last = cards.length - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(last, n)));
  // swipe between cards
  const x0 = useRef<number | null>(null);
  const card = cards[i];

  return (
    <div className="frame intro-frame">
      <div
        className="page intro"
        onPointerDown={(e) => (x0.current = e.clientX)}
        onPointerUp={(e) => {
          if (x0.current === null) return;
          const dx = e.clientX - x0.current;
          x0.current = null;
          if (Math.abs(dx) > 60) go(i + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="intro-top">
          {card.level ? <span className="intro-level">{card.level}</span> : <span />}
          {returning && i < last ? (
            <button className="pill" onClick={() => enter()}>
              Deal me in
            </button>
          ) : i < last ? (
            <button className="intro-skip" onClick={() => go(last)}>
              Skip ›
            </button>
          ) : null}
        </div>
        <div className="intro-card" key={card.key}>
          {card.body}
        </div>
        <div className="intro-nav">
          <button className="intro-back" onClick={() => go(i - 1)} disabled={i === 0}>
            ‹ Back
          </button>
          <div className="intro-dots" aria-label={`Card ${i + 1} of ${cards.length}`}>
            {cards.map((c, k) => (
              <button key={c.key} className={k === i ? 'on' : ''} onClick={() => go(k)} aria-label={`Card ${k + 1}`} />
            ))}
          </div>
          {i < last ? (
            <button className="act stand" onClick={() => go(i + 1)}>
              Next ›
            </button>
          ) : (
            <span className="intro-nav-gap" />
          )}
        </div>
      </div>
    </div>
  );
}

function Jose({ children }: { children: ReactNode }) {
  return (
    <div className="jose">
      <span className="jose-name">José · your dealer</span>
      <p>{children}</p>
    </div>
  );
}
