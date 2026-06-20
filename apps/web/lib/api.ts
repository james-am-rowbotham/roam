import type { Geometry } from 'geojson';
import {
  type GetTrails200Item,
  type GetTrailsId200,
  type GetTrailsId200Properties,
  type GetTrailsIdSections200Item,
  getTrails as fetchTrails,
  getTrailsId as fetchTrailsId,
  getTrailsIdSections as fetchTrailsIdSections,
} from './generated/api';

// API shapes come from codegen, never hand-written (§19). These aliases give the
// generated OpenAPI types friendly names for the rest of the web app; re-run
// `bun run codegen` after any API schema change. The `waymark` is resolved
// server-side from osmc:symbol via @roam/core, so the web renders the painted
// sign from the same parsed structure as the app and map (§17.8).
export type TrailListItem = GetTrails200Item;
export type TrailSection = GetTrailsIdSections200Item;

// The route Feature (GeoJSON). The generated geometry is an open record; we
// narrow it to a GeoJSON Geometry for the map.
export interface TrailFeature {
  geometry: Geometry | null;
  properties: GetTrailsId200Properties;
}

/**
 * Fetch the trail catalogue. The landing page is the SEO content net and must
 * always render, so a failure resolves to an empty list (→ design fallbacks)
 * rather than throwing. ISR caching lives in the generated client's fetcher
 * (lib/fetch-client.ts).
 */
export async function getTrails(): Promise<TrailListItem[]> {
  try {
    const res = await fetchTrails();
    return res.status === 200 ? res.data : [];
  } catch {
    return [];
  }
}

/** Resolve one trail's simplified route geometry (GeoJSON) for the maps. */
export async function getTrailFeature(id: number): Promise<TrailFeature | null> {
  try {
    const res = await fetchTrailsId(String(id));
    if (res.status !== 200) return null;
    const feature = res.data as GetTrailsId200;
    return {
      geometry: (feature.geometry ?? null) as Geometry | null,
      properties: feature.properties,
    };
  } catch {
    return null;
  }
}

/** Fetch a trail's ordered stages (etapas). Empty list on failure. */
export async function getSections(id: number): Promise<TrailSection[]> {
  try {
    const res = await fetchTrailsIdSections(String(id));
    return res.status === 200 ? res.data : [];
  } catch {
    return [];
  }
}

/** Look up a single onboarded trail by its ref (e.g. "GR11"), case-insensitive. */
export function findTrailByRef(trails: TrailListItem[], ref: string): TrailListItem | undefined {
  return trails.find((t) => t.ref?.toUpperCase() === ref.toUpperCase());
}
