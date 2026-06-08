// All map configuration lives here — style URLs, defaults, tile sources.
// Swapping renderer (MapTiler → self-hosted) is a change to this file only.

const key = process.env.EXPO_PUBLIC_MAPTILER_KEY;

export const MAP_STYLE_URL = key
  ? `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${key}`
  : 'https://tiles.openfreemap.org/styles/liberty';

// Pyrenees centre — default viewport for the Map tab
export const MAP_DEFAULT_CENTER: [number, number] = [0.8, 42.75];
export const MAP_DEFAULT_ZOOM = 7;
