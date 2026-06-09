import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { db } from './connection';
import { accommodations, routes, sections, trails, waterSources } from './schema';

type LonLat = [number, number];

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
// Imagery — curated, theme-appropriate Unsplash photos assigned deterministically
// (by index) so re-seeds are stable. Placeholder dev imagery until real curated
// photos arrive via the ingestion pipeline (§8). All URLs verified to resolve.
// ---------------------------------------------------------------------------

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80`;

const TRAIL_IMAGE = img('1506905925346-21bda4d32df4');

const MOUNTAIN_IMAGES = [
  '1506905925346-21bda4d32df4',
  '1464822759023-fed622ff2c3b',
  '1454496522488-7a8e488e8606',
  '1519681393784-d120267933ba',
  '1486870591958-9b9d0d1dda99',
  '1551632811-561732d1e306',
  '1470071459604-3b5ec3a7fe05',
  '1483728642387-6c3bdd6c93e5',
  '1464278533981-50106e6176b1',
  '1426604966848-d7adac402bff',
  '1551524559-8af4e6624178',
  '1518609878373-06d740f60d8b',
].map(img);

const REFUGE_IMAGES = [
  '1520250497591-112f2f40a3f4',
  '1571896349842-33c89424de2d',
  '1518733057094-95b53143d2a7',
  '1605540436563-5bca919ae766',
  '1531366936337-7c912a4589a7',
].map(img);

const WATER_IMAGES = [
  '1432405972618-c60b0225b8f9',
  '1437482078695-73f5ca6c96e2',
  '1505672678657-cc7037095e60',
  '1444930694458-01babf71870c',
  '1502082553048-f009c37129b9',
].map(img);

// Cycle through a pool by index — stable across re-seeds, no randomness.
const pick = (pool: string[], i: number): string => pool[i % pool.length] ?? pool[0] ?? TRAIL_IMAGE;

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
// Geometry ordering — OSM ways merge into several disconnected pieces (small
// gaps), and their ST_Dump order is NOT walking order, which corrupts chainage.
// Stitch them into one west→east ordered line so chainage is monotonic.
// ---------------------------------------------------------------------------

interface Piece {
  coords: LonLat[];
  start: LonLat;
  end: LonLat;
}

function toPieces(raw: LonLat[][]): Piece[] {
  const out: Piece[] = [];
  for (const coords of raw) {
    const start = coords[0];
    const end = coords[coords.length - 1];
    if (start && end && coords.length >= 2) out.push({ coords, start, end });
  }
  return out;
}

// Greedy nearest-neighbour chain. GR11 runs Atlantic→Mediterranean, so start at
// the westernmost endpoint and repeatedly append the nearest remaining piece,
// flipping it when its far end is the closer join.
function orderIntoLine(pieces: Piece[]): LonLat[] {
  const d2 = (a: LonLat, b: LonLat) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

  let seed: { piece: Piece; coords: LonLat[] } | null = null;
  let minLon = Number.POSITIVE_INFINITY;
  for (const p of pieces) {
    if (p.start[0] < minLon) {
      minLon = p.start[0];
      seed = { piece: p, coords: p.coords };
    }
    if (p.end[0] < minLon) {
      minLon = p.end[0];
      seed = { piece: p, coords: [...p.coords].reverse() };
    }
  }
  if (!seed) return [];

  const used = new Set<Piece>([seed.piece]);
  const chain: LonLat[] = [...seed.coords];
  let tail = chain[chain.length - 1] ?? null;

  while (used.size < pieces.length && tail) {
    let best: { piece: Piece; coords: LonLat[] } | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const p of pieces) {
      if (used.has(p)) continue;
      const ds = d2(tail, p.start);
      const de = d2(tail, p.end);
      if (ds < bestD) {
        bestD = ds;
        best = { piece: p, coords: p.coords };
      }
      if (de < bestD) {
        bestD = de;
        best = { piece: p, coords: [...p.coords].reverse() };
      }
    }
    if (!best) break;
    used.add(best.piece);
    chain.push(...best.coords.slice(1));
    tail = chain[chain.length - 1] ?? tail;
  }
  return chain;
}

// ---------------------------------------------------------------------------
// Step 1: Route geometry
// Reads from the pre-downloaded cache file. The current cache was fetched by ref
// and includes the unrelated Île-de-France "GR 11" (filtered out below). Prefer
// re-fetching by the canonical relation id (GR11 = 68861, see CLAUDE.md §8):
//   curl -X POST https://overpass.openstreetmap.fr/api/interpreter \
//     --data-urlencode 'data=[out:json][timeout:300];relation(68861);way(r);out geom;' \
//     -o packages/db/data/gr11-ways.json
// ---------------------------------------------------------------------------

async function seedRoute(): Promise<number> {
  console.log('Loading GR11 ways from cache…');

  const cacheFile = Bun.file(`${import.meta.dir}/../data/gr11-ways.json`);
  const data = (await cacheFile.json()) as { elements: Array<OverpassWay | OverpassNode> };

  // The cache was fetched by ref ("GR 11"), which also matches the Île-de-France
  // GR 11 near Paris. Keep only ways inside the Pyrenees corridor so the trail
  // doesn't jump 700 km north. (Better: re-fetch by relation id — see header.)
  const inBbox = (p: { lat: number; lon: number }) =>
    p.lat >= BBOX.south && p.lat <= BBOX.north && p.lon >= BBOX.west && p.lon <= BBOX.east;
  const ways = data.elements
    .filter(
      (e): e is OverpassWay =>
        e.type === 'way' && Array.isArray(e.geometry) && e.geometry.length > 1,
    )
    .filter((w) => w.geometry.some(inBbox));
  console.log(`  Got ${ways.length} ways in the Pyrenees corridor`);
  if (ways.length === 0) throw new Error('Cache file is empty or missing — re-fetch it');

  // max:1 = single connection so TEMP TABLE is visible across all queries in this session
  const client = postgres(process.env.DATABASE_URL ?? '', { max: 1, prepare: false });

  await client`DROP TABLE IF EXISTS _seed_gr11_ways`;
  await client`CREATE TEMP TABLE _seed_gr11_ways (geom geometry(LineString, 4326))`;

  for (const way of ways) {
    const coords = way.geometry.map((p) => `${p.lon} ${p.lat}`).join(', ');
    await client`INSERT INTO _seed_gr11_ways VALUES (ST_GeomFromText(${`LINESTRING(${coords})`}, 4326))`;
  }

  // Merge touching ways, then order the resulting pieces into one walking line.
  const pieceRows = await client<Array<{ gj: string }>>`
    SELECT ST_AsGeoJSON((ST_Dump(ST_LineMerge(ST_Collect(geom)))).geom) AS gj
    FROM _seed_gr11_ways
  `;
  const rawPieces = pieceRows.map(
    (r) => (JSON.parse(r.gj) as { coordinates: LonLat[] }).coordinates,
  );
  const ordered = orderIntoLine(toPieces(rawPieces));
  if (ordered.length < 2) throw new Error('Failed to order route pieces into a line');

  const wkt = `LINESTRING(${ordered.map(([lon, lat]) => `${lon} ${lat}`).join(', ')})`;
  const [lenRow] = await client<Array<{ len: number }>>`
    SELECT ST_Length(ST_GeomFromText(${wkt}, 4326)::geography) AS len
  `;
  const lengthM = Number(lenRow?.len ?? 0);
  console.log(
    `  Ordered ${rawPieces.length} pieces → ${Math.round(lengthM / 1000)} km single line`,
  );

  const inserted = await db
    .insert(routes)
    .values({
      name: 'GR11',
      description: 'Sendero de los Pirineos — Hendaye to Cap de Creus',
      distanceM: lengthM,
      ascentM: 47_000,
      descentM: 47_000,
      geom: sql`ST_GeomFromText(${wkt}, 4326)`,
    })
    .returning({ id: routes.id }); // exclude geom — Drizzle can't parse the EWKB back

  const route = inserted[0];
  if (!route) throw new Error('Failed to insert route');

  await db.insert(trails).values({
    routeId: route.id,
    ref: 'GR11',
    country: 'Spain',
    region: 'Pyrenees',
    imageUrl: TRAIL_IMAGE,
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

// The GR11 walks as ~40 day-stages between refuges and villages. We don't have
// the official étape endpoints yet (that's the Phase 7 ingestion pipeline), so
// approximate them as even ~22 km splits along the corrected line, grouped into
// the three classic regions. Elevation is distributed evenly across stages.
const SECTION_COUNT = 40;

function regionFor(fraction: number): string {
  if (fraction < 1 / 3) return 'Western Pyrenees';
  if (fraction < 2 / 3) return 'Central Pyrenees';
  return 'Eastern Pyrenees';
}

async function seedSections(routeId: number): Promise<void> {
  console.log('Generating sections…');

  const [route] = await db
    .select({ distanceM: routes.distanceM, ascentM: routes.ascentM, descentM: routes.descentM })
    .from(routes)
    .where(eq(routes.id, routeId));
  if (!route?.distanceM) throw new Error('Route has no length — cannot generate sections');

  const total = route.distanceM;
  const ascentPer = Math.round((route.ascentM ?? 0) / SECTION_COUNT);
  const descentPer = Math.round((route.descentM ?? 0) / SECTION_COUNT);

  const rows = Array.from({ length: SECTION_COUNT }, (_, i) => {
    const startChainageM = (i * total) / SECTION_COUNT;
    const endChainageM = ((i + 1) * total) / SECTION_COUNT;
    const region = regionFor((i + 0.5) / SECTION_COUNT);
    return {
      routeId,
      name: `GR11 Stage ${i + 1}`,
      description: `${region} · km ${Math.round(startChainageM / 1000)}–${Math.round(endChainageM / 1000)}`,
      orderIndex: i + 1,
      startChainageM,
      endChainageM,
      ascentM: ascentPer,
      descentM: descentPer,
      imageUrl: pick(MOUNTAIN_IMAGES, i),
    };
  });

  await db.insert(sections).values(rows);
  console.log(
    `  Inserted ${SECTION_COUNT} sections (~${Math.round(total / SECTION_COUNT / 1000)} km each)`,
  );
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

  const client = postgres(process.env.DATABASE_URL ?? '', { max: 1, prepare: false });
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
      imageUrl: pick(REFUGE_IMAGES, inserted),
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

  const client = postgres(process.env.DATABASE_URL ?? '', { max: 1, prepare: false });
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
      imageUrl: pick(WATER_IMAGES, inserted),
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
