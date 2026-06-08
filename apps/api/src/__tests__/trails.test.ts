import { describe, expect, it } from 'bun:test';
import app from '../index';

// Integration tests — hit the real Supabase seed data.
// Requires DATABASE_URL in environment and GR11 to be seeded.

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await app.fetch(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });
});

describe('GET /trails', () => {
  it('returns a list with at least one trail', async () => {
    const res = await app.fetch(new Request('http://localhost/trails'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('each trail has expected fields', async () => {
    const res = await app.fetch(new Request('http://localhost/trails'));
    const [trail] = (await res.json()) as Array<Record<string, unknown>>;
    expect(trail).toHaveProperty('id');
    expect(trail).toHaveProperty('ref');
    expect(trail).toHaveProperty('name');
    expect(trail).toHaveProperty('distanceM');
  });
});

describe('GET /trails/:id', () => {
  it('returns a GeoJSON Feature for a valid trail', async () => {
    const list = await app.fetch(new Request('http://localhost/trails'));
    const [first] = (await list.json()) as Array<{ id: number }>;
    if (!first) throw new Error('No trails in seed');

    const res = await app.fetch(new Request(`http://localhost/trails/${first.id}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.type).toBe('Feature');
    expect(body.geometry).toBeTruthy();
    expect(body.properties).toBeTruthy();
  });

  it('returns 404 for unknown id', async () => {
    const res = await app.fetch(new Request('http://localhost/trails/99999'));
    expect(res.status).toBe(404);
  });
});

describe('GET /trails/:id/sections', () => {
  it('returns ordered sections', async () => {
    const list = await app.fetch(new Request('http://localhost/trails'));
    const [first] = (await list.json()) as Array<{ id: number }>;
    if (!first) throw new Error('No trails in seed');

    const res = await app.fetch(new Request(`http://localhost/trails/${first.id}/sections`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ orderIndex: number; startChainageM: number }>;
    expect(body.length).toBeGreaterThan(0);
    // Sections should be in order
    const indices = body.map((s) => s.orderIndex);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });
});

describe('GET /trails/:id/water', () => {
  it('returns water sources ordered by chainage', async () => {
    const list = await app.fetch(new Request('http://localhost/trails'));
    const [first] = (await list.json()) as Array<{ id: number }>;
    if (!first) throw new Error('No trails in seed');

    const res = await app.fetch(new Request(`http://localhost/trails/${first.id}/water`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ chainageM: number }>;
    expect(body.length).toBeGreaterThan(0);
    // Should be in ascending chainage order
    const chainages = body.map((w) => w.chainageM);
    expect(chainages).toEqual([...chainages].sort((a, b) => a - b));
  });
});

describe('GET /trails/:id/accommodations', () => {
  it('returns accommodations ordered by chainage', async () => {
    const list = await app.fetch(new Request('http://localhost/trails'));
    const [first] = (await list.json()) as Array<{ id: number }>;
    if (!first) throw new Error('No trails in seed');

    const res = await app.fetch(new Request(`http://localhost/trails/${first.id}/accommodations`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ chainageM: number; type: string }>;
    expect(body.length).toBeGreaterThan(0);
    const chainages = body.map((a) => a.chainageM);
    expect(chainages).toEqual([...chainages].sort((a, b) => a - b));
  });
});
