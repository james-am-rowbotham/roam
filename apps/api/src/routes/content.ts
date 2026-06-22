import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { and, asc, contentBlocks, db, eq } from '@roam/db';
import { ContentBlockSchema } from '../schemas';

export const contentRouter = new OpenAPIHono();

const ScopeParamSchema = z.object({
  scopeType: z.enum(['route', 'region', 'stage', 'poi']),
  scopeId: z.string().transform(Number),
});

// GET /content/:scopeType/:scopeId — the curated read-layer blocks (§21) for one
// node of the chain (a route, region, stage/etapa or POI). The web and the app
// render from the same blocks. Flagged drafts are withheld; everything else is
// returned ordered for display.
contentRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{scopeType}/{scopeId}',
    tags: ['Content'],
    summary: 'Content blocks for a scope',
    request: { params: ScopeParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(ContentBlockSchema) } },
        description: 'Content blocks',
      },
    },
  }),
  async (c) => {
    const { scopeType, scopeId } = c.req.valid('param');
    const rows = await db
      .select({
        id: contentBlocks.id,
        scopeType: contentBlocks.scopeType,
        scopeId: contentBlocks.scopeId,
        lens: contentBlocks.lens,
        block: contentBlocks.block,
        schemaVersion: contentBlocks.schemaVersion,
        orderIndex: contentBlocks.orderIndex,
        seasonFrom: contentBlocks.seasonFrom,
        seasonTo: contentBlocks.seasonTo,
        source: contentBlocks.source,
        confidence: contentBlocks.confidence,
        reviewStatus: contentBlocks.reviewStatus,
      })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.scopeType, scopeType), eq(contentBlocks.scopeId, scopeId)))
      .orderBy(asc(contentBlocks.orderIndex));
    return c.json(rows, 200);
  },
);
