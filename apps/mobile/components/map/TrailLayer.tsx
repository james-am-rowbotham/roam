import {
  GeoJSONSource,
  Layer,
  type SymbolLayerSpecification,
} from '@maplibre/maplibre-react-native';
import { flattenCoords } from '../../lib/geo';

interface Props {
  id: string;
  geojson: GeoJSON.Feature | GeoJSON.FeatureCollection;
  color: string;
  width?: number;
  opacity?: number;
  /** Tapping the line fires this (e.g. open the trail detail). */
  onPress?: () => void;
}

// The trail line. The painted blaze is intentionally NOT drawn here — it rides
// above the line as a separate <TrailBlaze> so it always sits on top of any
// highlight/stage line drawn over the route (§17.2).
export function TrailLayer({ id, geojson, color, width = 3, opacity = 0.9, onPress }: Props) {
  return (
    <GeoJSONSource id={id} data={geojson} onPress={onPress ? () => onPress() : undefined}>
      <Layer
        id={`${id}-line`}
        type="line"
        paint={{ 'line-color': color, 'line-width': width, 'line-opacity': opacity }}
        layout={{ 'line-join': 'round', 'line-cap': 'round' }}
      />
    </GeoJSONSource>
  );
}

interface BlazeProps {
  id: string;
  /** The route line — used for placement (line repeats) or to find the midpoint. */
  geojson: GeoJSON.Feature | GeoJSON.FeatureCollection;
  /** Registered sprite name (`blaze-<symbolKey>`, see blazeIcons.tsx). */
  image: string;
  /**
   * Preview mode: draw a single blaze at the route's midpoint instead of
   * repeating along the line. On a small, zoomed-out thumb the repeating
   * placement lands one sign off near an edge; a centred single sign reads as
   * the trail's identity. Default false (repeat along the line).
   */
  centered?: boolean;
}

// The repeating waymark riding the line — placed along the route, spaced by zoom
// (sparse far out → denser zoomed in), kept upright. The sprite is pre-rendered
// from the same waymarkSvg() the RN Waymark uses (§17.2).
const blazeLineLayout = (image: string) => ({
  'symbol-placement': 'line',
  // Spacing in px between repeats — kept wide so the blaze punctuates the route
  // rather than crowding it (a couple on screen, not a chain).
  'symbol-spacing': ['interpolate', ['linear'], ['zoom'], 8, 900, 11, 700, 14, 560],
  'icon-image': image,
  'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.7, 14, 1],
  'icon-rotation-alignment': 'viewport',
  'icon-allow-overlap': false,
  'symbol-avoid-edges': true,
});

// A single blaze pinned to one point (the route midpoint) — always shown, upright.
const blazePointLayout = (image: string) => ({
  'icon-image': image,
  'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 14, 1],
  'icon-rotation-alignment': 'viewport',
  'icon-allow-overlap': true,
  'icon-ignore-placement': true,
});

// The painted blaze, drawn as its own source so it layers ABOVE every trail line
// (the full route, plus any highlight/stage line over it). Render it after the
// TrailLayer(s) in a map. `centered` switches from repeat-along-line to a single
// midpoint sign for previews.
export function TrailBlaze({ id, geojson, image, centered = false }: BlazeProps) {
  if (centered) {
    const pts = flattenCoords(geojson as unknown as Record<string, unknown>);
    const mid = pts[Math.floor(pts.length / 2)];
    if (!mid) return null;
    const data: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: mid }, properties: {} },
      ],
    };
    return (
      <GeoJSONSource id={id} data={data}>
        <Layer
          id={`${id}-blaze`}
          type="symbol"
          layout={blazePointLayout(image) as unknown as SymbolLayerSpecification['layout']}
        />
      </GeoJSONSource>
    );
  }
  return (
    <GeoJSONSource id={id} data={geojson}>
      <Layer
        id={`${id}-blaze`}
        type="symbol"
        layout={blazeLineLayout(image) as unknown as SymbolLayerSpecification['layout']}
      />
    </GeoJSONSource>
  );
}
