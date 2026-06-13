import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { resolveWaymark } from '@roam/core';
import { accommodations, asc, db, eq, routes, sections, sql, trails, waterSources } from '@roam/db';
import {
  AccommodationSchema,
  ErrorSchema,
  IdParamSchema,
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
      })
      .from(trails)
      .innerJoin(routes, eq(trails.routeId, routes.id))
      .orderBy(asc(trails.id));
    return c.json(rows.map(withWaymark), 200);
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
        properties: withWaymark(trail),
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
      .select()
      .from(sections)
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
        id: waterSources.id,
        routeId: waterSources.routeId,
        name: waterSources.name,
        chainageM: waterSources.chainageM,
        imageUrl: waterSources.imageUrl,
        seasonal: waterSources.seasonal,
        source: waterSources.source,
        confidence: waterSources.confidence,
        lastConfirmedAt: waterSources.lastConfirmedAt,
        reportCount: waterSources.reportCount,
        manualOverride: waterSources.manualOverride,
        createdAt: waterSources.createdAt,
        updatedAt: waterSources.updatedAt,
        lat: sql<number | null>`ST_Y(${waterSources.geom})`,
        lng: sql<number | null>`ST_X(${waterSources.geom})`,
      })
      .from(waterSources)
      .where(eq(waterSources.routeId, trail.routeId))
      .orderBy(asc(waterSources.chainageM));
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
        id: accommodations.id,
        routeId: accommodations.routeId,
        name: accommodations.name,
        chainageM: accommodations.chainageM,
        imageUrl: accommodations.imageUrl,
        type: accommodations.type,
        capacity: accommodations.capacity,
        seasonal: accommodations.seasonal,
        bookingUrl: accommodations.bookingUrl,
        source: accommodations.source,
        confidence: accommodations.confidence,
        lastConfirmedAt: accommodations.lastConfirmedAt,
        reportCount: accommodations.reportCount,
        manualOverride: accommodations.manualOverride,
        createdAt: accommodations.createdAt,
        updatedAt: accommodations.updatedAt,
        lat: sql<number | null>`ST_Y(${accommodations.geom})`,
        lng: sql<number | null>`ST_X(${accommodations.geom})`,
      })
      .from(accommodations)
      .where(eq(accommodations.routeId, trail.routeId))
      .orderBy(asc(accommodations.chainageM));
    return c.json(rows as unknown as z.infer<typeof AccommodationSchema>[], 200);
  },
);
