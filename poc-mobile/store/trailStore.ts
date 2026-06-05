import { create } from 'zustand'

interface TrailState {
  // null = not yet loaded, string = raw GeoJSON
  cachedGeojson: string | null
  source: 'network' | 'sqlite' | null
  setCached: (geojson: string, source: 'network' | 'sqlite') => void
}

export const useTrailStore = create<TrailState>((set) => ({
  cachedGeojson: null,
  source: null,
  setCached: (geojson, source) => set({ cachedGeojson: geojson, source }),
}))
