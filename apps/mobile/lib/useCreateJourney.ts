import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CURRENT_USER_ID } from '../config/user';
import { type CreateJourneyBody, createJourney, journeysQueryKey } from './hooks';

// Creates a journey, refreshes the list, and opens its detail screen.
// Interim: callers pass a default pace/accommodation — the full Setup flow
// (Figma 08–12) will collect those from the user before creating.
export function useCreateJourney() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateJourneyBody) => createJourney(body),
    onSuccess: (res) => {
      if ('error' in res.data) return;
      queryClient.invalidateQueries({ queryKey: journeysQueryKey({ userId: CURRENT_USER_ID }) });
      router.push(`/journey/${res.data.id}`);
    },
  });
}
