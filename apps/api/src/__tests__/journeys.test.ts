import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { db, eq, inArray, journeys, stages } from '@roam/db';
import app from '../index';

// Integration tests — hit the real Supabase seed data and write/clean up their
// own journeys. Requires DATABASE_URL and GR11 to be seeded.

const TEST_USER = 'test-journey-user';

async function api(path: string, init?: RequestInit) {
  return app.fetch(new Request(`http://localhost${path}`, init));
}

describe('Journeys', () => {
  let routeId = 0;
  let journeyId = 0;

  beforeAll(async () => {
    const res = await api('/trails');
    const trails = (await res.json()) as Array<{ routeId: number }>;
    const first = trails[0];
    if (!first) throw new Error('no trails seeded — cannot test journeys');
    routeId = first.routeId;
  });

  afterAll(async () => {
    // Remove anything this suite created (stages first — FK to journeys).
    const owned = await db
      .select({ id: journeys.id })
      .from(journeys)
      .where(eq(journeys.userId, TEST_USER));
    const ids = owned.map((j) => j.id);
    if (ids.length > 0) {
      await db.delete(stages).where(inArray(stages.journeyId, ids));
      await db.delete(journeys).where(inArray(journeys.id, ids));
    }
  });

  it('creates a journey and generates ordered stages', async () => {
    const res = await api('/journeys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ routeId, userId: TEST_USER, targetDistancePerDayM: 25_000 }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: number;
      userId: string;
      stages: Array<{ orderIndex: number; startChainageM: number; distanceM: number | null }>;
    };
    journeyId = body.id;

    expect(body.userId).toBe(TEST_USER);
    expect(body.stages.length).toBeGreaterThan(0);
    // Stages are returned in walking order, 1-based and contiguous.
    body.stages.forEach((s, i) => expect(s.orderIndex).toBe(i + 1));
    expect(body.stages.every((s) => (s.distanceM ?? 0) > 0)).toBe(true);
  });

  it('persists an explicitly provided (adjusted) itinerary as-is', async () => {
    const res = await api('/journeys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        routeId,
        userId: TEST_USER,
        name: 'Custom plan',
        stages: [
          {
            startChainageM: 0,
            endChainageM: 10000,
            distanceM: 10000,
            ascentM: 100,
            descentM: 50,
            overnightAccommodationId: null,
            restDay: false,
          },
          {
            startChainageM: 10000,
            endChainageM: 10000,
            distanceM: 0,
            ascentM: 0,
            descentM: 0,
            overnightAccommodationId: null,
            restDay: true,
          },
          {
            startChainageM: 10000,
            endChainageM: 20000,
            distanceM: 10000,
            ascentM: 100,
            descentM: 50,
            overnightAccommodationId: null,
            restDay: false,
          },
        ],
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      name: string;
      stages: Array<{ orderIndex: number; restDay: boolean }>;
    };
    expect(body.name).toBe('Custom plan');
    expect(body.stages.length).toBe(3);
    expect(body.stages[1]?.restDay).toBe(true);
    body.stages.forEach((s, i) => expect(s.orderIndex).toBe(i + 1));
  });

  it('returns the journey with its stages by id', async () => {
    const res = await api(`/journeys/${journeyId}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number; stages: unknown[] };
    expect(body.id).toBe(journeyId);
    expect(Array.isArray(body.stages)).toBe(true);
    expect(body.stages.length).toBeGreaterThan(0);
  });

  it("lists the user's journeys", async () => {
    const res = await api(`/journeys?userId=${TEST_USER}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: number }>;
    expect(body.some((j) => j.id === journeyId)).toBe(true);
  });

  it('404s for an unknown journey', async () => {
    const res = await api('/journeys/999999999');
    expect(res.status).toBe(404);
  });

  it('404s when the route does not exist', async () => {
    const res = await api('/journeys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ routeId: 999999999, userId: TEST_USER }),
    });
    expect(res.status).toBe(404);
  });

  async function progress(action: object) {
    const res = await api(`/journeys/${journeyId}/progress`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(action),
    });
    expect(res.status).toBe(200);
    return (await res.json()) as {
      status: string;
      stages: Array<{ id: number; status: string; completedAt: string | null }>;
    };
  }

  it('starts a journey, completes a stage, and undoes it', async () => {
    const started = await progress({ type: 'start' });
    expect(started.status).toBe('active');
    // Starting activates the journey but does not auto-start a stage (current is derived).
    expect(started.stages[0]?.status).toBe('planned');

    const firstId = started.stages[0]?.id ?? 0;
    const completed = await progress({ type: 'completeStage', stageId: firstId });
    expect(completed.stages[0]?.status).toBe('completed');
    expect(completed.stages[0]?.completedAt).not.toBeNull();
    // Completing a day must NOT auto-start the next.
    expect(completed.stages[1]?.status).toBe('planned');

    const undone = await progress({ type: 'uncompleteStage', stageId: firstId });
    expect(undone.stages[0]?.status).toBe('planned');
    expect(undone.stages[0]?.completedAt).toBeNull();
  });

  it('inserts a rest day after a stage and shifts the schedule', async () => {
    const before = (await (await api(`/journeys/${journeyId}`)).json()) as {
      stages: Array<{ id: number }>;
    };
    const count = before.stages.length;
    const firstId = before.stages[0]?.id ?? 0;

    const res = await api(`/journeys/${journeyId}/rest-day`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ afterStageId: firstId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      stages: Array<{ id: number; orderIndex: number; restDay: boolean }>;
    };
    expect(body.stages.length).toBe(count + 1);
    // The inserted rest day sits right after the first stage.
    expect(body.stages[1]?.restDay).toBe(true);
    body.stages.forEach((s, i) => expect(s.orderIndex).toBe(i + 1));
  });

  it('combines two adjacent walking days into one', async () => {
    const before = (await (await api(`/journeys/${journeyId}`)).json()) as {
      stages: Array<{ id: number; restDay: boolean; distanceM: number | null }>;
    };
    const count = before.stages.length;
    const idx = before.stages.findIndex(
      (s, i) => !s.restDay && before.stages[i + 1] && !before.stages[i + 1]?.restDay,
    );
    const target = before.stages[idx];
    const next = before.stages[idx + 1];
    const res = await api(`/journeys/${journeyId}/combine`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stageId: target?.id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stages: Array<{ id: number; distanceM: number | null }> };
    expect(body.stages.length).toBe(count - 1);
    const merged = body.stages.find((s) => s.id === target?.id);
    expect(merged?.distanceM).toBeCloseTo((target?.distanceM ?? 0) + (next?.distanceM ?? 0), 3);
  });

  it('removes a rest day', async () => {
    const before = (await (await api(`/journeys/${journeyId}`)).json()) as {
      stages: Array<{ id: number; restDay: boolean }>;
    };
    const rest = before.stages.find((s) => s.restDay);
    expect(rest).toBeDefined();
    const res = await api(`/journeys/${journeyId}/remove-rest-day`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stageId: rest?.id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stages: Array<{ id: number }> };
    expect(body.stages.some((s) => s.id === rest?.id)).toBe(false);
  });

  it('splits a day at a section boundary into two', async () => {
    const before = (await (await api(`/journeys/${journeyId}`)).json()) as {
      stages: Array<{ id: number; orderIndex: number; restDay: boolean; distanceM: number | null }>;
    };
    const count = before.stages.length;
    // A long day (spans a section boundary) is splittable.
    const target = [...before.stages]
      .filter((s) => !s.restDay)
      .sort((a, b) => (b.distanceM ?? 0) - (a.distanceM ?? 0))[0];
    const res = await api(`/journeys/${journeyId}/split`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stageId: target?.id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      stages: Array<{ id: number; orderIndex: number; distanceM: number | null }>;
    };
    expect(body.stages.length).toBe(count + 1);
    // The two halves sum to the original distance.
    const first = body.stages.find((s) => s.id === target?.id);
    const second = body.stages.find((s) => s.orderIndex === (first?.orderIndex ?? 0) + 1);
    expect((first?.distanceM ?? 0) + (second?.distanceM ?? 0)).toBeCloseTo(
      target?.distanceM ?? 0,
      1,
    );
  });
});
