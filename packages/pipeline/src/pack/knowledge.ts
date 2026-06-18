// TrailKnowledge — the normalized intermediate between ingested trail data (Postgres)
// and the @roam/content pack. The DB reader produces this; buildTrailPack consumes it.
// Decoupling the two means the pure mapping is testable from fixtures (no DB), and the
// source can change (Postgres now, a file later) without touching the mapping.

export interface KnowledgeRegion {
  /** Stable slug for the coarse region, e.g. 'aragonese-pyrenees'. */
  id: string;
  name: string;
  description: string;
  orderIndex: number;
}

export interface KnowledgeStage {
  /** Etapa order along the trail, 1-based. */
  number: number;
  name: string;
  regionId: string; // the coarse region this etapa belongs to
  startChainageM: number;
  endChainageM: number;
  ascentM: number | null;
  descentM: number | null;
  /** Shared-location ids for the etapa's start/end (computed at boundaries). */
  fromLocationId: string;
  toLocationId: string;
}

export interface KnowledgeLocation {
  id: string;
  name: string;
  type: string; // open vocab (placeTypes registry)
  lat: number;
  lng: number;
}

export interface TrailKnowledge {
  routeName: string;
  lengthM: number;
  /** Ordered elevation samples along the route: distance-from-start + elevation, metres. */
  elevationProfile: { d: number; e: number }[];
  regions: KnowledgeRegion[];
  stages: KnowledgeStage[];
  locations: KnowledgeLocation[];
}
