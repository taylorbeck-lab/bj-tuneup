import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useV2 } from '../settings';
import { useStrategy } from '../../store/strategy';
import { useEdgeModel } from '../../store/edge';
import { call } from '../../workers/client';
import { normalizeRules, type Rules } from '../../engine/rules';
import { verdict, type Plan } from '../../engine/plan';
import { money } from '../bankroll';
import { kvGet, kvSet } from '../../store/db';

/**
 * Plan a session: describe the game in front of you and how you'll play it, and José tells you what
 * it's worth and how a session like that is likely to end. Built for strike-and-go play: a better
 * game needs a shorter session.
 */
interface Form {
  decks: Rules['decks'];
  h17: boolean;
  das: boolean;
  lateSurrender: boolean;
  bjPayout: Rules['bjPayout'];
  penetration: number;
  players: number;
  unit: number;
  spread: number;
  buyIn: number;
  minutes: number;
  /** Leave when up this share of the buy-in (0 = play the time out). */
  goal: number;
}

const SPREADS = [4, 6, 8, 12, 16, 20];

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
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const signed = (x: number) => (x >= 0 ? '+' : '−') + money(Math.abs(x)).replace(/^[−-]?/, '');

export function PlanPage() {
  const { s } = useV2();
  const [f, setF] = useState<Form>(() => ({
    decks: s.rules.decks,
    h17: s.rules.h17,
    das: s.rules.das,
    lateSurrender: s.rules.lateSurrender,
    bjPayout: s.rules.bjPayout,
    penetration: s.rules.penetration,
    players: 3,
    unit: s.tableMin,
    spread: 8,
    buyIn: 1000,
    minutes: 60,
    goal: 1,
  }));
  // the last plan you made is kept on the device
  useEffect(() => {
    kvGet<Form>('v2plan').then((x) => x && setF((cur) => ({ ...cur, ...x })));
  }, []);
  const set = (p: Partial<Form>) =>
    setF((cur) => {
      const next = { ...cur, ...p };
      void kvSet('v2plan', next);
      return next;
    });

  const rules = useMemo(
    () => normalizeRules({ ...s.rules, decks: f.decks, h17: f.h17, das: f.das, lateSurrender: f.lateSurrender, bjPayout: f.bjPayout, penetration: f.penetration, cutSpread: 0.06 }),
    [s.rules, f.decks, f.h17, f.das, f.lateSurrender, f.bjPayout, f.penetration],
  );
  const st = useStrategy(rules);
  const model = useEdgeModel(rules, st.chart);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const spreads = useMemo(() => [...new Set([1, 4, 8, 12, 20, f.spread])].sort((a, b) => a - b), [f.spread]);

  useEffect(() => {
    if (!model) return;
    let live = true;
    setBusy(true);
    const id = setTimeout(() => {
      call('planSession', { rules, model, players: f.players, minutes: f.minutes, unit: f.unit, buyIn: f.buyIn, winGoal: f.goal ? f.buyIn * f.goal : null }, spreads)
        .then((p) => live && setPlan(p))
        .finally(() => live && setBusy(false));
    }, 250);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [model, rules, f.players, f.minutes, f.unit, f.buyIn, f.goal, spreads]);

  const mine = plan?.spreads.find((x) => x.spread === f.spread);
  const v = mine ? verdict(rules, mine) : null;

  return (
    <div className="frame">
      <header className="hud">
        <a className="pill" href="#/">
          ← Table
        </a>
        <span className="spacer" />
        <a className="pill" href="#/real">
          Before you play
        </a>
      </header>
      <div className="page">
        <h1>
          Plan a <span className="serif" style={{ fontSize: 34 }}>session</span>
        </h1>
        <div className="jose">
          <span className="jose-name">José · your dealer</span>
          <p>Tell me the game in front of you and how you’ll play it. I’ll tell you what it’s worth, primo.</p>
        </div>

        <section className="group">
          <div className="gh">The game</div>
          <Row label="Blackjack pays">
            <Seg label="Blackjack pays" value={f.bjPayout} onChange={(v) => set({ bjPayout: v })} options={[{ v: 1.5 as const, l: '3 to 2' }, { v: 1.2 as const, l: '6 to 5' }]} />
          </Row>
          <Row label="Decks">
            <Seg label="Decks" value={f.decks} onChange={(v) => set({ decks: v })} options={([1, 2, 6, 8] as const).map((n) => ({ v: n, l: String(n) }))} />
          </Row>
          <Row label="Soft 17">
            <Seg label="Soft 17" value={f.h17 ? 'h' : 's'} onChange={(v) => set({ h17: v === 'h' })} options={[{ v: 'h', l: 'Dealer hits' }, { v: 's', l: 'Stands' }]} />
          </Row>
          <Row label="Double after split">
            <Seg label="Double after split" value={f.das ? 'y' : 'n'} onChange={(v) => set({ das: v === 'y' })} options={[{ v: 'y', l: 'Yes' }, { v: 'n', l: 'No' }]} />
          </Row>
          <Row label="Surrender">
            <Seg label="Surrender" value={f.lateSurrender ? 'y' : 'n'} onChange={(v) => set({ lateSurrender: v === 'y' })} options={[{ v: 'y', l: 'Yes' }, { v: 'n', l: 'No' }]} />
          </Row>
          <Row label="Cut card" hint={`About ${Math.round(f.penetration * 100)}% of the cards dealt before the shuffle`}>
            <input type="range" min={50} max={90} step={5} value={Math.round(f.penetration * 100)} onChange={(e) => set({ penetration: Number(e.target.value) / 100 })} aria-label="Cut card" />
          </Row>
          <Row label="Players" hint="Including you">
            <Seg label="Players" value={f.players} onChange={(v) => set({ players: v })} options={[1, 2, 3, 4, 5, 6].map((n) => ({ v: n, l: String(n) }))} />
          </Row>
        </section>

        <section className="group">
          <div className="gh">How you’ll play it</div>
          <Row label="Your unit" hint="Your minimum bet">
            <Seg label="Unit" value={f.unit} onChange={(v) => set({ unit: v })} options={[5, 10, 15, 25, 50, 100].map((n) => ({ v: n, l: '$' + n }))} />
          </Row>
          <Row label="Spread" hint={`1 unit at a neutral count up to ${f.spread} at the top (${money(f.unit)} to ${money(f.unit * f.spread)})`}>
            <Seg label="Spread" value={f.spread} onChange={(v) => set({ spread: v })} options={SPREADS.map((n) => ({ v: n, l: `1–${n}` }))} />
          </Row>
          <Row label="Buy-in">
            <Seg label="Buy-in" value={f.buyIn} onChange={(v) => set({ buyIn: v })} options={[200, 500, 1000, 2000, 5000].map((n) => ({ v: n, l: money(n) }))} />
          </Row>
          <Row label="Time at the table">
            <Seg label="Time" value={f.minutes} onChange={(v) => set({ minutes: v })} options={[{ v: 30, l: '30 min' }, { v: 60, l: '1 hr' }, { v: 120, l: '2 hr' }, { v: 180, l: '3 hr' }]} />
          </Row>
          <Row label="Leave when up">
            <Seg label="Leave when up" value={f.goal} onChange={(v) => set({ goal: v })} options={[{ v: 0, l: 'Play it out' }, { v: 0.5, l: '+50%' }, { v: 1, l: 'Double' }]} />
          </Row>
        </section>

        {!model || !mine || !plan ? (
          <p className="muted">{st.chart ? 'Working out this game…' : 'Working out the strategy for these rules (the first time takes a moment)…'}</p>
        ) : (
          <>
            <section className={'plan-result ' + v!.tone} aria-busy={busy}>
              <div className="jose">
                <span className="jose-name">José · the verdict</span>
                <p>{v!.line}</p>
              </div>
              <div className="plan-grid">
                <div>
                  <b>{(mine.edge >= 0 ? '+' : '') + pct(mine.edge, 2)}</b>
                  <small>your edge</small>
                </div>
                <div>
                  <b>{signed(mine.perHour)}</b>
                  <small>an hour, on average</small>
                </div>
                <div>
                  <b>±{money(mine.swingPerHour)}</b>
                  <small>a typical hour’s swing</small>
                </div>
                {f.goal > 0 && (
                  <div>
                    <b>{pct(mine.pGoal)}</b>
                    <small>leave {f.goal === 1 ? 'doubled' : 'up half'}</small>
                  </div>
                )}
                <div>
                  <b>{pct(mine.pUp)}</b>
                  <small>leave up at all</small>
                </div>
                <div>
                  <b>{pct(mine.pBust)}</b>
                  <small>lose the buy-in</small>
                </div>
              </div>
              <p className="plan-note">
                About {plan.hands} hands in {f.minutes < 60 ? `${f.minutes} minutes` : `${f.minutes / 60} hour${f.minutes > 60 ? 's' : ''}`} at {plan.handsPerHour} an hour; {plan.roundsPerShoe.toFixed(0)} rounds a shoe, and the cards left
                favour you on {pct(plan.favourable)} of them. Average result for a session like this: <b>{signed(mine.session)}</b>.
              </p>
            </section>

            <section className="group">
              <div className="gh">Same game, other spreads</div>
              <table className="plan-table">
                <thead>
                  <tr>
                    <th>Spread</th>
                    <th>Edge</th>
                    <th>An hour</th>
                    {f.goal > 0 && <th>Hit goal</th>}
                    <th>Lose buy-in</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.spreads.map((x) => (
                    <tr key={x.spread} className={x.spread === f.spread ? 'on' : ''}>
                      <td>{x.spread === 1 ? 'Flat' : `1–${x.spread}`}</td>
                      <td className={x.edge > 0 ? 'up' : 'down'}>{(x.edge >= 0 ? '+' : '') + pct(x.edge, 2)}</td>
                      <td>{signed(x.perHour)}</td>
                      {f.goal > 0 && <td>{pct(x.pGoal)}</td>}
                      <td>{pct(x.pBust)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              Basic strategy with Hi-Lo betting, your top bet from a true count of {f.decks <= 2 ? '+4' : '+5'}; count plays add roughly 0.1–0.2%. Sessions are simulated thousands of times on this game's real
              shoes: leaving when you hit your goal or the buy-in runs out. In a short session the swing is far bigger than the edge, so the game you pick (payout, cut, decks, players,
              how far you can spread) decides more than any one session.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
