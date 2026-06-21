import { describe, expect, it } from 'bun:test';
import {
  type MapEntity,
  activeFilterChips,
  estimateDurationDays,
  facetOptions,
  filterEntities,
  hasActiveFilters,
  matchesQuery,
  toggleFilterValue,
} from './mapSearch';

const gr11: MapEntity = {
  id: 't1',
  kind: 'trail',
  name: 'GR11',
  ref: 'GR11',
  country: 'Spain',
  region: 'Pyrenees',
  distanceM: 847_000,
  difficulty: 'hard',
  seasons: ['summer', 'autumn'],
  keywords: ['Senda Pirenaica', 'Cap de Creus'],
};
const gr10: MapEntity = {
  id: 't2',
  kind: 'trail',
  name: 'GR10',
  ref: 'GR 10',
  country: 'France',
  region: 'Pyrenees',
  distanceM: 927_000,
  difficulty: 'hard',
  seasons: ['summer'],
};
const aneto: MapEntity = {
  id: 'p1',
  kind: 'peak',
  name: 'Aneto',
  country: 'Spain',
  region: 'Pyrenees',
  distanceM: 18_000,
  difficulty: 'expert',
  seasons: ['summer'],
};
const all = [gr11, gr10, aneto];

describe('filterEntities', () => {
  it('returns everything with no active filters', () => {
    expect(filterEntities(all, {})).toEqual(all);
    expect(filterEntities(all, { query: '  ' })).toEqual(all);
  });

  it('filters by kind', () => {
    expect(filterEntities(all, { kinds: ['peak'] })).toEqual([aneto]);
    expect(filterEntities(all, { kinds: ['trail'] })).toEqual([gr11, gr10]);
  });

  it('filters by country (OR within a dimension)', () => {
    expect(filterEntities(all, { countries: ['France'] })).toEqual([gr10]);
    expect(filterEntities(all, { countries: ['Spain', 'France'] }).length).toBe(3);
  });

  it('AND across dimensions', () => {
    expect(filterEntities(all, { kinds: ['trail'], countries: ['Spain'] })).toEqual([gr11]);
  });

  it('filters by distance band (half-open)', () => {
    expect(filterEntities(all, { distance: ['lt10'] })).toEqual([]);
    expect(filterEntities(all, { distance: ['10-30'] })).toEqual([aneto]);
    expect(filterEntities(all, { distance: ['100+'] })).toEqual([gr11, gr10]);
  });

  it('filters by duration band using the distance estimate when no durationDays', () => {
    // Aneto: 18 km → ~1 day → "Day hike".
    expect(filterEntities(all, { duration: ['day'] })).toEqual([aneto]);
    // GR11/GR10 are multi-week → "7+ days".
    expect(filterEntities(all, { duration: ['7+'] })).toEqual([gr11, gr10]);
  });

  it('prefers an explicit durationDays over the estimate', () => {
    const e = { ...aneto, durationDays: 5 };
    expect(filterEntities([e], { duration: ['4-7'] })).toEqual([e]);
    expect(filterEntities([e], { duration: ['day'] })).toEqual([]);
  });

  it('filters by season intersection', () => {
    expect(filterEntities(all, { seasons: ['autumn'] })).toEqual([gr11]);
    expect(filterEntities(all, { seasons: ['winter'] })).toEqual([]);
  });

  it('excludes entities missing a required facet', () => {
    const noDifficulty = { ...gr10, difficulty: null };
    expect(filterEntities([noDifficulty], { difficulty: ['hard'] })).toEqual([]);
  });

  it('combines query with filters', () => {
    expect(filterEntities(all, { query: 'senda', kinds: ['trail'] })).toEqual([gr11]);
  });
});

describe('matchesQuery', () => {
  it('matches name, ref, place and keywords, case-insensitively', () => {
    expect(matchesQuery(gr11, 'gr11')).toBe(true);
    expect(matchesQuery(gr11, 'pyrenees')).toBe(true);
    expect(matchesQuery(gr11, 'cap de creus')).toBe(true);
    expect(matchesQuery(gr11, 'dolomites')).toBe(false);
  });

  it('requires all tokens to be present', () => {
    expect(matchesQuery(gr11, 'spain pyrenees')).toBe(true);
    expect(matchesQuery(gr11, 'spain alps')).toBe(false);
  });
});

describe('toggleFilterValue', () => {
  it('adds then removes a value, clearing the dimension when empty', () => {
    const a = toggleFilterValue({}, 'countries', 'Spain');
    expect(a.countries).toEqual(['Spain']);
    const b = toggleFilterValue(a, 'countries', 'France');
    expect(b.countries).toEqual(['Spain', 'France']);
    const c = toggleFilterValue(b, 'countries', 'Spain');
    expect(c.countries).toEqual(['France']);
    const d = toggleFilterValue(c, 'countries', 'France');
    expect(d.countries).toBeUndefined();
    expect(hasActiveFilters(d)).toBe(false);
  });
});

describe('activeFilterChips', () => {
  it('flattens selections into labelled chips', () => {
    const chips = activeFilterChips({
      difficulty: ['moderate'],
      duration: ['2-3'],
      countries: ['Spain'],
    });
    expect(chips).toEqual([
      { dimension: 'countries', value: 'Spain', label: 'Spain' },
      { dimension: 'difficulty', value: 'moderate', label: 'Moderate' },
      { dimension: 'duration', value: '2-3', label: '2–3 days' },
    ]);
  });
});

describe('facetOptions', () => {
  it('lists distinct values with counts, sorted', () => {
    expect(facetOptions(all, 'country')).toEqual([
      { value: 'France', label: 'France', count: 1 },
      { value: 'Spain', label: 'Spain', count: 2 },
    ]);
    expect(facetOptions(all, 'region')).toEqual([
      { value: 'Pyrenees', label: 'Pyrenees', count: 3 },
    ]);
  });
});

describe('estimateDurationDays', () => {
  it('estimates ~18 km/day, min 1, null when unknown', () => {
    expect(estimateDurationDays(18_000)).toBe(1);
    expect(estimateDurationDays(900_000)).toBe(50);
    expect(estimateDurationDays(1000)).toBe(1);
    expect(estimateDurationDays(null)).toBeNull();
  });
});
