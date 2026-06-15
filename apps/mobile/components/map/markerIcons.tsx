import { colors } from '../../theme';

// Marker glyphs registered with the map style so native SymbolLayers can draw
// them via `icon-image`. White-on-transparent PNGs (24 / @2x / @3x) rasterized
// from assets/markers/src/*.svg (the Figma icon masters). RN resolves the right
// density per device. Registered on the map by <MapImages>. To regenerate, see
// assets/markers/README.md.
export const MARKER_GLYPHS = {
  'glyph-water': require('../../assets/markers/glyph-water.png'),
  'glyph-stay': require('../../assets/markers/glyph-stay.png'),
  'glyph-food': require('../../assets/markers/glyph-food.png'),
  'glyph-mountain': require('../../assets/markers/glyph-mountain.png'),
  // Route termini — the play/flag signs on the start/finish discs (§17.1).
  'glyph-start': require('../../assets/markers/glyph-start.png'),
  'glyph-finish': require('../../assets/markers/glyph-finish.png'),
} as const;

export type MarkerGlyph = keyof typeof MARKER_GLYPHS;

// Semantic marker kinds → the glyph drawn on top and the disc colour beneath.
// The disc itself is a data-driven CircleLayer (colour here, confidence-driven
// opacity/stroke in the layer); the glyph rides on top in white. Used by the
// native POI layers.
export const MARKER_STYLE = {
  water: { glyph: 'glyph-water', color: colors.marker.water },
  accommodation: { glyph: 'glyph-stay', color: colors.marker.refuge },
  food: { glyph: 'glyph-food', color: colors.marker.food },
  peak: { glyph: 'glyph-mountain', color: colors.marker.viewpoint },
} as const satisfies Record<string, { glyph: MarkerGlyph; color: string }>;

export type MarkerKind = keyof typeof MARKER_STYLE;
