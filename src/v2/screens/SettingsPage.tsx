import { useState, type ReactNode } from 'react';
import { HAND_CUT, useV2, SPEEDS, tableMax, type V2Settings } from '../settings';
import { MODES } from '../modes';
import { levelSettings } from '../course/LevelUp';
import type { Level } from '../progress';
import { resetStats } from '../stats';
import { startFresh } from '../ErrorBoundary';
import { normalizeRules, type Rules } from '../../engine/rules';
import { useBankroll, money } from '../bankroll';
import { LEGAL_LINE } from '../../legal';
import { BRAND } from '../brand';
import { AI_COACH } from '../features';
import { useInstall, installLine } from '../install';
import { applyUpdateIfReady, checkForUpdate, useUpdateReady, type UpdateCheck } from '../update';

/** What each dealing speed is like. It's José's hands only: the people at the table take the time people take. */
const SPEED_WORD: Record<V2Settings['speed'], string> = {
  slow: 'A new dealer. A good pace to learn the count on.',
  average: 'A typical table.',
  fast: 'A sharp dealer. A fair test of your count.',
  xfast: 'A drill: quicker hands than you’ll usually meet. The players still take their time.',
};

/** When this copy of the app was built, in your own time. */
const BUILT = new Date(__BUILD_TIME__).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const CHECK_WORD: Record<UpdateCheck, string> = {
  ready: 'A newer version is ready.',
  downloading: 'A newer version is downloading. Give it a moment.',
  latest: 'You have the latest version.',
  unknown: 'Couldn’t check just now. Close the app fully and open it again to pick up the newest version.',
};

/** The game on the felt, in a line you'd say out loud. */
function rulesInWords(r: Rules): string {
  const decks = r.decks === 1 ? 'Single deck' : r.decks === 2 ? 'Double deck' : `${r.decks} decks`;
  return [decks, r.h17 ? 'dealer hits soft 17' : 'dealer stands on soft 17', r.bjPayout === 1.5 ? 'blackjack pays 3 to 2' : 'blackjack pays 6 to 5', r.lateSurrender ? 'surrender' : ''].filter(Boolean).join(' · ');
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}
function Tog({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className="tog" onClick={() => set(!on)} />;
}
function Row({ label, hint, children }: { label: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="row">
      <div>
        <div className="lbl">{label}</div>
        {hint && <div className="hint">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="group">
      <div className="gh">{title}</div>
      {children}
    </section>
  );
}


export function SettingsPage() {
  const { s, set } = useV2();
  const { br, reset } = useBankroll(s.startBankroll);
  /**
   * Resets ask first in a sheet of our own: the phone's built-in confirm box can fail to show in an
   * app added to the home screen (and then the reset silently never happens).
   */
  const [ask, setAsk] = useState<{ title: string; body: string; yes: string; run: () => Promise<unknown> | void; danger?: boolean } | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const flash = (k: string, msg: string) => {
    setDone((d) => ({ ...d, [k]: msg }));
    setTimeout(() => setDone((d) => ({ ...d, [k]: '' })), 3500);
  };
  const r = s.rules;
  const R = (p: Partial<Rules>) => set({ rules: normalizeRules({ ...r, ...p }) });
  const C = (p: Partial<V2Settings['coach']>) => set({ coach: { ...s.coach, ...p } });
  const level = s.progress.level;
  const inst = useInstall();
  const updateReady = useUpdateReady();
  const [checked, setChecked] = useState<UpdateCheck | 'checking' | null>(null);
  const [updating, setUpdating] = useState(false);
  return (
    <div className="frame">
      <header className="hud">
        <a className="pill" href="#/">
          ← Table
        </a>
        <span className="spacer" />
        <span className="muted" style={{ fontSize: 13 }}>
          Settings
        </span>
      </header>
      <div className="page">
        <Group title="Your level">
          <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            {MODES.map((m, i) => {
              const lv = (i + 1) as Level;
              const on = level === lv;
              return (
                <button
                  key={i}
                  type="button"
                  className={'level-pick' + (on ? ' on' : '')}
                  aria-pressed={on}
                  // picking Level 3 yourself means you know the count plays: all of them are graded
                  onClick={() => set(levelSettings(s, lv, lv === 3 ? { tier: 3 } : {}))}
                >
                  <span className="display">
                    Level {lv} · {m.title}
                  </span>
                  <span className="serif">{m.sub}</span>
                </button>
              );
            })}
          </div>
          <Row label="José moves me up" hint="When your stats show you’re ready, he offers the next level at the end of a shoe">
            <Tog on={s.progress.auto} set={(v) => set({ progress: { ...s.progress, auto: v } })} label="José moves me up" />
          </Row>
          <Row label="Your progress" hint="What the next level takes, and how close you are">
            <a className="pill" href="#/stats">
              See it
            </a>
          </Row>
        </Group>

        <Group title="José’s coaching">
          <Row label="His notes on your play" hint="After each move: every time, only when you miss, or never">
            <Seg label="José’s notes" value={s.coach.feedback} onChange={(v) => C({ feedback: v })} options={[{ v: 'always', l: 'Always' }, { v: 'mistakes', l: 'Misses' }, { v: 'off', l: 'Off' }]} />
          </Row>
          {level >= 2 && (
            <Row label="Count checks" hint="How often José asks “what’s the count?” between hands. He always asks at the end of the shoe.">
              <Seg label="Count checks" value={s.coach.countQuiz} onChange={(v) => C({ countQuiz: v })} options={[{ v: 'off', l: 'Off' }, { v: 'sometimes', l: 'Sometimes' }, { v: 'often', l: 'Often' }]} />
            </Row>
          )}
          {level < 3 && (
            <Row label="Hands you missed come back" hint={level === 1 ? 'A hand you miss is dealt again a few hands later, then further apart. José says so when he does it.' : 'Now and then, never on a good count, and José says so. At Level 3 every shoe is fully random.'}>
              <Tog on={s.coach.practiceMisses} set={(v) => C({ practiceMisses: v })} label="Hands you missed come back" />
            </Row>
          )}
        </Group>

        <Group title="The table">
          <Row label="José’s pace" hint={SPEED_WORD[s.speed]}>
            <select value={s.speed} onChange={(e) => set({ speed: e.target.value as V2Settings['speed'] })} aria-label="José’s dealing pace" style={{ background: 'transparent', border: '1px solid rgba(233,220,198,0.25)', borderRadius: 99, padding: '6px 10px' }}>
              {SPEEDS.map((x) => (
                <option key={x.id} value={x.id} style={{ background: '#18241e' }}>
                  {x.label}
                </option>
              ))}
            </select>
          </Row>
          <Row
            label="Other players"
            hint={
              s.traffic === 'off'
                ? 'A set number of players, nobody comes or goes'
                : s.traffic === 'quiet'
                  ? 'Often heads up: one or two players, more hands per shoe'
                  : s.traffic === 'normal'
                    ? 'Two to five players, coming and going like a real table'
                    : 'Four to six players: fewer hands per shoe, like a busy night'
            }
          >
            <Seg
              label="Other players"
              value={s.traffic}
              onChange={(v) => set({ traffic: v })}
              options={[
                { v: 'quiet' as const, l: 'Quiet' },
                { v: 'normal' as const, l: 'Normal' },
                { v: 'busy' as const, l: 'Busy' },
                { v: 'off' as const, l: 'Fixed' },
              ]}
            />
          </Row>
          {s.traffic === 'off' && (
            <Row label="Players" hint="Including you">
              <Seg label="Players" value={s.players} onChange={(v) => set({ players: v })} options={[1, 2, 3, 4, 5, 6].map((n) => ({ v: n, l: String(n) }))} />
            </Row>
          )}
          <Row label="Your seat" hint="1 is first base (dealt first), 6 is third base (acts last)">
            <Seg label="Your seat" value={s.seat} onChange={(v) => set({ seat: v })} options={[1, 2, 3, 4, 5, 6].map((n) => ({ v: n, l: String(n) }))} />
          </Row>
          <Row label="Hands you play">
            <Seg label="Hands" value={s.spots} onChange={(v) => set({ spots: v })} options={[{ v: 1 as const, l: 'One' }, { v: 2 as const, l: 'Two' }]} />
          </Row>
          <Row label="Table minimum" hint={`Maximum ${money(tableMax(s.tableMin))}`}>
            <Seg label="Table minimum" value={s.tableMin} onChange={(v) => set({ tableMin: v })} options={[5, 10, 25, 50, 100].map((n) => ({ v: n, l: '$' + n }))} />
          </Row>
          <Row label="Buy-in" hint={`Play money. You have ${money(br.balance)} now.`}>
            <Seg label="Buy-in" value={s.startBankroll} onChange={(v) => set({ startBankroll: v })} options={[500, 1000, 5000, 10000].map((n) => ({ v: n, l: money(n) }))} />
          </Row>
        </Group>

        <section className="group">
          <details className="rules-fold">
            <summary>
              <span className="gh-in">House rules</span>
              <span className="rules-now">{rulesInWords(r)}</span>
              <span className="rules-change">Change</span>
            </summary>
          <Row label="Decks">
            <Seg label="Decks" value={r.decks} onChange={(v) => R({ decks: v })} options={([1, 2, 6, 8] as const).map((n) => ({ v: n, l: String(n) }))} />
          </Row>
          <Row label="Soft 17">
            <Seg label="Soft 17" value={r.h17 ? 'h' : 's'} onChange={(v) => R({ h17: v === 'h' })} options={[{ v: 'h', l: 'Dealer hits' }, { v: 's', l: 'Stands' }]} />
          </Row>
          <Row label="Blackjack pays" hint={r.bjPayout === 1.5 ? undefined : 'Costs you about 1.4% on every bet. See how bad it is here; never play it for real.'}>
            <Seg label="Blackjack pays" value={r.bjPayout} onChange={(v) => R({ bjPayout: v })} options={[{ v: 1.5 as const, l: '3 to 2' }, { v: 1.2 as const, l: '6 to 5' }]} />
          </Row>
          <Row label="Double after split">
            <Tog on={r.das} set={(v) => R({ das: v })} label="Double after split" />
          </Row>
          <Row label="Double on">
            <Seg label="Double on" value={r.doubleOn} onChange={(v) => R({ doubleOn: v })} options={[{ v: 'any', l: 'Any 2' }, { v: '9-11', l: '9–11' }, { v: '10-11', l: '10–11' }]} />
          </Row>
          <Row label="Split up to" hint="Hands from one pair">
            <Seg label="Split up to" value={r.maxSplitHands} onChange={(v) => R({ maxSplitHands: v })} options={[2, 3, 4].map((n) => ({ v: n, l: String(n) }))} />
          </Row>
          <Row label="Resplit aces">
            <Tog on={r.resplitAces} set={(v) => R({ resplitAces: v })} label="Resplit aces" />
          </Row>
          <Row label="Surrender" hint="Give up half your bet after the dealer checks for blackjack">
            <Tog on={r.lateSurrender} set={(v) => R({ lateSurrender: v })} label="Surrender" />
          </Row>
          <Row label="How deep the cut card goes" hint={`${r.cutSpread ? 'About' : 'Exactly'} ${Math.round(r.penetration * 100)}% of the shoe is dealt before the shuffle. Deeper is better for you.`}>
            <input type="range" min={50} max={90} step={5} value={Math.round(r.penetration * 100)} onChange={(e) => R({ penetration: Number(e.target.value) / 100 })} aria-label="How deep the cut card goes" />
          </Row>
          <Row
            label="Shuffle"
            hint={
              s.shuffle === 'hand'
                ? 'José shuffles by hand: the next shoe is built from where the last one ended'
                : 'A shuffle machine between shoes (not a continuous shuffler): a perfect shuffle, then the shoe is dealt to the cut card'
            }
          >
            <Seg
              label="Shuffle"
              value={s.shuffle}
              onChange={(v) => set({ shuffle: v })}
              options={[
                { v: 'hand' as const, l: 'By hand' },
                { v: 'machine' as const, l: 'Machine' },
              ]}
            />
          </Row>
          <Row label="Cut card placed" hint={r.cutSpread ? 'Placed by hand: a little deeper or shallower each shoe' : 'Same spot every shoe, like a notched tray'}>
            <Seg label="Cut card placed" value={r.cutSpread ? 'hand' : 'fixed'} onChange={(v) => R({ cutSpread: v === 'hand' ? HAND_CUT : 0 })} options={[{ v: 'hand', l: 'By hand' }, { v: 'fixed', l: 'Fixed' }]} />
          </Row>
          </details>
        </section>

        {inst.how !== 'installed' && inst.how !== 'none' && (
          <Group title="Keep it on your phone">
            <Row label="Add to your home screen" hint={installLine(inst.how) ?? undefined}>
              {inst.how === 'prompt' && (
                <button className="pill" onClick={() => void inst.install()}>
                  Install
                </button>
              )}
            </Row>
          </Group>
        )}

        <Group title="Before you play for real">
          <Row label="Plan a session" hint="Tell José the game and how you’ll play it: what it’s worth and how a session goes">
            <a className="pill" href="#/plan">
              Plan
            </a>
          </Row>
          <Row label="Do’s and don’ts" hint="Never 6 to 5, never a continuous shuffler, read the cut, strike and go">
            <a className="pill" href="#/real">
              Read
            </a>
          </Row>
        </Group>

        <Group title="This copy of the app">
          <Row
            label={`Version ${__APP_VERSION__}`}
            hint={`Built ${BUILT}. ${updateReady ? CHECK_WORD.ready + ' Updating reloads the app; a hand in play is dropped.' : checked === 'checking' ? 'Checking…' : checked ? CHECK_WORD[checked] : 'New versions go in by themselves when you open the app.'}`}
          >
            {updateReady || updating ? (
              <button
                className="pill mustard"
                disabled={updating}
                onClick={() => {
                  setUpdating(true);
                  applyUpdateIfReady();
                }}
              >
                {updating ? 'Updating…' : 'Update now'}
              </button>
            ) : (
              <button
                className="pill"
                disabled={checked === 'checking'}
                onClick={async () => {
                  setChecked('checking');
                  setChecked(await checkForUpdate());
                }}
              >
                Check
              </button>
            )}
          </Row>
        </Group>

        <Group title="Start over">
          <Row label="How it works" hint="José's intro, from the top">
            <a className="pill" href="#/home">
              Show me
            </a>
          </Row>
          <Row label="Reset bankroll" hint={done.bankroll || `${money(br.balance)} now, ${br.hands} hands played. Back to ${money(s.startBankroll)} of play money.`}>
            <button
              className="pill"
              onClick={() =>
                setAsk({
                  title: 'Reset bankroll?',
                  body: `Your bankroll goes back to ${money(s.startBankroll)} of play money.`,
                  yes: 'Reset bankroll',
                  run: async () => {
                    await reset(s.startBankroll);
                    flash('bankroll', `Done: ${money(s.startBankroll)}`);
                  },
                })
              }
            >
              Reset
            </button>
          </Row>
          <Row label="Reset stats" hint={done.stats || 'Your record and missed hands'}>
            <button
              className="pill"
              onClick={() =>
                setAsk({
                  title: 'Reset stats?',
                  body: 'Your record, count checks and missed hands are cleared. This can’t be undone.',
                  yes: 'Reset stats',
                  run: async () => {
                    await resetStats();
                    flash('stats', 'Done: stats cleared');
                  },
                })
              }
            >
              Reset
            </button>
          </Row>
          <Row label="Start fresh" hint="Like opening the link for the first time">
            <button
              className="pill coral"
              onClick={() =>
                setAsk({
                  title: 'Start fresh?',
                  body: 'Your settings, bankroll and stats on this device are erased, and the app opens like the first time.',
                  yes: 'Start fresh',
                  danger: true,
                  run: () => startFresh(),
                })
              }
            >
              Start fresh
            </button>
          </Row>
        </Group>

        {AI_COACH && (
          <Group title="Ask the coach (AI)">
            <Row label="Claude API key" hint={s.apiKey ? 'Saved on this device only' : 'Unlocks the coach chat'}>
              {s.apiKey ? (
                <button className="pill" onClick={() => set({ apiKey: undefined })}>
                  Remove key
                </button>
              ) : (
                <a className="pill" href="#/coach">
                  Add key
                </a>
              )}
            </Row>
          </Group>
        )}

        <p className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
          {BRAND.long} · practice only, play money. Everything you do stays on this device. {LEGAL_LINE}
        </p>
      </div>
      {ask && (
        <div className="sheet-back" onClick={() => setAsk(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={ask.title}>
            <span className="display" style={{ fontSize: 28 }}>
              {ask.title}
            </span>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{ask.body}</p>
            <button
              className={'act ' + (ask.danger ? 'hit' : 'stand')}
              onClick={async () => {
                const a = ask;
                setAsk(null);
                await a.run();
              }}
            >
              {ask.yes}
            </button>
            <button className="act" onClick={() => setAsk(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
