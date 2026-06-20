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

// Adds `openMap` (a map preview → the full map tab) to the store resolve. Use on screens
// that render map blocks; later this carries a filter so the map opens scoped to the trail.
export function useStoreResolve(): BlockResolve {
  const router = useRouter();
  return { ...storeResolve, openMap: () => router.push('/(tabs)/map') };
}
