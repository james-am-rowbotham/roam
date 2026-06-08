import { create } from 'zustand';

interface MapViewport {
  center: [number, number];
  zoom: number;
}

interface MapState {
  // Viewport the map should fly to on next render
  pendingViewport: MapViewport | null;
  // Active section highlight — persists until explicitly cleared
  highlightGeojson: Record<string, unknown> | null;
  highlightLabel: string | null;
  highlightChainageRange: [number, number] | null;
  // Separate flag so the back panel shows even if geojson is temporarily null
  isHighlightActive: boolean;

  setViewport: (v: MapViewport) => void; // navigate to map without highlight
  setHighlight: (
    viewport: MapViewport,
    geojson: Record<string, unknown>,
    label: string | null,
    chainageRange: [number, number] | null,
  ) => void;
  applyPendingViewport: (center: [number, number], zoom: number) => void;
  clearHighlight: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  pendingViewport: null,
  highlightGeojson: null,
  highlightLabel: null,
  highlightChainageRange: null,
  isHighlightActive: false,

  setViewport: (v) => set({ pendingViewport: v }),

  setHighlight: (viewport, geojson, label, chainageRange) =>
    set({
      pendingViewport: viewport,
      highlightGeojson: geojson,
      highlightLabel: label,
      highlightChainageRange: chainageRange,
      isHighlightActive: true,
    }),

  applyPendingViewport: (center, zoom) => set({ pendingViewport: null }),

  clearHighlight: () =>
    set({
      highlightGeojson: null,
      highlightLabel: null,
      highlightChainageRange: null,
      isHighlightActive: false,
      pendingViewport: null,
    }),
}));
