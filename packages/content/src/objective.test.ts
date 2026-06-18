import { describe, expect, test } from 'bun:test';
import { assertObjectiveShape, isValidObjectiveShape } from './objective';
import { peakRouteStats, trailStageStats } from './stats';
import type { Objective } from './types';

const base = {
  slug: 's',
  name: 'n',
  regionIds: ['r1'],
  tagline: 't',
  heroMediaId: 'm',
  summary: 'sum',
  guide: [],
  highlightIds: [],
};

const trail = (over: Partial<Objective> = {}): Objective => ({
  id: 'gr11',
  type: 'trail',
  atAGlance: [],
  sectionIds: ['sec1'],
  ...base,
  ...over,
});

const peak = (over: Partial<Objective> = {}): Objective => ({
  id: 'aneto',
  type: 'peak',
  atAGlance: [],
  routeIds: ['rt1'],
  ...base,
  ...over,
});

describe('invariant 2 — trail|peak decomposition (§3)', () => {
  test('a well-formed trail (sectionIds, no routeIds) passes', () => {
    expect(() => assertObjectiveShape(trail())).not.toThrow();
    expect(isValidObjectiveShape(trail())).toBe(true);
  });

  test('a well-formed peak (routeIds, no sectionIds) passes', () => {
    expect(() => assertObjectiveShape(peak())).not.toThrow();
  });

  test('a peak with sectionIds is rejected (no synthetic Section)', () => {
    expect(() => assertObjectiveShape(peak({ sectionIds: ['sec1'] }))).toThrow(
      /must not have sectionIds/,
    );
  });

  test('a trail with routeIds is rejected', () => {
    expect(() => assertObjectiveShape(trail({ routeIds: ['rt1'] }))).toThrow(
      /must not have routeIds/,
    );
  });

  test('a trail without sectionIds is rejected', () => {
    expect(() => assertObjectiveShape(trail({ sectionIds: undefined }))).toThrow(
      /must have sectionIds/,
    );
  });

  test('a peak without routeIds is rejected', () => {
    expect(() => assertObjectiveShape(peak({ routeIds: undefined }))).toThrow(/must have routeIds/);
  });
});

describe('stat builders keep atAGlance a generic Stat[]', () => {
  test('trail leads with distance; peak has none', () => {
    const ts = trailStageStats({
      distanceKm: 18,
      ascentM: 905,
      descentM: 1135,
      hours: '7h',
      grade: { system: 'hiking-band', value: 'hard' },
    });
    const ps = peakRouteStats({
      summitM: 3404,
      grade: { system: 'french-alpine', value: 'PD' },
      ascentM: 1200,
      season: 'Jul–Sep',
    });
    expect(ts.find((s) => s.key === 'distance')?.value).toBe(18);
    expect(ps.find((s) => s.key === 'distance')).toBeUndefined();
    expect(ps.find((s) => s.key === 'summit')?.value).toBe(3404);
  });
});
