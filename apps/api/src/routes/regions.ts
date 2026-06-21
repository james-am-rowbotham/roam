import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { and, asc, contentBlocks, db, eq, regions, routes, sql, trails } from '@roam/db';
import { ErrorSchema, IdParamSchema, RegionDetailSchema } from '../schemas';

export const regionsRouter = new OpenAPIHono();

// GET /regions/:id — a coarse Region (§5): its stage span + distance, a geometry
// slice and elevation slice for that span, and its curated content blocks. This
// is the mobile "Section" detail, rendered on the web region page.
regionsRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Regions'],
    summary: 'Get region detail with content, geometry and elevation slices',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: RegionDetailSchema } },
        description: 'Region detail',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');

    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    if (!region) return c.json({ error: 'not found' }, 404);

    const [trail] = await db
      .select({ id: trails.id })
      .from(trails)
      .where(eq(trails.routeId, region.routeId));

    // Aggregate the region's stages: span (chainage) + stage-number range.
    const [agg] = (await db.execute(sql`
      SELECT
        COUNT(*)::int AS stage_count,
        MIN(order_index)::int AS stage_start,
        MAX(order_index)::int AS stage_end,
        MIN(start_chainage_m) AS start_m,
        MAX(end_chainage_m) AS end_m
      FROM sections WHERE region_id = ${id}
    `)) as unknown as Array<{
      stage_count: number;
      stage_start: number | null;
      stage_end: number | null;
      start_m: number | null;
      end_m: number | null;
    }>;

    const startM = agg?.start_m ?? 0;
    const endM = agg?.end_m ?? 0;
    const distanceM = Math.abs(endM - startM);

    // Geometry slice for the region's chainage span (ST_LineSubstring, §7).
    const geomRows = (await db.execute(sql`
      SELECT ST_AsGeoJSON(
        ST_SimplifyPreserveTopology(
          ST_LineSubstring(
            ST_LineMerge(r.geom),
            LEAST(${startM}::double precision, ${endM}::double precision) / NULLIF(ST_Length(ST_LineMerge(r.geom)::geography), 0),
            GREATEST(${startM}::double precision, ${endM}::double precision) / NULLIF(ST_Length(ST_LineMerge(r.geom)::geography), 0)
          ),
          0.0002
        )
      )::json AS geometry
      FROM routes r WHERE r.id = ${region.routeId}
    `)) as unknown as Array<{ geometry: object | null }>;

    // Elevation profile sliced to the span, distance rebased to 0.
    const [routeRow] = await db
      .select({ elevationProfile: routes.elevationProfile })
      .from(routes)
      .where(eq(routes.id, region.routeId));
    const lo = Math.min(startM, endM);
    const hi = Math.max(startM, endM);
    const elevationProfile =
      routeRow?.elevationProfile
        ?.filter((p) => p.d >= lo && p.d <= hi)
        .map((p) => ({ d: Math.round(p.d - lo), e: p.e })) ?? null;

    const blocks = await db
      .select({
        id: contentBlocks.id,
        scopeType: contentBlocks.scopeType,
        scopeId: contentBlocks.scopeId,
        lens: contentBlocks.lens,
        blockType: contentBlocks.blockType,
        title: contentBlocks.title,
        body: contentBlocks.body,
        orderIndex: contentBlocks.orderIndex,
        seasonFrom: contentBlocks.seasonFrom,
        seasonTo: contentBlocks.seasonTo,
        source: contentBlocks.source,
        confidence: contentBlocks.confidence,
      })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.scopeType, 'region'), eq(contentBlocks.scopeId, id)))
      .orderBy(asc(contentBlocks.orderIndex));

    return c.json(
      {
        ...region,
        trailId: trail?.id ?? 0,
        stageStart: agg?.stage_start ?? 0,
        stageEnd: agg?.stage_end ?? 0,
        stageCount: agg?.stage_count ?? 0,
        distanceM,
        geometry: geomRows[0]?.geometry ?? null,
        elevationProfile,
        contentBlocks: blocks,
      },
      200,
    );
  },
);
