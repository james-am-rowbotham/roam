// Per-trail structural-ingest config (§8) — the "config row" for db:seed. Everything the
// OSM → Postgres seed needs that varies by trail: the OSM/corridor config, the curated
// etapas (the Stage layer), the coarse regions (the Region layer), the cached ways/relation
// files, and the route's total ascent (until DEM-derived). Adding a trail = an entry here
// + its data files (`<trail>-ways.json`, `<trail>-etapas.ts`). seed.ts is otherwise generic.

import {
  GR10,
  GR10_ETAPAS,
  GR11,
  GR11_ETAPAS,
  type Gr11Etapa,
  type TrailConfig,
} from '@roam/pipeline';

/** A coarse region (§5) owning an inclusive range of etapas up to `untilStage`. */
export interface RegionDef {
  name: string;
  description: string;
  untilStage: number;
}

export interface SeedConfig {
  config: TrailConfig;
  etapas: readonly Gr11Etapa[];
  regions: RegionDef[];
  /** Cached Overpass files under packages/db/data/. */
  waysFile: string;
  relationFile?: string;
  /** Total route ascent/descent until a DEM pass replaces it. */
  ascentM: number;
}

const GR11_REGIONS: RegionDef[] = [
  {
    name: 'Basque Country & Navarre',
    description: 'From Cabo Higuer, passing through forests and coastal hills.',
    untilStage: 8,
  },
  {
    name: 'Aragonese Pyrenees',
    description:
      'Higher, rugged alpine terrain, passing through locations like Candanchú and the Respomuso Hut.',
    untilStage: 15,
  },
  {
    name: 'Ordesa & High Country',
    description:
      'Includes the scenic Ordesa National Park and the high limestone, passing through Góriz and Viadós.',
    untilStage: 22,
  },
  {
    name: 'Andorra & Pallars High Country',
    description:
      'Traverses granite landscapes in Andorra and the Catalan Pyrenees, including areas like Colomèrs.',
    untilStage: 34,
  },
  {
    name: 'Eastern Pyrenees',
    description:
      'Descending through forests and valleys towards the Mediterranean coast at Cap de Creus.',
    untilStage: 46,
  },
];

// GR10's coarse regions (§5) — the French Pyrenean départements/massifs, west→east.
const GR10_REGIONS: RegionDef[] = [
  {
    name: 'Pays Basque',
    description: 'Green Atlantic foothills from Hendaye through the Basque country.',
    untilStage: 9,
  },
  {
    name: 'Haut-Béarn',
    description: 'The Aspe and Ossau valleys into the first high country.',
    untilStage: 15,
  },
  {
    name: 'Bigorre',
    description: 'Cauterets, Gavarnie and the high Hautes-Pyrénées.',
    untilStage: 23,
  },
  {
    name: 'Luchonnais',
    description: 'The Louron and Larboust valleys around Luchon.',
    untilStage: 29,
  },
  {
    name: 'Couserans',
    description: 'The remote western Ariège — Biros, Bethmale and Bassiès.',
    untilStage: 37,
  },
  {
    name: 'Haute-Ariège',
    description: 'The high eastern Ariège to the Carlit and Bouillouses.',
    untilStage: 46,
  },
  {
    name: 'Catalan Pyrenees',
    description: 'Cerdagne, Canigou and the descent to the Mediterranean at Banyuls.',
    untilStage: 55,
  },
];

export const SEED_CONFIGS: Record<string, SeedConfig> = {
  gr11: {
    config: GR11,
    etapas: GR11_ETAPAS,
    regions: GR11_REGIONS,
    waysFile: 'gr11-ways.json',
    relationFile: 'gr11-relation.json',
    ascentM: 47_000,
  },
  gr10: {
    config: GR10,
    etapas: GR10_ETAPAS,
    regions: GR10_REGIONS,
    waysFile: 'gr10-ways.json',
    relationFile: 'gr10-relation.json',
    ascentM: 55_000,
  },
};

export function getSeedConfig(trailId: string): SeedConfig {
  const c = SEED_CONFIGS[trailId];
  if (!c) {
    throw new Error(
      `No seed config for "${trailId}" — add it to seedConfigs.ts (config + etapas + regions + ways file).`,
    );
  }
  return c;
}
