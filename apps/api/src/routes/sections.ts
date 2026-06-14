import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { asc, db, eq, routes, sections, sql, trails } from '@roam/db';

import { ElevationPointSchema, ErrorSchema, IdParamSchema, SectionSchema } from '../schemas';

export const sectionsRouter = new OpenAPIHono();

const SectionDetailSchema = SectionSchema.extend({
  orderIndex: z.number(),
  totalSections: z.number(),
  trailId: z.number(),
  distanceM: z.number(),
  // GeoJSON geometry for just this section, extracted via ST_LineSubstring
  geometry: z.record(z.string(), z.unknown()).nullable(),
  // The route's elevation profile sliced to this section, distance rebased to 0.
  elevationProfile: z.array(ElevationPointSchema).nullable(),
});

// GET /sections/:id
sectionsRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Sections'],
    summary: 'Get section detail with trail context',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: SectionDetailSchema } },
        description: 'Section detail',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');

    const [section] = await db.select().from(sections).where(eq(sections.id, id));
    if (!section) return c.json({ error: 'not found' }, 404);

    // Get trail id and total sections count for "Section X of Y"
    const [trail] = await db
      .select({ id: trails.id })
      .from(trails)
      .where(eq(trails.routeId, section.routeId));

    const allSections = await db
      .select({ id: sections.id })
      .from(sections)
      .where(eq(sections.routeId, section.routeId))
      .orderBy(asc(sections.orderIndex));

    const distanceM = Math.abs((section.endChainageM ?? 0) - (section.startChainageM ?? 0));

    // Extract section geometry using ST_LineSubstring on the merged route line
    const start = section.startChainageM ?? 0;
    const end = section.endChainageM ?? 0;

    // Slice the route's elevation profile to this section, rebasing distance to 0.
    const [routeRow] = await db
      .select({ elevationProfile: routes.elevationProfile })
      .from(routes)
      .where(eq(routes.id, section.routeId));
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    const elevationProfile =
      routeRow?.elevationProfile
        ?.filter((p) => p.d >= lo && p.d <= hi)
        .map((p) => ({ d: Math.round(p.d - lo), e: p.e })) ?? null;

    const geomRows = (await db.execute(sql`
      SELECT ST_AsGeoJSON(
        ST_SimplifyPreserveTopology(
          ST_LineSubstring(
            ST_LineMerge(r.geom),
            LEAST(${start}::double precision, ${end}::double precision) / NULLIF(ST_Length(ST_LineMerge(r.geom)::geography), 0),
            GREATEST(${start}::double precision, ${end}::double precision) / NULLIF(ST_Length(ST_LineMerge(r.geom)::geography), 0)
          ),
          0.0001
        )
      )::json AS geometry
      FROM routes r WHERE r.id = ${section.routeId}
    `)) as unknown as Array<{ geometry: object | null }>;

    return c.json(
      {
        ...section,
        distanceM,
        totalSections: allSections.length,
        trailId: trail?.id ?? 0,
        geometry: geomRows[0]?.geometry ?? null,
        elevationProfile,
      },
      200,
    );
  },
);
