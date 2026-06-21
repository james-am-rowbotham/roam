// Re-sample every route's elevation profile at a finer interval and update routes.elevation_profile
// in place — no full re-seed needed (POIs/sections untouched). Then run `pack:build`.
//
//   bun --env-file=.env src/refresh-elevation.ts            # all routes @ ELEVATION_INTERVAL_M
//   bun --env-file=.env src/refresh-elevation.ts --interval=500
//
// Why this exists: stage elevation charts looked featureless because the stored profile was
// coarse (~1–2 km), so a 12 km stage carried only ~6 points (§7). Finer sampling fixes it.
// Open-Meteo is rate-limited, so a whole trail takes a few minutes — that's expected.

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { ELEVATION_INTERVAL_M, buildElevationProfile } from './elevation';
import { routes } from './schema';

type LonLat = [number, number];

const intervalArg = process.argv.find((a) => a.startsWith('--interval='))?.split('=')[1];
const intervalM = intervalArg ? Number(intervalArg) : ELEVATION_INTERVAL_M;

const client = postgres(process.env.DATABASE_URL ?? '', { max: 1, prepare: false });
const db = drizzle(client);

const rows = await client<{ id: number; name: string; gj: string }[]>`
  SELECT id, name, ST_AsGeoJSON(geom) AS gj FROM routes WHERE geom IS NOT NULL ORDER BY id`;

console.log(`Refreshing elevation for ${rows.length} route(s) @ ${intervalM} m\n`);
for (const r of rows) {
  const geom = JSON.parse(r.gj) as { type: string; coordinates: LonLat[] | LonLat[][] };
  const coords: LonLat[] =
    geom.type === 'LineString'
      ? (geom.coordinates as LonLat[])
      : (geom.coordinates as LonLat[][]).flat();
  process.stdout.write(`  ${r.name} (route ${r.id}): ${coords.length} verts → `);
  const profile = await buildElevationProfile(coords, intervalM);
  await db.update(routes).set({ elevationProfile: profile }).where(eq(routes.id, r.id));
  console.log(`${profile.length} points`);
}

await client.end();
console.log('\nElevation refresh complete ✓  — now run `pack:build`.');
