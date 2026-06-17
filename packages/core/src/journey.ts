// Journey Engine — pure, deterministic stage generation.
//
// Runs unchanged on the server (initial plan) and on device (offline replanning):
// no I/O, no Date.now(), no randomness. Given the same input it always returns the
// same plan. See PROJECT GUIDE §11.
//
// Model (principle 4 — progressive complexity): the route is linearly referenced
// (§7), so a journey is just the selected chainage span cut into equal day-length
// windows sized to the pace target. A long section therefore splits across several
// days and short sections combine within a day — no routing graph, only 1-D maths.
// Each day reports the sections it overlaps (for labels) and a pro-rated ascent.

import type { Accommodation, Section } from './types';

export type Direction = 'forward' | 'reverse';
export type AccommodationPreference = 'refuge' | 'camping' | 'mixed';

export interface JourneyPace {
  /** Target walking distance per day, in metres. Consecutive short sections are
   *  combined into a day up to (but not past) this target. */
  targetDistancePerDayM: number;
}

export interface JourneyDates {
  startDate: Date;
  endDate: Date;
}

export interface PlanJourneyInput {
  /** All sections of the route. Walking order is derived from `orderIndex`, not
   *  from the array order. */
  sections: Section[];
  direction?: Direction;
  /** Restrict the journey to a contiguous span of sections (inclusive, by id).
   *  Omitted bounds default to the route's first/last section. */
  startSectionId?: number;
  endSectionId?: number;
  /** Daily target comes from `pace` or, if absent, from `dates` (budgeted days →
   *  km/day). If neither is given, every section becomes its own day. */
  pace?: JourneyPace;
  dates?: JourneyDates;
  accommodation?: AccommodationPreference;
  /** Optional POIs used to suggest an overnight stop at each day's end. */
  accommodations?: Accommodation[];
}

export interface PlannedStage {
  /** 1-based day number within the journey. */
  orderIndex: number;
  /** Route chainage at the day's start and end. For a reverse journey the day is
   *  walked from high chainage to low, so `startChainageM > endChainageM`. */
  startChainageM: number;
  endChainageM: number;
  /** Always >= 0, regardless of direction. */
  distanceM: number;
  ascentM: number;
  descentM: number;
  /** Sections combined into this day, in walking order. */
  sectionIds: number[];
  /** Nearest preference-matching accommodation to the day's end, or null. */
  suggestedAccommodationId: number | null;
}

export interface JourneyPlan {
  stages: PlannedStage[];
  totalDistanceM: number;
  totalAscentM: number;
  totalDescentM: number;
  /** Walking days. Rest days are added later as journey overrides, not here. */
  totalDays: number;
}

/** Don't suggest an overnight stop further than this from the stage's end. */
const OVERNIGHT_WINDOW_M = 5_000;

const EMPTY_PLAN: JourneyPlan = {
  stages: [],
  totalDistanceM: 0,
  totalAscentM: 0,
  totalDescentM: 0,
  totalDays: 0,
};

/** Generate a journey's stages over a route. One stage per curated etapa (§11):
 *  the engine does NOT invent stages — it takes the trail's curated sections in the
 *  selected span and walking direction and emits them 1:1. Pace/dates no longer cut
 *  the route into windows; they only seed the DAY grouping later (a pure display
 *  concern), so the official etapa numbering is preserved everywhere. */
export function planJourney(input: PlanJourneyInput): JourneyPlan {
  const direction = input.direction ?? 'forward';
  const reverse = direction === 'reverse';

  // Sections in ascending chainage, then the selected span.
  const ordered = [...input.sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const span = sliceSpan(ordered, input.startSectionId, input.endSectionId);
  if (span.length === 0) return EMPTY_PLAN;

  const accommodation = input.accommodation ?? 'mixed';
  const accommodations = input.accommodations ?? [];

  // Walk the span in direction order: forward keeps ascending chainage; reverse
  // walks high → low (so stage 1 is the far end of the span).
  const walkOrder = reverse ? [...span].reverse() : span;

  const stages: PlannedStage[] = walkOrder.map((s, i) => {
    const { slo, shi, len } = sectionInterval(s);
    const endChainageM = reverse ? slo : shi;
    const ascentM = s.ascentM ?? 0;
    const descentM = s.descentM ?? 0;
    return {
      orderIndex: i + 1,
      startChainageM: reverse ? shi : slo,
      endChainageM,
      distanceM: len,
      // Walking backwards turns climbs into descents and vice versa.
      ascentM: reverse ? descentM : ascentM,
      descentM: reverse ? ascentM : descentM,
      sectionIds: [s.id],
      suggestedAccommodationId: suggestOvernight(
        endChainageM,
        direction,
        accommodation,
        accommodations,
      ),
    };
  });

  return {
    stages,
    totalDistanceM: sum(stages.map((s) => s.distanceM)),
    totalAscentM: sum(stages.map((s) => s.ascentM)),
    totalDescentM: sum(stages.map((s) => s.descentM)),
    totalDays: stages.length,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

/** Inclusive slice between two section ids. A missing bound extends to that end;
 *  bounds given out of order are treated as a range (min..max). */
function sliceSpan(
  ordered: Section[],
  startSectionId: number | undefined,
  endSectionId: number | undefined,
): Section[] {
  const startIdx = startSectionId == null ? 0 : ordered.findIndex((s) => s.id === startSectionId);
  const endIdx =
    endSectionId == null ? ordered.length - 1 : ordered.findIndex((s) => s.id === endSectionId);
  if (startIdx === -1 || endIdx === -1) return [];
  return ordered.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
}

/** A section's chainage interval, ascending, with its length. */
function sectionInterval(s: Section): { slo: number; shi: number; len: number } {
  const slo = Math.min(s.startChainageM, s.endChainageM);
  const shi = Math.max(s.startChainageM, s.endChainageM);
  return { slo, shi, len: shi - slo };
}

function matchesPreference(type: Accommodation['type'], pref: AccommodationPreference): boolean {
  if (pref === 'mixed') return true;
  if (pref === 'refuge') return type === 'refuge' || type === 'hut';
  return type === 'campsite'; // camping
}

/** Nearest preference-matching accommodation to the day's end, within the window. */
function suggestOvernight(
  endChainageM: number,
  _direction: Direction,
  pref: AccommodationPreference,
  accommodations: Accommodation[],
): number | null {
  let best: Accommodation | null = null;
  let bestGap = Number.POSITIVE_INFINITY;

  for (const a of accommodations) {
    if (!matchesPreference(a.type, pref)) continue;
    const gap = Math.abs(a.chainageM - endChainageM);
    if (gap <= OVERNIGHT_WINDOW_M && gap < bestGap) {
      best = a;
      bestGap = gap;
    }
  }
  return best ? best.id : null;
}
