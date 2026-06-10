import { describe, expect, it } from 'bun:test';
import { type JourneyProgress, type StageProgress, applyProgress } from './progress';

const AT = '2026-06-10T08:00:00.000Z';

function makeStages(n: number): StageProgress[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    orderIndex: i + 1,
    status: 'planned' as const,
    completedAt: null,
    restDay: false,
    stoppedEarlyAtChainageM: null,
  }));
}

const planned: JourneyProgress = { status: 'planned' };

describe('applyProgress — start', () => {
  it('activates the journey without touching any stage', () => {
    const r = applyProgress(planned, makeStages(3), { type: 'start' });
    expect(r.journey.status).toBe('active');
    expect(r.stages.every((s) => s.status === 'planned')).toBe(true);
  });

  it('does not mutate the input', () => {
    const stages = makeStages(2);
    applyProgress({ status: 'active' }, stages, { type: 'completeStage', stageId: 1, at: AT });
    expect(stages[0]?.status).toBe('planned');
  });
});

describe('applyProgress — completeStage', () => {
  it('records completion without advancing other stages', () => {
    const r = applyProgress({ status: 'active' }, makeStages(3), {
      type: 'completeStage',
      stageId: 2,
      at: AT,
    });
    expect(r.stages[1]?.status).toBe('completed');
    expect(r.stages[1]?.completedAt).toBe(AT);
    // Neighbours are untouched — nothing auto-starts.
    expect(r.stages[0]?.status).toBe('planned');
    expect(r.stages[2]?.status).toBe('planned');
    expect(r.journey.status).toBe('active');
  });

  it('never produces more than one non-completed "current" stage', () => {
    let state = applyProgress(planned, makeStages(4), { type: 'start' });
    state = applyProgress(state.journey, state.stages, {
      type: 'completeStage',
      stageId: 1,
      at: AT,
    });
    state = applyProgress(state.journey, state.stages, {
      type: 'completeStage',
      stageId: 3,
      at: AT,
    });
    const current = state.stages.filter((s) => s.status !== 'completed');
    // First non-completed is the single derived "current" — here stage 2, then 4.
    expect(current.map((s) => s.id)).toEqual([2, 4]);
  });

  it('completes the journey when every walking stage is done', () => {
    let state = applyProgress(planned, makeStages(2), { type: 'start' });
    state = applyProgress(state.journey, state.stages, {
      type: 'completeStage',
      stageId: 1,
      at: AT,
    });
    expect(state.journey.status).toBe('active');
    state = applyProgress(state.journey, state.stages, {
      type: 'completeStage',
      stageId: 2,
      at: AT,
    });
    expect(state.journey.status).toBe('completed');
  });
});

describe('applyProgress — uncompleteStage', () => {
  it('reverts a stage to planned and reopens a finished journey', () => {
    let state = applyProgress(planned, makeStages(1), { type: 'start' });
    state = applyProgress(state.journey, state.stages, {
      type: 'completeStage',
      stageId: 1,
      at: AT,
    });
    expect(state.journey.status).toBe('completed');
    state = applyProgress(state.journey, state.stages, { type: 'uncompleteStage', stageId: 1 });
    expect(state.stages[0]?.status).toBe('planned');
    expect(state.stages[0]?.completedAt).toBeNull();
    expect(state.journey.status).toBe('active');
  });
});

describe('applyProgress — stopEarly & end', () => {
  it('records where you stopped without changing completion', () => {
    const active = applyProgress(planned, makeStages(2), { type: 'start' });
    const r = applyProgress(active.journey, active.stages, {
      type: 'stopEarly',
      stageId: 1,
      chainageM: 12_345,
    });
    expect(r.stages[0]?.stoppedEarlyAtChainageM).toBe(12_345);
    expect(r.stages[0]?.status).toBe('planned');
  });

  it('ends a journey as completed', () => {
    const active = applyProgress(planned, makeStages(3), { type: 'start' });
    const r = applyProgress(active.journey, active.stages, { type: 'end', at: AT });
    expect(r.journey.status).toBe('completed');
  });
});
