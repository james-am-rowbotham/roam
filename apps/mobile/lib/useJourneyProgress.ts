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

// Mutations for advancing / overriding a journey, each refreshing its detail and
// the list: progress (start/complete/…), insert/remove rest day, combine days.
export function useJourneyProgress(journeyId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: journeyQueryKey(journeyId) });
    queryClient.invalidateQueries({ queryKey: journeysQueryKey({ userId: CURRENT_USER_ID }) });
  };

  const progress = useMutation({
    mutationFn: (action: ProgressAction) => journeyProgress(journeyId, action),
    onSuccess: invalidate,
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
