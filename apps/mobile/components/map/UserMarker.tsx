import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { colors } from '../../theme';

interface Props {
  /** [lng, lat] of the device. */
  coord: [number, number];
}

// The "you are here" puck on the map. Rendered as circle layers (not an
// annotation) so it always draws reliably; lives in components/map so MapLibre
// imports stay behind the map boundary (§3).
export function UserMarker({ coord }: Props) {
  const data: GeoJSON.FeatureCollection<GeoJSON.Point> = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: coord }, properties: {} },
    ],
  };
  return (
    <GeoJSONSource id="user-location" data={data}>
      <Layer
        id="user-location-halo"
        type="circle"
        paint={{ 'circle-radius': 16, 'circle-color': colors.marker.water, 'circle-opacity': 0.2 }}
      />
      <Layer
        id="user-location-dot"
        type="circle"
        paint={{
          'circle-radius': 7,
          'circle-color': colors.marker.water,
          'circle-stroke-width': 3,
          'circle-stroke-color': colors.text.onAccent,
        }}
      />
    </GeoJSONSource>
  );
}
