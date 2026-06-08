import { accommodations, asc, db, eq, routes, sections, sql, trails, waterSources } from '@roam/db';
import { Hono } from 'hono';

const app = new Hono();

// GET /trails — list all trails joined with their route
app.get('/', async (c) => {
  const rows = await db
    .select({
      id: trails.id,
      ref: trails.ref,
      country: trails.country,
      region: trails.region,
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

  return c.json(rows);
});

// GET /trails/:id — trail detail with simplified GeoJSON geometry
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (Number.isNaN(id)) return c.json({ error: 'invalid id' }, 400);

  const [trail] = await db
    .select({
      id: trails.id,
      ref: trails.ref,
      country: trails.country,
      region: trails.region,
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

  // Serve simplified geometry as GeoJSON — ST_SimplifyPreserveTopology keeps shape accurate
  const geomRows = (await db.execute(sql`
    SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.00005))::json AS geometry
    FROM routes WHERE id = ${trail.routeId}
  `)) as unknown as Array<{ geometry: object }>;

  return c.json({
    type: 'Feature',
    geometry: geomRows[0]?.geometry ?? null,
    properties: trail,
  });
});

// GET /trails/:id/sections — sections ordered by position on route
app.get('/:id/sections', async (c) => {
  const id = Number(c.req.param('id'));
  if (Number.isNaN(id)) return c.json({ error: 'invalid id' }, 400);

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

  return c.json(rows);
});

// GET /trails/:id/water — water sources ordered by chainage
app.get('/:id/water', async (c) => {
  const id = Number(c.req.param('id'));
  if (Number.isNaN(id)) return c.json({ error: 'invalid id' }, 400);

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

  return c.json(rows);
});

// GET /trails/:id/accommodations — accommodations ordered by chainage
app.get('/:id/accommodations', async (c) => {
  const id = Number(c.req.param('id'));
  if (Number.isNaN(id)) return c.json({ error: 'invalid id' }, 400);

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

  return c.json(rows);
});

export { app as trails };
