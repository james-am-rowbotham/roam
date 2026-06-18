import { describe, expect, test } from 'bun:test';
import { gradeScale, markerColorToken, placeTypes } from './registries';

describe('grade badge resolves a scale from `system` (§3/§7.3)', () => {
  test('hiking-band positions the value on its scale', () => {
    const { scale, index } = gradeScale({ system: 'hiking-band', value: 'hard' });
    expect(scale).toEqual(['easy', 'moderate', 'hard', 'severe']);
    expect(index).toBe(2);
  });

  test('french-alpine positions the value on its (different) scale', () => {
    const { scale, index } = gradeScale({ system: 'french-alpine', value: 'PD' });
    expect(scale).toEqual(['F', 'PD', 'AD', 'D', 'TD', 'ED']);
    expect(index).toBe(1);
  });

  test('an unknown system throws (not silently mis-rendered)', () => {
    expect(() => gradeScale({ system: 'made-up', value: 'x' })).toThrow(/unknown grade system/);
  });

  test('a value off the scale returns index -1 but still yields the scale', () => {
    const { scale, index } = gradeScale({ system: 'hiking-band', value: 'extreme' });
    expect(index).toBe(-1);
    expect(scale).toHaveLength(4);
  });
});

describe('open place vocab — colour comes from the registry, not an enum', () => {
  test('a new type (glacier/col) resolves a colour token with zero core changes', () => {
    expect(placeTypes.glacier?.colorToken).toBeDefined();
    expect(placeTypes.col?.colorToken).toBe('trail.sl');
  });

  test('an unmapped type falls back rather than throwing', () => {
    expect(markerColorToken('something-new')).toBe('text.primary');
  });
});
