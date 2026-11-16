import { describe, it, expect } from 'vitest';
import { sayLine } from '../src/v2/coach/FeedbackCard';

describe('José says the line once', () => {
  it('drops a repeated play from the start of the line', () => {
    expect(sayLine('Hit', "Hit: you can't bust, and against a 10 doubling isn't worth it.")).toBe("You can't bust, and against a 10 doubling isn't worth it.");
    expect(sayLine('Stand', 'Stand on 16 here: the count is high.')).toBe('The count is high.');
  });
  it('leaves other lines alone and keeps number ranges together', () => {
    expect(sayLine('Hit', 'A 10 usually finishes on 17–21.')).toBe('A 10 usually finishes on 17⁠–⁠21.');
    expect(sayLine('Double', undefined)).toBeUndefined();
  });
});
