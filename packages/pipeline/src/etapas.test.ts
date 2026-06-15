import { describe, expect, test } from 'bun:test';
import { GR11_ETAPAS, assignEtapaChainage } from './etapas';

const ROUTE_M = 820_000;

describe('GR11_ETAPAS data', () => {
  test('is the 46 official etapas in walking order, west→east', () => {
    expect(GR11_ETAPAS).toHaveLength(46);
    expect(GR11_ETAPAS.map((e) => e.stage)).toEqual(Array.from({ length: 46 }, (_, i) => i + 1));
    expect(GR11_ETAPAS[0]?.name).toContain('Cabo Higuer');
    expect(GR11_ETAPAS.at(-1)?.name).toContain('Cap de Creus');
  });

  test('published total is ~824 km', () => {
    const totalKm = GR11_ETAPAS.reduce((s, e) => s + e.distanceKm, 0);
    expect(totalKm).toBeGreaterThan(820);
    expect(totalKm).toBeLessThan(830);
  });
});

describe('assignEtapaChainage', () => {
  const staged = assignEtapaChainage(GR11_ETAPAS, ROUTE_M);

  test('one chainaged stage per etapa, order preserved', () => {
    expect(staged).toHaveLength(46);
    expect(staged.map((s) => s.stage)).toEqual(GR11_ETAPAS.map((e) => e.stage));
  });

  test('spans exactly [0, routeLength] with no gaps or overlaps', () => {
    expect(staged[0]?.startChainageM).toBe(0);
    expect(staged.at(-1)?.endChainageM).toBe(ROUTE_M);
    for (let i = 1; i < staged.length; i++) {
      // Each stage starts exactly where the previous ended — a continuous spine.
      expect(staged[i]?.startChainageM).toBe(staged[i - 1]?.endChainageM ?? -1);
    }
  });

  test('segment lengths are positive and sum to the route length', () => {
    for (const s of staged) expect(s.distanceM).toBeGreaterThan(0);
    const sum = staged.reduce((acc, s) => acc + s.distanceM, 0);
    expect(sum).toBeCloseTo(ROUTE_M, 3);
  });

  test('preserves longer etapas as proportionally longer segments', () => {
    // E01 (31.6 km) must chainage longer than E03 (18.9 km).
    const e1 = staged.find((s) => s.stage === 1);
    const e3 = staged.find((s) => s.stage === 3);
    expect(e1 && e3 && e1.distanceM > e3.distanceM).toBe(true);
  });

  test('degenerate route length never throws', () => {
    expect(assignEtapaChainage([], 0)).toEqual([]);
  });
});
