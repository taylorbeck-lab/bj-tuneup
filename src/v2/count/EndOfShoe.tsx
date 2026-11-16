import { useMemo, useState } from 'react';
import type { Table } from '../../engine/game';
import type { EdgeModel } from '../../engine/edge';
import { Pad } from './CountSheet';
import { countWords } from './words';
import { summariseShoe, shoeLine } from './shoe';
import { recordShoeEnd } from '../stats';
import { money } from '../bankroll';

const pctEdge = (x: number) => (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(1) + '%';

/**
 * The end of the shoe: the cut card is out, so before he shuffles José asks for your count (the
 * ultimate check: did you stay accurate the whole way?), then sums up how good the shoe was.
 */
export function EndOfShoe({ table, model, counting, onDone }: { table: Table; model?: EdgeModel; counting: boolean; onDone: () => void }) {
  const rc = table.rc;
  const [answer, setAnswer] = useState<number | 'pass' | null>(null);
  const summary = useMemo(() => summariseShoe(table.shoeRounds(), model), [table, model]);
  const answered = answer !== null;
  const right = answer === rc;
  const say = (a: number | 'pass') => {
    setAnswer(a);
    recordShoeEnd(a === 'pass' ? 'passed' : a === rc ? 'right' : 'wrong');
  };
  return (
    <div className="sheet-back">
      <div className="sheet" role="dialog" aria-label="End of the shoe">
        <div className="jose" style={{ borderColor: 'var(--orange)' }}>
          <span className="jose-name">José · end of the shoe</span>
          <p style={{ color: 'var(--ink)' }}>{!answered ? (counting ? 'Cut card’s out. Before I shuffle, what’s your count?' : 'Cut card’s out. Counting along yet? What’s your count?') : 'Here’s how that shoe went.'}</p>
        </div>

        {!answered ? (
          <>
            <Pad label="That’s my count" onSubmit={(n) => say(n)} />
            <div className="actions" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button className="act" onClick={() => say('pass')}>
                Don’t know
              </button>
              <button className="act quiet-ink" onClick={() => say('pass')}>
                Skip
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={'coach ' + (answer === 'pass' ? '' : right ? 'ok' : 'no')}>
              <div className="head">
                <span className="display">{answer === 'pass' ? 'The count' : right ? 'Spot on' : 'Off a bit'}</span>
                <span className="serif">it was {countWords(rc)}</span>
              </div>
              <p>
                {answer === 'pass'
                  ? 'No problem. Try keeping it next shoe; the end of the shoe is where you find out.'
                  : right
                    ? 'You stayed with it the whole shoe. That’s the skill.'
                    : `You said ${countWords(answer as number)}. Most drift comes from splits, doubles and the dealer’s hand: keep counting through the noise.`}
              </p>
            </div>
            {summary && (
              <div className="shoe-sum">
                <div className="shoe-grid">
                  <div>
                    <b>{summary.hands}</b>
                    <small>hands</small>
                  </div>
                  <div>
                    <b>{countWords(summary.peakTc)}</b>
                    <small>high true count</small>
                  </div>
                  <div>
                    <b>{countWords(summary.lowTc)}</b>
                    <small>low</small>
                  </div>
                  <div>
                    <b>
                      {summary.favoured}/{summary.hands}
                    </b>
                    <small>hands in your favour</small>
                  </div>
                  <div>
                    <b>{pctEdge(summary.bestEdge)}</b>
                    <small>best edge</small>
                  </div>
                  <div>
                    <b className={summary.net >= 0 ? 'up' : 'down'}>{(summary.net >= 0 ? '+' : '−') + money(Math.abs(summary.net))}</b>
                    <small>this shoe</small>
                  </div>
                </div>
                {summary.favoured > 0 && summary.betFlat > 0 && (
                  <p className="shoe-bets">
                    Your average bet: <b>{money(Math.round(summary.betUp))}</b> when the shoe favoured you, <b>{money(Math.round(summary.betFlat))}</b> otherwise.
                  </p>
                )}
                <p className="shoe-line">“{shoeLine(summary)}”</p>
              </div>
            )}
            <button className="act stand" onClick={onDone}>
              Shuffle up
            </button>
          </>
        )}
      </div>
    </div>
  );
}
