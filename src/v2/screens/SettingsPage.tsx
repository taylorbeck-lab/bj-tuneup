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
              const level = (i + 1) as Level;
              const on = s.progress.level === level;
              return (
                <button
                  key={i}
                  className={'act' + (on ? ' stand' : ' quiet')}
                  style={{ textAlign: 'left', padding: '8px 12px', minHeight: 0 }}
                  aria-pressed={on}
                  // picking Level 3 yourself means you know the count plays: all of them are graded
                  onClick={() => set(levelSettings(s, level, level === 3 ? { tier: 3 } : {}))}
                >
                  <span className="display" style={{ fontSize: 18 }}>
                    Level {level} · {m.title}
                  </span>{' '}
                  <span className="serif" style={{ fontSize: 17, textTransform: 'none' }}>
                    {m.sub}
                  </span>
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

        <Group title="Fine-tune">
          <Row label="Coach" hint="Feedback after your decisions">
            <Seg label="Coach" value={s.coach.feedback} onChange={(v) => C({ feedback: v })} options={[{ v: 'always', l: 'Always' }, { v: 'mistakes', l: 'Mistakes' }, { v: 'off', l: 'Off' }]} />
          </Row>
          <Row label="Deviations" hint="The right play changes with the count">
            <Tog on={s.coach.deviations} set={(v) => C({ deviations: v })} label="Deviations" />
          </Row>
          <Row label="Show the count" hint="Training wheels: the count on the table (tap the discard tray any time to be tested or to ask)">
            <Tog on={s.coach.showCount} set={(v) => C({ showCount: v })} label="Show the count" />
          </Row>
          <Row label="Count quizzes" hint="José asks “what's the count?”">
            <Seg label="Count quizzes" value={s.coach.countQuiz} onChange={(v) => C({ countQuiz: v })} options={[{ v: 'off', l: 'Off' }, { v: 'sometimes', l: 'Sometimes' }, { v: 'often', l: 'Often' }]} />
          </Row>
          <Row label="Practice my misses" hint="A hand you miss comes back a few hands later, then about 30, then about 100. Often at Level 1, now and then at Level 2, never at Level 3 (a fully random shoe).">
            <Tog on={s.coach.practiceMisses} set={(v) => C({ practiceMisses: v })} label="Practice my misses" />
          </Row>
          <Row label="Bet coach" hint="Raise and lower your bet with the count">
            <Tog on={s.coach.betCoach} set={(v) => C({ betCoach: v })} label="Bet coach" />
          </Row>
        </Group>

        <Group title="Table">
          <Row label="José’s pace">
            <select value={s.speed} onChange={(e) => set({ speed: e.target.value as V2Settings['speed'] })} aria-label="José’s dealing pace" style={{ background: 'transparent', border: '1px solid rgba(233,220,198,0.25)', borderRadius: 99, padding: '6px 10px' }}>
              {SPEEDS.map((x) => (
                <option key={x.id} value={x.id} style={{ background: '#18241e' }}>
                  {x.label}
                </option>
              ))}
            </select>
          </Row>
          <Row
            label="Table"
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
              label="Table"
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
          <Row label="Your seat" hint="1 = first base (dealt first) · 6 = third base">
            <Seg label="Your seat" value={s.seat} onChange={(v) => set({ seat: v })} options={[1, 2, 3, 4, 5, 6].map((n) => ({ v: n, l: String(n) }))} />
          </Row>
          <Row label="Hands you play">
            <Seg label="Hands" value={s.spots} onChange={(v) => set({ spots: v })} options={[{ v: 1 as const, l: 'One' }, { v: 2 as const, l: 'Two' }]} />
          </Row>
        </Group>

        <Group title="Rules">
          <Row label="Decks">
            <Seg label="Decks" value={r.decks} onChange={(v) => R({ decks: v })} options={([1, 2, 6, 8] as const).map((n) => ({ v: n, l: String(n) }))} />
          </Row>
          <Row label="Soft 17">
            <Seg label="Soft 17" value={r.h17 ? 'h' : 's'} onChange={(v) => R({ h17: v === 'h' })} options={[{ v: 'h', l: 'Dealer hits' }, { v: 's', l: 'Stands' }]} />
          </Row>
          <Row label="Blackjack pays">
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
          <Row label="Late surrender">
            <Tog on={r.lateSurrender} set={(v) => R({ lateSurrender: v })} label="Late surrender" />
          </Row>
          <Row label="Penetration" hint={r.cutSpread ? `Cut card around ${Math.round(r.penetration * 100)}% of the shoe` : `Cut card at ${Math.round(r.penetration * 100)}% every shoe`}>
            <input type="range" min={50} max={90} step={5} value={Math.round(r.penetration * 100)} onChange={(e) => R({ penetration: Number(e.target.value) / 100 })} aria-label="Penetration" />
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
          <Row label="Cut card" hint={r.cutSpread ? 'Placed by hand: a little deeper or shallower each shoe' : 'Same spot every shoe, like a notched tray'}>
            <Seg label="Cut card" value={r.cutSpread ? 'hand' : 'fixed'} onChange={(v) => R({ cutSpread: v === 'hand' ? HAND_CUT : 0 })} options={[{ v: 'hand', l: 'By hand' }, { v: 'fixed', l: 'Fixed' }]} />
          </Row>
        </Group>

        <Group title="Money">
          <Row label="Table minimum" hint={`Maximum ${money(tableMax(s.tableMin))}`}>
            <Seg label="Table minimum" value={s.tableMin} onChange={(v) => set({ tableMin: v })} options={[5, 10, 25, 50, 100].map((n) => ({ v: n, l: '$' + n }))} />
          </Row>
          <Row label="Starting bankroll">
            <Seg label="Starting bankroll" value={s.startBankroll} onChange={(v) => set({ startBankroll: v })} options={[500, 1000, 5000, 10000].map((n) => ({ v: n, l: money(n) }))} />
          </Row>
          <Row label="Bankroll" hint={`${money(br.balance)} now · ${br.hands} hands played`} />
        </Group>

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

        <Group title="Start over">
          <Row label="How it works" hint="José's intro, from the top">
            <a className="pill" href="#/home">
              Show me
            </a>
          </Row>
          <Row label="Reset bankroll" hint={done.bankroll || `Back to ${money(s.startBankroll)} of play money`}>
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

        <p className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
          {BRAND.long} · practice only, play money. {LEGAL_LINE}
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
