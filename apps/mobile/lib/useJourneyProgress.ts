import type { JourneyStatus } from '@roam/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_ID } from '../config/user';
import {
  type ProgressAction,
  journeyCombine,
  journeyProgress,
  journeyQueryKey,
  journeyRemoveRestDay,
  journeyRestDay,
  journeySplit,
  journeysQueryKey,
} from './hooks';

// Status-changing progress actions we can reflect in the cache before the server
// round-trips — so Pause/Resume responds on tap (§11: pausing is a non-event).
// completeStage isn't here: it mutates stage rows, which we leave to the refetch.
const OPTIMISTIC_STATUS: Partial<Record<ProgressAction['type'], JourneyStatus>> = {
  start: 'active',
  pause: 'paused',
  resume: 'active',
  end: 'completed',
};

// The slice of the cached journey envelope ({ data, status, headers }) we touch.
type JourneyCache = { data?: ({ status?: JourneyStatus } | { error: unknown }) | null } | undefined;

// Mutations for advancing / overriding a journey, each refreshing its detail and
// the list: progress (start/complete/…), insert/remove rest day, combine days.
export function useJourneyProgress(journeyId: string) {
  const queryClient = useQueryClient();
  const key = journeyQueryKey(journeyId);
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: journeysQueryKey({ userId: CURRENT_USER_ID }) });
  };

  const progress = useMutation({
    mutationFn: (action: ProgressAction) => journeyProgress(journeyId, action),
    // Optimistically flip the journey status so the toggle feels instant; the
    // background refetch in onSettled reconciles with the server's truth.
    onMutate: async (action: ProgressAction) => {
      const nextStatus = OPTIMISTIC_STATUS[action.type];
      if (!nextStatus) return { previous: undefined };
      // Stop an in-flight refetch from clobbering the optimistic value.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData<JourneyCache>(key, (old) => {
        if (!old?.data || 'error' in old.data) return old;
        return { ...old, data: { ...old.data, status: nextStatus } };
      });
      return { previous };
    },
    // The request failed — restore the pre-tap snapshot so the button un-toggles.
    onError: (_err, _action, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(key, context.previous);
    },
    onSettled: invalidate,
  });
  const restDay = useMutation({
    mutationFn: (afterStageId: number) => journeyRestDay(journeyId, { afterStageId }),
    onSuccess: invalidate,
  });
  const removeRestDay = useMutation({
    mutationFn: (stageId: number) => journeyRemoveRestDay(journeyId, { stageId }),
    onSuccess: invalidate,
  });
  const combine = useMutation({
    mutationFn: (stageId: number) => journeyCombine(journeyId, { stageId }),
    onSuccess: invalidate,
  });
  const split = useMutation({
    mutationFn: (stageId: number) => journeySplit(journeyId, { stageId }),
    onSuccess: invalidate,
  });

  return { progress, restDay, removeRestDay, combine, split };
}
