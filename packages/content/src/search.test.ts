import { describe, expect, test } from 'bun:test';
import type { ObjectiveSummary, SectionSummary, StageSummary } from './repo';
import {
  type SearchInput,
  buildSearchIndex,
  durationOverlaps,
  estimateDuration,
  searchIndex,
  segmentsForDuration,
} from './search';
import type { Country, Range, Region, Stat } from './types';

// ── Fixtures: a tiny 2-country trail + one peak ──────────────────────────────

const stat = (key: string, value: number | string, unit?: string): Stat => ({
  key,
  value,
  unit,
  label: key,
});

const countries: Country[] = [
  {
    id: 'es',
    slug: 'es',
    name: 'Spain',
    continentId: 'eu',
    tagline: '',
    heroMediaId: '',
    summary: '',
  },
];
const ranges: Range[] = [
  {
    id: 'pyrenees',
    slug: 'pyrenees',
    name: 'Pyrenees',
    continentId: 'eu',
    tagline: '',
    heroMediaId: '',
    summary: '',
  },
];
const regions: Region[] = [
  {
    id: 'aragon',
    slug: 'aragon',
    name: 'Aragón',
    countryId: 'es',
    tagline: '',
    heroMediaId: '',
    summary: '',
  },
];

const objectives: ObjectiveSummary[] = [
  {
    id: 'gr11',
    slug: 'gr11',
    name: 'GR11',
    type: 'trail',
    regionIds: ['aragon'],
    rangeId: 'pyrenees',
    tagline: 'Across the Spanish Pyrenees',
    heroMediaId: '',
    summary: 'A long traverse',
    atAGlance: [stat('distance', 820, 'km'), stat('stages', 6), stat('days', '5–6')],
    sectionIds: ['gr11-aragon'],
  },
];

const sections: SectionSummary[] = [
  {
    id: 'gr11-aragon',
    objectiveId: 'gr11',
    order: 0,
    name: 'Aragón',
    tagline: 'High limestone country',
    heroMediaId: '',
    regionIds: ['aragon'],
    summary: 'The Aragonese stretch',
    atAGlance: [stat('stages', 6), stat('distance', 820, 'km')],
    stageIds: ['s1', 's2', 's3', 's4', 's5', 's6'],
  },
];

const stages: StageSummary[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `s${n}`,
  sectionId: 'gr11-aragon',
  number: n,
  name: `Place ${n} → Place ${n + 1}`,
  fromLocationId: `p${n}`,
  toLocationId: `p${n + 1}`,
  grade: { system: 'hiking-band', value: n > 4 ? 'hard' : 'moderate' },
  atAGlance: [stat('distance', 15, 'km'), stat('ascent', 600, 'm')],
}));

const input: SearchInput = { objectives, sections, stages, countries, ranges, regions };

// ── Duration math ────────────────────────────────────────────────────────────

describe('estimateDuration', () => {
  test('relaxed = stage count, fast = ⌈n/2.5⌉, floor 1 day', () => {
    expect(estimateDuration(1)).toEqual({ min: 1, max: 1 });
    expect(estimateDuration(3)).toEqual({ min: 2, max: 3 });
    expect(estimateDuration(6)).toEqual({ min: 3, max: 6 });
  });
});

describe('durationOverlaps', () => {
  test('true when bands intersect', () => {
    expect(durationOverlaps({ min: 2, max: 3 }, { min: 3, max: 6 })).toBe(true);
    expect(durationOverlaps({ min: 1, max: 1 }, { min: 2, max: 3 })).toBe(false);
  });
});

// ── Index ────────────────────────────────────────────────────────────────────

describe('buildSearchIndex', () => {
  const docs = buildSearchIndex(input);

  test('emits one doc per trail/section/stage', () => {
    expect(docs.filter((d) => d.type === 'trail')).toHaveLength(1);
    expect(docs.filter((d) => d.type === 'section')).toHaveLength(1);
    expect(docs.filter((d) => d.type === 'stage')).toHaveLength(6);
  });

  test('trail facets carry country, range, distance, day-band', () => {
    const trail = docs.find((d) => d.type === 'trail');
    expect(trail?.facets.countryId).toBe('es');
    expect(trail?.facets.rangeId).toBe('pyrenees');
    expect(trail?.facets.distanceKm).toBe(820);
    expect(trail?.facets.durationDays).toEqual({ min: 5, max: 6 }); // from the 'days' stat
  });

  test('section day-band is derived from its stage count', () => {
    const sec = docs.find((d) => d.type === 'section');
    expect(sec?.facets.durationDays).toEqual(estimateDuration(6));
  });

  test('keyword text includes geography', () => {
    const trail = docs.find((d) => d.type === 'trail');
    expect(trail?.text).toContain('pyrenees');
    expect(trail?.text).toContain('spain');
  });
});

// ── Keyword + filter query ─────────────────────────────────────────────────

describe('searchIndex', () => {
  const docs = buildSearchIndex(input);

  test('keyword matches across entity types', () => {
    const hits = searchIndex(docs, { query: 'aragón' });
    expect(hits.some((h) => h.type === 'section')).toBe(true);
  });

  test('type filter narrows results', () => {
    const hits = searchIndex(docs, { filters: { types: ['stage'] } });
    expect(hits).toHaveLength(6);
    expect(hits.every((h) => h.type === 'stage')).toBe(true);
  });

  test('duration filter matches by overlap (sections/trails, not single stages)', () => {
    const hits = searchIndex(docs, { filters: { durationDays: { min: 2, max: 3 } } });
    const types = new Set(hits.map((h) => h.type));
    expect(types.has('stage')).toBe(false); // a stage is a single day
    expect(types.has('section')).toBe(true); // 6-stage section's band [3,6] overlaps [2,3]
  });
});

// ── Segment synthesis ────────────────────────────────────────────────────────

describe('segmentsForDuration', () => {
  test('synthesises contiguous windows of the requested length', () => {
    const segs = segmentsForDuration(input, { min: 2, max: 3 });
    expect(segs.length).toBeGreaterThan(0);
    expect(segs.every((s) => s.type === 'segment')).toBe(true);
    // Every segment spans 2 or 3 stages and carries a Journey-Setup nav target.
    for (const s of segs) {
      expect(s.nav.fromStageId).toBeDefined();
      expect(s.nav.toStageId).toBeDefined();
    }
  });

  test('window distance sums the member stages', () => {
    const segs = segmentsForDuration(input, { min: 2, max: 2 }, { maxPerLength: 1 });
    expect(segs[0]?.facets.distanceKm).toBe(30); // 2 × 15 km
  });

  test('strides starts so a trail does not return every overlapping window', () => {
    const all = segmentsForDuration(input, { min: 2, max: 2 }, { maxPerLength: 2 });
    expect(all.length).toBeLessThanOrEqual(2);
  });
});
