import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { downsampleElevation, resolveWaymark } from '@roam/core';
import {
  and,
  asc,
  db,
  eq,
  getTableColumns,
  hazards,
  pois,
  regions,
  routes,
  sections,
  sql,
  trails,
} from '@roam/db';
import {
  AccommodationSchema,
  ErrorSchema,
  HazardSchema,
  IdParamSchema,
  RegionSummarySchema,
  SectionSchema,
  TrailFeatureSchema,
  TrailListItemSchema,
  WaterSourceSchema,
} from '../schemas';

export const trailsRouter = new OpenAPIHono();

// Fold the raw OSM tags into the parsed `waymark` the client renders (§17.8).
// Resolve at the boundary so the painted sign is built from one shared definition.
function withWaymark<
  T extends { ref: string | null; osmcSymbol: string | null; network: string | null },
>(row: T): Omit<T, 'osmcSymbol' | 'network'> & { waymark: ReturnType<typeof resolveWaymark> } {
  const { osmcSymbol, network, ...rest } = row;
  return { ...rest, waymark: resolveWaymark({ osmcSymbol, network, ref: row.ref }) };
}

// GET /trails
trailsRouter.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Trails'],
    summary: 'List all trails',
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(TrailListItemSchema) } },
        description: 'Trail list',
      },
    },
  }),
  async (c) => {
    const rows = await db
      .select({
        id: trails.id,
        ref: trails.ref,
        country: trails.country,
        region: trails.region,
        imageUrl: trails.imageUrl,
        routeId: trails.routeId,
        name: routes.name,
        description: routes.description,
        distanceM: routes.distanceM,
        ascentM: routes.ascentM,
        descentM: routes.descentM,
        osmcSymbol: routes.osmcSymbol,
        network: routes.network,
        elevationProfile: routes.elevationProfile,
      })
      .from(trails)
      .innerJoin(routes, eq(trails.routeId, routes.id))
      .orderBy(asc(trails.id));
    // Fold in the waymark and a light elevation silhouette; drop the full profile.
    return c.json(
      rows.map(({ elevationProfile, ...row }) => ({
        ...withWaymark(row),
        elevation: downsampleElevation(
          (elevationProfile ?? []).map((p) => p.e),
          48,
        ),
      })),
      200,
    );
  },
);

// GET /trails/:id
trailsRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Trails'],
    summary: 'Get trail with GeoJSON geometry',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: TrailFeatureSchema } },
        description: 'Trail feature',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const [trail] = await db
      .select({
        id: trails.id,
        ref: trails.ref,
        country: trails.country,
        region: trails.region,
        imageUrl: trails.imageUrl,
        routeId: trails.routeId,
        name: routes.name,
        description: routes.description,
        distanceM: routes.distanceM,
        ascentM: routes.ascentM,
        descentM: routes.descentM,
        osmcSymbol: routes.osmcSymbol,
        network: routes.network,
        elevationProfile: routes.elevationProfile,
      })
      .from(trails)
      .innerJoin(routes, eq(trails.routeId, routes.id))
      .where(eq(trails.id, id));

    if (!trail) return c.json({ error: 'not found' }, 404);

    const geomRows = (await db.execute(sql`
      SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.00005))::json AS geometry
      FROM routes WHERE id = ${trail.routeId}
    `)) as unknown as Array<{ geometry: object }>;

    return c.json(
      {
        type: 'Feature' as const,
        geometry: geomRows[0]?.geometry ?? null,
        properties: {
          ...withWaymark(trail),
          elevation: downsampleElevation(
            (trail.elevationProfile ?? []).map((p) => p.e),
            48,
          ),
        },
      },
      200,
    );
  },
);

// GET /trails/:id/sections
trailsRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{id}/sections',
    tags: ['Trails'],
    summary: 'Get sections for a trail',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(SectionSchema) } },
        description: 'Sections',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const [trail] = await db
      .select({ routeId: trails.routeId })
      .from(trails)
      .where(eq(trails.id, id));
    if (!trail) return c.json({ error: 'not found' }, 404);
    const rows = await db
      .select({ ...getTableColumns(sections), regionName: regions.name })
      .from(sections)
      .leftJoin(regions, eq(regions.id, sections.regionId))
      .where(eq(sections.routeId, trail.routeId))
      .orderBy(asc(sections.orderIndex));
    return c.json(rows, 200);
  },
);

// GET /trails/:id/water
trailsRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{id}/water',
    tags: ['Trails'],
    summary: 'Get water sources for a trail ordered by chainage',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(WaterSourceSchema) } },
        description: 'Water sources',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const [trail] = await db
      .select({ routeId: trails.routeId })
      .from(trails)
      .where(eq(trails.id, id));
    if (!trail) return c.json({ error: 'not found' }, 404);
    const rows = await db
      .select({
        id: pois.id,
        routeId: pois.routeId,
        name: pois.name,
        chainageM: pois.chainageM,
        imageUrl: pois.imageUrl,
        seasonal: sql<boolean>`COALESCE((${pois.meta}->>'seasonal')::boolean, false)`,
        source: pois.source,
        confidence: pois.confidence,
        lastConfirmedAt: pois.lastConfirmedAt,
        reportCount: pois.reportCount,
        manualOverride: pois.manualOverride,
        createdAt: pois.createdAt,
        updatedAt: pois.updatedAt,
        lat: sql<number | null>`ST_Y(${pois.geom})`,
        lng: sql<number | null>`ST_X(${pois.geom})`,
      })
      .from(pois)
      .where(and(eq(pois.routeId, trail.routeId), eq(pois.category, 'water')))
      .orderBy(asc(pois.chainageM));
    return c.json(rows as unknown as z.infer<typeof WaterSourceSchema>[], 200);
  },
);

// GET /trails/:id/accommodations
trailsRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{id}/accommodations',
    tags: ['Trails'],
    summary: 'Get accommodations for a trail ordered by chainage',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(AccommodationSchema) } },
        description: 'Accommodations',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const [trail] = await db
      .select({ routeId: trails.routeId })
      .from(trails)
      .where(eq(trails.id, id));
    if (!trail) return c.json({ error: 'not found' }, 404);
    const rows = await db
      .select({
        id: pois.id,
        routeId: pois.routeId,
        name: pois.name,
        chainageM: pois.chainageM,
        imageUrl: pois.imageUrl,
        type: pois.category,
        capacity: sql<number | null>`(${pois.meta}->>'capacity')::int`,
        seasonal: sql<boolean>`COALESCE((${pois.meta}->>'seasonal')::boolean, false)`,
        bookingUrl: sql<string | null>`${pois.meta}->>'bookingUrl'`,
        source: pois.source,
        confidence: pois.confidence,
        lastConfirmedAt: pois.lastConfirmedAt,
        reportCount: pois.reportCount,
        manualOverride: pois.manualOverride,
        createdAt: pois.createdAt,
        updatedAt: pois.updatedAt,
        lat: sql<number | null>`ST_Y(${pois.geom})`,
        lng: sql<number | null>`ST_X(${pois.geom})`,
      })
      .from(pois)
      .where(and(eq(pois.routeId, trail.routeId), sql`${pois.category} <> 'water'`))
      .orderBy(asc(pois.chainageM));
    return c.json(rows as unknown as z.infer<typeof AccommodationSchema>[], 200);
  },
);

// GET /trails/:id/regions — the coarse Region layer (§5) with each region's stage
// span + distance, for the trail's region list and navigation.
trailsRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{id}/regions',
    tags: ['Trails'],
    summary: 'Get coarse regions for a trail',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(RegionSummarySchema) } },
        description: 'Regions',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const [trail] = await db
      .select({ routeId: trails.routeId })
      .from(trails)
      .where(eq(trails.id, id));
    if (!trail) return c.json({ error: 'not found' }, 404);

    const rows = (await db.execute(sql`
      SELECT reg.id, reg.route_id AS "routeId", reg.name, reg.description, reg.image_url AS "imageUrl",
             reg.order_index AS "orderIndex", reg.created_at AS "createdAt", reg.updated_at AS "updatedAt",
             COALESCE(MIN(s.order_index), 0)::int AS "stageStart",
             COALESCE(MAX(s.order_index), 0)::int AS "stageEnd",
             COUNT(s.id)::int AS "stageCount",
             COALESCE(MAX(s.end_chainage_m) - MIN(s.start_chainage_m), 0) AS "distanceM"
      FROM regions reg
      LEFT JOIN sections s ON s.region_id = reg.id
      WHERE reg.route_id = ${trail.routeId}
      GROUP BY reg.id
      ORDER BY reg.order_index
    `)) as unknown as z.infer<typeof RegionSummarySchema>[];
    return c.json(rows, 200);
  },
);

// GET /trails/:id/hazards — hazards along the trail, ordered by chainage (§13).
trailsRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{id}/hazards',
    tags: ['Trails'],
    summary: 'Get hazards for a trail ordered by chainage',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(HazardSchema) } },
        description: 'Hazards',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const [trail] = await db
      .select({ routeId: trails.routeId })
      .from(trails)
      .where(eq(trails.id, id));
    if (!trail) return c.json({ error: 'not found' }, 404);
    const rows = await db
      .select({
        id: hazards.id,
        routeId: hazards.routeId,
        name: hazards.name,
        chainageM: hazards.chainageM,
        type: hazards.type,
        description: hazards.description,
        source: hazards.source,
        confidence: hazards.confidence,
        lastConfirmedAt: hazards.lastConfirmedAt,
        reportCount: hazards.reportCount,
        manualOverride: hazards.manualOverride,
        createdAt: hazards.createdAt,
        updatedAt: hazards.updatedAt,
        lat: sql<number | null>`ST_Y(${hazards.geom})`,
        lng: sql<number | null>`ST_X(${hazards.geom})`,
      })
      .from(hazards)
      .where(eq(hazards.routeId, trail.routeId))
      .orderBy(asc(hazards.chainageM));
    return c.json(rows as unknown as z.infer<typeof HazardSchema>[], 200);
  },
);
