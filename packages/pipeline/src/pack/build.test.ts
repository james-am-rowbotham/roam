import { describe, expect, test } from 'bun:test';
import { importPacks } from '@roam/content';
import { GR11 } from '../config';
import { assembleSeed, buildTrailPack } from './build';
import type { PackConfig } from './config';
import { CONTINENTS, COUNTRIES } from './geography';
import type { TrailKnowledge } from './knowledge';

const config: PackConfig = {
  id: 'gr11',
  type: 'trail',
  countryId: 'spain',
  source: GR11,
  tagline: 'Pyrenees High Route · Spain',
  summary: 'Coast to coast.',
};

// A tiny but complete fixture: 1 route, 2 coarse regions, 3 etapas, 4 boundary locations.
const knowledge: TrailKnowledge = {
  routeName: 'GR11',
  lengthM: 60_000,
  elevationProfile: [
    { d: 0, e: 100 },
    { d: 20_000, e: 1800 },
    { d: 40_000, e: 900 },
    { d: 60_000, e: 300 },
  ],
  regions: [
    { id: 'basque', name: 'Basque Country', description: 'Green hills.', orderIndex: 1 },
    { id: 'aragon', name: 'Aragon', description: 'The high heart.', orderIndex: 2 },
  ],
  stages: [
    {
      number: 1,
      name: 'A → B',
      regionId: 'basque',
      startChainageM: 0,
      endChainageM: 20_000,
      ascentM: 1700,
      descentM: 0,
      fromLocationId: 'a',
      toLocationId: 'b',
    },
    {
      number: 2,
      name: 'B → C',
      regionId: 'aragon',
      startChainageM: 20_000,
      endChainageM: 40_000,
      ascentM: 600,
      descentM: 900,
      fromLocationId: 'b',
      toLocationId: 'c',
    },
    {
      number: 3,
      name: 'C → D',
      regionId: 'aragon',
      startChainageM: 40_000,
      endChainageM: 60_000,
      ascentM: 200,
      descentM: 800,
      fromLocationId: 'c',
      toLocationId: 'd',
    },
  ],
  locations: [
    { id: 'a', name: 'A', type: 'town', lat: 43, lng: -1 },
    { id: 'b', name: 'B', type: 'town', lat: 43, lng: 0 },
    { id: 'c', name: 'C', type: 'refuge', lat: 42.7, lng: 0.5 },
    { id: 'd', name: 'D', type: 'town', lat: 42.5, lng: 1 },
  ],
  water: [],
  accommodation: [],
};

describe('pack builder (multi-trail engine)', () => {
  const built = buildTrailPack(config, knowledge);
  const seed = assembleSeed(CONTINENTS, COUNTRIES, [], [built]);

  test('the assembled seed passes the importer (no dangling references)', () => {
    expect(() => importPacks(seed)).not.toThrow();
  });

  test('coarse regions become BOTH discovery regions and trail sections', () => {
    expect(built.regions.map((r) => r.id).sort()).toEqual(['aragon', 'basque']);
    expect(built.pack.objective.sectionIds).toEqual(['gr11-basque', 'gr11-aragon']);
    expect(built.pack.objective.regionIds.sort()).toEqual(['aragon', 'basque']);
  });

  test('etapas become stages, grouped into their section', () => {
    expect(built.pack.stages).toHaveLength(3);
    const aragon = built.pack.sections.find((s) => s.id === 'gr11-aragon');
    expect(aragon?.stageIds).toEqual(['gr11-s2', 'gr11-s3']);
    expect(aragon?.atAGlance.find((s) => s.key === 'stages')?.value).toBe('2–3');
  });

  test('each stage gets a Derived elevation block sliced from the route profile', () => {
    const s1 = built.pack.stages.find((s) => s.id === 'gr11-s1');
    const elev = s1?.blocks.find((b) => b.kind === 'elevation');
    expect(elev).toBeDefined();
  });

  test('stage grade is Derived from relief (severe for the 1700 m climb)', () => {
    const s1 = built.pack.stages.find((s) => s.id === 'gr11-s1');
    expect(s1?.grade).toEqual({ system: 'hiking-band', value: 'severe' });
  });
});
