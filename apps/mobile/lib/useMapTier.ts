import { useCallback, useState } from 'react';
import { type MapTier, zoomTier } from '../config/map';

interface UseMapTier {
  /** Current zoom tier for progressive disclosure (Figma "Map Strategy"). */
  tier: MapTier;
  /** Pass to <MapView onZoomChanged> — translates live zoom into a tier. */
  onZoomChanged: (zoom: number) => void;
}

// Tracks which zoom tier the map is in. onZoomChanged fires continuously during
// a pinch, but state only updates when the tier boundary is crossed — so RN
// chrome re-renders a handful of times across the whole zoom range, not once
// per frame. Map *layers* read the raw zoom via expressions and don't go
// through here at all.
export function useMapTier(initialZoom: number): UseMapTier {
  const [tier, setTier] = useState<MapTier>(() => zoomTier(initialZoom));

  const onZoomChanged = useCallback((zoom: number) => {
    const next = zoomTier(zoom);
    setTier((prev) => (prev === next ? prev : next));
  }, []);

  return { tier, onZoomChanged };
}
