import { describe, it, expect } from 'vitest';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import { REFERENCE_INDICES } from '../src/engine/indices';
import { DEFAULT_V2 } from '../src/v2/settings';
import { countPlayPreview, shouldPreview } from '../src/v2/coach/preview';

const chart = generateBasicStrategy(DEFAULT_V2.rules).chart;
const av = { canDouble: true, canSplit: true, canSurrender: false };

describe('next-level preview', () => {
  it('12 v 3: hit now, stand at a high count', () => {
    const p = countPlayPreview(REFERENCE_INDICES, chart, [10, 2], 3, av)!;
    expect(p.action).toBe('stand');
    expect(p.when).toBe('up 2+');
  });
  it('16 v 10: stand at any plus count', () => {
    const p = countPlayPreview(REFERENCE_INDICES, chart, [10, 6], 10, av)!;
    expect(p.action).toBe('stand');
    expect(p.when).toBe('even or higher');
  });
  it('13 v 2: stand now, hit when the count is low', () => {
    const p = countPlayPreview(REFERENCE_INDICES, chart, [10, 3], 2, av)!;
    expect(p.action).toBe('hit');
    expect(p.when).toBe('down 2 or lower');
  });
  it('hands the count never changes have no preview', () => {
    expect(countPlayPreview(REFERENCE_INDICES, chart, [10, 8], 7, av)).toBeNull();
    expect(countPlayPreview(REFERENCE_INDICES, chart, [10, 1], 6, av)).toBeNull();
  });
  it('first three times always, then now and then', () => {
    expect(shouldPreview(0, 0.9)).toBe(true);
    expect(shouldPreview(2, 0.9)).toBe(true);
    expect(shouldPreview(3, 0.9)).toBe(false);
    expect(shouldPreview(7, 0.1)).toBe(true);
  });
});
