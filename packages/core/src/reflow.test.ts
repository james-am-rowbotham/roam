import { describe, expect, test } from 'bun:test';
import { type ForecastStage, forecastAfterDecision } from './reflow';

const walk = (
  id: number,
  orderIndex: number,
  completed = false,
  overnightAccommodationId: number | null = null,
): ForecastStage => ({
  id,
  orderIndex,
  restDay: false,
  completed,
  distanceM: 20_000,
  overnightAccommodationId,
});

// Day 1 done this evening; days 2–5 remain.
const STAGES: ForecastStage[] = [
  walk(1, 1, true),
  walk(2, 2, false, 77),
  { ...walk(3, 3), distanceM: 14_000 },
  walk(4, 4),
  walk(5, 5),
];

describe('forecastAfterDecision', () => {
  test('as planned keeps the remaining count', () => {
    const f = forecastAfterDecision(STAGES, 'asPlanned', '2027-07-19');
    expect(f.available).toBe(true);
    expect(f.remainingDays).toBe(4);
    expect(f.deltaDays).toBe(0);
    expect(f.finishDate).toBe('2027-07-23');
  });

  test('push on absorbs the day after tomorrow', () => {
    const f = forecastAfterDecision(STAGES, 'pushOn', '2027-07-19');
    expect(f.remainingDays).toBe(3);
    expect(f.deltaDays).toBe(-1);
    expect(f.pushOnDistanceM).toBe(14_000);
    expect(f.skippedAccommodationId).toBe(77);
    expect(f.finishDate).toBe('2027-07-22');
  });

  test('rest day pushes the finish out a day', () => {
    const f = forecastAfterDecision(STAGES, 'restDay', '2027-07-19');
    expect(f.remainingDays).toBe(5);
    expect(f.deltaDays).toBe(1);
    expect(f.finishDate).toBe('2027-07-24');
  });

  test('push on is unavailable on the second-to-last day', () => {
    const lastTwo = [walk(1, 1, true), walk(2, 2)];
    const f = forecastAfterDecision(lastTwo, 'pushOn');
    expect(f.available).toBe(false);
    expect(f.deltaDays).toBe(0);
    expect(f.remainingDays).toBe(1);
  });

  test('future rest days count toward the finish', () => {
    const withRest: ForecastStage[] = [
      walk(1, 1, true),
      { id: 9, orderIndex: 2, restDay: true, completed: false, distanceM: 0 },
      walk(2, 3),
      walk(3, 4),
    ];
    const f = forecastAfterDecision(withRest, 'asPlanned', '2027-07-19');
    expect(f.remainingDays).toBe(3);
    expect(f.finishDate).toBe('2027-07-22');
  });
});
