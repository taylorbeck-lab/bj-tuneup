import { useEffect, useRef, useState } from 'react';
import { useV2, type V2Settings } from '../settings';
import { MODES } from '../modes';
import { loadStats, handsPlayed } from '../stats';
import { shouldOffer, headsUpOffer, newPlaysAt, describePlay, THRESHOLDS, LEVEL_NAME, type Level, type NextStep, type Progress, type Tier } from '../progress';
import { EndOfShoe } from '../count/EndOfShoe';
import type { Table } from '../../engine/game';
import type { IndexPlay } from '../../engine/indices';
import type { EdgeModel } from '../../engine/edge';
import { noteLevelUp } from '../table/joseLines';

/** The settings for a level: the coach the mode uses, and where the course stands. */
export function levelSettings(s: V2Settings, level: Level, extra: Partial<Progress> = {}): Partial<V2Settings> {
  return { coach: { ...s.coach, ...MODES[level - 1].coach }, progress: { ...s.progress, level, ...extra } };
}

/**
 * The end of the shoe, in order: José's count check and the shoe review (when you're counting),
 * then, if your stats say you're ready, his offer to move you up. With nothing to show he just
 * shuffles.
 */
export function ShoeEnd({ table, model, plays, onDone }: { table: Table; model?: EdgeModel; plays: IndexPlay[]; onDone: () => void }) {
  const { s } = useV2();
  const counting = s.progress.level >= 2;
  const [step, setStep] = useState<'count' | 'offer'>(counting ? 'count' : 'offer');
  const [offer, setOffer] = useState<NextStep | null | undefined>(undefined);
  const finished = useRef(false);
  const done = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };
  const othersAtTable = table.seats.filter((x) => !x.human).length;
  useEffect(() => {
    if (step !== 'offer') return;
    let live = true;
    // the shoe's own result is saved first, so it counts toward the offer
    void loadStats().then((st) => live && setOffer(shouldOffer(st, s.progress) ?? headsUpOffer(st, s.progress, othersAtTable)));
    return () => {
      live = false;
    };
  }, [step, s.progress]);
  useEffect(() => {
    if (step === 'offer' && offer === null) done();
  });

  if (step === 'count') return <EndOfShoe table={table} model={model} onDone={() => setStep('offer')} />;
  if (!offer) return null;
  return <LevelUp step={offer} plays={plays} onClose={done} />;
}

/** José's offer to move you up, with what's coming in a few lines. */
export function LevelUp({ step, plays, onClose }: { step: NextStep; plays: IndexPlay[]; onClose: () => void }) {
  const { s, set } = useV2();
  const p = s.progress;
  const later = async () => {
    if (step.kind === 'headsUp') {
      set({ progress: { ...p, headsUpOffered: true } });
      return onClose();
    }
    const st = await loadStats();
    set({ progress: { ...p, askAfter: handsPlayed(st) + THRESHOLDS.snoozeHands } });
    onClose();
  };
  const accept = () => {
    if (step.kind === 'headsUp') set({ traffic: 'quiet', progress: { ...p, headsUpOffered: true } });
    else if (step.kind === 'count') set(levelSettings(s, 2));
    else if (step.kind === 'plays') set(levelSettings(s, 3, { tier: 1 }));
    else set({ progress: { ...p, tier: Math.min(3, p.tier + 1) as Tier } });
    noteLevelUp(step.kind);
    onClose();
  };
  const nextTier: Tier = step.kind === 'plays' ? 1 : (Math.min(3, p.tier + 1) as Tier);
  const list = step.kind === 'count' || step.kind === 'headsUp' ? [] : newPlaysAt(plays, nextTier).map(describePlay);
  const shown = list.slice(0, 8);
  /** What got you here, from your own record. */
  const earned = step.kind === 'headsUp' ? [] : step.checks.filter((c) => c.ok).map((c) => `${c.label.replace(/, still$/, '')}: ${c.have}`);

  return (
    <div className="sheet-back">
      <div className="sheet" role="dialog" aria-label="José moves you up">
        {step.kind !== 'headsUp' && (
          <span className="levelup-kicker">
            {step.kind === 'count' ? `Level 2 · ${LEVEL_NAME[2]}` : step.kind === 'plays' ? `Level 3 · ${LEVEL_NAME[3]}` : `Level 3 · count plays, set ${nextTier} of 3`}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img className="jose-mini" src={`${import.meta.env.BASE_URL}brand/jose-avatar.jpg`} alt="" />
          <span className="display" style={{ fontSize: 28, lineHeight: 1 }}>
            {step.kind === 'headsUp' ? 'A table to yourself?' : step.kind === 'count' ? 'Ready to count, primo' : step.kind === 'plays' ? 'Time to bend the rules' : 'A few more, primo'}
          </span>
        </div>
        {step.kind === 'count' && (
          <>
            <p className="levelup-say">You’ve got the hands down, the rare ones too. Now the fun part: keep the count.</p>
            <div className="hilo light" role="table" aria-label="The Hi-Lo count">
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
            <ul className="levelup-list">
              <li>I’ll ask your count at the end of every shoe, and test you now and then (tap the discard tray to ask me any time).</li>
              <li>Bet with it: more when the true count is up, the minimum when it isn’t. I’ll tell you how each bet was.</li>
            </ul>
          </>
        )}
        {step.kind === 'headsUp' && (
          <>
            <p className="levelup-say">You know your hands, primo. Now it’s speed, and heads up you see about twice the hands. There’s a quiet table right over here.</p>
            <ul className="levelup-list">
              <li>Mostly just you and me; now and then someone sits down for a while.</li>
              <li>Settings → Table changes it any time (quiet, normal, busy, or a set number of players).</li>
            </ul>
          </>
        )}
        {step.kind !== 'count' && step.kind !== 'headsUp' && (
          <>
            <p className="levelup-say">
              {step.kind === 'plays'
                ? 'Your count’s good and your bets follow it. At the right count, a few plays change. Here are the ones that matter most:'
                : 'You’ve got those down. Here are the next ones I’ll hold you to:'}
            </p>
            <ul className="levelup-list plays">
              {shown.map((l) => (
                <li key={l}>{l}</li>
              ))}
              {list.length > shown.length && <li className="muted">…and {list.length - shown.length} more (the chart’s Count plays view has them all)</li>}
            </ul>
            {step.kind === 'plays' && <p className="levelup-note">More come once these are second nature.</p>}
          </>
        )}
        {earned.length > 0 && (
          <div className="levelup-earned" aria-label="What got you here">
            {earned.map((e) => (
              <span key={e}>✓ {e}</span>
            ))}
          </div>
        )}
        <button className="act stand" onClick={accept}>
          {step.kind === 'headsUp' ? 'Take the quiet table' : step.kind === 'count' ? 'Let’s count' : step.kind === 'plays' ? 'Let’s go' : 'Add them'}
        </button>
        <button className="act" onClick={() => void later()}>
          {step.kind === 'headsUp' ? 'I’ll stay here' : 'Not yet'}
        </button>
        <p className="levelup-note">
          Now: Level {p.level} · {LEVEL_NAME[p.level]}. You can change your level any time in Settings.
        </p>
      </div>
    </div>
  );
}
