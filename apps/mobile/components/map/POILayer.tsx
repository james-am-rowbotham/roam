import { GeoJSONSource, Layer, Marker } from '@maplibre/maplibre-react-native';
// GeoJSON types are available via @maplibre/maplibre-react-native's ambient declarations
import { TouchableOpacity, View } from 'react-native';

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
  /** Use PointAnnotation (renders above map layers) for small datasets */
  annotationMode?: boolean;
}

function toFeatureCollection(pois: POI[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
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

// PointAnnotation renders above all map layers — use for small POI sets
function AnnotationMarker({
  poi,
  color,
  radius,
  onPress,
}: {
  poi: POI;
  color: string;
  radius: number;
  onPress?: (id: number) => void;
}) {
  if (poi.lat == null || poi.lng == null) return null;
  return (
    <Marker id={`marker-${poi.id}`} lngLat={[poi.lng, poi.lat]}>
      <TouchableOpacity
        onPress={() => onPress?.(poi.id)}
        style={{
          width: (radius + 3) * 2,
          height: (radius + 3) * 2,
          borderRadius: radius + 3,
          backgroundColor: '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            backgroundColor: color,
          }}
        />
      </TouchableOpacity>
    </Marker>
  );
}

export function POILayer({ id, pois, color, radius = 7, onPress, annotationMode = false }: Props) {
  const filtered = pois.filter((p) => p.lat != null && p.lng != null);
  if (filtered.length === 0) return null;

  if (annotationMode) {
    return (
      <>
        {filtered.map((poi) => (
          <AnnotationMarker
            key={poi.id}
            poi={poi}
            color={color}
            radius={radius}
            onPress={onPress}
          />
        ))}
      </>
    );
  }

  // Circle layer approach for large datasets — nested for click handling
  const geojson = toFeatureCollection(filtered);
  const handlePress = onPress
    ? // biome-ignore lint/suspicious/noExplicitAny: MapLibre press event type is not publicly exported
      (e: any) => {
        const poiId =
          e.features?.[0]?.properties?.id ?? e.nativeEvent?.features?.[0]?.properties?.id;
        if (poiId != null) onPress(Number(poiId));
      }
    : undefined;

  return (
    <GeoJSONSource id={id} data={geojson} onPress={handlePress}>
      <Layer
        id={`${id}-border`}
        type="circle"
        paint={{ 'circle-radius': radius + 3, 'circle-color': '#ffffff' }}
      />
      <Layer
        id={`${id}-fill`}
        type="circle"
        paint={{ 'circle-radius': radius, 'circle-color': color }}
      />
    </GeoJSONSource>
  );
}
