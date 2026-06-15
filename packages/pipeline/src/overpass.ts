// Overpass access — the Extract stage's window onto OSM (§8.1). Pulls the route
// relation's ways and nearby POIs. Trail-agnostic: every query is built from a
// TrailConfig, never hardcoded.

const OVERPASS_MIRRORS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const HEADERS = { 'User-Agent': 'roam-app/0.1 (trail data pipeline, contact: dev@roam.app)' };

export interface OverpassWay {
  type: 'way';
  id: number;
  geometry: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

export interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export type OverpassElement = OverpassWay | OverpassNode;

// Try each mirror in order; accept the first non-empty response. An empty result
// usually means a mirror is lagging/rate-limited rather than the query being wrong,
// so we fall through to the next instead of treating empty as success.
export async function overpass(query: string): Promise<{ elements: OverpassElement[] }> {
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(`${mirror}?data=${encodeURIComponent(query.trim())}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(300_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements: OverpassElement[] };
      if (data.elements.length > 0) return data;
      console.log(`  ${mirror} returned empty — trying next…`);
    } catch {
      console.log(`  ${mirror} failed — trying next…`);
    }
  }
  throw new Error('All Overpass mirrors failed');
}

// The single most common value of an OSM tag across a set of ways — the fallback
// for waymark resolution when the route relation's own tags aren't available
// (most member ways don't carry osmc:symbol/network; a few do incidentally).
export function dominantTag(
  ways: Array<{ tags?: Record<string, string> }>,
  key: string,
): string | null {
  const counts = new Map<string, number>();
  for (const w of ways) {
    const v = w.tags?.[key];
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}
