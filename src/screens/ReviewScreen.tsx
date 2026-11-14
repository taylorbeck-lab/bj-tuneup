import { useEffect, useMemo, useState } from 'react';
import { TopBar, Button, Box, Instrument, Instruments, Hand, CardTile, fmtSigned } from '../ui/components';
import { getAll, getOne } from '../store/db';
import type { StoredShoe } from './sim/SimResults';
import type { DecisionSnapshot, RoundLog } from '../engine/game';
import type { DecisionEVs } from '../engine/ev/analyze';
import { ACTION_LABEL, type Action, chartAction } from '../engine/strategy/chart';
import { valueLabel } from '../engine/cards';
import { rulesLabel } from '../engine/rules';
import { navigate } from '../router';
import { useStrategy } from '../store/strategy';
import { useSettings } from '../store/SettingsContext';
import { useIndexPlays } from '../store/indices';
import { indexAction } from '../engine/indices';
import { insuranceEV } from '../engine/ev/engine';
import { handName } from './sim/summary';

const KIND: Record<string, string> = { sim: 'Table sim', 'sim:tuneup': 'Tune-Up table', feel: 'Feel Lab', strike: 'Strike mode', sidebet: 'Side bet hunter' };

function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function ReviewList() {
  const [shoes, setShoes] = useState<StoredShoe[]>([]);
  useEffect(() => {
    getAll<StoredShoe>('shoes').then((s) => setShoes(s.sort((a, b) => b.at - a.at)));
  }, []);
  return (
    <>
      <TopBar title="Hand review" />
      <main>
        <nav className="menu">
          {shoes.length === 0 && <p className="muted" style={{ padding: 'var(--s3) 0' }}>Play the table sim or Feel Lab; sessions show up here.</p>}
          {shoes.map((s) => (
            <a key={s.id} href={`#/review/${s.id}`}>
              <div>
                <div className="title" style={{ fontSize: 'var(--t-md)' }}>
                  {KIND[s.kind] ?? s.kind}
                </div>
                <div className="sub">
                  {new Date(s.at).toLocaleString()} · {s.logs.length} rounds · {rulesLabel(s.rules)}
                </div>
              </div>
              <span className="num">{fmtSigned(s.logs.reduce((a, l) => a + l.net, 0), 1)}u</span>
            </a>
          ))}
        </nav>
      </main>
    </>
  );
}

function compLine(c: number[]): string {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => `${valueLabel(v)}:${c[v]}`).join('  ');
}

export function ReviewDetail({ id }: { id: string }) {
  const [shoe, setShoe] = useState<StoredShoe | null>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    getOne<StoredShoe>('shoes', id).then((s) => setShoe(s ?? null));
  }, [id]);
  const { settings } = useSettings();
  const st = useStrategy(shoe?.rules ?? settings.rules);
  const { plays } = useIndexPlays(shoe?.rules ?? settings.rules);
  // flatten decisions to align with stored EVs
  const flat = useMemo(() => {
    const out: { round: number; d: DecisionSnapshot; evs: DecisionEVs }[] = [];
    if (!shoe) return out;
    let k = 0;
    for (const l of shoe.logs) for (const d of l.decisions) out.push({ round: l.round, d, evs: shoe.evs[k++] as DecisionEVs });
    return out;
  }, [shoe]);
  if (!shoe) return <main className="stack"><p className="mono muted">Loading…</p></main>;
  const log: RoundLog | undefined = shoe.logs[i];
  if (!log) return <main className="stack"><p>No rounds stored.</p></main>;
  const decs = flat.filter((f) => f.round === log.round);
  const ins = log.insurance;
  return (
    <>
      <TopBar
        title="Hand review"
        right={
          <span className="mono" style={{ fontSize: 'var(--t-xs)' }}>
            {i + 1}/{shoe.logs.length}
          </span>
        }
      />
      <main className="stack">
        <Instruments>
          <Instrument label="Bet" value={log.bet.units + 'u'} unit={`TC ${log.bet.tc} (exact ${log.bet.tcExact.toFixed(2)})`} />
          <Instrument label="Running count" value={(log.bet.rc > 0 ? '+' : '') + log.bet.rc} unit="before the deal" />
          <Instrument label="Result" value={fmtSigned(log.net, 1)} unit="units" tone={log.net < 0 ? 'bad' : log.net > 0 ? 'pos' : undefined} />
        </Instruments>
        <p className="mono muted" style={{ fontSize: 'var(--t-xs)' }}>
          Unseen before the deal: {compLine(log.bet.unseen)}
        </p>
        <div className="stage" style={{ minHeight: 0, gap: 'var(--s3)' }}>
          <span className="corner label">Dealer{log.dealerBJ ? ' · blackjack' : ''}</span>
          <Hand cards={log.dealer} spread size="sm" />
          <div className="seat-row">
            {log.playerHands.map((h, k) => (
              <div key={k} className="seat">
                <Hand cards={h.cards} spread size="sm" />
                <span className={'mono ' + (h.net < 0 ? 'accent' : '')} style={{ fontSize: 'var(--t-xs)' }}>
                  {h.bet}u · {fmtSigned(h.net, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
        {ins && (
          <Box title="Insurance">
            <p className="mono" style={{ fontSize: 'var(--t-sm)' }}>
              You {ins.take ? 'took' : 'declined'} {ins.evenMoney ? 'even money' : 'insurance'} at TC {ins.tc}. Exact EV of insurance: {fmtSigned(insuranceEV(ins.unseen), 4)} per unit bet.
            </p>
          </Box>
        )}
        {decs.map((f, k) => {
          const legal = (['hit', 'stand', 'double', 'split', 'surrender'] as Action[]).filter((a) => f.evs?.[a] !== undefined);
          const best = legal.reduce((b, a) => ((f.evs[a] as number) > (f.evs[b] as number) ? a : b), legal[0]);
          const ch = st.chart ? chartAction(st.chart, f.d.values, f.d.up, f.d.avail) : null;
          const ix = st.chart ? indexAction(plays, st.chart, f.d.values, f.d.up, f.d.tc, f.d.avail).action : null;
          return (
            <Box key={k} title={`Decision ${k + 1}: ${handName(f.d.values)} v ${valueLabel(f.d.up)}`} right={<span className="mono">RC {f.d.rc} · TC {f.d.tc}</span>}>
              <div className="stack" style={{ gap: 'var(--s2)' }}>
                <div className="row">
                  <CardTile card={f.d.upCard} size="sm" />
                  <Hand cards={f.d.cards} spread size="sm" />
                </div>
                <table className="chart" style={{ fontSize: 'var(--t-sm)' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', paddingLeft: 6 }}>Action</th>
                      <th>EV</th>
                      <th>vs best</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {legal.map((a) => (
                      <tr key={a} style={a === f.d.chosen ? { outline: '2px solid var(--fg)', outlineOffset: -2 } : undefined}>
                        <td style={{ textAlign: 'left', paddingLeft: 6 }}>{ACTION_LABEL[a]}</td>
                        <td>{fmtSigned(f.evs[a] as number, 4)}</td>
                        <td className={a !== best && a === f.d.chosen ? 'accent' : ''}>{a === best ? 'best' : fmtSigned((f.evs[a] as number) - (f.evs[best] as number), 4)}</td>
                        <td className="muted">
                          {[a === f.d.chosen && 'you', a === ch && 'chart', a === ix && ix !== ch && 'index'].filter(Boolean).join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mono muted" style={{ fontSize: 'var(--t-xs)' }}>
                  Unseen: {compLine(f.d.unseen)}
                </p>
              </div>
            </Box>
          );
        })}
        {decs.length === 0 && <p className="muted">No decisions this round (blackjack, dealer blackjack, or automatic).</p>}
        <div className="grid3" style={{ gap: 'var(--s2)' }}>
          <Button disabled={i === 0} onClick={() => setI(i - 1)}>
            ← Prev
          </Button>
          <Button disabled={i >= shoe.logs.length - 1} onClick={() => setI(i + 1)}>
            Next →
          </Button>
          <Button variant="ghost" onClick={() => download(`tuneup-shoe-${shoe.id}.json`, JSON.stringify(shoe, null, 1))}>
            Export
          </Button>
        </div>
        <Button variant="ghost" onClick={() => navigate('/review')}>
          All sessions
        </Button>
      </main>
    </>
  );
}
