// The only file that imports from @maplibre/maplibre-react-native.
// No MapLibre-specific types cross this boundary into screens.
import {
  Camera,
  Map as MapComponent,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { type ComponentRef, type ReactNode, forwardRef, useImperativeHandle, useRef } from 'react';
import { type NativeSyntheticEvent, StyleSheet } from 'react-native';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_STYLE_URL } from '../../config/map';

interface Props {
  center?: [number, number];
  zoom?: number;
  children?: ReactNode;
  /** When false, disables all pan/zoom/rotate — use for thumbnail preview maps */
  interactive?: boolean;
  /**
   * Called with the live zoom level as the viewport changes (pan/zoom/rotate).
   * Drives zoom-tier disclosure for RN chrome; map layers use zoom expressions
   * directly. Only a plain number crosses this boundary — no MapLibre types.
   */
  onZoomChanged?: (zoom: number) => void;
}

// Imperative handle for one-shot camera moves (e.g. "center on me"), which a
// declarative center/zoom prop can't do once the prop already equals the target.
export interface MapViewHandle {
  centerOn: (center: [number, number], zoom?: number) => void;
}

export const MapView = forwardRef<MapViewHandle, Props>(function MapView(
  {
    center = MAP_DEFAULT_CENTER,
    zoom = MAP_DEFAULT_ZOOM,
    children,
    interactive = true,
    onZoomChanged,
  },
  ref,
) {
  const cameraRef = useRef<ComponentRef<typeof Camera>>(null);

  useImperativeHandle(ref, () => ({
    centerOn: (c, z) => cameraRef.current?.easeTo({ center: c, zoom: z ?? zoom }),
  }));

  // Surface the live zoom as a plain number. onRegionIsChanging fires throughout
  // a gesture (live tier tracking); onRegionDidChange guarantees the settled value.
  const emitZoom = onZoomChanged
    ? (e: NativeSyntheticEvent<ViewStateChangeEvent>) => onZoomChanged(e.nativeEvent.zoom)
    : undefined;

  return (
    <MapComponent
      mapStyle={MAP_STYLE_URL}
      style={styles.map}
      logo={false}
      dragPan={interactive}
      touchZoom={interactive}
      touchRotate={interactive}
      doubleTapZoom={interactive}
      onRegionIsChanging={emitZoom}
      onRegionDidChange={emitZoom}
    >
      <Camera ref={cameraRef} center={center} zoom={zoom} />
      {children}
    </MapComponent>
  );
});

const styles = StyleSheet.create({
  map: { flex: 1 },
});
