import { resolveWaymark } from '@roam/core';
import {
  GR11,
  GR11_ETAPAS,
  type LonLat,
  type OverpassNode,
  type OverpassWay,
  assignEtapaChainage,
  orderIntoLine,
  overpass,
  resolveRouteWaymark,
  toPieces,
} from '@roam/pipeline';
import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { db } from './connection';
import { buildElevationProfile } from './elevation';
import { accommodations, regions, routes, sections, trails, waterSources } from './schema';

// The GR11 route relation's own tags (§8/§17.8). osmc:symbol, network and ref
// live on the relation — NOT the member ways, only ~3 of which carry them
// incidentally — so this is the authoritative waymark source. Captured from the
// "Senda Pirenaica" stage relations (E01–E37), which all share these tags; the
// pre-2020 relation 68861 in CLAUDE.md §8 is stale. Refresh with:
//   relation["type"="route"]["ref"="GR 11"](42,-2.5,43.5,3.5); out tags;
async function loadRelationTags(): Promise<Record<string, string> | null> {
  const file = Bun.file(`${import.meta.dir}/../data/gr11-relation.json`);
  if (!(await file.exists())) return null;
  return (await file.json()) as Record<string, string>;
}

// ---------------------------------------------------------------------------
// Config — the GR11 ingestion config (§8) drives the corridor + metadata.
// ---------------------------------------------------------------------------

// Pyrenees bounding box for POI queries + the route's ref-based way filter.
const BBOX = GR11.bbox;

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

  // Capture the raw waymark tags (§17.8). Prefer the route relation's own tags
  // (authoritative); fall back to the dominant member-way tags. The API parses
  // osmc:symbol into the painted sign — we store it raw. GR11 is
  // "red:white:red_lower:11:black" (white plate, red lower bar, "11"), network nwn.
  const relTags = await loadRelationTags();
  const { osmcSymbol, network } = resolveRouteWaymark(relTags, ways, GR11);
  const sign = resolveWaymark({ osmcSymbol, network, ref: GR11.ref }).symbol;
  console.log(
    `  Waymark: ${
      sign
        ? `${sign.background.colorName} plate + ${sign.foregrounds
            .map((f) => `${f.colorName} ${f.shape}`)
            .join(', ')}${sign.text ? ` "${sign.text}"` : ''}`
        : 'none'
    } · network ${network ?? '—'}`,
  );

  const inserted = await db
    .insert(routes)
    .values({
      name: GR11.name,
      description: GR11.description,
      distanceM: lengthM,
      ascentM: 47_000,
      descentM: 47_000,
      geom: sql`ST_GeomFromText(${wkt}, 4326)`,
      osmcSymbol,
      network,
    })
    .returning({ id: routes.id }); // exclude geom — Drizzle can't parse the EWKB back

  const route = inserted[0];
  if (!route) throw new Error('Failed to insert route');

  await db.insert(trails).values({
    routeId: route.id,
    ref: GR11.ref,
    country: GR11.country,
    region: GR11.region,
    imageUrl: TRAIL_IMAGE,
  });

  // Real elevation profile sampled along the line (§7). Non-fatal: a network
  // failure just leaves it null (the chart falls back to a flat line).
  try {
    const profile = await buildElevationProfile(ordered, 1000);
    await db.update(routes).set({ elevationProfile: profile }).where(eq(routes.id, route.id));
    console.log(`  Elevation: ${profile.length} points sampled`);
  } catch (err) {
    console.warn(`  Elevation sampling failed (${String(err).slice(0, 60)}) — skipping`);
  }

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

// GR11's five regions (the coarse Region layer, §5) — curated contiguous groupings
// of the official etapas, west→east, each owning an inclusive stage range. Regions
// are orientation-only labels (never progress, §5).
const GR11_REGIONS: { name: string; description: string; untilStage: number }[] = [
  {
    name: 'Basque Country & Navarre',
    description: 'From Cabo Higuer, passing through forests and coastal hills.',
    untilStage: 8,
  },
  {
    name: 'Aragonese Pyrenees',
    description:
      'Higher, rugged alpine terrain, passing through locations like Candanchú and the Respomuso Hut.',
    untilStage: 15,
  },
  {
    name: 'Ordesa & High Country',
    description:
      'Includes the scenic Ordesa National Park and the high limestone, passing through Góriz and Viadós.',
    untilStage: 22,
  },
  {
    name: 'Andorra & Pallars High Country',
    description:
      'Traverses granite landscapes in Andorra and the Catalan Pyrenees, including areas like Colomèrs.',
    untilStage: 34,
  },
  {
    name: 'Eastern Pyrenees',
    description:
      'Descending through forests and valleys towards the Mediterranean coast at Cap de Creus.',
    untilStage: 46,
  },
];

function regionFor(stage: number): string {
  return GR11_REGIONS.find((r) => stage <= r.untilStage)?.name ?? 'Eastern Pyrenees';
}

// The fine Stage layer (§5): the 46 official GR11 etapas, laid onto the route's
// chainage axis by cumulative published distance (@roam/pipeline). Real names,
// boundaries and per-stage elevation — replaces the earlier synthetic even splits.
async function seedSections(routeId: number): Promise<void> {
  console.log('Generating sections (official etapas)…');

  const [route] = await db
    .select({ distanceM: routes.distanceM })
    .from(routes)
    .where(eq(routes.id, routeId));
  if (!route?.distanceM) throw new Error('Route has no length — cannot generate sections');

  const total = route.distanceM;

  // The coarse region layer: one row per region, then map name → id for the FK.
  const regionRows = await db
    .insert(regions)
    .values(
      GR11_REGIONS.map((r, i) => ({
        routeId,
        name: r.name,
        description: r.description,
        orderIndex: i + 1,
      })),
    )
    .returning({ id: regions.id, name: regions.name });
  const regionId = new Map(regionRows.map((r) => [r.name, r.id]));
  console.log(`  Inserted ${regionRows.length} regions`);

  const staged = assignEtapaChainage(GR11_ETAPAS, total);
  const rows = staged.map((e, i) => {
    const region = regionFor(e.stage);
    return {
      routeId,
      regionId: regionId.get(region) ?? null,
      name: e.name,
      description: `${region} · Etapa ${e.stage} · ${Math.round(e.distanceM / 1000)} km`,
      orderIndex: e.stage,
      startChainageM: e.startChainageM,
      endChainageM: e.endChainageM,
      ascentM: e.ascentM,
      descentM: e.descentM,
      imageUrl: pick(MOUNTAIN_IMAGES, i),
    };
  });

  await db.insert(sections).values(rows);
  console.log(
    `  Inserted ${rows.length} sections (official etapas, ${Math.round(total / 1000)} km)`,
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

// `bun src/seed.ts sections` re-seeds only the curated Region+Stage layer for the
// existing route (regions + sections), leaving the route geometry and POIs intact.
// Used to roll the trail's curated stages forward to the official etapas without a
// full re-import. Nothing FKs to sections/regions, so the replace is safe.
if (process.argv[2] === 'sections') {
  const [route] = await db.select({ id: routes.id }).from(routes).limit(1);
  if (!route) throw new Error('No route to re-seed — run the full seed first');
  await db.delete(sections).where(eq(sections.routeId, route.id));
  await db.delete(regions).where(eq(regions.routeId, route.id));
  console.log('Cleared existing regions + sections');
  await seedSections(route.id);
  console.log('\nGR11 sections re-seed complete ✓');
  process.exit(0);
}

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
