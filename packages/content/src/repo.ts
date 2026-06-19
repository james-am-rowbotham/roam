// Repository interface + hydration boundary (Implementation Pass §5.2).
//
// List/summary views load summaries + child ids only; detail views inline full child
// content. Encoding this in the contract is what stops a screen over-fetching — a
// list never pulls `blocks`/`guide`. The first implementation reads bundled JSON
// content packs; the interface stays identical when it moves to the local store.

import type {
  Continent,
  Country,
  Grade,
  Location,
  Objective,
  ObjectiveType,
  POI,
  Range,
  Region,
  Route,
  Section,
  Stage,
  Stat,
} from './types';

// ── Summary projections (the lean shape for list/card views) ────────────────
// Summaries carry card-facing fields + child ids, and deliberately OMIT heavy
// content (`blocks`, `guide`, nested children) so list queries stay cheap.

export interface ObjectiveSummary {
  id: string;
  slug: string;
  name: string;
  type: ObjectiveType;
  regionIds: string[];
  rangeId?: string;
  tagline: string;
  heroMediaId: string;
  summary: string;
  atAGlance: Stat[];
  sectionIds?: string[];
  routeIds?: string[];
}

export interface SectionSummary {
  id: string;
  objectiveId: string;
  order: number;
  name: string;
  tagline: string;
  heroMediaId: string;
  regionIds: string[];
  summary: string;
  atAGlance: Stat[];
  stageIds: string[];
}

export interface StageSummary {
  id: string;
  sectionId: string;
  number: number;
  name: string;
  fromLocationId: string;
  toLocationId: string;
  grade: Grade;
  atAGlance: Stat[];
}

export interface RouteSummary {
  id: string;
  objectiveId: string;
  name: string;
  tagline: string;
  grade: Grade;
  atAGlance: Stat[];
  legIds: string[];
}

export interface RoamRepo {
  // discovery
  getContinent(id: string): Promise<Continent>;
  getCountry(id: string): Promise<Country>;
  getRegion(id: string): Promise<Region>;
  getRange(id: string): Promise<Range>;
  /** Countries / ranges under a continent, regions under a country (the discovery lists).
   *  These are flat (no heavy content) so they return whole. */
  listCountries(continentId: string): Promise<Country[]>;
  listRanges(continentId: string): Promise<Range[]>;
  listRegions(countryId: string): Promise<Region[]>;
  /** Every objective that *touches* this region (invariant 3), summaries only. */
  listObjectivesByRegion(regionId: string): Promise<ObjectiveSummary[]>;
  /** Every objective in this mountain range (cross-country), summaries only. */
  listObjectivesByRange(rangeId: string): Promise<ObjectiveSummary[]>;

  // objective
  /** Every objective in the pack, summaries only — the Home / browse entry. */
  listObjectives(): Promise<ObjectiveSummary[]>;
  getObjective(id: string): Promise<Objective>;
  listSections(objectiveId: string): Promise<SectionSummary[]>;
  listRoutes(objectiveId: string): Promise<RouteSummary[]>;

  // detail (full content inlined)
  getSection(id: string): Promise<Section>;
  listStages(sectionId: string): Promise<StageSummary[]>;
  getStage(id: string): Promise<Stage>;
  getRoute(id: string): Promise<Route>;

  // shared
  getLocation(id: string): Promise<Location>;
  getPOI(id: string): Promise<POI>;
}
