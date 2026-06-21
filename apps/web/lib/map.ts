import type { Geometry } from 'geojson';

// A point of interest along a trail (water, refuge, hazard…) shown on the map
// when its trail is selected (§17). Linear-referenced in the DB; here we just
// carry the marker kind + coordinates + name.
export type PoiKind = 'water' | 'refuge' | 'food' | 'viewpoint' | 'historic' | 'hazard';
export interface PoiPoint {
  id: string;
  kind: PoiKind;
  name: string;
  lng: number;
  lat: number;
}

// One trail drawn on the map: a stable `id` (so the map can reconcile which
// routes changed across filters instead of re-drawing everything), its route
// geometry, the painted way colour for the line (§17.8), and its POIs (shown
// when the trail is selected). Selection/highlighting is driven by the map's
// `selectedId` prop.
export interface MapRoute {
  id: string;
  geometry: Geometry | null;
  color?: string;
  pois?: PoiPoint[];
}

// Marker palette (§16) — the warm POI colours; markers never use the accent.
export const POI_COLORS: Record<PoiKind, string> = {
  water: '#4D7A8C',
  refuge: '#A0683C',
  food: '#6B8456',
  viewpoint: '#58836B',
  historic: '#7C6E5C',
  hazard: '#A32D2D',
};

// Collision priority — water always wins a label fight (§17.3): a missed water
// source is the only dangerous POI mistake.
export const POI_SORT: Record<PoiKind, number> = {
  water: 1,
  refuge: 2,
  hazard: 3,
  food: 4,
  viewpoint: 5,
  historic: 6,
};

// Map config kept out of the components so swapping the base style or tile
// source is a config change, not a refactor (the §3 "strict MapView wrapper"
// principle, applied to the web). Today we point at OpenFreeMap's free,
// key-less vector style for the online marketing map; once our own outdoor
// style ships on R2/CDN this URL changes and nothing else does.
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

// Fallback view when no route geometry is available (API down): the Pyrenees,
// Irun (west) to Cap de Creus (east) — the GR11 corridor.
export const PYRENEES_BOUNDS: [[number, number], [number, number]] = [
  [-2.1, 42.2], // SW
  [3.4, 43.4], // NE
];

// The route line colour follows the trail's painted way colour (§17.8); GR11 is
// red. We default to ink when a trail has no symbol.
export const ROUTE_INK = '#26231e';
