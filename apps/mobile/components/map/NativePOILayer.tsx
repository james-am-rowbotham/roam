import {
  type CircleLayerSpecification,
  GeoJSONSource,
  Layer,
  type SymbolLayerSpecification,
} from '@maplibre/maplibre-react-native';
import { MAP_LABEL_FONT, MAP_TIER_MIN_ZOOM } from '../../config/map';
import { colors } from '../../theme';
import { MARKER_STYLE, type MarkerKind } from './markerIcons';

export interface NativePOI {
  id: number;
  lat: number | null;
  lng: number | null;
  name?: string | null;
  /** 0–1 derived confidence (§9). Drives the muted look for unconfirmed facts. */
  confidence?: number;
}

interface Props {
  /** Unique prefix for this layer's source + layers, e.g. "water". */
  id: string;
  /** Marker kind — selects disc colour + glyph from MARKER_STYLE. */
  kind: MarkerKind;
  pois: NativePOI[];
  onPress?: (poiId: number) => void;
}

// Zoom breakpoints come straight from the tier model so the on-map fades line up
// exactly with the JS tier used by RN chrome (Figma "Map Strategy", node 710:50).
const { tactical: TACTICAL, detail: DETAIL } = MAP_TIER_MIN_ZOOM;
const FADE_IN = TACTICAL - 1; // markers ramp 0→1 across this → tactical
const LABEL_FADE_IN = DETAIL - 1; // labels ramp 0→1 across this → detail
const CONFIRMED = 0.5; // confidence ≥ this reads as confirmed (full strength)

// A marker is unconfirmed → drawn muted. As the *output* of a zoom interpolate
// this is allowed: zoom stays the top-level input, the stop value reads feature
// data. Lets one expression both fade by zoom and mute by confidence.
const confidenceOpacity = (confirmed: number, unconfirmed: number) => [
  'case',
  ['>=', ['get', 'confidence'], CONFIRMED],
  confirmed,
  unconfirmed,
];

function toFeatureCollection(pois: NativePOI[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: pois
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng as number, p.lat as number] },
        properties: {
          id: p.id,
          label: p.name ?? '',
          confidence: p.confidence ?? 1,
        },
      })),
  };
}

// A POI type rendered as native MapLibre layers (not RN views), so disclosure,
// collision and fades run on the render thread. Three reads of one source:
//   • disc  — CircleLayer, fades in at the Tactical tier, muted when unconfirmed
//   • glyph — SymbolLayer icon (white, from MARKER_STYLE), tracks the disc
//   • label — same SymbolLayer's text, switches on at the Detail tier
export function NativePOILayer({ id, kind, pois, onPress }: Props) {
  const { color, glyph } = MARKER_STYLE[kind];
  const data = toFeatureCollection(pois);
  if (data.features.length === 0) return null;

  const handlePress = onPress
    ? // biome-ignore lint/suspicious/noExplicitAny: MapLibre press event type isn't publicly exported
      (e: any) => {
        const poiId =
          e.features?.[0]?.properties?.id ?? e.nativeEvent?.features?.[0]?.properties?.id;
        if (poiId != null) onPress(Number(poiId));
      }
    : undefined;

  // Expression literals can't be narrowed to the strict style-spec union by TS,
  // so these objects are authored untyped and asserted at the <Layer> boundary.
  const discPaint = {
    'circle-color': color,
    'circle-stroke-color': colors.text.onAccent,
    'circle-radius': ['interpolate', ['linear'], ['zoom'], TACTICAL, 9, DETAIL, 12],
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], TACTICAL, 2, DETAIL, 3],
    // Fade in across FADE_IN→TACTICAL; at full zoom, muted if unconfirmed.
    'circle-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      FADE_IN,
      0,
      TACTICAL,
      confidenceOpacity(1, 0.5),
    ],
    'circle-stroke-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      FADE_IN,
      0,
      TACTICAL,
      confidenceOpacity(1, 0.4),
    ],
  };

  const glyphLayout = {
    'icon-image': glyph,
    'icon-size': ['interpolate', ['linear'], ['zoom'], TACTICAL, 0.75, DETAIL, 0.95],
    'icon-anchor': 'center',
    // Every disc keeps its glyph — no collision between icon and disc.
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    // Label rides to the right of the disc; optional so the marker still shows
    // when the label collides with another at the Detail tier.
    'text-field': ['get', 'label'],
    'text-font': MAP_LABEL_FONT,
    'text-size': 12,
    'text-anchor': 'left',
    'text-offset': [0.9, 0],
    'text-justify': 'left',
    'text-optional': true,
  };

  const glyphPaint = {
    'icon-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      FADE_IN,
      0,
      TACTICAL,
      confidenceOpacity(1, 0.6),
    ],
    'text-color': colors.text.primary,
    'text-halo-color': colors.text.onAccent,
    'text-halo-width': 1.4,
    // Labels are a Detail-tier reveal — invisible until then.
    'text-opacity': ['interpolate', ['linear'], ['zoom'], LABEL_FADE_IN, 0, DETAIL, 1],
  };

  return (
    <GeoJSONSource id={id} data={data} onPress={handlePress}>
      <Layer
        id={`${id}-disc`}
        type="circle"
        paint={discPaint as unknown as CircleLayerSpecification['paint']}
      />
      <Layer
        id={`${id}-glyph`}
        type="symbol"
        layout={glyphLayout as unknown as SymbolLayerSpecification['layout']}
        paint={glyphPaint as unknown as SymbolLayerSpecification['paint']}
      />
    </GeoJSONSource>
  );
}
