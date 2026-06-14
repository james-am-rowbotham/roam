import { Images } from '@maplibre/maplibre-react-native';
import { BLAZE_SPRITES } from './blazeIcons';
import { MARKER_GLYPHS } from './markerIcons';

// Registers every map sprite once: POI glyphs (white icons drawn on the
// data-driven disc) and trail blaze signs (the whole painted sign per
// osmc:symbol). Render once inside <MapView>; the native SymbolLayers below
// reference these by name (`glyph-*`, `blaze-*`).
export function MapImages() {
  return <Images images={{ ...MARKER_GLYPHS, ...BLAZE_SPRITES }} />;
}
