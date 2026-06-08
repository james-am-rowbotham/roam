import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, Point } from 'geojson';

export interface POI {
  id: number;
  lat: number | null;
  lng: number | null;
  [key: string]: unknown;
}

interface Props {
  id: string;
  pois: POI[];
  color: string;
  radius?: number;
  onPress?: (poiId: number) => void;
}

function toFeatureCollection(pois: POI[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: pois
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng as number, p.lat as number] },
        properties: { id: p.id },
      })),
  };
}

export function POILayer({ id, pois, color, radius = 6, onPress }: Props) {
  const geojson = toFeatureCollection(pois);
  if (geojson.features.length === 0) return null;

  const handlePress = onPress
    ? // biome-ignore lint/suspicious/noExplicitAny: MapLibre press event type is not publicly exported
      (e: any) => {
        const poiId =
          e.features?.[0]?.properties?.id ?? e.nativeEvent?.features?.[0]?.properties?.id;
        if (poiId != null) onPress(Number(poiId));
      }
    : undefined;

  return (
    <>
      <GeoJSONSource id={id} data={geojson} onPress={handlePress}>
        {/* White border ring */}
        <Layer
          id={`${id}-border`}
          type="circle"
          paint={{ 'circle-radius': radius + 2, 'circle-color': '#ffffff' }}
        />
        {/* Coloured fill */}
        <Layer
          id={`${id}-fill`}
          type="circle"
          paint={{ 'circle-radius': radius, 'circle-color': color }}
        />
      </GeoJSONSource>
    </>
  );
}
