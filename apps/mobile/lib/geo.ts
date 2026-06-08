type Coords2D = [number, number];

function flattenCoords(geometry: Record<string, unknown>): Coords2D[] {
  const type = geometry.type as string;
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
