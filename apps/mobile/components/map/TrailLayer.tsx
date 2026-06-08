import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

interface Props {
  id: string;
  geojson: GeoJSON.Feature | GeoJSON.FeatureCollection;
  color: string;
  width?: number;
  opacity?: number;
}

export function TrailLayer({ id, geojson, color, width = 3, opacity = 0.9 }: Props) {
  return (
    <>
      <GeoJSONSource id={id} data={geojson} />
      <Layer
        id={`${id}-line`}
        type="line"
        source={id}
        paint={{ 'line-color': color, 'line-width': width, 'line-opacity': opacity }}
        layout={{ 'line-join': 'round', 'line-cap': 'round' }}
      />
    </>
  );
}
