// Normalise stage (§8.2) — transform raw OSM into canonical fields. Pure and
// testable; the DB-writing orchestration (chainage, regions, sections, POIs)
// still lives in the seed and consumes these (see README "Status").

import type { TrailConfig } from './config';
import { type OverpassWay, dominantTag } from './overpass';

export interface RawWaymarkTags {
  /** The literal painted-blaze encoding (e.g. "red:white:red_lower:11:black"),
   *  stored raw and parsed into the sign by resolveWaymark() at the API boundary. */
  osmcSymbol: string | null;
  /** The OSM network tier (iwn|nwn|rwn|lwn) — sort/filter metadata, never a colour. */
  network: string | null;
}

// Resolve the route's raw waymark tags (§17.8) by precedence:
//   1. the route relation's own tags — authoritative; osmc:symbol/network/ref live
//      on the relation, NOT the member ways (only a few carry them incidentally);
//   2. the dominant member-way tag — a fallback when the relation tags aren't loaded;
//   3. the trail config's recorded fallback — so the blaze still resolves offline
//      even when neither OSM source is available.
// Stored raw; parsing into the painted sign is the API/`resolveWaymark` boundary.
export function resolveRouteWaymark(
  relationTags: Record<string, string> | null,
  ways: OverpassWay[],
  config: TrailConfig,
): RawWaymarkTags {
  const osmcSymbol =
    relationTags?.['osmc:symbol'] ?? dominantTag(ways, 'osmc:symbol') ?? config.waymark.osmcSymbol;
  const network = relationTags?.network ?? dominantTag(ways, 'network') ?? config.waymark.network;
  return { osmcSymbol, network };
}
