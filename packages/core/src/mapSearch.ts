// Shared map search + filter engine. Pure and platform-agnostic so the exact
// same logic powers the map on web and mobile (the §13 "one selector" idea,
// generalised to filtering). Callers normalise trails, peaks and (later) POIs
// into a `MapEntity`, then this module answers "what's on the map right now".
//
// The facet metadata (difficulty, season, precise duration) is still being
// built out (§21); the engine already supports those dimensions — entities that
// lack a value simply don't match a filter that requires it, so coverage grows
// as the data lands without any code change here.

export type MapEntityKind = 'trail' | 'peak' | 'water' | 'refuge' | 'poi';
export type Difficulty = 'easy' | 'moderate' | 'hard' | 'expert';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** A normalised, filterable/searchable thing on the map. */
export interface MapEntity {
  id: string;
  kind: MapEntityKind;
  name: string;
  ref?: string | null;
  country?: string | null;
  /** The mountain range / "place" (a trail's region facet). */
  region?: string | null;
  distanceM?: number | null;
  /** Estimated days end-to-end; falls back to a distance estimate when absent. */
  durationDays?: number | null;
  difficulty?: Difficulty | null;
  /** Seasons the entity is in its window. */
  seasons?: Season[] | null;
  /** Extra free-text matched by search (nearby towns, aliases…). */
  keywords?: string[] | null;
}

export type DurationBandId = 'day' | '2-3' | '4-7' | '7+';
export type DistanceBandId = 'lt10' | '10-30' | '30-100' | '100+';

export interface DurationBand {
  id: DurationBandId;
  label: string;
  minDays: number;
  maxDays: number;
}
export interface DistanceBand {
  id: DistanceBandId;
  label: string;
  minM: number;
  maxM: number;
}

// Buckets mirror the Figma filter sheet. Duration ranges are inclusive and
// non-overlapping; distance ranges are half-open [min, max).
export const DURATION_BANDS: DurationBand[] = [
  { id: 'day', label: 'Day hike', minDays: 0, maxDays: 1 },
  { id: '2-3', label: '2–3 days', minDays: 2, maxDays: 3 },
  { id: '4-7', label: '4–7 days', minDays: 4, maxDays: 7 },
  { id: '7+', label: '7+ days', minDays: 8, maxDays: Number.POSITIVE_INFINITY },
];

export const DISTANCE_BANDS: DistanceBand[] = [
  { id: 'lt10', label: '< 10 km', minM: 0, maxM: 10_000 },
  { id: '10-30', label: '10–30 km', minM: 10_000, maxM: 30_000 },
  { id: '30-100', label: '30–100 km', minM: 30_000, maxM: 100_000 },
  { id: '100+', label: '100 km+', minM: 100_000, maxM: Number.POSITIVE_INFINITY },
];

export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'hard', label: 'Hard' },
  { id: 'expert', label: 'Expert' },
];

export const SEASONS: { id: Season; label: string }[] = [
  { id: 'spring', label: 'Spring' },
  { id: 'summer', label: 'Summer' },
  { id: 'autumn', label: 'Autumn' },
  { id: 'winter', label: 'Winter' },
];

export const KIND_LABELS: Record<MapEntityKind, string> = {
  trail: 'Trail',
  peak: 'Peak',
  water: 'Water',
  refuge: 'Refuge',
  poi: 'Place',
};

/** The active filter selection. Every dimension is multi-select (OR within,
 *  AND across); an absent/empty dimension means "any". */
export interface MapFilters {
  query?: string;
  kinds?: MapEntityKind[];
  countries?: string[];
  regions?: string[];
  difficulty?: Difficulty[];
  duration?: DurationBandId[];
  distance?: DistanceBandId[];
  seasons?: Season[];
}

/** Array-valued filter dimensions (everything except the free-text query). */
export type FilterDimension =
  | 'kinds'
  | 'countries'
  | 'regions'
  | 'difficulty'
  | 'duration'
  | 'distance'
  | 'seasons';

const ARRAY_DIMENSIONS: FilterDimension[] = [
  'kinds',
  'countries',
  'regions',
  'difficulty',
  'duration',
  'distance',
  'seasons',
];

/** Days to walk a distance at a ~18 km/day pace (a soft hint, §11). */
export function estimateDurationDays(distanceM?: number | null): number | null {
  if (distanceM == null) return null;
  return Math.max(1, Math.round(distanceM / 1000 / 18));
}

function durationDaysOf(e: MapEntity): number | null {
  return e.durationDays ?? estimateDurationDays(e.distanceM);
}

/** Free-text match: every whitespace-separated token must appear somewhere in
 *  the entity's name / ref / place / keywords (case-insensitive). */
export function matchesQuery(entity: MapEntity, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    entity.name,
    entity.ref,
    entity.country,
    entity.region,
    ...(entity.keywords ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

function someBand<B extends { id: string }>(
  bands: B[],
  selected: string[],
  test: (band: B) => boolean,
): boolean {
  return bands.some((b) => selected.includes(b.id) && test(b));
}

/** Does an entity satisfy the whole filter? */
export function matchesFilters(entity: MapEntity, f: MapFilters): boolean {
  if (f.query && !matchesQuery(entity, f.query)) return false;
  if (f.kinds?.length && !f.kinds.includes(entity.kind)) return false;
  if (f.countries?.length && !(entity.country && f.countries.includes(entity.country)))
    return false;
  if (f.regions?.length && !(entity.region && f.regions.includes(entity.region))) return false;
  if (f.difficulty?.length && !(entity.difficulty && f.difficulty.includes(entity.difficulty)))
    return false;
  if (f.seasons?.length && !entity.seasons?.some((s) => f.seasons?.includes(s))) return false;

  if (f.duration?.length) {
    const d = durationDaysOf(entity);
    if (d == null) return false;
    if (!someBand(DURATION_BANDS, f.duration, (b) => d >= b.minDays && d <= b.maxDays))
      return false;
  }
  if (f.distance?.length) {
    const m = entity.distanceM;
    if (m == null) return false;
    if (!someBand(DISTANCE_BANDS, f.distance, (b) => m >= b.minM && m < b.maxM)) return false;
  }
  return true;
}

/** The entities currently on the map for a given filter. With no active
 *  filters this returns everything (the default "show all trails" state). */
export function filterEntities(entities: MapEntity[], f: MapFilters): MapEntity[] {
  if (!hasActiveFilters(f)) return entities;
  return entities.filter((e) => matchesFilters(e, f));
}

/** Whether any filter (or query) is active. */
export function hasActiveFilters(f: MapFilters): boolean {
  return Boolean(
    f.query?.trim() ||
      f.kinds?.length ||
      f.countries?.length ||
      f.regions?.length ||
      f.difficulty?.length ||
      f.duration?.length ||
      f.distance?.length ||
      f.seasons?.length,
  );
}

/** Immutably add/remove a value in an array dimension. Empties the dimension
 *  back to `undefined` so `hasActiveFilters` stays accurate. */
export function toggleFilterValue(
  f: MapFilters,
  dimension: FilterDimension,
  value: string,
): MapFilters {
  const current = (f[dimension] as string[] | undefined) ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return { ...f, [dimension]: next.length ? next : undefined };
}

export interface FilterChip {
  dimension: FilterDimension;
  value: string;
  label: string;
}

function labelFor(dimension: FilterDimension, value: string): string {
  switch (dimension) {
    case 'kinds':
      return KIND_LABELS[value as MapEntityKind] ?? value;
    case 'difficulty':
      return DIFFICULTIES.find((d) => d.id === value)?.label ?? value;
    case 'duration':
      return DURATION_BANDS.find((b) => b.id === value)?.label ?? value;
    case 'distance':
      return DISTANCE_BANDS.find((b) => b.id === value)?.label ?? value;
    case 'seasons':
      return SEASONS.find((s) => s.id === value)?.label ?? value;
    default:
      return value; // country / region render their raw name
  }
}

/** Flatten the active selection into labelled chips for the filter bar. */
export function activeFilterChips(f: MapFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const dimension of ARRAY_DIMENSIONS) {
    for (const value of (f[dimension] as string[] | undefined) ?? []) {
      chips.push({ dimension, value, label: labelFor(dimension, value) });
    }
  }
  return chips;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

/** Distinct values present in the data for a geography facet, with counts —
 *  used to build the country / place chip lists. */
export function facetOptions(entities: MapEntity[], key: 'country' | 'region'): FacetOption[] {
  const counts = new Map<string, number>();
  for (const e of entities) {
    const v = e[key];
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, label: value, count }));
}
