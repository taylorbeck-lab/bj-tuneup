import type { V2Settings } from './settings';

type Coach = V2Settings['coach'];

/**
 * Three modes, each deciding which feedback cards you get. Betting the count comes before count
 * plays because most of a counter's edge comes from betting more when the count is up.
 */
export const MODES: { title: string; sub: string; coach: Partial<Coach> }[] = [
  { title: 'Basic strategy', sub: 'every hand right, with a peek at what comes next', coach: { deviations: false, countQuiz: 'off', betCoach: false } },
  { title: 'Count & bet', sub: 'keep the count, bet with it, get tested now and then', coach: { deviations: false, countQuiz: 'sometimes', betCoach: true } },
  { title: 'Full AP', sub: 'plus count plays: the right play changes with the count', coach: { deviations: true, countQuiz: 'sometimes', betCoach: true } },
];

export const modeMatches = (c: Coach, p: Partial<Coach>) => (Object.keys(p) as (keyof Coach)[]).every((k) => k === 'feedback' || c[k] === p[k]);
