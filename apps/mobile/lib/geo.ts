export type Coords2D = [number, number];

export function flattenCoords(geometry: Record<string, unknown>): Coords2D[] {
  const type = geometry.type as string;
  // Unwrap a Feature to its geometry.
  if (type === 'Feature' && geometry.geometry && typeof geometry.geometry === 'object') {
    return flattenCoords(geometry.geometry as Record<string, unknown>);
  }
  const coords = geometry.coordinates as unknown;

  if (type === 'Point' && Array.isArray(coords)) {
    return [[coords[0] as number, coords[1] as number]];
  }
  if (type === 'LineString' && Array.isArray(coords)) {
    return coords as Coords2D[];
  }
  if (type === 'MultiLineString' && Array.isArray(coords)) {
    return (coords as Coords2D[][]).flat();
  }
  return [];
}

// Bounding box [minLng, minLat, maxLng, maxLat]
function geometryBbox(geometry: Record<string, unknown>): [number, number, number, number] | null {
  const pts = flattenCoords(geometry);
  if (pts.length === 0) return null;
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const [lng, lat] of pts) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

// Approximate zoom that fits the bbox on screen with some padding
function bboxZoom(bbox: [number, number, number, number]): number {
  const lngSpan = bbox[2] - bbox[0];
  const latSpan = bbox[3] - bbox[1];
  const maxSpan = Math.max(lngSpan, latSpan);
  if (maxSpan < 0.2) return 11;
  if (maxSpan < 0.5) return 10;
  if (maxSpan < 1.0) return 9;
  if (maxSpan < 2.0) return 8;
  if (maxSpan < 4.0) return 7;
  return 6;
}

// Compute the approximate centre of a GeoJSON geometry.
export function geometryCenter(
  geometry: Record<string, unknown> | null | undefined,
): Coords2D | null {
  if (!geometry) return null;
  const pts = flattenCoords(geometry);
  if (pts.length === 0) return null;
  const mid = pts[Math.floor(pts.length / 2)];
  return mid ?? null;
}

// Compute center + zoom that frames the full geometry.
export function geometryViewport(
  geometry: Record<string, unknown> | null | undefined,
): { center: Coords2D; zoom: number } | null {
  if (!geometry) return null;
  const bbox = geometryBbox(geometry);
  if (!bbox) return null;
  const center: Coords2D = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
  return { center, zoom: bboxZoom(bbox) };
}

const EARTH_RADIUS_M = 6_371_000;
const DEG = Math.PI / 180;

/** Great-circle distance between two lng/lat points, in metres. */
export function haversineM([lng1, lat1]: Coords2D, [lng2, lat2]: Coords2D): number {
  const dLat = (lat2 - lat1) * DEG;
  const dLng = (lng2 - lng1) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Project a lng/lat point onto a line and locate it along it.
 *
 * Returns `fraction` (0..1, the projected point's distance along the line ÷ total
 * line length) and `offRouteM` (how far the point sits from the line). Multiply
 * `fraction` by the route's real length to get chainage (§7) — the same
 * fraction↔chainage approximation `stageSubGeometry` uses, since on device we
 * only hold the simplified line. Null when the geometry isn't a usable line.
 *
 * Per-segment lengths use haversine; the projection onto each segment uses a
 * local equirectangular approximation (accurate at the short segment scale).
 */
export function locateOnLine(
  geometry: Record<string, unknown> | null | undefined,
  point: Coords2D,
): { fraction: number; offRouteM: number } | null {
  if (!geometry) return null;
  const pts = flattenCoords(geometry);
  if (pts.length < 2) return null;

  // Cumulative length to each vertex.
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1] as Coords2D;
    const curr = pts[i] as Coords2D;
    cum.push((cum[i - 1] as number) + haversineM(prev, curr));
  }
  const totalM = cum[cum.length - 1] as number;
  if (totalM <= 0) return null;

  // Metres-per-degree at the query latitude, for the planar segment projection.
  const mPerDegLat = EARTH_RADIUS_M * DEG;
  const mPerDegLng = mPerDegLat * Math.cos(point[1] * DEG);
  const toXY = ([lng, lat]: Coords2D): Coords2D => [lng * mPerDegLng, lat * mPerDegLat];
  const p = toXY(point);

  let bestOff = Number.POSITIVE_INFINITY;
  let bestDist = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = toXY(pts[i - 1] as Coords2D);
    const b = toXY(pts[i] as Coords2D);
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const segLen2 = abx * abx + aby * aby;
    const t = segLen2 > 0 ? ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / segLen2 : 0;
    const ct = Math.max(0, Math.min(1, t));
    const projX = a[0] + ct * abx;
    const projY = a[1] + ct * aby;
    const off = Math.hypot(p[0] - projX, p[1] - projY);
    if (off < bestOff) {
      bestOff = off;
      const segM = (cum[i] as number) - (cum[i - 1] as number);
      bestDist = (cum[i - 1] as number) + ct * segM;
    }
  }

  return { fraction: bestDist / totalM, offRouteM: bestOff };
}
