import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
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
      })
      .from(trails)
      .innerJoin(routes, eq(trails.routeId, routes.id))
      .orderBy(asc(trails.id));
    return c.json(rows, 200);
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
      { type: 'Feature' as const, geometry: geomRows[0]?.geometry ?? null, properties: trail },
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
      .select()
      .from(waterSources)
      .where(eq(waterSources.routeId, trail.routeId))
      .orderBy(asc(waterSources.chainageM));
    return c.json(rows, 200);
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
      .select()
      .from(accommodations)
      .where(eq(accommodations.routeId, trail.routeId))
      .orderBy(asc(accommodations.chainageM));
    return c.json(rows, 200);
  },
);
