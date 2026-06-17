import { describe, expect, it } from 'bun:test';
import { type StageInput, buildItineraryDays } from './itineraryDays';

// 10 etapas of 20 km each (200 km trail), numbered 1..10.
const stages: StageInput[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `Town ${i} → Town ${i + 1}`,
  orderIndex: i + 1,
  startChainageM: i * 20_000,
  endChainageM: (i + 1) * 20_000,
  ascentM: 500,
}));

describe('buildItineraryDays', () => {
  it('counts progress in stages from the walked-distance frontier', () => {
    const m = buildItineraryDays(stages, {
      reverse: false,
      doneDistanceM: 40_000, // two stages walked
      paceTargetM: 20_000, // one stage per day
    });
    expect(m.totalStages).toBe(10);
    expect(m.doneStages).toBe(2);
    expect(m.currentStageNumber).toBe(3);
    expect(m.days).toHaveLength(10);
    expect(m.days[0]?.stages[0]?.status).toBe('done');
    expect(m.days[2]?.stages[0]?.status).toBe('current');
    expect(m.days[3]?.stages[0]?.status).toBe('upcoming');
  });

  it('groups multiple whole stages into a day at a fast pace', () => {
    const m = buildItineraryDays(stages, {
      reverse: false,
      doneDistanceM: 0,
      paceTargetM: 40_000, // two stages per day
    });
    expect(m.days).toHaveLength(5);
    expect(m.days[0]?.stages).toHaveLength(2);
    expect(m.days[0]?.rightLabel).toContain('2 STAGES');
  });

  it('opens a region band for GR11 and marks crossings after the first', () => {
    const m = buildItineraryDays(stages, {
      reverse: false,
      doneDistanceM: 0,
      paceTargetM: 20_000,
      trailRef: 'GR11',
    });
    const bands = m.days.map((d) => d.regionBand).filter(Boolean);
    expect(bands.length).toBeGreaterThan(1);
    expect(m.days[0]?.regionBand?.name).toBe('Basque Country');
    expect(m.days[0]?.regionBand?.first).toBe(true);
    expect(m.days[0]?.regionBand?.rangeLabel).toMatch(/^STAGES \d+–\d+$/);
    // Later bands are crossings, not the first.
    expect(bands.slice(1).every((b) => b?.first === false)).toBe(true);
  });

  it('regroups only remaining stages when pace changes mid-journey', () => {
    const m = buildItineraryDays(stages, {
      reverse: false,
      doneDistanceM: 40_000, // stages 1 & 2 walked
      donePaceTargetM: 20_000, // history: one stage per day
      paceTargetM: 40_000, // remaining: two stages per day
    });
    // Done stages keep 1/day (2 days); the 8 remaining pack 2/day (4 days) = 6 total.
    expect(m.days).toHaveLength(6);
    expect(m.days[0]?.stages).toHaveLength(1);
    expect(m.days[1]?.stages).toHaveLength(1);
    // The current day is the boundary — first regrouped day, holding 2 stages.
    expect(m.days[2]?.status).toBe('current');
    expect(m.days[2]?.stages).toHaveLength(2);
  });

  it('prefers a curated region from the trail package over the client map', () => {
    const withRegion = stages.map((s) => ({ ...s, regionName: 'Aragon' }));
    const m = buildItineraryDays(withRegion, {
      reverse: false,
      doneDistanceM: 0,
      paceTargetM: 20_000,
      trailRef: 'GR11', // client map would say Basque/Navarra/… but the curated value wins
    });
    expect(m.days.every((d) => d.stages.every((s) => s.region === 'Aragon'))).toBe(true);
    // One region → exactly one band.
    expect(m.days.filter((d) => d.regionBand).length).toBe(1);
  });

  it('shows the real date + time taken on completed days from the journey windows', () => {
    const m = buildItineraryDays(stages, {
      reverse: false,
      doneDistanceM: 40_000, // stages 1 & 2 done
      paceTargetM: 20_000, // one stage per day
      completedStages: [
        {
          startChainageM: 0,
          endChainageM: 20_000,
          completedAt: '2026-06-12T18:00:00',
          elapsedSeconds: 7 * 3600 + 10 * 60,
        },
        {
          startChainageM: 20_000,
          endChainageM: 40_000,
          completedAt: '2026-06-13T17:00:00',
          elapsedSeconds: 5 * 3600 + 20 * 60,
        },
      ],
    });
    // Single-stage completed day → real date on the left, walking time on the right.
    expect(m.days[0]?.status).toBe('done');
    expect(m.days[0]?.dateLabel).toBe('12 JUN');
    expect(m.days[0]?.rightLabel).toBe('7H 10M');
    expect(m.days[1]?.dateLabel).toBe('13 JUN');
    expect(m.days[1]?.rightLabel).toBe('5H 20M');
  });

  it('combines stage count + total time on a completed multi-stage day', () => {
    const m = buildItineraryDays(stages, {
      reverse: false,
      doneDistanceM: 40_000,
      paceTargetM: 40_000, // two stages per day → day 1 = stages 1+2
      completedStages: [
        {
          startChainageM: 0,
          endChainageM: 20_000,
          completedAt: '2026-06-14T12:00:00',
          elapsedSeconds: 4 * 3600,
        },
        {
          startChainageM: 20_000,
          endChainageM: 40_000,
          completedAt: '2026-06-14T18:00:00',
          elapsedSeconds: 4 * 3600 + 30 * 60,
        },
      ],
    });
    expect(m.days[0]?.stages).toHaveLength(2);
    expect(m.days[0]?.dateLabel).toBe('14 JUN');
    expect(m.days[0]?.rightLabel).toBe('2 STAGES · 8H 30M');
  });

  it('groups stages finished on the same calendar day into one day', () => {
    // Three 20 km etapas all ticked off today → a single multi-stage day, not three.
    const today = [
      { startChainageM: 0, endChainageM: 20_000, completedAt: '2026-06-14T09:00:00' },
      { startChainageM: 20_000, endChainageM: 40_000, completedAt: '2026-06-14T13:00:00' },
      { startChainageM: 40_000, endChainageM: 60_000, completedAt: '2026-06-14T17:00:00' },
    ];
    const m = buildItineraryDays(stages, {
      reverse: false,
      doneDistanceM: 60_000, // stages 1–3 done
      paceTargetM: 20_000, // one stage per day (forecast) — done days come from dates
      completedStages: today,
    });
    const doneDays = m.days.filter((d) => d.status === 'done');
    expect(doneDays).toHaveLength(1);
    expect(doneDays[0]?.stages).toHaveLength(3);
    expect(doneDays[0]?.dateLabel).toBe('14 JUN');
    expect(m.currentStageNumber).toBe(4);
  });

  it('folds stages finished today into one growing TODAY day with the current stage', () => {
    // Regression for "finishing a stage pushes you to the next day": stages 1 & 2 done
    // today, stage 3 current — all one TODAY day, not a done day + a separate TODAY.
    const todayCompletions = [
      { startChainageM: 0, endChainageM: 20_000, completedAt: '2026-06-17T08:00:00' },
      { startChainageM: 20_000, endChainageM: 40_000, completedAt: '2026-06-17T12:00:00' },
    ];
    const m = buildItineraryDays(stages, {
      reverse: false,
      doneDistanceM: 40_000, // stages 1 & 2 done
      paceTargetM: 20_000, // one stage/day forecast
      completedStages: todayCompletions,
      todayISO: '2026-06-17',
    });
    expect(m.days[0]?.status).toBe('current');
    expect(m.days[0]?.dateLabel).toBe('TODAY');
    expect(m.days[0]?.stages.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(m.currentStageNumber).toBe(3);
    // The forecast starts tomorrow, counting forward from today (not the start date).
    expect(m.days[1]?.dateLabel).toBe('18 JUN');
    expect(m.days[1]?.stages.map((s) => s.number)).toEqual([4]);
  });

  it('keeps earlier days separate while folding only today into TODAY', () => {
    const completions = [
      { startChainageM: 0, endChainageM: 20_000, completedAt: '2026-06-15T18:00:00' }, // yesterday
      { startChainageM: 20_000, endChainageM: 40_000, completedAt: '2026-06-16T18:00:00' }, // today
    ];
    const m = buildItineraryDays(stages, {
      reverse: false,
      doneDistanceM: 40_000,
      paceTargetM: 20_000,
      completedStages: completions,
      todayISO: '2026-06-16',
    });
    expect(m.days[0]?.dateLabel).toBe('15 JUN');
    expect(m.days[0]?.stages.map((s) => s.number)).toEqual([1]);
    // Stage 2 finished today folds in with current stage 3.
    expect(m.days[1]?.status).toBe('current');
    expect(m.days[1]?.dateLabel).toBe('TODAY');
    expect(m.days[1]?.stages.map((s) => s.number)).toEqual([2, 3]);
  });

  it('dates a boundary-straddling stage by the day it was finished, not the day before', () => {
    // Regression: completed stages were matched to a journey window by their MIDPOINT.
    // A 30 km window grid over 20 km etapas puts etapa 2's midpoint (30 km) in window 1
    // (finished 16 Jun), so it leaked into the previous day even though it was finished
    // in window 2 (17 Jun). Matching on the stage END keeps it on the day it was walked.
    const windows = [
      { startChainageM: 0, endChainageM: 30_000, completedAt: '2026-06-16T18:00:00' },
      { startChainageM: 30_000, endChainageM: 60_000, completedAt: '2026-06-17T18:00:00' },
    ];
    const m = buildItineraryDays(stages, {
      reverse: false,
      doneDistanceM: 60_000, // etapas 1–3 done
      paceTargetM: 20_000,
      completedStages: windows,
    });
    const doneDays = m.days.filter((d) => d.status === 'done');
    // 16 Jun → etapa 1 only; 17 Jun → etapas 2 & 3 (etapa 2 did NOT fall back to 16 Jun).
    expect(doneDays).toHaveLength(2);
    expect(doneDays[0]?.dateLabel).toBe('16 JUN');
    expect(doneDays[0]?.stages.map((s) => s.number)).toEqual([1]);
    expect(doneDays[1]?.dateLabel).toBe('17 JUN');
    expect(doneDays[1]?.stages.map((s) => s.number)).toEqual([2, 3]);
  });

  it('shows no region bands for an unknown trail', () => {
    const m = buildItineraryDays(stages, {
      reverse: false,
      doneDistanceM: 0,
      paceTargetM: 20_000,
      trailRef: 'XYZ',
    });
    expect(m.days.every((d) => d.regionBand === undefined)).toBe(true);
    expect(m.days.every((d) => d.stages.every((s) => s.region === null))).toBe(true);
  });
});
