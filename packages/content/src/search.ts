// Offline search + filtering (§14) — pure, on-device. The index is DERIVED from the
// already-loaded store entities (no pack bloat, no serialized index): every trail, peak,
// section and stage becomes a keyword-searchable SearchDoc with structured facets. Filters
// are predicates over those facets. "Days of walking" is the headline filter — a stage ≈ a
// day at relaxed pace (§11), so duration is a band [fast, relaxed] and the filter matches by
// OVERLAP. The duration filter also SYNTHESISES arbitrary segments: any contiguous run of
// stages whose length matches the requested day-band (e.g. "Stages 12–14"), so a hiker can
// find a 2–3 day chunk that isn't a curated Section. All pure → identical online/offline.

import type { ObjectiveSummary, SectionSummary, StageSummary } from './repo';
import type { Country, Range, Region, Stat } from './types';

// ── Model ────────────────────────────────────────────────────────────────────

export type SearchType = 'trail' | 'peak' | 'section' | 'stage' | 'segment';

/** Estimated walking duration as a band: relaxed pace = `max` (≈1 stage/day, §11),
 *  fast pace = `min` (≈2.5 stages/day). A whole-number count of days. */
export interface DurationDays {
  min: number;
  max: number;
}

export interface SearchFacets {
  countryId?: string;
  rangeId?: string;
  distanceKm: number;
  durationDays: DurationDays;
  /** Hiking-band grade value where the entity carries one (stages). */
  grade?: string;
}

/** How to open a result. A segment carries from/to stage ids → Journey Setup's segment
 *  picker (§16); the rest open their detail screen. */
export interface SearchNav {
  objectiveId: string;
  sectionId?: string;
  stageId?: string;
  fromStageId?: string;
  toStageId?: string;
}

export interface SearchDoc {
  id: string;
  type: SearchType;
  title: string;
  subtitle: string;
  /** Lowercased keyword blob — name, tagline, geography, grade, type. */
  text: string;
  facets: SearchFacets;
  nav: SearchNav;
}

export interface SearchFilters {
  types?: SearchType[];
  countryId?: string;
  rangeId?: string;
  /** Match docs whose duration band OVERLAPS this one; also drives segment synthesis. */
  durationDays?: DurationDays;
  grades?: string[];
}

export interface SearchQuery {
  query?: string;
  filters?: SearchFilters;
}

/** The store slice the index is built from (summaries + discovery entities). */
export interface SearchInput {
  objectives: ObjectiveSummary[];
  sections: SectionSummary[];
  stages: StageSummary[];
  countries: Country[];
  ranges: Range[];
  regions: Region[];
}

// ── Duration helpers ───────────────────────────────────────────────────────

/** Pace ceiling — a fit hiker packs up to ~2.5 curated stages into one day (§11). */
const STAGES_PER_FAST_DAY = 2.5;

/** A stage-count → its duration band. N stages ≈ N days relaxed, ⌈N/2.5⌉ days fast. */
export function estimateDuration(stageCount: number): DurationDays {
  const n = Math.max(1, stageCount);
  return { min: Math.max(1, Math.ceil(n / STAGES_PER_FAST_DAY)), max: n };
}

/** Two day-bands overlap (the filter-match relation). */
export function durationOverlaps(a: DurationDays, b: DurationDays): boolean {
  return a.min <= b.max && b.min <= a.max;
}

// ── Stat extraction ──────────────────────────────────────────────────────────

function statNum(stats: Stat[], key: string): number {
  const v = stats.find((s) => s.key === key)?.value;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Parse a "42–46" / "42-46" ranged stat into a band; a single number → [n,n]. */
function parseRange(value: string | number | undefined): DurationDays | undefined {
  if (typeof value === 'number') return { min: value, max: value };
  if (typeof value !== 'string') return undefined;
  const nums = value.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return undefined;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return { min, max };
}

// ── Index construction ─────────────────────────────────────────────────────

const norm = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' ').toLowerCase();

/** Build the static keyword+facet index (trail/peak/section/stage). Segments are
 *  synthesised on demand by the duration filter, not stored here. */
export function buildSearchIndex(input: SearchInput): SearchDoc[] {
  const region = new Map(input.regions.map((r) => [r.id, r]));
  const country = new Map(input.countries.map((c) => [c.id, c]));
  const range = new Map(input.ranges.map((r) => [r.id, r]));
  const objective = new Map(input.objectives.map((o) => [o.id, o]));
  const section = new Map(input.sections.map((s) => [s.id, s]));

  // The country/range an objective sits in (via its first region + its rangeId).
  const geoOf = (regionIds: string[], rangeId?: string) => {
    const firstRegion = regionIds.map((id) => region.get(id)).find(Boolean);
    const c = firstRegion ? country.get(firstRegion.countryId) : undefined;
    const r = rangeId ? range.get(rangeId) : undefined;
    const regionNames = regionIds
      .map((id) => region.get(id)?.name)
      .filter(Boolean)
      .join(' ');
    return { country: c, range: r, regionNames };
  };

  const docs: SearchDoc[] = [];

  for (const o of input.objectives) {
    const geo = geoOf(o.regionIds, o.rangeId);
    // Days: the objective's own 'days' stat, else from total stage count, else a peak push.
    const duration =
      parseRange(o.atAGlance.find((s) => s.key === 'days')?.value) ??
      (statNum(o.atAGlance, 'stages') > 0
        ? estimateDuration(statNum(o.atAGlance, 'stages'))
        : { min: 1, max: 2 });
    docs.push({
      id: o.id,
      type: o.type,
      title: o.name,
      subtitle: [geo.country?.name, geo.range?.name].filter(Boolean).join(' · '),
      text: norm(
        o.name,
        o.tagline,
        o.summary,
        geo.country?.name,
        geo.range?.name,
        geo.regionNames,
        o.type,
      ),
      facets: {
        countryId: geo.country?.id,
        rangeId: o.rangeId,
        distanceKm: statNum(o.atAGlance, 'distance'),
        durationDays: duration,
      },
      nav: { objectiveId: o.id },
    });
  }

  for (const s of input.sections) {
    const o = objective.get(s.objectiveId);
    const geo = geoOf(s.regionIds, o?.rangeId);
    docs.push({
      id: s.id,
      type: 'section',
      title: s.name,
      subtitle: [o?.name, geo.country?.name].filter(Boolean).join(' · '),
      text: norm(s.name, s.tagline, s.summary, o?.name, geo.country?.name, geo.regionNames),
      facets: {
        countryId: geo.country?.id,
        rangeId: o?.rangeId,
        distanceKm: statNum(s.atAGlance, 'distance'),
        durationDays: estimateDuration(s.stageIds.length),
      },
      nav: { objectiveId: s.objectiveId, sectionId: s.id },
    });
  }

  for (const st of input.stages) {
    const sec = section.get(st.sectionId);
    const o = sec ? objective.get(sec.objectiveId) : undefined;
    const geo = geoOf(sec?.regionIds ?? [], o?.rangeId);
    docs.push({
      id: st.id,
      type: 'stage',
      title: st.name,
      subtitle: [`Stage ${st.number}`, o?.name, geo.country?.name].filter(Boolean).join(' · '),
      text: norm(
        `stage ${st.number}`,
        st.name,
        o?.name,
        sec?.name,
        geo.country?.name,
        st.grade.value,
      ),
      facets: {
        countryId: geo.country?.id,
        rangeId: o?.rangeId,
        distanceKm: statNum(st.atAGlance, 'distance'),
        durationDays: { min: 1, max: 1 },
        grade: st.grade.value,
      },
      nav: { objectiveId: o?.id ?? '', sectionId: st.sectionId, stageId: st.id },
    });
  }

  return docs;
}

// ── Segment synthesis (arbitrary N-day chunks) ───────────────────────────────

/** Synthesise contiguous stage-windows of a trail whose RELAXED length (= stage count)
 *  falls in [band.min, band.max] — "2–3 days" → every run of 2 or 3 consecutive stages.
 *  Windows are strided so a long trail doesn't return hundreds of near-duplicates
 *  (`maxPerLength` evenly-spaced starts per length). */
export function segmentsForDuration(
  input: SearchInput,
  band: DurationDays,
  opts: { maxPerLength?: number } = {},
): SearchDoc[] {
  const maxPerLength = opts.maxPerLength ?? 6;
  const region = new Map(input.regions.map((r) => [r.id, r]));
  const country = new Map(input.countries.map((c) => [c.id, c]));
  const section = new Map(input.sections.map((s) => [s.id, s]));
  const docs: SearchDoc[] = [];

  for (const o of input.objectives) {
    if (o.type !== 'trail') continue;
    const stages = input.stages
      .filter((st) => section.get(st.sectionId)?.objectiveId === o.id)
      .sort((a, b) => a.number - b.number);
    if (stages.length < band.min) continue;
    const firstRegion = o.regionIds.map((id) => region.get(id)).find(Boolean);
    const c = firstRegion ? country.get(firstRegion.countryId) : undefined;

    for (let len = band.min; len <= band.max; len++) {
      const starts = stages.length - len + 1;
      if (starts <= 0) continue;
      // Evenly-spaced start positions → coverage without hundreds of overlapping windows.
      const step = Math.max(1, Math.ceil(starts / maxPerLength));
      for (let i = 0; i < starts; i += step) {
        const window = stages.slice(i, i + len);
        const from = window[0];
        const to = window[window.length - 1];
        if (!from || !to) continue;
        const distanceKm =
          Math.round(window.reduce((sum, st) => sum + statNum(st.atAGlance, 'distance'), 0) * 10) /
          10;
        docs.push({
          id: `${o.id}:seg:${from.number}-${to.number}`,
          type: 'segment',
          title: `${o.name} · Stages ${from.number}–${to.number}`,
          subtitle: [`${len} day${len > 1 ? 's' : ''}`, `${distanceKm} km`, c?.name]
            .filter(Boolean)
            .join(' · '),
          text: norm(o.name, `stages ${from.number} ${to.number}`, from.name, to.name, c?.name),
          facets: {
            countryId: c?.id,
            rangeId: o.rangeId,
            distanceKm,
            durationDays: estimateDuration(len),
          },
          nav: { objectiveId: o.id, fromStageId: from.id, toStageId: to.id },
        });
      }
    }
  }

  return docs;
}

// ── Query ────────────────────────────────────────────────────────────────────

const TYPE_RANK: Record<SearchType, number> = {
  trail: 0,
  peak: 1,
  section: 2,
  segment: 3,
  stage: 4,
};

function matchesFilters(doc: SearchDoc, f: SearchFilters): boolean {
  if (f.types && !f.types.includes(doc.type)) return false;
  if (f.countryId && doc.facets.countryId !== f.countryId) return false;
  if (f.rangeId && doc.facets.rangeId !== f.rangeId) return false;
  if (f.grades && (!doc.facets.grade || !f.grades.includes(doc.facets.grade))) return false;
  if (f.durationDays && !durationOverlaps(doc.facets.durationDays, f.durationDays)) return false;
  return true;
}

/** Run a query over the index. Keyword = every whitespace token must appear in `text`.
 *  Results are ranked by entity type then keyword-prefix relevance, then title. When a
 *  duration filter is set, callers fold in `segmentsForDuration` before querying. */
export function searchIndex(docs: SearchDoc[], q: SearchQuery): SearchDoc[] {
  const tokens = (q.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const filters = q.filters ?? {};

  const hits = docs.filter((doc) => {
    if (!matchesFilters(doc, filters)) return false;
    return tokens.every((t) => doc.text.includes(t));
  });

  const firstToken = tokens[0];
  const score = (doc: SearchDoc): number => {
    let s = TYPE_RANK[doc.type];
    if (firstToken && doc.title.toLowerCase().startsWith(firstToken)) s -= 0.5;
    return s;
  };
  return hits.sort((a, b) => score(a) - score(b) || a.title.localeCompare(b.title));
}
