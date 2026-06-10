// Journey progress & override resolution — pure and deterministic (timestamps are
// passed in, never read from the clock), so the exact same transitions run on the
// server and on device for offline overrides replayed through the outbox (§11).

export type JourneyStatus = 'planned' | 'active' | 'completed' | 'abandoned';
export type StageStatus = 'planned' | 'active' | 'completed';

export interface JourneyProgress {
  status: JourneyStatus;
}

export interface StageProgress {
  id: number;
  orderIndex: number;
  status: StageStatus;
  completedAt: string | null;
  restDay: boolean;
  stoppedEarlyAtChainageM: number | null;
}

export type ProgressAction =
  | { type: 'start' }
  | { type: 'completeStage'; stageId: number; at: string }
  | { type: 'uncompleteStage'; stageId: number }
  | { type: 'stopEarly'; stageId: number; chainageM: number }
  | { type: 'end'; at: string };

export interface ProgressResult {
  journey: JourneyProgress;
  stages: StageProgress[];
}

/** Apply a progress action, returning the new journey + stage states. Inputs are
 *  never mutated. Stages are returned sorted by orderIndex. */
export function applyProgress(
  journey: JourneyProgress,
  stages: StageProgress[],
  action: ProgressAction,
): ProgressResult {
  const ordered = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);
  const next = ordered.map((s) => ({ ...s }));
  let status = journey.status;

  // Stages only ever record completion. The "current" stage is derived by the
  // caller as the first non-rest stage that isn't completed — so completing a day
  // never auto-starts the next, and there's only ever one current stage.
  const allWalkDone = () => next.filter((s) => !s.restDay).every((s) => s.status === 'completed');

  switch (action.type) {
    case 'start': {
      status = 'active';
      break;
    }
    case 'completeStage': {
      const target = next.find((s) => s.id === action.stageId);
      if (target) {
        target.status = 'completed';
        target.completedAt = action.at;
        status = allWalkDone() ? 'completed' : 'active';
      }
      break;
    }
    case 'uncompleteStage': {
      const target = next.find((s) => s.id === action.stageId);
      if (target) {
        target.status = 'planned';
        target.completedAt = null;
        target.stoppedEarlyAtChainageM = null;
        if (status === 'completed') status = 'active';
      }
      break;
    }
    case 'stopEarly': {
      // Record where you stopped within a day. Does not change completion.
      const target = next.find((s) => s.id === action.stageId);
      if (target) target.stoppedEarlyAtChainageM = action.chainageM;
      break;
    }
    case 'end': {
      status = 'completed';
      break;
    }
  }

  return { journey: { status }, stages: next };
}
