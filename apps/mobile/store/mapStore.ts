import { create } from 'zustand';

interface MapViewport {
  center: [number, number];
  zoom: number;
}

// ── Content focus (the search/browse → map highlight, string-id world) ───────
// A focus is a trail plus an optional narrower scope (a stage, section, or a
// synthesised segment). Rendered as removable chips: dropping the scope widens to
// the whole trail; dropping the trail clears the focus. Geometry comes from the
// bundled content pack (offline), so this never needs the API.
export type FocusScopeKind = 'stage' | 'section' | 'segment';

export interface FocusScope {
  kind: FocusScopeKind;
  label: string; // "Stage 5", "Aragón", "Stages 3–5"
  geom: GeoJSON.Geometry; // the highlighted slice
  sectionId?: string;
  stageId?: string;
  /** Stage range for the journey preset (set for stage/section/segment). */
  fromStageId?: string;
  toStageId?: string;
}

export interface ContentFocus {
  objectiveId: string;
  trailLabel: string; // "GR11"
  routeGeom: GeoJSON.Geometry; // whole-trail line (shown when no scope)
  color?: string; // the trail's osmc way colour (red for GR11) — the highlight colour
  scope: FocusScope | null;
}

interface MapState {
  // Viewport to fly to on next render
  pendingViewport: MapViewport | null;

  // Whether the trail (GR11) is shown on the map. It's a removable filter:
  // default on, hidden when the trail chip is removed, restored when re-added.
  trailVisible: boolean;

  // Active filter state
  activeTrailId: number | null;
  activeTrailLabel: string | null; // e.g. "GR11"
  activeTrailGeomCenter: [number, number] | null; // midpoint of trail for label

  activeSectionId: number | null;
  activeSectionLabel: string | null; // e.g. "Western Pyrenees"
  activeSectionGeomCenter: [number, number] | null; // midpoint of section for label
  activeSectionGeom: Record<string, unknown> | null; // for rendering section line
  activeSectionChainageRange: [number, number] | null; // for filtering POIs

  // Content focus (search/browse → map). Independent of the numeric filters above.
  focus: ContentFocus | null;

  // Actions
  setFocus: (focus: ContentFocus) => void;
  clearFocusScope: () => void; // remove the narrow chip → whole trail
  clearFocus: () => void; // remove the trail chip → all trails
  setViewport: (v: MapViewport) => void;
  setTrailFilter: (trailId: number, label: string, geomCenter: [number, number]) => void;
  setSectionFilter: (
    sectionId: number,
    label: string,
    geomCenter: [number, number],
    geom: Record<string, unknown>,
    chainageRange: [number, number] | null,
    viewport: MapViewport,
  ) => void;
  showTrail: () => void; // re-add GR11 after it was removed
  removeTrailFilter: () => void; // hides GR11 and clears trail AND section
  removeSectionFilter: () => void; // clears section only
}

export const useMapStore = create<MapState>((set) => ({
  pendingViewport: null,
  trailVisible: true,
  activeTrailId: null,
  activeTrailLabel: null,
  activeTrailGeomCenter: null,
  activeSectionId: null,
  activeSectionLabel: null,
  activeSectionGeomCenter: null,
  activeSectionGeom: null,
  activeSectionChainageRange: null,

  focus: null,

  setFocus: (focus) => set({ focus }),
  clearFocusScope: () => set((s) => (s.focus ? { focus: { ...s.focus, scope: null } } : {})),
  clearFocus: () => set({ focus: null }),

  setViewport: (v) => set({ pendingViewport: v }),

  setTrailFilter: (trailId, label, geomCenter) =>
    set({
      trailVisible: true,
      activeTrailId: trailId,
      activeTrailLabel: label,
      activeTrailGeomCenter: geomCenter,
    }),

  setSectionFilter: (sectionId, label, geomCenter, geom, chainageRange, viewport) =>
    set({
      trailVisible: true,
      activeSectionId: sectionId,
      activeSectionLabel: label,
      activeSectionGeomCenter: geomCenter,
      activeSectionGeom: geom,
      activeSectionChainageRange: chainageRange,
      pendingViewport: viewport,
    }),

  showTrail: () => set({ trailVisible: true }),

  removeTrailFilter: () =>
    set({
      trailVisible: false,
      activeTrailId: null,
      activeTrailLabel: null,
      activeTrailGeomCenter: null,
      activeSectionId: null,
      activeSectionLabel: null,
      activeSectionGeomCenter: null,
      activeSectionGeom: null,
      activeSectionChainageRange: null,
    }),

  removeSectionFilter: () =>
    set({
      activeSectionId: null,
      activeSectionLabel: null,
      activeSectionGeomCenter: null,
      activeSectionGeom: null,
      activeSectionChainageRange: null,
    }),
}));
