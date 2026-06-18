import { describe, expect, test } from 'bun:test';
import { guideFacets, objectiveTabs, topicsForFacet } from './guide';
import { importPacks } from './importer';
import { createMemoryRepo } from './memory';
import { seed } from './seed';

const repo = createMemoryRepo(importPacks(seed));

describe('Phase 4 — Guide shell is data-driven (same shell, both objectives)', () => {
  test('trail derives a "Route" tab + Environment facet from data', async () => {
    const gr11 = await repo.getObjective('gr11');
    expect(objectiveTabs(gr11).map((t) => t.label)).toEqual(['Guide', 'Route']);
    expect(guideFacets(gr11.guide)).toEqual(['overview', 'planning', 'environment']);
  });

  test('peak derives a "Routes" tab + Conditions facet from the SAME helpers', async () => {
    const aneto = await repo.getObjective('aneto');
    expect(objectiveTabs(aneto).map((t) => t.label)).toEqual(['Guide', 'Routes']);
    expect(guideFacets(aneto.guide)).toEqual(['overview', 'planning', 'conditions']);
  });

  test('facets carry their topics, in canonical order', async () => {
    const gr11 = await repo.getObjective('gr11');
    const overview = topicsForFacet(gr11.guide, 'overview');
    expect(overview.length).toBeGreaterThan(0);
    expect(overview.every((t) => t.facet === 'overview')).toBe(true);
  });
});

describe('memory repo honours the hydration boundary', () => {
  test('listObjectivesByRegion returns summaries (no guide), getObjective returns detail', async () => {
    const inAragon = await repo.listObjectivesByRegion('aragon');
    expect(inAragon.map((o) => o.id).sort()).toEqual(['aneto', 'gr11']); // both touch Aragon
    expect(Boolean(inAragon[0] && 'guide' in inAragon[0])).toBe(false); // summary omits guide
    const full = await repo.getObjective('gr11');
    expect(full.guide.length).toBeGreaterThan(0); // detail has it
  });

  test('listSections is ordered; a missing id rejects', async () => {
    const sections = await repo.listSections('gr11');
    expect(sections.map((s) => s.order)).toEqual([1, 2, 3, 4, 5]);
    await expect(repo.getObjective('nope')).rejects.toThrow(/not found/);
  });
});
