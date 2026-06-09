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
});
