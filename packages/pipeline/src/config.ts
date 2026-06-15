// Per-trail ingestion config (§8). Adding the Nth trail should be a new config
// entry, not new code: the same Extract→Normalise stages run for any trail from
// the fields here. GR11 is the first; flagship trails get hand-finished after.

export interface TrailBBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface TrailConfig {
  /** Stable slug — used in logs and as the ingestion key. */
  id: string;
  /** Route display name seeded onto the `routes` row. */
  name: string;
  /** Official waymark ref, e.g. "GR11". */
  ref: string;
  /** Human description seeded onto the route. */
  description?: string;
  country: string;
  region: string;
  /**
   * Canonical OSM route relation id (§8). The preferred Extract key: fetching by
   * relation avoids matching same-ref routes elsewhere (e.g. the Île-de-France
   * "GR 11" that the current ref-based fetch has to bbox-filter out). Left null
   * until the canonical relation is confirmed against live OSM — Extract falls
   * back to ref + bbox while null.
   */
  osmRelationId: number | null;
  /** Corridor bounding box — POI queries, and the fallback ref-based way filter. */
  bbox: TrailBBox;
  /**
   * Waymark tags as read from the route relation (§17.8). When the relation can't
   * be fetched live, these seed the route's `osmc_symbol` / `network` so the blaze
   * still resolves. Mirrors the OSM data; resolved into the painted sign by
   * `resolveWaymark` (@roam/core) at the API boundary.
   */
  waymark: { osmcSymbol: string | null; network: string | null };
}

// GR11 — Senda Pirenaica, Hendaye/Irun → Cap de Creus. The relation tags below
// match the live "Senda Pirenaica" route (network nwn, the white-plate/red-lower
// "11" blaze, §17.8). relation 68861 is the legacy id in CLAUDE.md §8; verify it
// against live OSM before switching Extract from ref+bbox to relation-id.
export const GR11: TrailConfig = {
  id: 'gr11',
  name: 'GR11',
  ref: 'GR11',
  description: 'Sendero de los Pirineos — Hendaye to Cap de Creus',
  country: 'Spain',
  region: 'Pyrenees',
  osmRelationId: null,
  bbox: { south: 42.2, west: -1.9, north: 43.6, east: 3.5 },
  waymark: { osmcSymbol: 'red:white:red_lower:11:black', network: 'nwn' },
};

export const TRAILS: Record<string, TrailConfig> = {
  [GR11.id]: GR11,
};
