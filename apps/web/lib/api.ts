import type { Geometry } from 'geojson';
import {
  type GetContentScopeTypeScopeId200Item,
  type GetRegionsId200,
  type GetSectionsId200,
  type GetTrails200Item,
  type GetTrailsId200,
  type GetTrailsId200Properties,
  type GetTrailsIdAccommodations200Item,
  type GetTrailsIdHazards200Item,
  type GetTrailsIdRegions200Item,
  type GetTrailsIdSections200Item,
  type GetTrailsIdWater200Item,
  getTrailsIdAccommodations as fetchAccommodations,
  getContentScopeTypeScopeId as fetchContent,
  getTrailsIdHazards as fetchHazards,
  getRegionsId as fetchRegion,
  getTrailsIdRegions as fetchRegions,
  getSectionsId as fetchSection,
  getTrails as fetchTrails,
  getTrailsId as fetchTrailsId,
  getTrailsIdSections as fetchTrailsIdSections,
  getTrailsIdWater as fetchWater,
} from './generated/api';

// API shapes come from codegen, never hand-written (§19). These aliases give the
// generated OpenAPI types friendly names for the rest of the web app; re-run
// `bun run codegen` after any API schema change. The `waymark` is resolved
// server-side from osmc:symbol via @roam/core, so the web renders the painted
// sign from the same parsed structure as the app and map (§17.8).
export type TrailListItem = GetTrails200Item;
export type TrailSection = GetTrailsIdSections200Item;
export type RegionSummary = GetTrailsIdRegions200Item;
export type RegionDetail = GetRegionsId200;
export type SectionDetail = GetSectionsId200;
export type ContentBlock = GetContentScopeTypeScopeId200Item;
export type WaterSource = GetTrailsIdWater200Item;
export type Accommodation = GetTrailsIdAccommodations200Item;
export type Hazard = GetTrailsIdHazards200Item;
export type ContentScope = 'route' | 'region' | 'stage' | 'poi';

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

/** The coarse Region layer for a trail (mobile "Sections"). */
export async function getRegions(trailId: number): Promise<RegionSummary[]> {
  try {
    const res = await fetchRegions(String(trailId));
    return res.status === 200 ? res.data : [];
  } catch {
    return [];
  }
}

/** A region's detail: geometry slice, elevation slice, stage span, content blocks. */
export async function getRegion(id: number): Promise<RegionDetail | null> {
  try {
    const res = await fetchRegion(String(id));
    return res.status === 200 ? (res.data as RegionDetail) : null;
  } catch {
    return null;
  }
}

/** A stage's (etapa) detail: geometry slice + elevation slice + trail context. */
export async function getSection(id: number): Promise<SectionDetail | null> {
  try {
    const res = await fetchSection(String(id));
    return res.status === 200 ? (res.data as SectionDetail) : null;
  } catch {
    return null;
  }
}

/** Curated read-layer content blocks (§21) for one node of the chain. */
export async function getContent(scope: ContentScope, scopeId: number): Promise<ContentBlock[]> {
  try {
    const res = await fetchContent(scope, String(scopeId));
    return res.status === 200 ? res.data : [];
  } catch {
    return [];
  }
}

/** Water sources along a trail, ordered by chainage. */
export async function getWater(trailId: number): Promise<WaterSource[]> {
  try {
    const res = await fetchWater(String(trailId));
    return res.status === 200 ? res.data : [];
  } catch {
    return [];
  }
}

/** Accommodations along a trail, ordered by chainage. */
export async function getAccommodations(trailId: number): Promise<Accommodation[]> {
  try {
    const res = await fetchAccommodations(String(trailId));
    return res.status === 200 ? res.data : [];
  } catch {
    return [];
  }
}

/** Hazards along a trail, ordered by chainage. */
export async function getHazards(trailId: number): Promise<Hazard[]> {
  try {
    const res = await fetchHazards(String(trailId));
    return res.status === 200 ? res.data : [];
  } catch {
    return [];
  }
}

/** Look up a single onboarded trail by its ref (e.g. "GR11"), case-insensitive. */
export function findTrailByRef(trails: TrailListItem[], ref: string): TrailListItem | undefined {
  return trails.find((t) => t.ref?.toUpperCase() === ref.toUpperCase());
}
