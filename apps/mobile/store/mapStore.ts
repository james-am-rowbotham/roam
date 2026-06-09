import { create } from 'zustand';

interface MapViewport {
  center: [number, number];
  zoom: number;
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

  // Actions
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
