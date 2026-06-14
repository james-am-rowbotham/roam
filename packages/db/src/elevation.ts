import type { ElevationPoint } from './schema';

// Build a route's elevation profile by sampling the line at a fixed interval and
// looking each point up against a DEM (Open-Meteo, free, no key). Runs at ingest
// (§7) so the device renders a real profile, never a synthetic one.
//
// PRODUCTION NOTE: the default interval here is coarse (1 km) and Open-Meteo
// rate-limits bursts, so dev profiles are low-resolution. The real pipeline
// should sample much finer (≈100–250 m, or DEM-native) against a LOCAL DEM
// (ASTER/SRTM per §7) — no per-request rate limit, granular terrain. Swap the
// fetch for a local DEM read and drop `intervalM` accordingly before scaling
// past GR11.

type LonLat = [number, number];

const EARTH_R = 6_371_000;
const DEG = Math.PI / 180;

function haversineM([lng1, lat1]: LonLat, [lng2, lat2]: LonLat): number {
  const dLat = (lat2 - lat1) * DEG;
  const dLng = (lng2 - lng1) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

interface Sample {
  coord: LonLat;
  chainageM: number;
}

// Evenly-spaced points along an ordered line, each carrying its chainage (§7).
// Always includes the start and end vertices.
export function sampleAlongLine(coords: LonLat[], intervalM: number): Sample[] {
  const first = coords[0];
  if (!first) return [];
  const out: Sample[] = [{ coord: first, chainageM: 0 }];
  let acc = 0; // chainage at coords[i-1]
  let nextAt = intervalM;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1] as LonLat;
    const b = coords[i] as LonLat;
    const seg = haversineM(a, b);
    while (seg > 0 && nextAt <= acc + seg) {
      const t = (nextAt - acc) / seg;
      out.push({ coord: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], chainageM: nextAt });
      nextAt += intervalM;
    }
    acc += seg;
  }
  const last = coords[coords.length - 1] as LonLat;
  const tail = out[out.length - 1] as Sample;
  if (tail.chainageM < acc - 1) out.push({ coord: last, chainageM: acc });
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One batch, retrying on 429/5xx with backoff (Open-Meteo rate-limits bursts).
async function fetchBatch(batch: Sample[]): Promise<{ elevation: number[] }> {
  const lat = batch.map((s) => s.coord[1].toFixed(5)).join(',');
  const lng = batch.map((s) => s.coord[0].toFixed(5)).join(',');
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url);
    if (res.ok) return (await res.json()) as { elevation: number[] };
    if (res.status !== 429 && res.status < 500)
      throw new Error(`Open-Meteo elevation ${res.status}`);
    await sleep(6000 * (attempt + 1)); // 6s, 12s, 18s … the free tier limits bursts hard
  }
  throw new Error('Open-Meteo elevation: rate-limited after retries');
}

// Look the samples up against the Open-Meteo elevation DEM (batched ≤100/request,
// throttled so we don't trip the rate limit).
async function fetchElevations(samples: Sample[]): Promise<ElevationPoint[]> {
  const profile: ElevationPoint[] = [];
  const BATCH = 100;
  for (let i = 0; i < samples.length; i += BATCH) {
    const batch = samples.slice(i, i + BATCH);
    if (i > 0) await sleep(8000); // space out requests under the rate limit
    const data = await fetchBatch(batch);
    batch.forEach((s, j) =>
      profile.push({ d: Math.round(s.chainageM), e: Math.round(data.elevation[j] ?? 0) }),
    );
  }
  return profile;
}

// Sample + DEM-lookup a route's line into an elevation profile.
export async function buildElevationProfile(
  coords: LonLat[],
  intervalM = 1000,
): Promise<ElevationPoint[]> {
  return fetchElevations(sampleAlongLine(coords, intervalM));
}
