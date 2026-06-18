// Per-trail pack config (§8) — adding a trail is a config entry, not new code. Each
// references the OSM/ingest TrailConfig (geometry, etapas, POIs) and the discovery
// country it sits under, plus editorial hero copy for the objective. The same
// buildPack engine runs for every entry.

import { GR11, type TrailConfig } from '../config';

export interface PackConfig {
  /** Objective slug, e.g. 'gr11'. */
  id: string;
  type: 'trail' | 'peak';
  /** Discovery country this objective sits under (geography.ts). */
  countryId: string;
  /** The OSM/ingest config — geometry, etapas, POIs, waymark. */
  source: TrailConfig;
  /** Objective hero/summary copy (curation-owned; placeholder for now). */
  tagline: string;
  summary: string;
}

export const PACK_CONFIGS: PackConfig[] = [
  {
    id: 'gr11',
    type: 'trail',
    countryId: 'spain',
    source: GR11,
    tagline: 'Pyrenees High Route · Spain', // TODO(copy)
    summary:
      'The Senda Pirenaica traces the Spanish Pyrenees coast to coast — from Hondarribia on the Atlantic to Cap de Creus on the Mediterranean, waymarked red-and-white the whole way.', // TODO(copy)
  },
];
