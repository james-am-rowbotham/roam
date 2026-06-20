import { useRouter } from 'expo-router';
import { contentStore } from '../../lib/contentRepo';
import type { BlockResolve } from './ContentBlockRenderer';

// A synchronous BlockResolve backed by the in-memory content store — the renderer's
// id→entity lookups (highlights, locations, legs, media) for stage/route content.
export const storeResolve: BlockResolve = {
  highlight: (id) => contentStore.highlights.get(id),
  location: (id) => contentStore.locations.get(id),
  leg: (id) => contentStore.legs.get(id),
  mediaUrl: (id) => contentStore.media.get(id)?.uri,
};

// Adds `openMap` (a map preview → the full map tab) to the store resolve. Screens that know
// their entity pass an `openMap` that focuses it on the map (trail/section/stage); otherwise
// the preview just opens the map tab.
export function useStoreResolve(openMap?: () => void): BlockResolve {
  const router = useRouter();
  return { ...storeResolve, openMap: openMap ?? (() => router.push('/(tabs)/map')) };
}
