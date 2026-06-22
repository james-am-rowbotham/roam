import { resolveWaymark } from '@roam/core';
import {
  type LonLat,
  type OverpassNode,
  type OverpassWay,
  POI_KINDS,
  STAY_CATEGORIES,
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
import { pois, regions, routes, sections, trails } from './schema';
import { type SeedConfig, getSeedConfig } from './seedConfigs';

// Structural ingest (§8) — OSM → Postgres, config-driven by trail. Pick the trail from the
// CLI (`db:seed gr10`); everything trail-specific (corridor, etapas, regions, ways cache,
// waymark) comes from its SeedConfig. `db:seed <trailId> sections` re-seeds only the curated
// Region+Stage layer.
const args = process.argv.slice(2);
const sectionsOnly = args.includes('sections');
const trailId = args.find((a) => a !== 'sections' && !a.startsWith('-')) ?? 'gr11';
const C = getSeedConfig(trailId);
const BBOX = C.config.bbox;

// The route relation's own tags (§8/§17.8): osmc:symbol, network, ref live on the relation,
// not the member ways — the authoritative waymark source. Cached per trail.
async function loadRelationTags(): Promise<Record<string, string> | null> {
  if (!C.relationFile) return null;
  const file = Bun.file(`${import.meta.dir}/../data/${C.relationFile}`);
  if (!(await file.exists())) return null;
  return (await file.json()) as Record<string, string>;
}

// Curated, theme-appropriate Unsplash photos assigned deterministically (by index) so
// re-seeds are stable. Placeholder dev imagery until the editorial pipeline (§21.4) lands.
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
const pick = (pool: string[], i: number): string => pool[i % pool.length] ?? pool[0] ?? TRAIL_IMAGE;

// ── Step 1: Route geometry ──────────────────────────────────────────────────
// Reads the trail's pre-downloaded ways cache, keeps the ways inside the corridor (the
// ref-based fetch can match same-ref routes elsewhere), merges + orders into one line.
async function seedRoute(): Promise<number> {
  console.log(`Loading ${trailId} ways from cache (${C.waysFile})…`);
  const cacheFile = Bun.file(`${import.meta.dir}/../data/${C.waysFile}`);
  if (!(await cacheFile.exists())) throw new Error(`Ways cache ${C.waysFile} missing — fetch it`);
  const data = (await cacheFile.json()) as { elements: Array<OverpassWay | OverpassNode> };

  const inBbox = (p: { lat: number; lon: number }) =>
    p.lat >= BBOX.south && p.lat <= BBOX.north && p.lon >= BBOX.west && p.lon <= BBOX.east;
  const ways = data.elements
    .filter(
      (e): e is OverpassWay =>
        e.type === 'way' && Array.isArray(e.geometry) && e.geometry.length > 1,
    )
    .filter((w) => w.geometry.some(inBbox));
  console.log(`  Got ${ways.length} ways in the corridor`);
  if (ways.length === 0) throw new Error('Cache file is empty or missing — re-fetch it');

  const client = postgres(process.env.DATABASE_URL ?? '', { max: 1, prepare: false });
  // One transaction so the TEMP TABLE stays on a single backend — the Supabase transaction
  // pooler routes separate statements to different backends, dropping a session temp table.
  const rawPieces = (await client.begin(async (tx) => {
    await tx`CREATE TEMP TABLE _seed_ways (geom geometry(LineString, 4326)) ON COMMIT DROP`;
    for (const way of ways) {
      const coords = way.geometry.map((p) => `${p.lon} ${p.lat}`).join(', ');
      await tx`INSERT INTO _seed_ways VALUES (ST_GeomFromText(${`LINESTRING(${coords})`}, 4326))`;
    }
    const pieceRows = await tx<Array<{ gj: string }>>`
      SELECT ST_AsGeoJSON((ST_Dump(ST_LineMerge(ST_Collect(geom)))).geom) AS gj FROM _seed_ways
    `;
    return pieceRows.map((r) => (JSON.parse(r.gj) as { coordinates: LonLat[] }).coordinates);
  })) as LonLat[][];
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

  const relTags = await loadRelationTags();
  const { osmcSymbol, network } = resolveRouteWaymark(relTags, ways, C.config);
  const sign = resolveWaymark({ osmcSymbol, network, ref: C.config.ref }).symbol;
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
      name: C.config.name,
      description: C.config.description,
      distanceM: lengthM,
      ascentM: C.ascentM,
      descentM: C.ascentM,
      geom: sql`ST_GeomFromText(${wkt}, 4326)`,
      osmcSymbol,
      network,
    })
    .returning({ id: routes.id });
  const route = inserted[0];
  if (!route) throw new Error('Failed to insert route');

  await db.insert(trails).values({
    routeId: route.id,
    ref: C.config.ref,
    country: C.config.country,
    region: C.config.region,
    imageUrl: TRAIL_IMAGE,
  });

  try {
    const profile = await buildElevationProfile(ordered);
    await db.update(routes).set({ elevationProfile: profile }).where(eq(routes.id, route.id));
    console.log(`  Elevation: ${profile.length} points sampled`);
  } catch (err) {
    console.warn(`  Elevation sampling failed (${String(err).slice(0, 60)}) — skipping`);
  }

  await client.end();
  return route.id;
}

// ── Step 2: Chainage — project a lon/lat onto the route line ────────────────
async function computeChainage(routeId: number, lon: number, lat: number): Promise<number> {
  const result = await db.execute(sql`
    WITH segments AS (
      SELECT (ST_Dump(geom)).geom AS seg, (ST_Dump(geom)).path[1] AS seg_idx
      FROM routes WHERE id = ${routeId}
    ),
    cumulative AS (
      SELECT seg, seg_idx,
        COALESCE(SUM(ST_Length(seg::geography))
          OVER (ORDER BY seg_idx ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS cum_m
      FROM segments
    ),
    closest AS (
      SELECT seg, cum_m FROM cumulative
      ORDER BY ST_Distance(seg::geography, ST_GeomFromText(${`POINT(${lon} ${lat})`}, 4326)::geography)
      LIMIT 1
    )
    SELECT cum_m
      + ST_LineLocatePoint(seg, ST_GeomFromText(${`POINT(${lon} ${lat})`}, 4326))
        * ST_Length(seg::geography) AS chainage_m
    FROM closest
  `);
  const rows = result as unknown as Array<{ chainage_m: number }>;
  return Number(rows[0]?.chainage_m ?? 0);
}

// ── Step 3: Sections (the curated Region + Stage layers, §5) ─────────────────
function regionFor(stage: number, cfg: SeedConfig): string {
  const last = cfg.regions[cfg.regions.length - 1]?.name ?? '';
  return cfg.regions.find((r) => stage <= r.untilStage)?.name ?? last;
}

async function seedSections(routeId: number): Promise<void> {
  console.log('Generating sections (official etapas)…');
  const [route] = await db
    .select({ distanceM: routes.distanceM })
    .from(routes)
    .where(eq(routes.id, routeId));
  if (!route?.distanceM) throw new Error('Route has no length — cannot generate sections');
  const total = route.distanceM;

  const regionRows = await db
    .insert(regions)
    .values(
      C.regions.map((r, i) => ({
        routeId,
        name: r.name,
        description: r.description,
        orderIndex: i + 1,
      })),
    )
    .returning({ id: regions.id, name: regions.name });
  const regionId = new Map(regionRows.map((r) => [r.name, r.id]));
  console.log(`  Inserted ${regionRows.length} regions`);

  const staged = assignEtapaChainage(C.etapas, total);
  const rows = staged.map((e, i) => {
    const region = regionFor(e.stage, C);
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

// ── Step 4: Accommodations from Overpass ────────────────────────────────────
// ── Steps 4–5: POIs from Overpass, config-driven by the registry (§8) ────────
// One loop over POI_KINDS writes every point type into the unified `pois` table, so adding a
// POI type is a registry variable — not a new seeder. Supersedes seedAccommodations/Water.
async function seedPois(routeId: number): Promise<void> {
  const client = postgres(process.env.DATABASE_URL ?? '', { max: 1, prepare: false });
  const imageFor = (category: string, i: number) =>
    STAY_CATEGORIES.includes(category) ? pick(REFUGE_IMAGES, i) : pick(WATER_IMAGES, i);
  for (const kind of POI_KINDS) {
    console.log(`Fetching ${kind.key} from Overpass…`);
    const selectors = kind.overpass.map((s) => `node[${s}];`).join('\n      ');
    const data = await overpass(`
      [out:json][timeout:180][bbox:${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}];
      (
      ${selectors}
      );
      out body;
    `);
    const nodes = data.elements.filter(
      (e): e is OverpassNode => e.type === 'node' && (!kind.requireName || !!e.tags?.name),
    );
    let inserted = 0;
    for (const node of nodes) {
      const [proximity] = await client`
        SELECT ST_DWithin(
          ST_GeomFromText(${`POINT(${node.lon} ${node.lat})`}, 4326)::geography,
          geom::geography, ${kind.proximityM}
        ) AS nearby FROM routes WHERE id = ${routeId}`;
      if (!proximity?.nearby) continue;
      const tags = node.tags ?? {};
      const chainageM = await computeChainage(routeId, node.lon, node.lat);
      await db.insert(pois).values({
        routeId,
        category: kind.category,
        name: tags.name ?? null,
        chainageM,
        geom: sql`ST_GeomFromText(${`POINT(${node.lon} ${node.lat})`}, 4326)`,
        meta: kind.meta?.(tags) ?? {},
        imageUrl: imageFor(kind.category, inserted),
        source: 'osm',
        confidence: kind.category === 'water' ? 0.65 : 0.7,
      });
      inserted++;
    }
    console.log(`  Inserted ${inserted} ${kind.key}`);
  }
  await client.end();
}

// ── Main ────────────────────────────────────────────────────────────────────
const existingTrail = await db
  .select({ id: trails.id })
  .from(trails)
  .where(eq(trails.ref, C.config.ref));
const [existingRoute] = await db
  .select({ id: routes.id })
  .from(routes)
  .where(eq(routes.name, C.config.name));

// `db:seed <trailId> sections` re-seeds only this trail's Region+Stage layer.
if (sectionsOnly) {
  if (!existingRoute) throw new Error(`No ${trailId} route to re-seed — run the full seed first`);
  await db.delete(sections).where(eq(sections.routeId, existingRoute.id));
  await db.delete(regions).where(eq(regions.routeId, existingRoute.id));
  console.log(`Cleared existing ${trailId} regions + sections`);
  await seedSections(existingRoute.id);
  console.log(`\n${trailId} sections re-seed complete ✓`);
  process.exit(0);
}

if (existingTrail.length > 0) {
  console.log(`${trailId} already seeded — delete its trail row to re-seed`);
  process.exit(0);
}

const routeId = await seedRoute();
await seedSections(routeId);
await seedPois(routeId);

console.log(`\n${trailId} seed complete ✓`);
process.exit(0);
