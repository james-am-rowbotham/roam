import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { db } from './connection';
import { accommodations, routes, sections, trails, waterSources } from './schema';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OVERPASS_MIRRORS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const HEADERS = { 'User-Agent': 'roam-app/0.1 (trail data seed, contact: dev@roam.app)' };

// Pyrenees bounding box for POI queries
const BBOX = { south: 42.2, west: -1.9, north: 43.6, east: 3.5 };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverpassWay {
  type: 'way';
  id: number;
  geometry: Array<{ lat: number; lon: number }>;
}

interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Overpass helper — tries each mirror in order
// ---------------------------------------------------------------------------

async function overpass(query: string): Promise<{ elements: Array<OverpassWay | OverpassNode> }> {
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(`${mirror}?data=${encodeURIComponent(query.trim())}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(300_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements: Array<OverpassWay | OverpassNode> };
      if (data.elements.length > 0) return data;
      console.log(`  ${mirror} returned empty — trying next…`);
    } catch {
      console.log(`  ${mirror} failed — trying next…`);
    }
  }
  throw new Error('All Overpass mirrors failed');
}

// ---------------------------------------------------------------------------
// Step 1: Route geometry
// Reads from the pre-downloaded cache file. Re-fetch with:
//   curl -X POST https://overpass.openstreetmap.fr/api/interpreter \
//     --data-urlencode 'data=[out:json][timeout:300];relation["ref"="GR 11"]["route"="hiking"];way(r);out geom;' \
//     -o packages/db/data/gr11-ways.json
// ---------------------------------------------------------------------------

async function seedRoute(): Promise<number> {
  console.log('Loading GR11 ways from cache…');

  const cacheFile = Bun.file(`${import.meta.dir}/../data/gr11-ways.json`);
  const data = (await cacheFile.json()) as { elements: Array<OverpassWay | OverpassNode> };

  const ways = data.elements.filter(
    (e): e is OverpassWay => e.type === 'way' && Array.isArray(e.geometry) && e.geometry.length > 1,
  );
  console.log(`  Got ${ways.length} ways`);
  if (ways.length === 0) throw new Error('Cache file is empty or missing — re-fetch it');

  // max:1 = single connection so TEMP TABLE is visible across all queries in this session
  const client = postgres(process.env.DATABASE_URL ?? '', { max: 1 });

  await client`DROP TABLE IF EXISTS _seed_gr11_ways`;
  await client`CREATE TEMP TABLE _seed_gr11_ways (geom geometry(LineString, 4326))`;

  for (const way of ways) {
    const coords = way.geometry.map((p) => `${p.lon} ${p.lat}`).join(', ');
    await client`INSERT INTO _seed_gr11_ways VALUES (ST_GeomFromText(${`LINESTRING(${coords})`}, 4326))`;
  }

  const rows = await client<Array<{ wkt: string; length_m: string }>>`
    SELECT
      ST_AsText(ST_LineMerge(ST_Collect(geom))) AS wkt,
      ST_Length(ST_LineMerge(ST_Collect(geom))::geography) AS length_m
    FROM _seed_gr11_ways
  `;

  const row = rows[0];
  if (!row) throw new Error('Failed to merge ways');
  console.log(`  Merged → ${Math.round(Number(row.length_m) / 1000)} km`);

  const inserted = await db
    .insert(routes)
    .values({
      name: 'GR11',
      description: 'Sendero de los Pirineos — Hendaye to Cap de Creus',
      distanceM: Number(row.length_m),
      ascentM: 47_000,
      descentM: 47_000,
      geom: sql`ST_GeomFromText(${row.wkt}, 4326)`,
    })
    .returning({ id: routes.id }); // exclude geom — Drizzle can't parse MultiLineString EWKB

  const route = inserted[0];
  if (!route) throw new Error('Failed to insert route');

  await db.insert(trails).values({
    routeId: route.id,
    ref: 'GR11',
    country: 'Spain',
    region: 'Pyrenees',
  });

  await client.end();
  return route.id;
}

// ---------------------------------------------------------------------------
// Step 2: Chainage — project a lon/lat onto the route line
// ---------------------------------------------------------------------------

async function computeChainage(routeId: number, lon: number, lat: number): Promise<number> {
  // Handles both LineString and MultiLineString by finding the nearest segment,
  // summing lengths of all preceding segments, and adding the within-segment offset.
  const result = await db.execute(sql`
    WITH segments AS (
      SELECT
        (ST_Dump(geom)).geom AS seg,
        (ST_Dump(geom)).path[1] AS seg_idx
      FROM routes WHERE id = ${routeId}
    ),
    cumulative AS (
      SELECT
        seg, seg_idx,
        COALESCE(SUM(ST_Length(seg::geography))
          OVER (ORDER BY seg_idx ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0
        ) AS cum_m
      FROM segments
    ),
    closest AS (
      SELECT seg, cum_m
      FROM cumulative
      ORDER BY ST_Distance(seg::geography, ST_GeomFromText(${`POINT(${lon} ${lat})`}, 4326)::geography)
      LIMIT 1
    )
    SELECT
      cum_m
      + ST_LineLocatePoint(seg, ST_GeomFromText(${`POINT(${lon} ${lat})`}, 4326))
        * ST_Length(seg::geography) AS chainage_m
    FROM closest
  `);
  const rows = result as unknown as Array<{ chainage_m: number }>;
  return Number(rows[0]?.chainage_m ?? 0);
}

// ---------------------------------------------------------------------------
// Step 3: Sections
// ---------------------------------------------------------------------------

async function seedSections(routeId: number): Promise<void> {
  console.log('Computing section chainage…');

  const anchors = [
    [
      'Western Pyrenees',
      'Basque Country & Navarre — Hendaye to Candanchú',
      -1.7777,
      43.371,
      -0.5311,
      42.7997,
    ],
    [
      'Central Pyrenees',
      'Aragón high mountains — Candanchú to Benasque',
      -0.5311,
      42.7997,
      0.5217,
      42.6036,
    ],
    ['Eastern Pyrenees', 'Catalonia — Benasque to Cap de Creus', 0.5217, 42.6036, 3.3196, 42.3194],
  ] as const;

  for (const [
    index,
    [name, description, startLon, startLat, endLon, endLat],
  ] of anchors.entries()) {
    const startChainageM = await computeChainage(routeId, startLon, startLat);
    const endChainageM = await computeChainage(routeId, endLon, endLat);
    console.log(
      `  ${name}: ${Math.round(startChainageM / 1000)}–${Math.round(endChainageM / 1000)} km`,
    );
    await db.insert(sections).values({
      routeId,
      name,
      description,
      orderIndex: index + 1,
      startChainageM,
      endChainageM,
    });
  }
}

// ---------------------------------------------------------------------------
// Step 4: Accommodations from Overpass
// ---------------------------------------------------------------------------

async function seedAccommodations(routeId: number): Promise<void> {
  console.log('Fetching accommodations from Overpass…');

  const data = await overpass(`
    [out:json][timeout:180][bbox:${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}];
    (
      node["tourism"="alpine_hut"];
      node["tourism"="wilderness_hut"];
      node["tourism"="camp_site"]["name"];
    );
    out body;
  `);

  const nodes = data.elements.filter((e): e is OverpassNode => e.type === 'node' && !!e.tags?.name);
  console.log(`  Got ${nodes.length} nodes, filtering to corridor…`);

  const client = postgres(process.env.DATABASE_URL ?? '', { max: 1 });
  let inserted = 0;

  for (const node of nodes) {
    const [proximity] = await client`
      SELECT ST_DWithin(
        ST_GeomFromText(${`POINT(${node.lon} ${node.lat})`}, 4326)::geography,
        geom::geography,
        2000
      ) AS nearby
      FROM routes WHERE id = ${routeId}
    `;
    if (!proximity?.nearby) continue;

    const tags = node.tags ?? {};
    const type =
      tags.tourism === 'camp_site'
        ? 'campsite'
        : tags.tourism === 'wilderness_hut'
          ? 'hut'
          : 'refuge';
    const chainageM = await computeChainage(routeId, node.lon, node.lat);

    await db.insert(accommodations).values({
      routeId,
      name: tags.name ?? 'Unnamed',
      chainageM,
      geom: sql`ST_GeomFromText(${`POINT(${node.lon} ${node.lat})`}, 4326)`,
      type,
      capacity: tags.capacity ? Number.parseInt(tags.capacity) : null,
      seasonal: !!(tags.seasonal === 'yes' || tags.opening_hours?.includes('summer')),
      bookingUrl: tags.website ?? tags['contact:website'] ?? null,
      source: 'osm',
      confidence: 0.7,
    });
    inserted++;
  }

  await client.end();
  console.log(`  Inserted ${inserted} accommodations`);
}

// ---------------------------------------------------------------------------
// Step 5: Water sources from Overpass
// ---------------------------------------------------------------------------

async function seedWaterSources(routeId: number): Promise<void> {
  console.log('Fetching water sources from Overpass…');

  const data = await overpass(`
    [out:json][timeout:180][bbox:${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}];
    (
      node["natural"="spring"]["name"];
      node["amenity"="drinking_water"]["name"];
    );
    out body;
  `);

  const nodes = data.elements.filter((e): e is OverpassNode => e.type === 'node');
  console.log(`  Got ${nodes.length} nodes, filtering to corridor…`);

  const client = postgres(process.env.DATABASE_URL ?? '', { max: 1 });
  let inserted = 0;

  for (const node of nodes) {
    const [proximity] = await client`
      SELECT ST_DWithin(
        ST_GeomFromText(${`POINT(${node.lon} ${node.lat})`}, 4326)::geography,
        geom::geography,
        500
      ) AS nearby
      FROM routes WHERE id = ${routeId}
    `;
    if (!proximity?.nearby) continue;

    const tags = node.tags ?? {};
    const chainageM = await computeChainage(routeId, node.lon, node.lat);

    await db.insert(waterSources).values({
      routeId,
      name: tags.name ?? null,
      chainageM,
      geom: sql`ST_GeomFromText(${`POINT(${node.lon} ${node.lat})`}, 4326)`,
      seasonal: tags.seasonal === 'yes' || tags.intermittent === 'yes',
      source: 'osm',
      confidence: 0.65,
    });
    inserted++;
  }

  await client.end();
  console.log(`  Inserted ${inserted} water sources`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const existing = await db.select().from(trails).limit(1);
if (existing.length > 0) {
  console.log('Already seeded — delete trail rows to re-seed');
  process.exit(0);
}

const routeId = await seedRoute();
await seedSections(routeId);
await seedAccommodations(routeId);
await seedWaterSources(routeId);

console.log('\nGR11 seed complete ✓');
process.exit(0);
