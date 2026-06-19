// Per-trail structural-ingest config (§8) — DERIVED from the single trail registry
// (@roam/pipeline TRAIL_DEFS). seed.ts reads getSeedConfig(trailId); everything trail-
// specific (corridor, etapas, regions, ways cache, ascent) comes from the one descriptor.

import { type Gr11Etapa, type RegionDef, TRAIL_DEFS, type TrailConfig } from '@roam/pipeline';

export type { RegionDef };

export interface SeedConfig {
  config: TrailConfig;
  etapas: readonly Gr11Etapa[];
  regions: RegionDef[];
  /** Cached Overpass files under packages/db/data/. */
  waysFile: string;
  relationFile?: string;
  ascentM: number;
}

export function getSeedConfig(trailId: string): SeedConfig {
  const d = TRAIL_DEFS[trailId];
  if (!d) {
    throw new Error(`No trail "${trailId}" in the registry — add it to @roam/pipeline trails.ts.`);
  }
  return {
    config: d.trail,
    etapas: d.etapas,
    regions: d.regions,
    waysFile: d.waysFile,
    relationFile: d.relationFile,
    ascentM: d.ascentM,
  };
}
