// Pure helpers for the active-journey map: find the next POI ahead along the
// walking direction (1-D chainage lookups, §7) and frame the camera on a stage.

import { geometryViewport } from './geo';

type Coords2D = [number, number];

/** The nearest POI ahead of a chainage position in the walking direction. */
export function nextPoiAhead<T extends { chainageM: number }>(
  pois: T[],
  fromChainageM: number,
  reverse: boolean,
): { poi: T; distanceM: number } | null {
  let best: T | null = null;
  for (const p of pois) {
    const ahead = reverse ? p.chainageM < fromChainageM : p.chainageM > fromChainageM;
    if (!ahead) continue;
    if (best === null || (reverse ? p.chainageM > best.chainageM : p.chainageM < best.chainageM)) {
      best = p;
    }
  }
  return best ? { poi: best, distanceM: Math.abs(best.chainageM - fromChainageM) } : null;
}

/** Pull a LineString's coordinates out of a Feature or bare geometry. */
function lineCoords(geojson: unknown): Coords2D[] | null {
  if (!geojson || typeof geojson !== 'object') return null;
  const g = ('geometry' in geojson ? (geojson as { geometry: unknown }).geometry : geojson) as {
    coordinates?: unknown;
  };
  const c = g?.coordinates;
  if (!Array.isArray(c)) return null;
  if (Array.isArray(c[0]) && typeof (c[0] as unknown[])[0] === 'number') return c as Coords2D[];
  if (Array.isArray(c[0]) && Array.isArray((c[0] as unknown[])[0])) {
    return (c as Coords2D[][]).flat();
  }
  return null;
}

/**
 * The portion of the (simplified) trail line covering a stage's chainage range.
 * Chainage maps to a fraction of the line — approximate, but fine for drawing a
 * highlight and framing the camera. Null when the line can't be read.
 */
export function stageSubGeometry(
  geojson: unknown,
  startChainageM: number,
  endChainageM: number,
  totalM: number | null | undefined,
): { type: 'LineString'; coordinates: Coords2D[] } | null {
  const line = lineCoords(geojson);
  if (!line || line.length < 2 || !totalM) return null;
  const n = line.length;
  const f0 = Math.min(startChainageM, endChainageM) / totalM;
  const f1 = Math.max(startChainageM, endChainageM) / totalM;
  const i0 = Math.max(0, Math.floor(f0 * (n - 1)));
  const i1 = Math.min(n - 1, Math.ceil(f1 * (n - 1)));
  const slice = line.slice(i0, i1 + 1);
  if (slice.length < 2) return null;
  return { type: 'LineString', coordinates: slice };
}

/** Frame the camera on a stage (falls back to the whole line). */
export function stageViewport(
  geojson: unknown,
  startChainageM: number,
  endChainageM: number,
  totalM: number | null | undefined,
): { center: Coords2D; zoom: number } | null {
  const sub = stageSubGeometry(geojson, startChainageM, endChainageM, totalM);
  return geometryViewport(sub ?? (geojson as Record<string, unknown> | null));
}
