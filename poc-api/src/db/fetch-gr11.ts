// Fetches the real GR11 geometry from Overpass and re-seeds the database.
// Uses ST_LineMerge(ST_Collect(...)) so PostGIS stitches connected ways into
// continuous segments rather than concatenating them in random order.

import { db, sql } from './connection'

const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter'

const QUERY = `
[out:json][timeout:300];
relation["ref"="GR 11"]["type"="route"]["route"="hiking"];
way(r);
out geom;
`

interface OverpassWay {
  type: 'way'
  id: number
  geometry: Array<{ lat: number; lon: number }>
}

interface OverpassResponse {
  elements: OverpassWay[]
}

console.log('Fetching GR11 ways from Overpass…')
const res = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(QUERY.trim())}`, {
  headers: { 'User-Agent': 'roam-poc/0.1 (trail companion app, dev seed script)' },
})

if (!res.ok) {
  console.error(`Overpass error: ${res.status} ${await res.text()}`)
  process.exit(1)
}

const data = (await res.json()) as OverpassResponse
const ways = data.elements.filter((e) => e.type === 'way' && e.geometry?.length > 1)
console.log(`Got ${ways.length} ways`)

// Alter column type if needed (setup.ts handles fresh installs; this handles re-runs)
await db.execute(sql`
  ALTER TABLE trails ALTER COLUMN geom TYPE GEOMETRY(Geometry, 4326)
  USING ST_SetSRID(geom, 4326)
`).catch(() => { /* already correct type */ })

await db.execute(sql`DROP TABLE IF EXISTS _gr11_ways`)
await db.execute(sql`CREATE TEMP TABLE _gr11_ways (geom GEOMETRY(LineString, 4326))`)

// Insert each way separately (avoids massive single SQL string)
console.log('Inserting ways into temp table…')
for (const way of ways) {
  const coords = way.geometry.map((p) => `${p.lon} ${p.lat}`).join(', ')
  const wkt = `LINESTRING(${coords})`
  await db.execute(sql`INSERT INTO _gr11_ways VALUES (ST_GeomFromText(${wkt}, 4326))`)
}

console.log('Merging connected segments with ST_LineMerge…')
// Use upsert so the row ID never changes on re-runs
await db.execute(sql`
  INSERT INTO trails (name, description, geom)
  SELECT
    'GR11',
    'Sendero de los Pirineos — Hendaye to Cap de Creus (~830 km)',
    ST_LineMerge(ST_Collect(geom))
  FROM _gr11_ways
  ON CONFLICT DO NOTHING
`)
await db.execute(sql`
  UPDATE trails
  SET geom = (SELECT ST_LineMerge(ST_Collect(geom)) FROM _gr11_ways),
      description = 'Sendero de los Pirineos — Hendaye to Cap de Creus (~830 km)'
  WHERE name = 'GR11'
`)

const stats = await db.execute(sql`
  SELECT
    ST_GeometryType(geom)       AS geom_type,
    ST_NPoints(geom)            AS points,
    ST_Length(geom::geography)/1000 AS length_km
  FROM trails WHERE name = 'GR11'
`) as unknown as Array<{ geom_type: string; points: number; length_km: number }>

const row = stats[0]
console.log(`Done — type=${row.geom_type}, points=${row.points}, length=${Math.round(row.length_km)} km`)
process.exit(0)
