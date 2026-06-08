import { OpenAPIHono, createRoute, type z } from '@hono/zod-openapi';
import { accommodations, db, eq, sql, waterSources } from '@roam/db';
import { AccommodationSchema, ErrorSchema, IdParamSchema, WaterSourceSchema } from '../schemas';

export const poisRouter = new OpenAPIHono();

// GET /pois/water/:id
poisRouter.openapi(
  createRoute({
    method: 'get',
    path: '/water/{id}',
    tags: ['POIs'],
    summary: 'Get water source detail',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: WaterSourceSchema } },
        description: 'Water source',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const [row] = await db
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
        lat: sql<number | null>`ST_Y(geom)`,
        lng: sql<number | null>`ST_X(geom)`,
      })
      .from(waterSources)
      .where(eq(waterSources.id, id));

    if (!row) return c.json({ error: 'not found' }, 404);
    return c.json(row as z.infer<typeof WaterSourceSchema>, 200);
  },
);

// GET /pois/accommodations/:id
poisRouter.openapi(
  createRoute({
    method: 'get',
    path: '/accommodations/{id}',
    tags: ['POIs'],
    summary: 'Get accommodation detail',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: AccommodationSchema } },
        description: 'Accommodation',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const [row] = await db
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
        lat: sql<number | null>`ST_Y(geom)`,
        lng: sql<number | null>`ST_X(geom)`,
      })
      .from(accommodations)
      .where(eq(accommodations.id, id));

    if (!row) return c.json({ error: 'not found' }, 404);
    return c.json(row as z.infer<typeof AccommodationSchema>, 200);
  },
);
