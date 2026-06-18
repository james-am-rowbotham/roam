import { describe, expect, test } from 'bun:test';
import { importPacks } from './importer';
import { seed } from './seed';

describe('Phase 2 — seed import + validation', () => {
  const store = importPacks(seed);

  test('imports the GR11 + Aneto packs with no dangling references', () => {
    // importPacks throws on any dangling ref; reaching here means clean.
    expect(store.objectives.size).toBe(2);
    expect(store.objectives.has('gr11')).toBe(true);
    expect(store.objectives.has('aneto')).toBe(true);
  });

  test('GR11 section set matches §12.1 (5 ordered sections, right ranges/distances)', () => {
    const gr11 = store.objectives.get('gr11');
    expect(gr11?.sectionIds).toHaveLength(5);
    const sections = (gr11?.sectionIds ?? [])
      .map((id) => store.sections.get(id))
      .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
    const stat = (sec: (typeof sections)[number], key: string) =>
      sec?.atAGlance.find((s) => s.key === key)?.value;
    expect(sections.map((s) => s?.name)).toEqual([
      'Basque Country',
      'Navarre',
      'Aragon',
      'Catalonia',
      'Cap de Creus',
    ]);
    expect(sections.map((s) => stat(s, 'stages'))).toEqual([
      '1–10',
      '11–18',
      '19–30',
      '31–43',
      '44–47',
    ]);
    expect(sections.map((s) => stat(s, 'distance'))).toEqual([165, 138, 210, 240, 78]);
  });

  test('Aneto has 3 routes and no sections (invariant 2)', () => {
    const aneto = store.objectives.get('aneto');
    expect(aneto?.type).toBe('peak');
    expect(aneto?.routeIds).toHaveLength(3);
    expect(aneto?.sectionIds).toBeUndefined();
    // grade-led parallel routes, each resolves
    for (const id of aneto?.routeIds ?? []) expect(store.routes.has(id)).toBe(true);
  });

  test('hydration boundary: summaries omit heavy content, details keep it', () => {
    const stageSummary = store.stageSummaries.get('gr11-candanchu-sallent');
    const stageDetail = store.stages.get('gr11-candanchu-sallent');
    expect(stageSummary).toBeDefined();
    expect('blocks' in (stageSummary ?? {})).toBe(false); // summary has no blocks
    expect(stageDetail?.blocks.length ?? 0).toBeGreaterThan(0); // detail does
  });

  test('a dangling reference fails loudly with the offending id', () => {
    const [trail0] = seed.trails;
    if (!trail0) throw new Error('fixture missing trail');
    const broken = {
      ...seed,
      trails: [{ ...trail0, objective: { ...trail0.objective, regionIds: ['no-such-region'] } }],
    };
    expect(() => importPacks(broken)).toThrow(/no-such-region/);
  });

  test('a peak handed a synthetic section is rejected (invariant 2)', () => {
    const [peak0] = seed.peaks;
    if (!peak0) throw new Error('fixture missing peak');
    const broken = {
      ...seed,
      peaks: [{ ...peak0, objective: { ...peak0.objective, sectionIds: ['fake'] } }],
    };
    expect(() => importPacks(broken)).toThrow(/must not have sectionIds/);
  });
});
