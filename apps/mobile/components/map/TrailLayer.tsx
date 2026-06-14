import {
  GeoJSONSource,
  Layer,
  type LineLayerSpecification,
  type SymbolLayerSpecification,
} from '@maplibre/maplibre-react-native';
import { colors } from '../../theme';

interface Props {
  id: string;
  geojson: GeoJSON.Feature | GeoJSON.FeatureCollection;
  color: string;
  width?: number;
  opacity?: number;
  /**
   * Render the soft green trail-corridor band beneath the line (Figma "Map
   * Strategy"). Use on the primary route only — not section/stage highlights.
   */
  corridor?: boolean;
  /**
   * Repeat the painted blaze sign along the route (§17.2). Pass a registered
   * sprite name (`blaze-<symbolKey>`, see blazeIcons.tsx). Primary route only.
   */
  blazeImage?: string;
}

// The repeating waymark riding the line — placed along the route, spaced by zoom
// (sparse far out → denser zoomed in), kept upright. The sprite is pre-rendered
// from the same waymarkSvg() the RN Waymark uses (§17.2).
const blazeLayout = (image: string) => ({
  'symbol-placement': 'line',
  'symbol-spacing': ['interpolate', ['linear'], ['zoom'], 8, 400, 11, 260, 14, 200],
  'icon-image': image,
  'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.7, 14, 1],
  'icon-rotation-alignment': 'viewport',
  'icon-allow-overlap': false,
  'symbol-avoid-edges': true,
});

// A wide, soft green band hugging the route — the corridor that orients the user
// at the Overview tier. line-blur feathers the edges; width grows with zoom.
const corridorPaint = {
  'line-color': colors.map.green,
  'line-opacity': 0.55,
  'line-width': ['interpolate', ['linear'], ['zoom'], 7, 10, 11, 22, 15, 40],
  'line-blur': ['interpolate', ['linear'], ['zoom'], 7, 6, 15, 24],
};

export function TrailLayer({
  id,
  geojson,
  color,
  width = 3,
  opacity = 0.9,
  corridor = false,
  blazeImage,
}: Props) {
  return (
    <>
      <GeoJSONSource id={id} data={geojson} />
      {corridor && (
        <Layer
          id={`${id}-corridor`}
          type="line"
          source={id}
          paint={corridorPaint as unknown as LineLayerSpecification['paint']}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
        />
      )}
      <Layer
        id={`${id}-line`}
        type="line"
        source={id}
        paint={{ 'line-color': color, 'line-width': width, 'line-opacity': opacity }}
        layout={{ 'line-join': 'round', 'line-cap': 'round' }}
      />
      {blazeImage && (
        <Layer
          id={`${id}-blaze`}
          type="symbol"
          source={id}
          layout={blazeLayout(blazeImage) as unknown as SymbolLayerSpecification['layout']}
        />
      )}
    </>
  );
}
