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
