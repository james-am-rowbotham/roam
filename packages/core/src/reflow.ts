// On-trail per-day decisions — "the plan is a forecast, not a contract".
// At stage completion the hiker picks one of three decisions for tomorrow;
// this module computes the consequence preview (finish-date delta, the +N km
// of a push-on, the overnight stop a push-on would skip) BEFORE the decision
// is confirmed. Pure and deterministic: dates are passed in, never read from
// the clock, so the same forecast runs on device (offline) and on the server.

export type StageDecision = 'asPlanned' | 'pushOn' | 'restDay';

export interface ForecastStage {
  id: number;
  orderIndex: number;
  restDay: boolean;
  completed: boolean;
  distanceM: number;
  /** The planned overnight stop at this day's end, if any. */
  overnightAccommodationId?: number | null;
}

export interface DecisionForecast {
  /** Whether this decision is currently possible (pushOn needs >= 2 remaining days). */
  available: boolean;
  /** Days from "today" (the evening of the just-completed stage) to the finish. */
  remainingDays: number;
  /** Finish-day shift vs walking as planned: -1 push on, +1 rest day, 0 as planned. */
  deltaDays: number;
  /** The extra distance walked tomorrow when pushing on (the absorbed day), else null. */
  pushOnDistanceM: number | null;
  /** Overnight stop that would go unused when pushing on (tomorrow's planned stop), else null. */
  skippedAccommodationId: number | null;
  /** ISO date (YYYY-MM-DD) of the forecast finish, when `fromDate` is given. */
  finishDate: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(isoDate: string, days: number): string {
  const t = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).getTime();
  return new Date(t + days * DAY_MS).toISOString().slice(0, 10);
}

/** Forecast the rest of the journey after a per-day decision taken at stage
 *  completion. `stages` is the journey's full stage list; "remaining" days are
 *  the not-yet-completed walking days plus any future rest days.
 *  `fromDate` (ISO date) is the day the decision is taken — the finish lands
 *  `remainingDays` after it. */
export function forecastAfterDecision(
  stages: ForecastStage[],
  decision: StageDecision,
  fromDate?: string,
): DecisionForecast {
  const ordered = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);
  const remainingWalk = ordered.filter((s) => !s.restDay && !s.completed);
  const remainingRest = ordered.filter((s) => s.restDay && !s.completed);
  const planned = remainingWalk.length + remainingRest.length;

  let available = true;
  let deltaDays = 0;
  let pushOnDistanceM: number | null = null;
  let skippedAccommodationId: number | null = null;

  switch (decision) {
    case 'asPlanned':
      break;
    case 'pushOn': {
      // Tomorrow absorbs the following day: one fewer day on trail, tomorrow
      // runs the absorbed day's distance further, and tomorrow's planned
      // overnight stop goes unused.
      const tomorrow = remainingWalk[0];
      const absorbed = remainingWalk[1];
      if (!tomorrow || !absorbed) {
        available = false;
        break;
      }
      deltaDays = -1;
      pushOnDistanceM = absorbed.distanceM;
      skippedAccommodationId = tomorrow.overnightAccommodationId ?? null;
      break;
    }
    case 'restDay': {
      deltaDays = 1;
      break;
    }
  }

  const remainingDays = Math.max(0, planned + (available ? deltaDays : 0));
  return {
    available,
    remainingDays,
    deltaDays: available ? deltaDays : 0,
    pushOnDistanceM,
    skippedAccommodationId,
    finishDate: fromDate ? addDays(fromDate, remainingDays) : null,
  };
}
