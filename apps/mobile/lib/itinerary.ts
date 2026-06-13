// Shapes a previewed plan into the stage rows sent to POST /journeys. The Review
// itinerary is a read-only forecast — per-day decisions happen on-trail at Stage
// Complete (see @roam/core reflow), never by hand-editing the plan here.

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

export function toCreateStages(stages: EditStage[]) {
  return stages.map(({ sectionIds: _ignored, ...rest }) => rest);
}
