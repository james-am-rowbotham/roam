import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { type ProgressAction, applyProgress, planJourney } from '@roam/core';
import {
  accommodations,
  and,
  asc,
  db,
  desc,
  eq,
  inArray,
  journeys,
  ne,
  routes,
  sections,
  stages,
} from '@roam/db';
import {
  CreateJourneySchema,
  ErrorSchema,
  IdParamSchema,
  JourneySchema,
  JourneySummarySchema,
  JourneyWithStagesSchema,
  ProgressActionSchema,
  UpdateJourneySchema,
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

    // Build the stages to persist: either the client's adjusted itinerary, or a
    // fresh plan from the route's sections via the (pure) engine.
    type StageValues = {
      orderIndex: number;
      startChainageM: number;
      endChainageM: number;
      distanceM: number;
      ascentM: number;
      descentM: number;
      overnightAccommodationId: number | null;
      restDay: boolean;
    };
    let stageValues: StageValues[];

    if (body.stages && body.stages.length > 0) {
      stageValues = body.stages.map((s, i) => ({ orderIndex: i + 1, ...s }));
    } else {
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
      stageValues = plan.stages.map((s) => ({
        orderIndex: s.orderIndex,
        startChainageM: s.startChainageM,
        endChainageM: s.endChainageM,
        distanceM: s.distanceM,
        ascentM: s.ascentM,
        descentM: s.descentM,
        overnightAccommodationId: s.suggestedAccommodationId,
        restDay: false,
      }));
    }

    if (stageValues.length === 0) {
      return c.json({ error: 'could not generate stages for the given route/range' }, 400);
    }

    const walk = stageValues.filter((s) => !s.restDay);
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
          guidePreset: body.guidePreset ?? 'guided',
          startChainageM: walk[0]?.startChainageM ?? null,
          endChainageM: walk.at(-1)?.endChainageM ?? null,
        })
        .returning();
      if (!journey) throw new Error('journey insert returned no row');

      const stageRows = await tx
        .insert(stages)
        .values(stageValues.map((s) => ({ ...s, journeyId: journey.id })))
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
        content: { 'application/json': { schema: z.array(JourneySummarySchema) } },
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

    // Progress summary per journey, from its (non-rest) stages.
    const ids = rows.map((r) => r.id);
    const stageRows = ids.length
      ? await db
          .select({
            journeyId: stages.journeyId,
            distanceM: stages.distanceM,
            restDay: stages.restDay,
            status: stages.status,
          })
          .from(stages)
          .where(inArray(stages.journeyId, ids))
      : [];

    type Sum = {
      totalDays: number;
      completedDays: number;
      totalDistanceM: number;
      doneDistanceM: number;
    };
    const byJourney = new Map<number, Sum>();
    for (const s of stageRows) {
      if (s.restDay) continue;
      const agg = byJourney.get(s.journeyId) ?? {
        totalDays: 0,
        completedDays: 0,
        totalDistanceM: 0,
        doneDistanceM: 0,
      };
      agg.totalDays += 1;
      agg.totalDistanceM += s.distanceM ?? 0;
      if (s.status === 'completed') {
        agg.completedDays += 1;
        agg.doneDistanceM += s.distanceM ?? 0;
      }
      byJourney.set(s.journeyId, agg);
    }

    const summarised = rows.map((r) => ({
      ...r,
      ...(byJourney.get(r.id) ?? {
        totalDays: 0,
        completedDays: 0,
        totalDistanceM: 0,
        doneDistanceM: 0,
      }),
    }));
    return c.json(summarised as unknown as z.infer<typeof JourneySummarySchema>[], 200);
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

// PATCH /journeys/:id — update editable journey settings (name).
journeysRouter.openapi(
  createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Journeys'],
    summary: 'Update journey settings',
    request: {
      params: IdParamSchema,
      body: { content: { 'application/json': { schema: UpdateJourneySchema } } },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: JourneyWithStagesSchema } },
        description: 'Updated journey with stages',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const [existing] = await db
      .select({ id: journeys.id })
      .from(journeys)
      .where(eq(journeys.id, id));
    if (!existing) return c.json({ error: 'not found' }, 404);

    const patch: Partial<typeof journeys.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name.trim() || null;
    if (body.guidePreset !== undefined) patch.guidePreset = body.guidePreset;
    if (body.pace !== undefined) patch.pace = body.pace;
    await db.update(journeys).set(patch).where(eq(journeys.id, id));

    return c.json(await journeyWithStages(id), 200);
  },
);

// DELETE /journeys/:id — remove a journey and its stages.
journeysRouter.openapi(
  createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Journeys'],
    summary: 'Delete a journey',
    request: { params: IdParamSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: z.object({ id: z.number() }) } },
        description: 'Deleted',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const [journey] = await db
      .select({ id: journeys.id })
      .from(journeys)
      .where(eq(journeys.id, id));
    if (!journey) return c.json({ error: 'not found' }, 404);

    await db.transaction(async (tx) => {
      await tx.delete(stages).where(eq(stages.journeyId, id));
      await tx.delete(journeys).where(eq(journeys.id, id));
    });

    return c.json({ id }, 200);
  },
);

// POST /journeys/:id/progress — apply a progress/override action (start, complete
// a stage, undo, stop early, end) via the pure engine, then persist the changes.
journeysRouter.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/progress',
    tags: ['Journeys'],
    summary: 'Advance or override a journey',
    request: {
      params: IdParamSchema,
      body: { content: { 'application/json': { schema: ProgressActionSchema } } },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: JourneyWithStagesSchema } },
        description: 'Updated journey with stages',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
    if (!journey) return c.json({ error: 'not found' }, 404);
    const stageRows = await db
      .select()
      .from(stages)
      .where(eq(stages.journeyId, id))
      .orderBy(asc(stages.orderIndex));

    const before = stageRows.map((s) => ({
      id: s.id,
      orderIndex: s.orderIndex,
      status: s.status,
      completedAt: s.completedAt ? s.completedAt.toISOString() : null,
      restDay: s.restDay,
      stoppedEarlyAtChainageM: s.stoppedEarlyAtChainageM,
    }));

    // Timestamps are stamped here so the engine stays pure.
    const at = new Date().toISOString();
    const action: ProgressAction =
      body.type === 'completeStage'
        ? { type: 'completeStage', stageId: body.stageId, at }
        : body.type === 'end'
          ? { type: 'end', at }
          : body;

    const result = applyProgress({ status: journey.status }, before, action);

    const changed = result.stages.filter((s) => {
      const o = before.find((b) => b.id === s.id);
      return (
        o &&
        (o.status !== s.status ||
          o.completedAt !== s.completedAt ||
          o.stoppedEarlyAtChainageM !== s.stoppedEarlyAtChainageM)
      );
    });

    // Only one journey may be navigated ('active') at a time: when this one
    // becomes active, any other active journey for the same user is paused.
    const becameActive = result.journey.status === 'active' && journey.status !== 'active';

    await db.transaction(async (tx) => {
      if (result.journey.status !== journey.status) {
        await tx
          .update(journeys)
          .set({ status: result.journey.status, updatedAt: new Date() })
          .where(eq(journeys.id, id));
      }
      if (becameActive) {
        await tx
          .update(journeys)
          .set({ status: 'paused', updatedAt: new Date() })
          .where(
            and(
              eq(journeys.userId, journey.userId),
              eq(journeys.status, 'active'),
              ne(journeys.id, id),
            ),
          );
      }
      for (const s of changed) {
        await tx
          .update(stages)
          .set({
            status: s.status,
            completedAt: s.completedAt ? new Date(s.completedAt) : null,
            stoppedEarlyAtChainageM: s.stoppedEarlyAtChainageM,
            updatedAt: new Date(),
          })
          .where(eq(stages.id, s.id));
      }
    });

    const [updated] = await db.select().from(journeys).where(eq(journeys.id, id));
    const updatedStages = await db
      .select()
      .from(stages)
      .where(eq(stages.journeyId, id))
      .orderBy(asc(stages.orderIndex));

    return c.json(
      { ...updated, stages: updatedStages } as unknown as z.infer<typeof JourneyWithStagesSchema>,
      200,
    );
  },
);

// POST /journeys/:id/rest-day — insert a rest day after a stage, shifting the
// rest of the schedule by one day.
journeysRouter.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/rest-day',
    tags: ['Journeys'],
    summary: 'Insert a rest day after a stage',
    request: {
      params: IdParamSchema,
      body: {
        content: { 'application/json': { schema: z.object({ afterStageId: z.number() }) } },
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: JourneyWithStagesSchema } },
        description: 'Updated journey with stages',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const { afterStageId } = c.req.valid('json');

    const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
    if (!journey) return c.json({ error: 'not found' }, 404);
    const rows = await db
      .select()
      .from(stages)
      .where(eq(stages.journeyId, id))
      .orderBy(asc(stages.orderIndex));
    const after = rows.find((s) => s.id === afterStageId);
    if (!after) return c.json({ error: 'stage not found' }, 404);

    await db.transaction(async (tx) => {
      // Shift later stages down by one, highest orderIndex first to avoid clashes.
      const toShift = rows
        .filter((s) => s.orderIndex > after.orderIndex)
        .sort((a, b) => b.orderIndex - a.orderIndex);
      for (const s of toShift) {
        await tx
          .update(stages)
          .set({ orderIndex: s.orderIndex + 1 })
          .where(eq(stages.id, s.id));
      }
      await tx.insert(stages).values({
        journeyId: id,
        orderIndex: after.orderIndex + 1,
        startChainageM: after.endChainageM,
        endChainageM: after.endChainageM,
        distanceM: 0,
        ascentM: 0,
        descentM: 0,
        restDay: true,
        status: 'planned',
      });
    });

    return c.json(await journeyWithStages(id), 200);
  },
);

async function journeyWithStages(id: number) {
  const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
  const stageRows = await db
    .select()
    .from(stages)
    .where(eq(stages.journeyId, id))
    .orderBy(asc(stages.orderIndex));
  return { ...journey, stages: stageRows } as unknown as z.infer<typeof JourneyWithStagesSchema>;
}

// POST /journeys/:id/combine — merge a day with the one after it into a single
// longer day, then renumber.
journeysRouter.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/combine',
    tags: ['Journeys'],
    summary: 'Combine a day with the next',
    request: {
      params: IdParamSchema,
      body: { content: { 'application/json': { schema: z.object({ stageId: z.number() }) } } },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: JourneyWithStagesSchema } },
        description: 'Updated journey with stages',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Cannot combine',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const { stageId } = c.req.valid('json');

    const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
    if (!journey) return c.json({ error: 'not found' }, 404);
    const rows = await db
      .select()
      .from(stages)
      .where(eq(stages.journeyId, id))
      .orderBy(asc(stages.orderIndex));
    const target = rows.find((s) => s.id === stageId);
    const nextStage = target ? rows.find((s) => s.orderIndex === target.orderIndex + 1) : undefined;
    if (!target || !nextStage || target.restDay || nextStage.restDay) {
      return c.json({ error: 'cannot combine these days' }, 400);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(stages)
        .set({
          endChainageM: nextStage.endChainageM,
          distanceM: (target.distanceM ?? 0) + (nextStage.distanceM ?? 0),
          ascentM: (target.ascentM ?? 0) + (nextStage.ascentM ?? 0),
          descentM: (target.descentM ?? 0) + (nextStage.descentM ?? 0),
          overnightAccommodationId: nextStage.overnightAccommodationId,
          updatedAt: new Date(),
        })
        .where(eq(stages.id, target.id));
      await tx.delete(stages).where(eq(stages.id, nextStage.id));
      const after = rows
        .filter((s) => s.orderIndex > nextStage.orderIndex)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      for (const s of after) {
        await tx
          .update(stages)
          .set({ orderIndex: s.orderIndex - 1 })
          .where(eq(stages.id, s.id));
      }
    });

    return c.json(await journeyWithStages(id), 200);
  },
);

// POST /journeys/:id/split — split a day in two at its chainage midpoint.
journeysRouter.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/split',
    tags: ['Journeys'],
    summary: 'Split a day into two',
    request: {
      params: IdParamSchema,
      body: { content: { 'application/json': { schema: z.object({ stageId: z.number() }) } } },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: JourneyWithStagesSchema } },
        description: 'Updated journey with stages',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Cannot split',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const { stageId } = c.req.valid('json');

    const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
    if (!journey) return c.json({ error: 'not found' }, 404);
    const rows = await db
      .select()
      .from(stages)
      .where(eq(stages.journeyId, id))
      .orderBy(asc(stages.orderIndex));
    const target = rows.find((s) => s.id === stageId);
    if (!target || target.restDay || (target.distanceM ?? 0) <= 0) {
      return c.json({ error: 'cannot split this day' }, 400);
    }

    // Split at the section boundary nearest the day's midpoint, so days stay
    // aligned to the trail's sections (not arbitrary halves).
    const sectionRows = await db
      .select({ startChainageM: sections.startChainageM, endChainageM: sections.endChainageM })
      .from(sections)
      .where(eq(sections.routeId, journey.routeId));
    const lo = Math.min(target.startChainageM, target.endChainageM);
    const hi = Math.max(target.startChainageM, target.endChainageM);
    const mid = (lo + hi) / 2;
    let cut: number | null = null;
    let bestGap = Number.POSITIVE_INFINITY;
    for (const sec of sectionRows) {
      for (const edge of [sec.startChainageM, sec.endChainageM]) {
        if (edge <= lo + 1 || edge >= hi - 1) continue;
        const gap = Math.abs(edge - mid);
        if (gap < bestGap) {
          bestGap = gap;
          cut = edge;
        }
      }
    }
    if (cut === null) return c.json({ error: 'no section boundary to split on' }, 400);

    const origEnd = target.endChainageM;
    const origOvernight = target.overnightAccommodationId;
    const totalDist = target.distanceM ?? 0;
    const firstDist = Math.abs(cut - target.startChainageM);
    const secondDist = Math.abs(target.endChainageM - cut);
    const frac = totalDist > 0 ? firstDist / totalDist : 0.5;
    const first = {
      distanceM: firstDist,
      ascentM: (target.ascentM ?? 0) * frac,
      descentM: (target.descentM ?? 0) * frac,
    };
    const second = {
      distanceM: secondDist,
      ascentM: (target.ascentM ?? 0) * (1 - frac),
      descentM: (target.descentM ?? 0) * (1 - frac),
    };

    await db.transaction(async (tx) => {
      await tx
        .update(stages)
        .set({ endChainageM: cut, ...first, overnightAccommodationId: null, updatedAt: new Date() })
        .where(eq(stages.id, target.id));
      const after = rows
        .filter((s) => s.orderIndex > target.orderIndex)
        .sort((a, b) => b.orderIndex - a.orderIndex);
      for (const s of after) {
        await tx
          .update(stages)
          .set({ orderIndex: s.orderIndex + 1 })
          .where(eq(stages.id, s.id));
      }
      await tx.insert(stages).values({
        journeyId: id,
        orderIndex: target.orderIndex + 1,
        startChainageM: cut,
        endChainageM: origEnd,
        ...second,
        overnightAccommodationId: origOvernight,
        restDay: false,
        status: 'planned',
      });
    });

    return c.json(await journeyWithStages(id), 200);
  },
);

// POST /journeys/:id/remove-rest-day — delete a rest day and renumber.
journeysRouter.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/remove-rest-day',
    tags: ['Journeys'],
    summary: 'Remove a rest day',
    request: {
      params: IdParamSchema,
      body: { content: { 'application/json': { schema: z.object({ stageId: z.number() }) } } },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: JourneyWithStagesSchema } },
        description: 'Updated journey with stages',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Not a rest day',
      },
      404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not found' },
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const { stageId } = c.req.valid('json');

    const [journey] = await db.select().from(journeys).where(eq(journeys.id, id));
    if (!journey) return c.json({ error: 'not found' }, 404);
    const rows = await db
      .select()
      .from(stages)
      .where(eq(stages.journeyId, id))
      .orderBy(asc(stages.orderIndex));
    const target = rows.find((s) => s.id === stageId);
    if (!target || !target.restDay) return c.json({ error: 'not a rest day' }, 400);

    await db.transaction(async (tx) => {
      await tx.delete(stages).where(eq(stages.id, target.id));
      const after = rows
        .filter((s) => s.orderIndex > target.orderIndex)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      for (const s of after) {
        await tx
          .update(stages)
          .set({ orderIndex: s.orderIndex - 1 })
          .where(eq(stages.id, s.id));
      }
    });

    return c.json(await journeyWithStages(id), 200);
  },
);
