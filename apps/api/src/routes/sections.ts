import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { and, asc, db, eq, sections, trails } from '@roam/db';
import { ErrorSchema, IdParamSchema, SectionSchema } from '../schemas';

export const sectionsRouter = new OpenAPIHono();

const SectionDetailSchema = SectionSchema.extend({
  orderIndex: z.number(),
  totalSections: z.number(),
  trailId: z.number(),
  distanceM: z.number(),
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

    const distanceM = (section.endChainageM ?? 0) - (section.startChainageM ?? 0);

    return c.json(
      {
        ...section,
        distanceM,
        totalSections: allSections.length,
        trailId: trail?.id ?? 0,
      },
      200,
    );
  },
);
