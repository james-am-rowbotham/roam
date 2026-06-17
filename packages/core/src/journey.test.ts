import { describe, expect, it } from 'bun:test';
import { planJourney } from './journey';
import type { Accommodation, Section } from './types';

// Four contiguous 10 km sections, each +500 / -200 m, covering 0–40 km.
function makeSections(): Section[] {
  return [0, 1, 2, 3].map((i) => ({
    id: i + 1,
    routeId: 1,
    name: `Section ${i + 1}`,
    description: null,
    orderIndex: i + 1,
    startChainageM: i * 10_000,
    endChainageM: (i + 1) * 10_000,
    ascentM: 500,
    descentM: 200,
  }));
}

function accommodation(
  over: Partial<Accommodation> & Pick<Accommodation, 'id' | 'chainageM' | 'type'>,
): Accommodation {
  return {
    routeId: 1,
    name: `Acc ${over.id}`,
    capacity: null,
    seasonal: false,
    bookingUrl: null,
    source: 'osm',
    confidence: 0.5,
    lastConfirmedAt: null,
    reportCount: 0,
    manualOverride: false,
    ...over,
  };
}

describe('planJourney — one stage per curated etapa', () => {
  it('emits exactly one stage per section, whatever the pace', () => {
    // Pace no longer cuts the route into windows — stages ARE the curated etapas.
    // The pace only seeds the day grouping later (a display concern).
    for (const target of [5_000, 8_000, 20_000, 40_000]) {
      const plan = planJourney({
        sections: makeSections(),
        pace: { targetDistancePerDayM: target },
      });
      expect(plan.stages).toHaveLength(4);
      expect(plan.stages.map((s) => s.sectionIds)).toEqual([[1], [2], [3], [4]]);
      expect(plan.stages.map((s) => s.distanceM)).toEqual([10_000, 10_000, 10_000, 10_000]);
    }
  });

  it('emits one stage per section with no pace or dates given', () => {
    const plan = planJourney({ sections: makeSections() });
    expect(plan.stages).toHaveLength(4);
    expect(plan.stages.map((s) => s.distanceM)).toEqual([10_000, 10_000, 10_000, 10_000]);
  });

  it('carries each section’s own ascent/descent (not pro-rated windows)', () => {
    const plan = planJourney({ sections: makeSections() });
    expect(plan.stages.every((s) => s.ascentM === 500 && s.descentM === 200)).toBe(true);
  });
});

describe('planJourney — totals', () => {
  it('preserves total distance, ascent and descent', () => {
    const plan = planJourney({ sections: makeSections() });
    expect(Math.round(plan.totalDistanceM)).toBe(40_000);
    expect(Math.round(plan.totalAscentM)).toBe(2_000);
    expect(Math.round(plan.totalDescentM)).toBe(800);
  });
});

describe('planJourney — direction', () => {
  it('reverses walking order and swaps ascent/descent', () => {
    const plan = planJourney({
      sections: makeSections(),
      pace: { targetDistancePerDayM: 10_000 },
      direction: 'reverse',
    });
    expect(plan.stages.map((s) => s.sectionIds)).toEqual([[4], [3], [2], [1]]);
    const first = plan.stages[0];
    // First reverse day covers the last section, walked high → low chainage.
    expect(first?.startChainageM).toBe(40_000);
    expect(first?.endChainageM).toBe(30_000);
    expect(first?.distanceM).toBe(10_000);
    expect(first?.ascentM).toBe(200);
    expect(first?.descentM).toBe(500);
  });
});

describe('planJourney — section span', () => {
  it('restricts the journey to an inclusive span of sections', () => {
    const plan = planJourney({
      sections: makeSections(),
      startSectionId: 2,
      endSectionId: 3,
      pace: { targetDistancePerDayM: 10_000 },
    });
    expect(plan.totalDistanceM).toBe(20_000);
    expect(plan.stages.map((s) => s.sectionIds)).toEqual([[2], [3]]);
  });

  it('returns an empty plan for an unknown section bound', () => {
    const plan = planJourney({ sections: makeSections(), startSectionId: 999 });
    expect(plan.totalDays).toBe(0);
    expect(plan.stages).toEqual([]);
  });
});

describe('planJourney — overnight suggestion', () => {
  const sections = makeSections();

  it('suggests the nearest accommodation matching the preference, within the window', () => {
    const accs: Accommodation[] = [
      accommodation({ id: 10, chainageM: 10_200, type: 'refuge' }),
      accommodation({ id: 11, chainageM: 9_000, type: 'campsite' }),
    ];
    const plan = planJourney({
      sections,
      pace: { targetDistancePerDayM: 10_000 },
      accommodation: 'refuge',
      accommodations: accs,
    });
    expect(plan.stages[0]?.suggestedAccommodationId).toBe(10);
  });

  it('ignores accommodations beyond the window', () => {
    const accs: Accommodation[] = [accommodation({ id: 20, chainageM: 30_000, type: 'refuge' })];
    const plan = planJourney({
      sections,
      pace: { targetDistancePerDayM: 10_000 },
      accommodation: 'refuge',
      accommodations: accs,
    });
    expect(plan.stages[0]?.suggestedAccommodationId).toBeNull();
  });

  it('honours a camping preference over a nearer refuge', () => {
    const accs: Accommodation[] = [
      accommodation({ id: 30, chainageM: 10_100, type: 'refuge' }),
      accommodation({ id: 31, chainageM: 10_800, type: 'campsite' }),
    ];
    const plan = planJourney({
      sections,
      pace: { targetDistancePerDayM: 10_000 },
      accommodation: 'camping',
      accommodations: accs,
    });
    expect(plan.stages[0]?.suggestedAccommodationId).toBe(31);
  });
});
