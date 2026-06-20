import type { TrailListItem } from './api';

// Trail ref → URL slug. The API stores refs with incidental spacing ("GR 10"
// vs "GR11"), so we normalise to a clean, stable slug ("gr10", "gr11") for both
// links and matching.
export function trailSlug(ref: string | null, id: number): string {
  if (!ref) return `trail-${id}`;
  return ref.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Resolve a URL slug back to a trail in the catalogue. */
export function findTrailBySlug(trails: TrailListItem[], slug: string): TrailListItem | undefined {
  return trails.find((t) => trailSlug(t.ref, t.id) === slug);
}

/** A place name → URL slug ("Cap de Creus" → "cap-de-creus"). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
