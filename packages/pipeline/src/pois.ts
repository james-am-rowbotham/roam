// POI registry (§8) — the config that drives unified POI ingestion into the `pois` table.
// Adding a POI type is adding an entry here: no new code, no new table, no migration. Each
// kind names its Overpass node selectors (OR'd), the corridor proximity, and how to derive
// the category-specific `meta`. `category` is the stored type (water | refuge | hut | …).

export interface PoiKind {
  /** Unique registry key. */
  key: string;
  /** Stored category — the POI's type (water | refuge | hut | campsite | spring | viewpoint | …). */
  category: string;
  /** Overpass node tag selectors, OR'd: e.g. ['"natural"="spring"', '"amenity"="drinking_water"']. */
  overpass: string[];
  /** Max distance from the route line to attach the POI (metres). */
  proximityM: number;
  /** Skip nodes without a `name` tag (e.g. campsites). */
  requireName?: boolean;
  /** Category-specific fields derived from the OSM tags, stored as `pois.meta`. */
  meta?: (tags: Record<string, string>) => Record<string, unknown>;
}

const seasonal = (t: Record<string, string>): boolean =>
  t.seasonal === 'yes' || (t.opening_hours?.includes('summer') ?? false);

const capacity = (t: Record<string, string>): number | null =>
  t.capacity ? Number.parseInt(t.capacity, 10) : null;

const bookingUrl = (t: Record<string, string>): string | null =>
  t.website ?? t['contact:website'] ?? null;

// A staffed/unstaffed sleeping place — shared meta shape (the old accommodations columns).
const stayMeta = (t: Record<string, string>) => ({
  seasonal: seasonal(t),
  capacity: capacity(t),
  bookingUrl: bookingUrl(t),
});

export const POI_KINDS: PoiKind[] = [
  {
    key: 'water',
    category: 'water',
    overpass: ['"natural"="spring"', '"amenity"="drinking_water"'],
    proximityM: 500,
    requireName: true,
    meta: (t) => ({ seasonal: seasonal(t) || t.intermittent === 'yes' }),
  },
  {
    key: 'refuge',
    category: 'refuge',
    overpass: ['"tourism"="alpine_hut"'],
    proximityM: 2000,
    requireName: true,
    meta: stayMeta,
  },
  {
    key: 'hut',
    category: 'hut',
    overpass: ['"tourism"="wilderness_hut"'],
    proximityM: 2000,
    requireName: true,
    meta: stayMeta,
  },
  {
    key: 'campsite',
    category: 'campsite',
    overpass: ['"tourism"="camp_site"'],
    proximityM: 2000,
    requireName: true,
    meta: stayMeta,
  },
];

// Categories that are places to sleep (→ the pack's accommodation layer); the rest are
// water/hazard/etc. Derived from the registry so a new stay kind is still just a variable.
export const STAY_CATEGORIES = ['refuge', 'hut', 'campsite', 'hotel', 'hostel'];
