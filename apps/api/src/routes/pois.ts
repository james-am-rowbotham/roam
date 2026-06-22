import { OpenAPIHono, createRoute, type z } from '@hono/zod-openapi';
import { and, db, eq, pois, sql } from '@roam/db';
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
        id: pois.id,
        routeId: pois.routeId,
        name: pois.name,
        chainageM: pois.chainageM,
        imageUrl: pois.imageUrl,
        seasonal: sql<boolean>`COALESCE((meta->>'seasonal')::boolean, false)`,
        source: pois.source,
        confidence: pois.confidence,
        lastConfirmedAt: pois.lastConfirmedAt,
        reportCount: pois.reportCount,
        manualOverride: pois.manualOverride,
        createdAt: pois.createdAt,
        updatedAt: pois.updatedAt,
        lat: sql<number | null>`ST_Y(geom)`,
        lng: sql<number | null>`ST_X(geom)`,
      })
      .from(pois)
      .where(and(eq(pois.id, id), eq(pois.category, 'water')));

    if (!row) return c.json({ error: 'not found' }, 404);
    return c.json(row as unknown as z.infer<typeof WaterSourceSchema>, 200);
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
        id: pois.id,
        routeId: pois.routeId,
        name: pois.name,
        chainageM: pois.chainageM,
        imageUrl: pois.imageUrl,
        type: pois.category,
        capacity: sql<number | null>`(meta->>'capacity')::int`,
        seasonal: sql<boolean>`COALESCE((meta->>'seasonal')::boolean, false)`,
        bookingUrl: sql<string | null>`meta->>'bookingUrl'`,
        source: pois.source,
        confidence: pois.confidence,
        lastConfirmedAt: pois.lastConfirmedAt,
        reportCount: pois.reportCount,
        manualOverride: pois.manualOverride,
        createdAt: pois.createdAt,
        updatedAt: pois.updatedAt,
        lat: sql<number | null>`ST_Y(geom)`,
        lng: sql<number | null>`ST_X(geom)`,
      })
      .from(pois)
      .where(and(eq(pois.id, id), sql`category <> 'water'`));

    if (!row) return c.json({ error: 'not found' }, 404);
    return c.json(row as unknown as z.infer<typeof AccommodationSchema>, 200);
  },
);
