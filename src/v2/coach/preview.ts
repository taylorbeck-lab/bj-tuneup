/**
 * Teaching progression: at levels before count plays, a right basic-strategy play on a hand that
 * the count can change gets a one-line preview of the next level ("later: stand at up 2+").
 * It describes the rule, never the current count, and is never graded.
 */
import { chartAction, type Action, type Avail, type Chart } from '../../engine/strategy/chart';
import { indexAction, type IndexPlay } from '../../engine/indices';
import { countWords } from '../count/words';

export interface Preview {
  play: IndexPlay;
  /** The play the count switches to. */
  action: Action;
  /** "up 2+" / "down 2 or lower" / "any plus count" */
  when: string;
}

const HUGE = 99;

export function countPlayPreview(plays: IndexPlay[], chart: Chart, values: readonly number[], up: number, avail: Avail): Preview | null {
  const base = chartAction(chart, values, up, avail);
  const hi = indexAction(plays, chart, values, up, HUGE, avail);
  if (hi.play && hi.action !== base) return { play: hi.play, action: hi.action, when: hi.play.index <= 0 ? (hi.play.index === 0 ? 'even or higher' : `${countWords(hi.play.index)} or higher`) : `up ${hi.play.index}+` };
  const lo = indexAction(plays, chart, values, up, -HUGE, avail);
  if (lo.play && lo.action !== base) return { play: lo.play, action: lo.action, when: `${countWords(lo.play.index - 1)} or lower` };
  return null;
}

/** Show a preview the first few times a hand comes up, then only now and then. */
export function shouldPreview(timesShown: number, rnd: number): boolean {
  return timesShown < 3 || rnd < 0.2;
}
