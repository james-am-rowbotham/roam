// All map configuration lives here — style URLs, defaults, tile sources.
// Swapping renderer (MapTiler → self-hosted) is a change to this file only.

// Style version for offline trail packs. Cached pack styles (marker colors,
// route paint) key on this — bump it whenever marker/style tokens change, or
// existing packs keep the old look forever. The design refresh (warm marker
// palette) is version 2. The offline-pack system (build phase 5) must read
// this when registering/validating a pack's cached style.
export const MAP_STYLE_VERSION = 2;

const key = process.env.EXPO_PUBLIC_MAPTILER_KEY;

export const MAP_STYLE_URL = key
  ? `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${key}`
  : 'https://tiles.openfreemap.org/styles/liberty';

// Pyrenees centre — default viewport for the Map tab
export const MAP_DEFAULT_CENTER: [number, number] = [0.8, 42.75];
export const MAP_DEFAULT_ZOOM = 7;

// ---------------------------------------------------------------------------
// Zoom tiers — progressive disclosure (Figma "Map Strategy", node 710:50)
// ---------------------------------------------------------------------------
// The map is one continuous view that reveals more detail as you zoom in. Every
// map element keys its visibility off these four tiers. This is the single
// source of truth: RN chrome reads the derived `tier`, and native layers feed
// these same zoom numbers into their `step`/`interpolate` expressions — so the
// JS gate and the on-map fade always agree.
export type MapTier = 'orient' | 'plan' | 'tactical' | 'detail';

// The minimum zoom at which each tier begins.
export const MAP_TIER_MIN_ZOOM = {
  orient: 0, //   0–8  · trail line + terrain, single blaze
  plan: 9, //     9–11 · region labels, multiple blazes, section dots
  tactical: 12, // 12–14 · POI icon markers, stage pill
  detail: 15, //  15+   · POI labels + confidence, km markers
} as const satisfies Record<MapTier, number>;

// Ordering for "at least this tier" comparisons.
const TIER_ORDER: Record<MapTier, number> = {
  orient: 0,
  plan: 1,
  tactical: 2,
  detail: 3,
};

// Which tier a raw zoom level falls into.
export function zoomTier(zoom: number): MapTier {
  if (zoom >= MAP_TIER_MIN_ZOOM.detail) return 'detail';
  if (zoom >= MAP_TIER_MIN_ZOOM.tactical) return 'tactical';
  if (zoom >= MAP_TIER_MIN_ZOOM.plan) return 'plan';
  return 'orient';
}

// True when `tier` is `min` or more detailed (e.g. tierAtLeast('detail','tactical')).
export function tierAtLeast(tier: MapTier, min: MapTier): boolean {
  return TIER_ORDER[tier] >= TIER_ORDER[min];
}

// Font stack for native map labels (SymbolLayer text). Must exist in the active
// base style's glyph endpoint — OpenFreeMap Liberty and MapTiler Outdoor both
// ship "Noto Sans Regular". Map labels render from the base style's SDF glyphs,
// not the app's UI fonts (RN font faces aren't available to the renderer).
export const MAP_LABEL_FONT = ['Noto Sans Regular'];
