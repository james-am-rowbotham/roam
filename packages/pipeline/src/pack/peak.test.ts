import { describe, expect, test } from 'bun:test';
import { importPacks } from '@roam/content';
import { GR11 } from '../config';
import { assembleSeed, buildTrailPack } from './build';
import type { PackConfig } from './config';
import { CONTINENTS, COUNTRIES } from './geography';
import type { TrailKnowledge } from './knowledge';
import { type PeakKnowledge, buildPeakPack } from './peak';

const fa = (value: string) => ({ system: 'french-alpine', value });

const peakConfig: PackConfig = {
  id: 'aneto',
  type: 'peak',
  countryId: 'spain',
  source: { ...GR11, id: 'aneto', name: 'Aneto', ref: 'Aneto' },
  tagline: '3,404 m · Maladeta massif · Spain',
  summary: 'The highest summit in the Pyrenees.',
};

const peakKnowledge: PeakKnowledge = {
  regionId: 'aragonese-pyrenees',
  summitM: 3404,
  season: 'Jul–Sep',
  routes: [
    {
      id: 'aneto-vn',
      name: 'Vía Normal',
      tagline: 'The glacier route.',
      grade: fa('PD'),
      distanceKm: 22,
      ascentM: 1530,
      hours: '9–11 h',
      legs: [
        { number: 1, name: 'Approach', fromLocationId: 'besurta', toLocationId: 'renclusa' },
        { number: 2, name: 'Summit push', fromLocationId: 'renclusa', toLocationId: 'summit' },
      ],
      highlightIds: ['h-mahoma'],
    },
    {
      id: 'aneto-cn',
      name: 'Cara Norte',
      tagline: 'A steeper line.',
      grade: fa('D'),
      distanceKm: 18,
      ascentM: 1400,
      hours: '10–12 h',
      legs: [{ number: 1, name: 'North face', fromLocationId: 'besurta', toLocationId: 'summit' }],
    },
  ],
  locations: [
    { id: 'besurta', name: 'La Besurta', type: 'town', lat: 42.68, lng: 0.66 },
    { id: 'renclusa', name: 'Renclusa', type: 'refuge', lat: 42.66, lng: 0.65 },
    { id: 'summit', name: 'Aneto summit', type: 'summit', lat: 42.63, lng: 0.66 },
  ],
  highlights: [{ id: 'h-mahoma', title: 'The Paso de Mahoma' }],
};

// A trail to provide the 'aragonese-pyrenees' region the peak references.
const trailConfig: PackConfig = {
  id: 'gr11',
  type: 'trail',
  countryId: 'spain',
  source: GR11,
  tagline: 't',
  summary: 's',
};
const trailKnowledge: TrailKnowledge = {
  routeName: 'GR11',
  lengthM: 20_000,
  elevationProfile: [
    { d: 0, e: 100 },
    { d: 20_000, e: 900 },
  ],
  regions: [
    { id: 'aragonese-pyrenees', name: 'Aragonese Pyrenees', description: 'x', orderIndex: 1 },
  ],
  stages: [
    {
      number: 1,
      name: 'A → B',
      regionId: 'aragonese-pyrenees',
      startChainageM: 0,
      endChainageM: 20_000,
      ascentM: 800,
      descentM: 0,
      fromLocationId: 't-a',
      toLocationId: 't-b',
    },
  ],
  locations: [
    { id: 't-a', name: 'A', type: 'town', lat: 42, lng: 0 },
    { id: 't-b', name: 'B', type: 'town', lat: 42, lng: 0.1 },
  ],
};

describe('peak engine (buildPeakPack)', () => {
  const trail = buildTrailPack(trailConfig, trailKnowledge);
  const peak = buildPeakPack(peakConfig, peakKnowledge);
  const seed = {
    ...assembleSeed(CONTINENTS, COUNTRIES, [], [trail]),
    locations: [...trail.locations, ...peak.locations],
    highlights: peak.highlights,
    peaks: [peak.pack],
  };

  test('the trail + peak seed validates (peak references the shared region)', () => {
    expect(() => importPacks(seed)).not.toThrow();
  });

  test('peak decomposes into routes + legs, never sections (invariant 2)', () => {
    expect(peak.pack.objective.type).toBe('peak');
    expect(peak.pack.objective.routeIds).toEqual(['aneto-vn', 'aneto-cn']);
    expect(peak.pack.objective.sectionIds).toBeUndefined();
    expect(peak.pack.legs).toHaveLength(3);
  });

  test('overview leads with summit · routes · season · grade-range', () => {
    const g = (k: string) => peak.pack.objective.atAGlance.find((s) => s.key === k)?.value;
    expect(g('summit')).toBe(3404);
    expect(g('routes')).toBe(2);
    expect(g('grade')).toBe('PD–D'); // easiest→hardest across the two routes
  });

  test('route stats are distance · ascent · time · grade', () => {
    const vn = peak.pack.routes[0];
    expect(vn?.atAGlance.map((s) => s.key)).toEqual(['distance', 'ascent', 'time', 'grade']);
  });
});
