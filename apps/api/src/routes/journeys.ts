import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { planJourney } from '@roam/core';
import { accommodations, asc, db, desc, eq, journeys, routes, sections, stages } from '@roam/db';
import {
  CreateJourneySchema,
  ErrorSchema,
  IdParamSchema,
  JourneySchema,
  JourneyWithStagesSchema,
} from '../schemas';

export const journeysRouter = new OpenAPIHono();

// POST /journeys — generate a stage plan over a route and persist it.
journeysRouter.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Journeys'],
    summary: 'Create a journey and generate its stages',
    request: {
      body: { content: { 'application/json': { schema: CreateJourneySchema } } },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: JourneyWithStagesSchema } },
        description: 'Created journey with stages',
      },
      400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Bad request' },
      404: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Route not found',
      },
    },
  }),
  async (c) => {
    const body = c.req.valid('json');

    const [route] = await db
      .select({ id: routes.id })
      .from(routes)
      .where(eq(routes.id, body.routeId));
    if (!route) return c.json({ error: 'route not found' }, 404);

    // Load the route's sections + accommodations and run the (pure) engine.
    const sectionRows = await db
      .select()
      .from(sections)
      .where(eq(sections.routeId, body.routeId))
      .orderBy(asc(sections.orderIndex));
    const accommodationRows = await db
      .select()
      .from(accommodations)
      .where(eq(accommodations.routeId, body.routeId));

    const plan = planJourney({
      sections: sectionRows,
      direction: body.direction,
      startSectionId: body.startSectionId,
      endSectionId: body.endSectionId,
      pace: body.targetDistancePerDayM
        ? { targetDistancePerDayM: body.targetDistancePerDayM }
        : undefined,
      dates:
        body.startDate && body.endDate
          ? { startDate: new Date(body.startDate), endDate: new Date(body.endDate) }
          : undefined,
      accommodation: body.accommodation,
      accommodations: accommodationRows,
    });

    if (plan.stages.length === 0) {
      return c.json({ error: 'could not generate stages for the given route/range' }, 400);
    }

    const created = await db.transaction(async (tx) => {
      const [journey] = await tx
        .insert(journeys)
        .values({
          userId: body.userId,
          name: body.name ?? null,
          routeId: body.routeId,
          direction: body.direction ?? 'forward',
          startDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          accommodation: body.accommodation ?? null,
          startChainageM: plan.stages[0]?.startChainageM ?? null,
          endChainageM: plan.stages.at(-1)?.endChainageM ?? null,
        })
        .returning();
      if (!journey) throw new Error('journey insert returned no row');

      const stageRows = await tx
        .insert(stages)
        .values(
          plan.stages.map((s) => ({
            journeyId: journey.id,
            orderIndex: s.orderIndex,
            startChainageM: s.startChainageM,
            endChainageM: s.endChainageM,
            distanceM: s.distanceM,
            ascentM: s.ascentM,
            descentM: s.descentM,
            overnightAccommodationId: s.suggestedAccommodationId,
          })),
        )
        .returning();

      return { ...journey, stages: stageRows };
    });

    return c.json(created as unknown as z.infer<typeof JourneyWithStagesSchema>, 201);
  },
);

// GET /journeys?userId= — list a user's journeys (most recent first).
journeysRouter.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Journeys'],
    summary: "List a user's journeys",
    request: { query: z.object({ userId: z.string() }) },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(JourneySchema) } },
        description: 'Journeys',
      },
    },
  }),
  async (c) => {
    const { userId } = c.req.valid('query');
    const rows = await db
      .select()
      .from(journeys)
      .where(eq(journeys.userId, userId))
      .orderBy(desc(journeys.createdAt));
    return c.json(rows as unknown as z.infer<typeof JourneySchema>[], 200);
  },
);

// GET /journeys/:id — a journey with its ordered stages.
journeysRouter.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Journeys'],
    summary: 'Get a journey with its stages',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: JourneyWithStagesSchema } },
        description: 'Journey with stages',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
    if (!journey) return c.json({ error: 'not found' }, 404);

    const stageRows = await db
      .select()
      .from(stages)
      .where(eq(stages.journeyId, id))
      .orderBy(asc(stages.orderIndex));

    return c.json(
      { ...journey, stages: stageRows } as unknown as z.infer<typeof JourneyWithStagesSchema>,
      200,
    );
  },
);
