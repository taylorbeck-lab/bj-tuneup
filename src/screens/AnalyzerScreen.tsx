import { useEffect, useMemo, useState } from 'react';
import { TopBar, Button, Box, Instrument, Instruments, CardTile, fmtSigned } from '../ui/components';
import { useSettings } from '../store/SettingsContext';
import { useStrategy } from '../store/strategy';
import { useIndexPlays } from '../store/indices';
import { fullComp, type Comp } from '../engine/shoe';
import { valueLabel, handTotal } from '../engine/cards';
import { randomSuitCard } from '../engine/drills';
import { mulberry32 } from '../engine/rng';
import { chartAction, ACTION_LABEL, type Action } from '../engine/strategy/chart';
import { indexAction } from '../engine/indices';
import { compAtTrueCount } from '../engine/indexgen';
import { call } from '../workers/client';
import type { DecisionEVs } from '../engine/ev/analyze';
import { hiLoTag } from '../engine/count';
import { rulesLabel, canDoubleTotal } from '../engine/rules';

const VALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const rng = mulberry32(3);
const cardFor = new Map<string, number>();
const tile = (v: number, i: number) => {
  const k = v + ':' + i;
  if (!cardFor.has(k)) cardFor.set(k, randomSuitCard(rng, v));
  return cardFor.get(k)!;
};

/** Exact EV of every action for any composition, hand and upcard. */
export function AnalyzerScreen() {
  const { settings } = useSettings();
  const rules = settings.rules;
  const st = useStrategy(rules);
  const { plays } = useIndexPlays(rules);
  const [shoe, setShoe] = useState<Comp>(() => fullComp(rules.decks));
  const [hand, setHand] = useState<number[]>([10, 6]);
  const [up, setUp] = useState(10);
  const [target, setTarget] = useState<'hand' | 'up'>('hand');
  const [res, setRes] = useState<{ evs: DecisionEVs | null; dealer: number[]; pBJ: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // unseen = shoe minus hand minus upcard
  const unseen = useMemo(() => {
    const u = shoe.slice();
    for (const v of [...hand, up]) u[v]--;
    return u;
  }, [shoe, hand, up]);
  const valid = unseen.every((c, i) => i === 0 || c >= 0) && unseen.reduce((a, b) => a + b, 0) > 10;
  const full = fullComp(rules.decks);
  const seenRc = VALS.reduce((s, v) => s + hiLoTag(v) * (full[v] - unseen[v]), 0);
  const nUnseen = unseen.reduce((a, b) => a + b, 0);
  const tc = seenRc / (nUnseen / 52);
  const t = handTotal(hand);
  const avail = {
    canDouble: hand.length === 2 && canDoubleTotal(rules, t.total, t.soft),
    canSplit: hand.length === 2 && hand[0] === hand[1] && rules.maxSplitHands > 1,
    canSurrender: hand.length === 2 && rules.lateSurrender,
  };

  useEffect(() => {
    if (!valid || t.total > 21) {
      setRes(null);
      return;
    }
    let live = true;
    setBusy(true);
    call('analyzeFull', unseen, hand, up, rules, avail).then((r) => {
      if (!live) return;
      setRes(r);
      setBusy(false);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseen, hand, up, rules]);

  const legal = (['hit', 'stand', 'double', 'split', 'surrender'] as Action[]).filter((a) => res?.evs?.[a] !== undefined);
  const best = legal.reduce<Action | null>((b, a) => (b === null || (res!.evs![a] as number) > (res!.evs![b] as number) ? a : b), null);
  const chartPlay = st.chart && hand.length >= 2 ? chartAction(st.chart, hand, up, avail) : null;
  const idxPlay = st.chart && hand.length >= 2 ? indexAction(plays, st.chart, hand, up, Math.floor(tc), avail) : null;

  return (
    <>
      <TopBar title="EV analyzer" />
      <main className="stack">
        <p className="mono muted" style={{ fontSize: 'var(--t-sm)' }}>
          {rulesLabel(rules)} · {nUnseen} unseen · RC {seenRc > 0 ? '+' : ''}
          {seenRc} · TC {tc.toFixed(2)}
        </p>
        <div className="stage" style={{ minHeight: 0 }}>
          <button className="btn ghost" style={{ border: 0, outline: target === 'up' ? '2px solid var(--fg)' : 'none', outlineOffset: 2 }} onClick={() => setTarget('up')} aria-label="Edit dealer upcard">
            <CardTile card={tile(up, 9)} />
          </button>
          <button className="btn ghost" style={{ border: 0, minHeight: 100, outline: target === 'hand' ? '2px solid var(--fg)' : 'none', outlineOffset: 2 }} onClick={() => setTarget('hand')} aria-label="Edit player hand">
            <div className="hand spread">{hand.length ? hand.map((v, i) => <CardTile key={i} card={tile(v, i)} />) : <span className="muted">tap cards below</span>}</div>
          </button>
          <span className="label">
            {target === 'up' ? 'Tap a value to set the upcard' : 'Tap values to add to your hand'} · {t.soft ? 'soft ' : ''}
            {t.total}
          </span>
        </div>
        <div className="grid4" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--s1)' }}>
          {VALS.map((v) => (
            <Button key={v} onClick={() => (target === 'up' ? setUp(v) : hand.length < 8 && setHand([...hand, v]))}>
              {valueLabel(v)}
            </Button>
          ))}
        </div>
        <div className="row">
          <Button variant="ghost" onClick={() => setHand(hand.slice(0, -1))}>
            ⌫ card
          </Button>
          <Button variant="ghost" onClick={() => setHand([])}>
            Clear hand
          </Button>
        </div>

        {!valid && <p className="accent">Those cards aren't available in this shoe.</p>}
        {res?.evs && (
          <Instruments>
            {legal.map((a) => (
              <Instrument
                key={a}
                label={ACTION_LABEL[a] + (a === best ? ' · best' : '')}
                value={fmtSigned(res.evs![a] as number, 4)}
                unit={a === best ? 'units' : `${fmtSigned((res.evs![a] as number) - (res.evs![best!] as number), 4)} vs best`}
                tone={a === best && (res.evs![a] as number) > 0 ? 'pos' : undefined}
              />
            ))}
            {res.evs.insurance !== undefined && <Instrument label="Insurance" value={fmtSigned(res.evs.insurance, 4)} unit="per unit bet" tone={res.evs.insurance > 0 ? 'pos' : undefined} />}
          </Instruments>
        )}
        {res?.evs && (
          <div className="row" style={{ gap: 'var(--s2)' }}>
            {chartPlay && <span className="tag">Chart: {ACTION_LABEL[chartPlay]}</span>}
            {idxPlay && <span className="tag">Index @ TC {Math.floor(tc)}: {ACTION_LABEL[idxPlay.action]}</span>}
            {best && <span className={'tag ' + (best !== idxPlay?.action ? 'good' : '')}>Exact: {ACTION_LABEL[best]}</span>}
          </div>
        )}
        {busy && <p className="mono muted">computing…</p>}
        {res && (
          <Box title={`Dealer ${valueLabel(up)} · outcomes${up === 1 || up === 10 ? ' (no blackjack)' : ''}`}>
            <table className="chart">
              <thead>
                <tr>
                  {['17', '18', '19', '20', '21', 'Bust'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {res.dealer.map((p, i) => (
                    <td key={i}>{(p * 100).toFixed(1)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
            {res.pBJ > 0 && <p className="mono muted" style={{ fontSize: 'var(--t-xs)', marginTop: 'var(--s2)' }}>P(blackjack before peek) {(res.pBJ * 100).toFixed(2)}%</p>}
          </Box>
        )}

        <Box title="Shoe composition" right={<span className="mono">{shoe.reduce((a, b) => a + b, 0)} cards</span>}>
          <div className="stack" style={{ gap: 'var(--s2)' }}>
            <div className="row" style={{ gap: 'var(--s1)' }}>
              <Button variant="ghost" onClick={() => setShoe(fullComp(rules.decks))}>
                Full
              </Button>
              {[-4, -2, 2, 4, 6, 8].map((x) => (
                <Button key={x} variant="ghost" onClick={() => setShoe(compAtTrueCount(rules.decks, Math.max(0.5, rules.decks / 2), x))}>
                  TC {x > 0 ? '+' : ''}
                  {x}
                </Button>
              ))}
            </div>
            <table className="chart">
              <tbody>
                {VALS.map((v) => (
                  <tr key={v}>
                    <th>{valueLabel(v)}</th>
                    <td>
                      <button onClick={() => setShoe(shoe.map((c, i) => (i === v ? Math.max(0, c - 1) : c)))} aria-label={`Remove a ${valueLabel(v)}`}>
                        −
                      </button>
                    </td>
                    <td>{shoe[v]}</td>
                    <td>
                      <button onClick={() => setShoe(shoe.map((c, i) => (i === v ? Math.min(full[v], c + 1) : c)))} aria-label={`Add a ${valueLabel(v)}`}>
                        +
                      </button>
                    </td>
                    <td className="muted">{unseen[v]} unseen</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted" style={{ fontSize: 'var(--t-xs)' }}>
              The shoe includes your hand and the upcard; "unseen" is what's left for the draw (the hole card included). TC presets use half the shoe remaining.
            </p>
          </div>
        </Box>
      </main>
    </>
  );
}
