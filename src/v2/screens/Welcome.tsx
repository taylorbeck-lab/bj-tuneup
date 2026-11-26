import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useV2, tableMax, type V2Settings } from '../settings';
import { levelSettings } from '../course/LevelUp';
import { LEVEL_NAME, nextStep } from '../progress';
import { loadStats, handsPlayed, type V2Stats } from '../stats';
import { BRAND } from '../brand';
import { money } from '../bankroll';
import { LEGAL_LINE } from '../../legal';
import { useInstall, installLine } from '../install';

/**
 * The front door. First time: José says hello and tells you how it works in three short cards (the
 * secret, the three levels, where everyone starts); the detail of each level is taught at the table
 * when you get there. After that, the door is one screen: welcome back, where you stand, deal me in.
 * `tour` shows the cards again (Settings → How it works, or the logo on the felt).
 */
export function Welcome({ onEnter, tour = false }: { onEnter: () => void; tour?: boolean }) {
  const { s, set } = useV2();
  const deck = s.rules.decks === 1 ? 'single deck' : s.rules.decks === 2 ? 'double deck' : `${s.rules.decks} decks`;
  const returning = s.onboarded;
  const [i, setI] = useState(0);
  const [apOpen, setApOpen] = useState(false);
  const [showTour, setShowTour] = useState(tour);
  const inst = useInstall();
  const enter = (patch: Partial<V2Settings> = {}) => {
    set({ onboarded: true, ...patch });
    onEnter();
  };
  const [stats, setStats] = useState<V2Stats | null>(null);
  useEffect(() => {
    if (returning) void loadStats().then(setStats);
  }, [returning]);
  const portrait = <img className="intro-jose" src={`${import.meta.env.BASE_URL}brand/jose-portrait.jpg`} alt="José, your dealer" />;
  const install = inst.how !== 'installed' && inst.how !== 'none' && (
    <p className="intro-install">
      <b>Keep it on your phone.</b>{' '}
      {inst.how === 'prompt' ? (
        <button className="intro-install-btn" onClick={() => void inst.install()}>
          Add to home screen
        </button>
      ) : (
        installLine(inst.how)
      )}
    </p>
  );

  // welcome back: one screen
  if (returning && !showTour) {
    const step = stats ? nextStep(stats, s.progress) : null;
    const open = step?.checks.find((c) => !c.ok);
    const hands = stats ? handsPlayed(stats) : 0;
    return (
      <div className="frame intro-frame">
        <div className="page intro door">
          <img src={`${import.meta.env.BASE_URL}brand/el-primo-logo-cream.png`} alt={BRAND.long} className="intro-logo small" />
          {portrait}
          <h1 className="intro-h">Welcome back, primo</h1>
          <p className="intro-p">
            <b>
              Level {s.progress.level} · {LEVEL_NAME[s.progress.level]}
            </b>
            {hands > 0 ? ` · ${hands.toLocaleString()} hands played` : ''}
            {step && (
              <>
                <br />
                {step.ready ? `${step.title}. You’re ready: I’ll offer it at the end of a shoe.` : open ? `${step.title}. ${open.label}: ${open.have}, need ${open.need}.` : null}
              </>
            )}
          </p>
          <span className="door-gap" />
          {install}
          <button className="act stand" onClick={() => enter()}>
            Deal me in
          </button>
          <button className="intro-skip door-how" onClick={() => setShowTour(true)}>
            How it works ›
          </button>
        </div>
      </div>
    );
  }

  const cards: { key: string; body: ReactNode }[] = [
    {
      key: 'secret',
      body: (
        <>
          <img src={`${import.meta.env.BASE_URL}brand/el-primo-logo-cream.png`} alt={BRAND.long} className="intro-logo small" />
          {portrait}
          <Jose>Hey primo. I’m going to let you in on a little secret, the one they don’t want you to know: you can beat blackjack.</Jose>
          <p className="intro-p">
            This is a real table: {deck}, {money(s.tableMin)} to {money(tableMax(s.tableMin))}, play money. I deal, you play, and I tell you how every move went.
          </p>
        </>
      ),
    },
    {
      key: 'levels',
      body: (
        <>
          <h1 className="intro-h">Three levels. I move you up.</h1>
          <ol className="intro-levels">
            <li>
              <b>Play every hand right</b>
              <span>Every hand has one right play; computers solved the game years ago. Learn them and the house edge shrinks to about half a percent.</span>
            </li>
            <li>
              <b>Count, and bet with it</b>
              <span>Keep one number in your head as the cards come out. When it runs up, the cards left are on your side: that’s when you bet more.</span>
            </li>
            <li>
              <b>Bend the rules</b>
              <span>At the right count a few plays change. Some are quiet. Some get the pit boss walking over.</span>
            </li>
          </ol>
          <Jose>Don’t memorise any of that now. I’ll teach each one at the table when you get there.</Jose>
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
              <Jose>Everybody starts with the hands, even people who say they know them. When your play shows you’re ready, I’ll move you up.</Jose>
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
                  <b>Everything from the first hand.</b> You already count Hi-Lo, size your bets by the true count and know the count plays. Every hand is graded against the
                  count, every bet against your edge, and I’ll ask your count at the end of every shoe. Tap the discard tray any time to be tested, or to ask me the count.
                </p>
                <button className="act hit intro-choice" onClick={() => enter(levelSettings(s, 3, { tier: 3, auto: true }))}>
                  <span className="display" style={{ fontSize: 19 }}>
                    That’s me: unlock it all
                  </span>
                </button>
              </div>
            ) : (
              <button className="intro-skip intro-ap-link" onClick={() => setApOpen(true)}>
                I already count cards ›
              </button>
            ))}
          <ul className="muted tips">
            <li>
              <b>Tap what José says</b> about your play for the why and the odds.
            </li>
            <li>
              <b>The charts</b>, your stats and the settings are down by your chips.
            </li>
          </ul>
          {install}
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
          <span />
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
