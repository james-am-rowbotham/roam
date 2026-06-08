// The only file that imports from @maplibre/maplibre-react-native.
// No MapLibre-specific types cross this boundary into screens.
import { Camera, Map as MapComponent } from '@maplibre/maplibre-react-native';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_STYLE_URL } from '../../config/map';

interface Props {
  center?: [number, number];
  zoom?: number;
  children?: ReactNode;
}

export function MapView({ center = MAP_DEFAULT_CENTER, zoom = MAP_DEFAULT_ZOOM, children }: Props) {
  return (
    <MapComponent mapStyle={MAP_STYLE_URL} style={styles.map} logo={false}>
      <Camera center={center} zoom={zoom} />
      {children}
    </MapComponent>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
