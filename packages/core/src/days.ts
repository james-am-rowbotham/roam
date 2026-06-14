// Day grouping — the per-journey planning layer over the trail's curated stages.
//
// Stages are trail data (the GR11's etapas); they are never generated per journey.
// A journey only *groups* consecutive whole stages into days based on pace. One stage
// per day at a relaxed pace; two or three packed into a day at a fast pace. A stage is
// never split across days — the official numbering stays intact (§"day-grouping").
//
// Pure and deterministic: no I/O, no clock. Dates are derived by the caller from
// (start or resume date) + the grouping, never stored.

export interface DayStage {
  /** Stage length in metres — the only thing grouping needs. */
  distanceM: number;
}

/**
 * Pack whole stages into days targeting ~`targetDistanceM` of walking per day.
 *
 * Greedy: a day is closed *before* adding a stage that would push it past the target,
 * so a day holds as many whole stages as fit under the target and a single stage longer
 * than the target stands alone. Every day holds at least one stage. Input order is the
 * walking order; it is preserved. Returns one array of stages per day.
 */
export function groupStagesIntoDays<T extends DayStage>(
  stages: T[],
  targetDistanceM: number,
): T[][] {
  const days: T[][] = [];
  let current: T[] = [];
  let currentDistanceM = 0;

  for (const stage of stages) {
    if (current.length > 0 && currentDistanceM + stage.distanceM > targetDistanceM) {
      days.push(current);
      current = [];
      currentDistanceM = 0;
    }
    current.push(stage);
    currentDistanceM += stage.distanceM;
  }
  if (current.length > 0) days.push(current);

  return days;
}
