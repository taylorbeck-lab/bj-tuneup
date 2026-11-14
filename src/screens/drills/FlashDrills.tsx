import { useEffect, useMemo, useRef, useState } from 'react';
import { TopBar, Hand, CardTile, Field, Seg } from '../../ui/components';
import { ActionBar } from '../../ui/ActionBar';
import { bsItems, bsItemKey, randomSuitCard, availFor, devItem, devCorrect, type BsItem, type DevItem, type DevAnswer } from '../../engine/drills';
import { mulberry32, randomSeed, type Rng } from '../../engine/rng';
import { useSettings } from '../../store/SettingsContext';
import { useStrategy } from '../../store/strategy';
import { useIndexPlays } from '../../store/indices';
import { loadSrs, recordSrs, pickWeighted, weight, type SrsItem } from '../../store/srs';
import { chartAction, ACTION_LABEL, type Action } from '../../engine/strategy/chart';
import { handTotal, valueLabel } from '../../engine/cards';
import { playLabel, type IndexPlay } from '../../engine/indices';
import { DrillIntro, DrillResult, useTally, Feedback, Progress } from './common';
import type { ActionEVs } from '../../engine/ev/engine';

type Phase = 'intro' | 'run' | 'done';

function handLabel(values: readonly number[]): string {
  const [a, b] = values;
  if (values.length === 2 && a === b) return `${valueLabel(a)},${valueLabel(b)}`;
  const t = handTotal(values);
  return t.soft ? `soft ${t.total}` : `hard ${t.total}`;
}

function cellKey(values: readonly number[], up: number): string {
  const [a, b] = values;
  const t = handTotal(values);
  if (a === b) return `pair:${a}:${up}`;
  return `${t.soft ? 'soft' : 'hard'}:${t.total}:${up}`;
}

function evLoss(evs: ActionEVs | undefined, chosen: Action, best: Action): number {
  if (!evs) return 0;
  const b = evs[best];
  const c = evs[chosen];
  if (b === undefined || c === undefined) return 0;
  return Math.max(0, b - c);
}

/** Basic strategy flash cards, weighted to your misses. */
export function BsFlash({ n: nDefault = 30, onDone }: { n?: number; onDone?: (acc: number) => void } = {}) {
  const { settings } = useSettings();
  const rules = settings.rules;
  const st = useStrategy(rules);
  const [phase, setPhase] = useState<Phase>('intro');
  const [n, setN] = useState(nDefault);
  const items = useMemo(() => bsItems(rules), [rules]);
  const srs = useRef<Map<string, SrsItem>>(new Map());
  const rng = useRef<Rng>(mulberry32(1));
  const [cur, setCur] = useState<{ item: BsItem; cards: number[]; upCard: number } | null>(null);
  const [i, setI] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const { tally, answer, markStart, reset } = useTally();
  const [t0, setT0] = useState(0);
  const av = availFor(rules);

  useEffect(() => {
    loadSrs().then((m) => (srs.current = m));
  }, []);

  const next = () => {
    const item = pickWeighted(items, (it) => weight(srs.current.get(bsItemKey(it.values, it.up))), rng.current);
    const [a, b] = item.values;
    setCur({ item, cards: [randomSuitCard(rng.current, a), randomSuitCard(rng.current, b)], upCard: randomSuitCard(rng.current, item.up) });
    markStart();
  };

  if (phase === 'intro')
    return (
      <DrillIntro
        title="Basic strategy flash"
        startLabel={st.chart ? 'Start' : 'Computing chart…'}
        onStart={() => {
          if (!st.chart) return;
          rng.current = mulberry32(randomSeed());
          reset();
          setI(0);
          setFb(null);
          setT0(performance.now());
          setPhase('run');
          next();
        }}
      >
        <p>Two-card hands vs the dealer upcard. Graded against your chart (including your overrides). Hands you miss come back more often.</p>
        <Field name="Hands">
          <Seg options={[20, 30, 50, 100].map((v) => ({ value: v, label: String(v) }))} value={n} onChange={setN} />
        </Field>
      </DrillIntro>
    );
  if (phase === 'done')
    return <DrillResult kind="drill:bs" title="Basic strategy" tally={tally} durationMs={performance.now() - t0} onAgain={() => setPhase('intro')} onSaved={() => onDone?.(tally.total ? tally.correct / tally.total : 0)} />;

  if (!cur || !st.chart) return null;
  const { item } = cur;
  const pair = item.values[0] === item.values[1];
  const legal: Action[] = ['hit', 'stand'];
  if (av.canDouble) legal.push('double');
  if (pair && av.canSplit) legal.push('split');
  if (av.canSurrender) legal.push('surrender');
  const pick = (a: Action) => {
    const best = chartAction(st.chart!, item.values, item.up, av);
    const ok = a === best;
    const key = bsItemKey(item.values, item.up);
    const label = `${handLabel(item.values)} v ${valueLabel(item.up)}`;
    const lost = ok ? 0 : evLoss(st.generated?.cellEVs[cellKey(item.values, item.up)], a, best);
    recordSrs(key, ok, label);
    answer(ok, ok ? undefined : { key, label, detail: `You: ${ACTION_LABEL[a]} · Chart: ${ACTION_LABEL[best]}`, evLost: lost });
    setFb({ ok, text: ok ? `${label}: ${ACTION_LABEL[best]}` : `${label}: ${ACTION_LABEL[best]} (−${lost.toFixed(3)} units)` });
    if (i + 1 >= n) setPhase('done');
    else {
      setI(i + 1);
      next();
    }
  };
  return (
    <>
      <TopBar title="BS flash" />
      <main className="stack">
        <Progress value={i} max={n} />
        <div className="stage">
          <span className="corner label">Dealer</span>
          <CardTile card={cur.upCard} size="lg" />
          <Hand cards={cur.cards} size="lg" spread />
          <span className="label">{handLabel(item.values)}</span>
        </div>
        <Feedback fb={fb} />
        <ActionBar legal={legal} onPick={pick} />
      </main>
    </>
  );
}

/** Deviation flash cards (index plays + insurance), weighted to your misses. */
export function DevFlash({ n: nDefault = 30, onDone }: { n?: number; onDone?: (acc: number) => void } = {}) {
  const { settings } = useSettings();
  const rules = settings.rules;
  const st = useStrategy(rules);
  const { plays } = useIndexPlays(rules);
  const [phase, setPhase] = useState<Phase>('intro');
  const [n, setN] = useState(nDefault);
  const srs = useRef<Map<string, SrsItem>>(new Map());
  const rng = useRef<Rng>(mulberry32(1));
  const [cur, setCur] = useState<{ item: DevItem; cards: number[]; upCard: number } | null>(null);
  const [i, setI] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const { tally, answer, markStart, reset } = useTally();
  const [t0, setT0] = useState(0);
  const av = availFor(rules);
  const usable = useMemo(() => plays.filter((p) => !p.surrender || rules.lateSurrender), [plays, rules.lateSurrender]);

  useEffect(() => {
    loadSrs().then((m) => (srs.current = m));
  }, []);
  const next = () => {
    const play = pickWeighted<IndexPlay>(usable, (p) => weight(srs.current.get('dev:' + p.id)), rng.current);
    const item = devItem(rng.current, play);
    setCur({ item, cards: item.values.map((v) => randomSuitCard(rng.current, v)), upCard: randomSuitCard(rng.current, item.up) });
    markStart();
  };

  if (phase === 'intro')
    return (
      <DrillIntro
        title="Deviations flash"
        startLabel={st.chart ? 'Start' : 'Computing chart…'}
        onStart={() => {
          if (!st.chart) return;
          rng.current = mulberry32(randomSeed());
          reset();
          setI(0);
          setFb(null);
          setT0(performance.now());
          setPhase('run');
          next();
        }}
      >
        <p>Hand, upcard and true count. Play by your index chart ({usable.length} plays, including insurance). The count is set near each index so the boundary is what you train.</p>
        <Field name="Hands">
          <Seg options={[20, 30, 50].map((v) => ({ value: v, label: String(v) }))} value={n} onChange={setN} />
        </Field>
      </DrillIntro>
    );
  if (phase === 'done')
    return <DrillResult kind="drill:dev" title="Deviations" tally={tally} durationMs={performance.now() - t0} onAgain={() => setPhase('intro')} onSaved={() => onDone?.(tally.total ? tally.correct / tally.total : 0)} />;
  if (!cur || !st.chart) return null;
  const { item } = cur;
  const isIns = item.play.hand.kind === 'insurance';
  const pick = (a: DevAnswer) => {
    const best = devCorrect(item, usable, st.chart!, av);
    const ok = a === best;
    const key = 'dev:' + item.play.id;
    const label = `${playLabel(item.play)} @ TC ${item.tc > 0 ? '+' : ''}${item.tc}`;
    recordSrs(key, ok, playLabel(item.play));
    const name = (x: DevAnswer) => (x === 'insure' ? 'Insure' : x === 'noinsure' ? 'No insurance' : ACTION_LABEL[x]);
    answer(ok, ok ? undefined : { key, label, detail: `You: ${name(a)} · Index ${item.play.index > 0 ? '+' : ''}${item.play.index}: ${name(best)}` });
    setFb({ ok, text: `${playLabel(item.play)} index ${item.play.index > 0 ? '+' : ''}${item.play.index} → ${name(best)}` });
    if (i + 1 >= n) setPhase('done');
    else {
      setI(i + 1);
      next();
    }
  };
  const pair = item.values.length === 2 && item.values[0] === item.values[1];
  const legal: Action[] = ['hit', 'stand'];
  if (av.canDouble) legal.push('double');
  if (pair && av.canSplit) legal.push('split');
  if (av.canSurrender) legal.push('surrender');
  return (
    <>
      <TopBar title="Deviations" />
      <main className="stack">
        <Progress value={i} max={n} />
        <div className="stage">
          <span className="corner label">TC</span>
          <span className="corner-r big-num" style={{ fontSize: 'var(--t-2xl)' }}>
            {item.tc > 0 ? '+' + item.tc : String(item.tc).replace('-', '−')}
          </span>
          <CardTile card={cur.upCard} size="lg" />
          <Hand cards={cur.cards} size="lg" spread />
          <span className="label">{isIns ? 'Dealer shows an ace' : handLabel(item.values)}</span>
        </div>
        <Feedback fb={fb} />
        {isIns ? (
          <div className="grid2" style={{ gap: 'var(--s2)' }}>
            <button className="btn big" onClick={() => pick('insure')}>
              Insure
            </button>
            <button className="btn big" onClick={() => pick('noinsure')}>
              No insurance
            </button>
          </div>
        ) : (
          <ActionBar legal={legal} onPick={pick} />
        )}
      </main>
    </>
  );
}
