import {
  type CircleLayerSpecification,
  GeoJSONSource,
  Layer,
  type SymbolLayerSpecification,
} from '@maplibre/maplibre-react-native';
import { MAP_LABEL_FONT } from '../../config/map';
import { flattenCoords } from '../../lib/geo';
import { colors } from '../../theme';

interface Props {
  /** The focused line's geometry — its first/last vertex are start/finish. */
  geom: Record<string, unknown> | null | undefined;
  /** Unique prefix for this layer's source + layers. */
  id?: string;
}

// Start/finish termini at either end of the focused line (a section, or the
// whole trail). Rendered as native MapLibre layers — a CircleLayer disc + an SDF
// text label — not RN `Marker` views: on iOS a Marker rasterises its view into a
// snapshot bitmap (blurry/pixelated), whereas vector layers stay crisp at every
// zoom and ride the render thread. Start = accent green, Finish = charcoal.
export function SectionEndpoints({ geom, id = 'section-endpoints' }: Props) {
  if (!geom) return null;
  const pts = flattenCoords(geom);
  if (pts.length < 2) return null;

  const start = pts[0] as [number, number];
  const finish = pts[pts.length - 1] as [number, number];

  const data: GeoJSON.FeatureCollection<GeoJSON.Point> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: start },
        properties: { role: 'start', label: 'START', glyph: 'glyph-start' },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: finish },
        properties: { role: 'finish', label: 'FINISH', glyph: 'glyph-finish' },
      },
    ],
  };

  // Expression literals can't be narrowed to the strict style-spec union by TS,
  // so these are authored untyped and asserted at the <Layer> boundary.
  const discPaint = {
    'circle-color': ['match', ['get', 'role'], 'start', colors.accent, colors.text.primary],
    'circle-stroke-color': colors.text.onAccent,
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 8, 14, 13],
    'circle-stroke-width': 3,
    // Termini are always present at every band (§17.1) — no zoom gating.
  };

  const labelLayout = {
    // The white play/flag sign riding the disc (§17.1) — a sprite, so it stays
    // crisp where an RN Marker's rasterised view would blur.
    'icon-image': ['get', 'glyph'],
    'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.55, 14, 0.82],
    'icon-anchor': 'center',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'text-field': ['get', 'label'],
    'text-font': MAP_LABEL_FONT,
    'text-size': 10,
    'text-letter-spacing': 0.1,
    'text-anchor': 'top',
    // Sit the label just below the (now larger) disc.
    'text-offset': [0, 1.5],
    // Termini labels must always show — they anchor the route's two ends.
    'text-allow-overlap': true,
    'text-ignore-placement': true,
  };

  const labelPaint = {
    'text-color': colors.text.primary,
    // Paper halo stands the label off the map (the pill effect, vector-crisp).
    'text-halo-color': colors.bg.app,
    'text-halo-width': 1.8,
  };

  return (
    <GeoJSONSource id={id} data={data}>
      <Layer
        id={`${id}-disc`}
        type="circle"
        paint={discPaint as unknown as CircleLayerSpecification['paint']}
      />
      <Layer
        id={`${id}-label`}
        type="symbol"
        layout={labelLayout as unknown as SymbolLayerSpecification['layout']}
        paint={labelPaint as unknown as SymbolLayerSpecification['paint']}
      />
    </GeoJSONSource>
  );
}
