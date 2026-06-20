// Seed importer + validation (Implementation Pass §10 Phase 2).
//
// Takes authored content packs → validates referential integrity and the objective
// shape (invariant 2) → emits an in-memory store that keeps SUMMARY records and
// DETAIL records separate (the §5.2 hydration boundary). The first repo reads bundled
// JSON packs; these typed packs serialize to that JSON 1:1.
//
// Validation is fail-loud: a dangling `regionId`/`locationId`/`highlightId` (or any
// child id) throws with the full list, so a malformed pack never ships silently.

import type { ContentBlock } from './blocks';
import { assertObjectiveShape } from './objective';
import type { ObjectiveSummary, RouteSummary, SectionSummary, StageSummary } from './repo';
import type {
  Continent,
  Country,
  Highlight,
  Leg,
  Location,
  MediaAsset,
  Objective,
  POI,
  Range,
  Region,
  Route,
  Section,
  Stage,
} from './types';

export interface TrailPack {
  objective: Objective; // type 'trail'
  sections: Section[];
  stages: Stage[];
}

export interface PeakPack {
  objective: Objective; // type 'peak'
  routes: Route[];
  legs: Leg[];
}

export interface SeedInput {
  continents: Continent[];
  countries: Country[];
  ranges?: Range[];
  regions: Region[];
  locations: Location[];
  pois: POI[];
  highlights: Highlight[];
  media?: MediaAsset[];
  trails: TrailPack[];
  peaks: PeakPack[];
}

export interface ImportedStore {
  // discovery + shared
  continents: Map<string, Continent>;
  countries: Map<string, Country>;
  ranges: Map<string, Range>;
  regions: Map<string, Region>;
  locations: Map<string, Location>;
  pois: Map<string, POI>;
  highlights: Map<string, Highlight>;
  media: Map<string, MediaAsset>;
  // details (full content)
  objectives: Map<string, Objective>;
  sections: Map<string, Section>;
  stages: Map<string, Stage>;
  routes: Map<string, Route>;
  legs: Map<string, Leg>;
  // summaries (the hydration boundary — list/card views read these)
  objectiveSummaries: Map<string, ObjectiveSummary>;
  sectionSummaries: Map<string, SectionSummary>;
  stageSummaries: Map<string, StageSummary>;
  routeSummaries: Map<string, RouteSummary>;
}

interface DanglingRef {
  from: string; // "stage candanchu-sallent"
  field: string; // "toLocationId"
  missing: string; // the unresolved id
  target: string; // "location"
}

const byId = <T extends { id: string }>(xs: T[]): Map<string, T> =>
  new Map(xs.map((x) => [x.id, x]));

// Location ids referenced inside a ContentBlock[] (water/accommodation/map/itinerary).
function blockRefs(blocks: ContentBlock[]): {
  locationIds: string[];
  highlightIds: string[];
  legIds: string[];
} {
  const locationIds: string[] = [];
  const highlightIds: string[] = [];
  const legIds: string[] = [];
  for (const b of blocks) {
    if (b.kind === 'water') locationIds.push(...b.stops.map((s) => s.locationId));
    else if (b.kind === 'accommodation') locationIds.push(...b.places.map((p) => p.locationId));
    else if (b.kind === 'map')
      locationIds.push(
        ...b.markers.filter((m) => m.kind === 'location' && m.id).map((m) => m.id as string),
      );
    else if (b.kind === 'highlights') highlightIds.push(...b.highlightIds);
    else if (b.kind === 'itinerary') legIds.push(...b.legIds);
  }
  return { locationIds, highlightIds, legIds };
}

/**
 * Validate + index authored packs into a hydration-split store. Throws on the first
 * batch of dangling references or objective-shape violations (with the full list).
 */
export function importPacks(input: SeedInput): ImportedStore {
  const continents = byId(input.continents);
  const countries = byId(input.countries);
  const ranges = byId(input.ranges ?? []);
  const regions = byId(input.regions);
  const locations = byId(input.locations);
  const pois = byId(input.pois);
  const highlights = byId(input.highlights);
  const media = byId(input.media ?? []);

  const objectives = new Map<string, Objective>();
  const sections = new Map<string, Section>();
  const stages = new Map<string, Stage>();
  const routes = new Map<string, Route>();
  const legs = new Map<string, Leg>();

  for (const t of input.trails) {
    objectives.set(t.objective.id, t.objective);
    for (const s of t.sections) sections.set(s.id, s);
    for (const s of t.stages) stages.set(s.id, s);
  }
  for (const p of input.peaks) {
    objectives.set(p.objective.id, p.objective);
    for (const r of p.routes) routes.set(r.id, r);
    for (const l of p.legs) legs.set(l.id, l);
  }

  // ── Referential integrity ──────────────────────────────────────────────────
  const dangling: DanglingRef[] = [];
  const check = (
    from: string,
    field: string,
    ids: string[],
    pool: Map<string, unknown>,
    target: string,
  ) => {
    for (const id of ids) if (!pool.has(id)) dangling.push({ from, field, missing: id, target });
  };

  for (const c of countries.values())
    check(`country ${c.id}`, 'continentId', [c.continentId], continents, 'continent');
  for (const r of ranges.values())
    check(`range ${r.id}`, 'continentId', [r.continentId], continents, 'continent');
  for (const r of regions.values())
    check(`region ${r.id}`, 'countryId', [r.countryId], countries, 'country');

  for (const o of objectives.values()) {
    assertObjectiveShape(o); // invariant 2 — throws on its own
    check(`objective ${o.id}`, 'regionIds', o.regionIds, regions, 'region');
    if (o.rangeId) check(`objective ${o.id}`, 'rangeId', [o.rangeId], ranges, 'range');
    check(`objective ${o.id}`, 'highlightIds', o.highlightIds, highlights, 'highlight');
    if (o.sectionIds) check(`objective ${o.id}`, 'sectionIds', o.sectionIds, sections, 'section');
    if (o.routeIds) check(`objective ${o.id}`, 'routeIds', o.routeIds, routes, 'route');
  }

  for (const s of sections.values()) {
    check(`section ${s.id}`, 'objectiveId', [s.objectiveId], objectives, 'objective');
    check(`section ${s.id}`, 'regionIds', s.regionIds, regions, 'region');
    check(`section ${s.id}`, 'stageIds', s.stageIds, stages, 'stage');
    check(`section ${s.id}`, 'highlightIds', s.highlightIds, highlights, 'highlight');
    check(
      `section ${s.id}`,
      'resupply',
      s.resupply.map((p) => p.locationId),
      locations,
      'location',
    );
    check(
      `section ${s.id}`,
      'refuges',
      s.refuges.map((p) => p.locationId),
      locations,
      'location',
    );
  }

  for (const s of stages.values()) {
    check(`stage ${s.id}`, 'sectionId', [s.sectionId], sections, 'section');
    check(`stage ${s.id}`, 'fromLocationId', [s.fromLocationId], locations, 'location');
    check(`stage ${s.id}`, 'toLocationId', [s.toLocationId], locations, 'location');
    check(`stage ${s.id}`, 'highlightIds', s.highlightIds, highlights, 'highlight');
    const refs = blockRefs(s.blocks);
    check(`stage ${s.id}`, 'blocks.location', refs.locationIds, locations, 'location');
    check(`stage ${s.id}`, 'blocks.highlight', refs.highlightIds, highlights, 'highlight');
  }

  for (const r of routes.values()) {
    check(`route ${r.id}`, 'objectiveId', [r.objectiveId], objectives, 'objective');
    check(`route ${r.id}`, 'legIds', r.legIds, legs, 'leg');
    check(`route ${r.id}`, 'highlightIds', r.highlightIds, highlights, 'highlight');
    const refs = blockRefs(r.blocks);
    check(`route ${r.id}`, 'blocks.location', refs.locationIds, locations, 'location');
    check(`route ${r.id}`, 'blocks.leg', refs.legIds, legs, 'leg');
  }

  for (const l of legs.values()) {
    check(`leg ${l.id}`, 'routeId', [l.routeId], routes, 'route');
    if (l.fromLocationId)
      check(`leg ${l.id}`, 'fromLocationId', [l.fromLocationId], locations, 'location');
    if (l.toLocationId)
      check(`leg ${l.id}`, 'toLocationId', [l.toLocationId], locations, 'location');
  }

  if (dangling.length > 0) {
    const lines = dangling.map(
      (d) => `  ${d.from}.${d.field} → missing ${d.target} "${d.missing}"`,
    );
    throw new Error(
      `Import failed — ${dangling.length} dangling reference(s):\n${lines.join('\n')}`,
    );
  }

  // ── Hydration boundary: derive summaries (strip blocks/guide/children) ───────
  const objectiveSummaries = new Map<string, ObjectiveSummary>();
  for (const o of objectives.values())
    objectiveSummaries.set(o.id, {
      id: o.id,
      slug: o.slug,
      name: o.name,
      type: o.type,
      regionIds: o.regionIds,
      rangeId: o.rangeId,
      tagline: o.tagline,
      heroMediaId: o.heroMediaId,
      summary: o.summary,
      atAGlance: o.atAGlance,
      sectionIds: o.sectionIds,
      routeIds: o.routeIds,
    });

  const sectionSummaries = new Map<string, SectionSummary>();
  for (const s of sections.values())
    sectionSummaries.set(s.id, {
      id: s.id,
      objectiveId: s.objectiveId,
      order: s.order,
      name: s.name,
      tagline: s.tagline,
      heroMediaId: s.heroMediaId,
      regionIds: s.regionIds,
      summary: s.summary,
      atAGlance: s.atAGlance,
      stageIds: s.stageIds,
    });

  const stageSummaries = new Map<string, StageSummary>();
  for (const s of stages.values())
    stageSummaries.set(s.id, {
      id: s.id,
      sectionId: s.sectionId,
      number: s.number,
      name: s.name,
      fromLocationId: s.fromLocationId,
      toLocationId: s.toLocationId,
      heroMediaId: s.heroMediaId,
      grade: s.grade,
      atAGlance: s.atAGlance,
    });

  const routeSummaries = new Map<string, RouteSummary>();
  for (const r of routes.values())
    routeSummaries.set(r.id, {
      id: r.id,
      objectiveId: r.objectiveId,
      name: r.name,
      tagline: r.tagline,
      grade: r.grade,
      atAGlance: r.atAGlance,
      legIds: r.legIds,
    });

  return {
    continents,
    countries,
    ranges,
    regions,
    locations,
    pois,
    highlights,
    media,
    objectives,
    sections,
    stages,
    routes,
    legs,
    objectiveSummaries,
    sectionSummaries,
    stageSummaries,
    routeSummaries,
  };
}
