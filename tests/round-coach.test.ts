import { describe, it, expect } from 'vitest';
import { decisionFeedback, betFeedback, insuranceFeedback } from '../src/v2/coach/round';
import type { CoachVerdict } from '../src/v2/coach/grade';
import type { IndexPlay } from '../src/engine/indices';

const p16v10: IndexPlay = { id: '16v10', hand: { kind: 'hard', total: 16 }, up: 10, index: 0, atOrAbove: 'stand', below: 'hit' };
const v = (o: Partial<CoachVerdict>): CoachVerdict => ({ right: true, chosen: 'hit', correct: 'hit', chartPlay: 'hit', title: '', accent: '', why: '', hand: '16 vs 10', key: 'h16v10', ...o });

describe('feedback classifiers', () => {
  it('right plays are a quiet tick', () => {
    const f = decisionFeedback(v({ right: true, chosen: 'double', correct: 'double', chartPlay: 'double', hand: '11 vs 6' }));
    expect(f).toMatchObject({ ok: true, tick: '✓ double', layer: 'play' });
  });
  it('a made count play is confirmed', () => {
    expect(decisionFeedback(v({ right: true, chosen: 'stand', correct: 'stand', countPlay: p16v10, countSpot: p16v10 }))).toMatchObject({ layer: 'deviate', ok: true, tick: '✓ count play' });
  });
  it('a missed count play lights Deviate and never states the count', () => {
    const f = decisionFeedback(v({ right: false, chosen: 'hit', correct: 'stand', countPlay: p16v10, countSpot: p16v10 }));
    expect(f).toMatchObject({ layer: 'deviate', ok: false, word: 'STAND' });
    expect(f.line).toBe('Count says stand on 16 vs 10.');
    expect(f.line).not.toMatch(/\d+\s*(up|down)|up \d|down \d|[+−-]\d/);
  });
  it('deviating too early is a Deviate miss', () => {
    expect(decisionFeedback(v({ right: false, chosen: 'stand', correct: 'hit', countSpot: p16v10 }))).toMatchObject({ layer: 'deviate', ok: false, word: 'HIT' });
  });
  it('a basic-strategy miss lights Play', () => {
    expect(decisionFeedback(v({ right: false, chosen: 'stand', correct: 'hit', hand: 'soft 18 vs 9' }))).toMatchObject({ layer: 'play', ok: false, line: 'Hit soft 18 vs 9.' });
  });
  it('bets: bigger, minimum, less', () => {
    expect(betFeedback(false, 25, 100, 4).line).toBe('Count says bet bigger.');
    expect(betFeedback(false, 100, 25, 1).line).toBe('Count says the minimum.');
    expect(betFeedback(false, 500, 100, 4).line).toBe('Easy: count says bet less.');
    expect(betFeedback(true, 25, 25, 1).tick).toBeUndefined();
    expect(betFeedback(true, 100, 100, 4).tick).toBe('✓ bet up');
  });
  it('insurance goes on Deviate when count plays are on', () => {
    expect(insuranceFeedback(false, true, true)).toMatchObject({ layer: 'deviate', ok: false });
    expect(insuranceFeedback(true, false, false)).toMatchObject({ layer: 'play', ok: true, tick: '✓ no insurance' });
  });
});
