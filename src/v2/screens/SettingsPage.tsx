import type { ReactNode } from 'react';
import { useV2, SPEEDS, tableMax, type V2Settings } from '../settings';
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
function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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

type Coach = V2Settings['coach'];
/** One-tap learning path: each step turns on the next layer. */
const PATH: { title: string; sub: string; coach: Partial<Coach> }[] = [
  { title: 'Play every hand right', sub: 'basic strategy with a coach', coach: { feedback: 'always', deviations: false, showCount: false, countQuiz: 'off', betCoach: false } },
  { title: 'Start counting', sub: 'the count shown, plus easy quizzes', coach: { deviations: false, showCount: true, countQuiz: 'sometimes', betCoach: false } },
  { title: 'Count on your own', sub: 'no helper, more quizzes', coach: { deviations: false, showCount: false, countQuiz: 'often', betCoach: false } },
  { title: 'Count plays', sub: 'the right play changes with the count', coach: { deviations: true, showCount: false, countQuiz: 'sometimes', betCoach: false } },
  { title: 'Bet the count', sub: 'raise when the shoe is yours', coach: { deviations: true, showCount: false, countQuiz: 'sometimes', betCoach: true } },
];
const matches = (c: Coach, p: Partial<Coach>) => (Object.keys(p) as (keyof Coach)[]).every((k) => k === 'feedback' || c[k] === p[k]);

export function SettingsPage() {
  const { s, set } = useV2();
  const { br, reset } = useBankroll(s.startBankroll);
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
        <Group title="Learning path">
          <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            {PATH.map((p, i) => {
              const on = matches(s.coach, p.coach);
              return (
                <button key={i} className={'act' + (on ? ' stand' : ' quiet')} style={{ textAlign: 'left', padding: '8px 12px', minHeight: 0 }} onClick={() => C(p.coach)}>
                  <span className="display" style={{ fontSize: 18 }}>
                    {i + 1}. {p.title}
                  </span>{' '}
                  <span className="serif" style={{ fontSize: 17, textTransform: 'none' }}>
                    {p.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </Group>

        <Group title="Learning">
          <Row label="Coach" hint="Feedback after your decisions">
            <Seg label="Coach" value={s.coach.feedback} onChange={(v) => C({ feedback: v })} options={[{ v: 'always', l: 'Always' }, { v: 'mistakes', l: 'Mistakes' }, { v: 'off', l: 'Off' }]} />
          </Row>
          <Row label="Deviations" hint="The right play changes with the count">
            <Tog on={s.coach.deviations} set={(v) => C({ deviations: v })} label="Deviations" />
          </Row>
          <Row label="Show the count" hint="Training wheels: running count on the table">
            <Tog on={s.coach.showCount} set={(v) => C({ showCount: v })} label="Show the count" />
          </Row>
          <Row label="Count quizzes" hint="Dealer asks “what's the count?”">
            <Seg label="Count quizzes" value={s.coach.countQuiz} onChange={(v) => C({ countQuiz: v })} options={[{ v: 'off', l: 'Off' }, { v: 'sometimes', l: 'Sometimes' }, { v: 'often', l: 'Often' }]} />
          </Row>
          <Row label="Practice my misses" hint="Hands you get wrong come back more often">
            <Tog on={s.coach.practiceMisses} set={(v) => C({ practiceMisses: v })} label="Practice my misses" />
          </Row>
          <Row label="Bet coach" hint="Raise and lower your bet with the count">
            <Tog on={s.coach.betCoach} set={(v) => C({ betCoach: v })} label="Bet coach" />
          </Row>
        </Group>

        <Group title="Table">
          <Row label="Dealer">
            <select value={s.speed} onChange={(e) => set({ speed: e.target.value as V2Settings['speed'] })} aria-label="Dealer speed" style={{ background: 'transparent', border: '1px solid rgba(233,220,198,0.25)', borderRadius: 99, padding: '6px 10px' }}>
              {SPEEDS.map((x) => (
                <option key={x.id} value={x.id} style={{ background: '#18241e' }}>
                  {x.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Players" hint="Including you">
            <Seg label="Players" value={s.players} onChange={(v) => set({ players: v })} options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ v: n, l: String(n) }))} />
          </Row>
          <Row label="Your seat" hint="1 = first base (dealt first) · 7 = third base">
            <Seg label="Your seat" value={s.seat} onChange={(v) => set({ seat: v })} options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ v: n, l: String(n) }))} />
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
          <Row label="Penetration" hint={`Cut card after ${Math.round(r.penetration * 100)}% of the shoe`}>
            <input type="range" min={50} max={90} step={5} value={Math.round(r.penetration * 100)} onChange={(e) => R({ penetration: Number(e.target.value) / 100 })} aria-label="Penetration" />
          </Row>
        </Group>

        <Group title="Money">
          <Row label="Table minimum" hint={`Maximum ${money(tableMax(s.tableMin))}`}>
            <Seg label="Table minimum" value={s.tableMin} onChange={(v) => set({ tableMin: v })} options={[5, 10, 25, 50, 100].map((n) => ({ v: n, l: '$' + n }))} />
          </Row>
          <Row label="Starting bankroll">
            <Seg label="Starting bankroll" value={s.startBankroll} onChange={(v) => set({ startBankroll: v })} options={[500, 1000, 5000, 10000].map((n) => ({ v: n, l: money(n) }))} />
          </Row>
          <Row label="Bankroll" hint={`${br.hands} hands played · started at ${money(br.start)}`}>
            <button className="pill" onClick={() => confirm(`Reset your bankroll to ${money(s.startBankroll)}?`) && reset(s.startBankroll)}>
              Reset to {money(s.startBankroll)}
            </button>
          </Row>
        </Group>

        <p className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
          {BRAND.long} · practice only, play money. {LEGAL_LINE}
        </p>
      </div>
    </div>
  );
}
