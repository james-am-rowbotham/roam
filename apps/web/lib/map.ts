import type { MapTrailCardProps } from '@/components/MapTrailCard';
import type { Geometry } from 'geojson';

// One trail drawn on the map: its route geometry, the painted way colour for the
// line (§17.8), and — for the explore map — a `card` with the trail basics shown
// as a popup over the line. Omit `card` (e.g. on a trail's own page) to draw just
// the line.
export interface MapRoute {
  geometry: Geometry | null;
  color?: string;
  card?: MapTrailCardProps;
}

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
