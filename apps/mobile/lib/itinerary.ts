// Local, pure edits to a previewed itinerary on the Review screen — insert/remove
// a rest day and combine two days — before the journey is created. The adjusted
// list is sent to POST /journeys and persisted as-is.

export interface EditStage {
  startChainageM: number;
  endChainageM: number;
  distanceM: number;
  ascentM: number;
  descentM: number;
  overnightAccommodationId: number | null;
  restDay: boolean;
  sectionIds: number[];
}

interface PlanStage {
  startChainageM: number;
  endChainageM: number;
  distanceM: number;
  ascentM: number;
  descentM: number;
  sectionIds: number[];
  suggestedAccommodationId: number | null;
}

export function fromPlan(stages: PlanStage[]): EditStage[] {
  return stages.map((s) => ({
    startChainageM: s.startChainageM,
    endChainageM: s.endChainageM,
    distanceM: s.distanceM,
    ascentM: s.ascentM,
    descentM: s.descentM,
    overnightAccommodationId: s.suggestedAccommodationId,
    restDay: false,
    sectionIds: s.sectionIds,
  }));
}

export function insertRestDay(stages: EditStage[], afterIndex: number): EditStage[] {
  const anchor = stages[afterIndex];
  if (!anchor) return stages;
  const rest: EditStage = {
    startChainageM: anchor.endChainageM,
    endChainageM: anchor.endChainageM,
    distanceM: 0,
    ascentM: 0,
    descentM: 0,
    overnightAccommodationId: null,
    restDay: true,
    sectionIds: [],
  };
  return [...stages.slice(0, afterIndex + 1), rest, ...stages.slice(afterIndex + 1)];
}

export function combineDays(stages: EditStage[], index: number): EditStage[] {
  const a = stages[index];
  const b = stages[index + 1];
  if (!a || !b || a.restDay || b.restDay) return stages;
  const merged: EditStage = {
    startChainageM: a.startChainageM,
    endChainageM: b.endChainageM,
    distanceM: a.distanceM + b.distanceM,
    ascentM: a.ascentM + b.ascentM,
    descentM: a.descentM + b.descentM,
    overnightAccommodationId: b.overnightAccommodationId,
    restDay: false,
    sectionIds: [...a.sectionIds, ...b.sectionIds],
  };
  return [...stages.slice(0, index), merged, ...stages.slice(index + 2)];
}

export function removeStage(stages: EditStage[], index: number): EditStage[] {
  return stages.filter((_, i) => i !== index);
}

export interface SectionRange {
  id: number;
  startChainageM: number;
  endChainageM: number;
}

// The section boundary inside (start, end) nearest the midpoint, or null if the
// day sits within a single section. Splits snap to this so days stay aligned to
// the trail's sections rather than to arbitrary halves.
export function sectionCut(start: number, end: number, sections: SectionRange[]): number | null {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const mid = (lo + hi) / 2;
  let best: number | null = null;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const sec of sections) {
    for (const edge of [sec.startChainageM, sec.endChainageM]) {
      if (edge <= lo + 1 || edge >= hi - 1) continue; // strictly inside
      const gap = Math.abs(edge - mid);
      if (gap < bestGap) {
        bestGap = gap;
        best = edge;
      }
    }
  }
  return best;
}

export function canSplitDay(stage: EditStage, sections: SectionRange[]): boolean {
  return !stage.restDay && sectionCut(stage.startChainageM, stage.endChainageM, sections) !== null;
}

// Split a day at the nearest section boundary — the inverse of combine. Section
// membership and pro-rated elevation are recomputed for each half.
export function splitDay(
  stages: EditStage[],
  index: number,
  sections: SectionRange[],
): EditStage[] {
  const s = stages[index];
  if (!s || s.restDay || s.distanceM <= 0) return stages;
  const cut = sectionCut(s.startChainageM, s.endChainageM, sections);
  if (cut === null) return stages;

  const sectionsIn = (a: number, b: number): number[] => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return sections
      .filter((sec) => {
        const slo = Math.min(sec.startChainageM, sec.endChainageM);
        const shi = Math.max(sec.startChainageM, sec.endChainageM);
        return Math.min(hi, shi) - Math.max(lo, slo) > 1;
      })
      .map((sec) => sec.id);
  };

  const half = (start: number, end: number, overnight: number | null): EditStage => {
    const dist = Math.abs(end - start);
    const frac = s.distanceM > 0 ? dist / s.distanceM : 0.5;
    return {
      startChainageM: start,
      endChainageM: end,
      distanceM: dist,
      ascentM: s.ascentM * frac,
      descentM: s.descentM * frac,
      overnightAccommodationId: overnight,
      restDay: false,
      sectionIds: sectionsIn(start, end),
    };
  };

  return [
    ...stages.slice(0, index),
    half(s.startChainageM, cut, null),
    half(cut, s.endChainageM, s.overnightAccommodationId),
    ...stages.slice(index + 1),
  ];
}

export function toCreateStages(stages: EditStage[]) {
  return stages.map(({ sectionIds: _ignored, ...rest }) => rest);
}
