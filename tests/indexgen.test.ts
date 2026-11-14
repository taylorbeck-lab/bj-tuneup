import { describe, it, expect, beforeAll } from 'vitest';
import { generateIndices, compAtTrueCount, type GeneratedIndex } from '../src/engine/indexgen';
import { generateBasicStrategy } from '../src/engine/strategy/generate';
import { BUILT_IN_PRESETS } from '../src/engine/rules';
import { REFERENCE_INDICES } from '../src/engine/indices';
import { fullComp } from '../src/engine/shoe';
import { hiLoTag } from '../src/engine/count';

describe('true-count shoe construction', () => {
  it('keeps the card total and produces the requested running count of seen cards', () => {
    for (const [decks, d] of [[6, 3], [2, 1], [2, 1.35]] as const) {
      const full = fullComp(decks);
      for (const t of [-8, -3, 0, 2, 5, 9]) {
        const c = compAtTrueCount(decks, d, t);
        const rem = c.reduce((a, b) => a + b, 0);
        expect(rem).toBe(Math.round(52 * d));
        let rc = 0;
        for (let v = 1; v <= 10; v++) rc += hiLoTag(v) * (full[v] - c[v]);
        expect(Math.abs(rc - t * d)).toBeLessThanOrEqual(1.5);
      }
    }
  });
});

describe('generated Hi-Lo indices vs published Illustrious 18 + Fab 4 (6D S17 DAS LS)', () => {
  let gen: GeneratedIndex[];
  beforeAll(() => {
    const rules = BUILT_IN_PRESETS.find((p) => p.id === '6d-s17-ls')!.rules;
    gen = generateIndices(generateBasicStrategy(rules).chart, rules);
  });
  it('every reference play is generated, in the same direction, within ±1; mean |diff| <= 0.5', () => {
    let absSum = 0;
    const report: string[] = [];
    for (const ref of REFERENCE_INDICES) {
      const g = gen.find((x) => x.play.id === ref.id);
      expect(g, ref.id).toBeDefined();
      expect(g!.play.atOrAbove, ref.id).toBe(ref.atOrAbove);
      const diff = g!.play.index - ref.index;
      report.push(`${ref.id}: ${g!.play.index} vs ${ref.index}`);
      expect(Math.abs(diff), report.join('; ')).toBeLessThanOrEqual(1);
      absSum += Math.abs(diff);
    }
    expect(absSum / REFERENCE_INDICES.length, report.join('; ')).toBeLessThanOrEqual(0.5);
  });
  it('generates the composition plays the owner uses (A,3 v 4 double; 4,4 v 4 split) at positive counts', () => {
    expect(gen.find((x) => x.play.id === 'A3v4')!.play.index).toBeGreaterThan(0);
    expect(gen.find((x) => x.play.id === '44v4')!.play.index).toBeGreaterThan(0);
  });
});
