// In-memory repository (Implementation Pass §5.2) — the first RoamRepo implementation,
// backed by the importer's store. The hydration boundary is real here: list methods
// return summary maps, detail methods return full records. When this moves to the local
// store, the interface is unchanged — only this file is swapped.

import type { ImportedStore } from './importer';
import type {
  ObjectiveSummary,
  RoamRepo,
  RouteSummary,
  SectionSummary,
  StageSummary,
} from './repo';

export function createMemoryRepo(store: ImportedStore): RoamRepo {
  const get = <T>(map: Map<string, T>, id: string, kind: string): Promise<T> => {
    const v = map.get(id);
    return v ? Promise.resolve(v) : Promise.reject(new Error(`${kind} not found: "${id}"`));
  };

  return {
    getContinent: (id) => get(store.continents, id, 'continent'),
    getCountry: (id) => get(store.countries, id, 'country'),
    getRegion: (id) => get(store.regions, id, 'region'),

    listCountries: (continentId) =>
      Promise.resolve([...store.countries.values()].filter((c) => c.continentId === continentId)),
    listRegions: (countryId) =>
      Promise.resolve([...store.regions.values()].filter((r) => r.countryId === countryId)),

    listObjectivesByRegion: (regionId) =>
      Promise.resolve(
        [...store.objectiveSummaries.values()].filter((o): o is ObjectiveSummary =>
          o.regionIds.includes(regionId),
        ),
      ),

    listObjectives: () => Promise.resolve([...store.objectiveSummaries.values()]),

    getObjective: (id) => get(store.objectives, id, 'objective'),

    listSections: (objectiveId) =>
      Promise.resolve(
        [...store.sectionSummaries.values()]
          .filter((s): s is SectionSummary => s.objectiveId === objectiveId)
          .sort((a, b) => a.order - b.order),
      ),

    listRoutes: (objectiveId) =>
      Promise.resolve(
        [...store.routeSummaries.values()].filter(
          (r): r is RouteSummary => r.objectiveId === objectiveId,
        ),
      ),

    getSection: (id) => get(store.sections, id, 'section'),

    listStages: (sectionId) =>
      Promise.resolve(
        [...store.stageSummaries.values()]
          .filter((s): s is StageSummary => s.sectionId === sectionId)
          .sort((a, b) => a.number - b.number),
      ),

    getStage: (id) => get(store.stages, id, 'stage'),
    getRoute: (id) => get(store.routes, id, 'route'),
    getLocation: (id) => get(store.locations, id, 'location'),
    getPOI: (id) => get(store.pois, id, 'poi'),
  };
}
