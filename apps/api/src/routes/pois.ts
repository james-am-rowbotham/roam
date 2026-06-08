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
    const rows = await db.execute(sql`
      SELECT *, ST_Y(geom) AS lat, ST_X(geom) AS lng
      FROM water_sources WHERE id = ${id}
    `);
    const row = (rows as unknown[])[0];
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
    const rows = await db.execute(sql`
      SELECT *, ST_Y(geom) AS lat, ST_X(geom) AS lng
      FROM accommodations WHERE id = ${id}
    `);
    const row = (rows as unknown[])[0];
    if (!row) return c.json({ error: 'not found' }, 404);
    return c.json(row as z.infer<typeof AccommodationSchema>, 200);
  },
);
