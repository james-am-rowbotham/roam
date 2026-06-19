// Per-trail pack config (§8) — DERIVED from the single trail registry (../trails). Adding
// a trail is one TRAIL_DEFS entry; this projects the pack-build view (objective copy,
// country, season) out of it. The same buildPack engine runs for every entry.

import type { TrailConfig } from '../config';
import { TRAIL_DEFS } from '../trails';

export interface PackConfig {
  /** Objective slug, e.g. 'gr11'. */
  id: string;
  type: 'trail' | 'peak';
  /** Discovery country this objective sits under (geography.ts). */
  countryId: string;
  /** The OSM/ingest config — geometry, etapas, POIs, waymark. */
  source: TrailConfig;
  /** Objective hero/summary copy. */
  tagline: string;
  summary: string;
  /** Best-season window for the Guide Overview. `best` = month numbers 1–12. */
  season?: { best: number[]; note: string };
}

export const PACK_CONFIGS: PackConfig[] = Object.values(TRAIL_DEFS).map((d) => ({
  id: d.trail.id,
  type: 'trail',
  countryId: d.countryId,
  source: d.trail,
  tagline: d.tagline,
  summary: d.summary,
  season: d.season,
}));
