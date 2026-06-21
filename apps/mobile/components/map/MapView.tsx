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
  /**
   * Frame the camera to a geographic box [west, south, east, north] with padding,
   * instead of center/zoom — used by preview maps to fit a route/section exactly.
   */
  bounds?: [number, number, number, number];
  children?: ReactNode;
  /** When false, disables all pan/zoom/rotate — use for thumbnail preview maps */
  interactive?: boolean;
  /**
   * Called with the live zoom level as the viewport changes (pan/zoom/rotate).
   * Drives zoom-tier disclosure for RN chrome; map layers use zoom expressions
   * directly. Only a plain number crosses this boundary — no MapLibre types.
   */
  onZoomChanged?: (zoom: number) => void;
  /** Tap on the map background (not a pressable feature) — e.g. to dismiss a selection. */
  onPress?: () => void;
}

// Imperative handle for one-shot camera moves (e.g. "center on me", "frame this
// route"), which a declarative center/zoom prop can't do once the prop already
// equals the target — and, for framing, lets the camera STAY put afterwards
// instead of reverting when a declarative `bounds` prop is removed.
export interface MapViewHandle {
  centerOn: (center: [number, number], zoom?: number) => void;
  fitBounds: (bounds: [number, number, number, number]) => void;
}

export const MapView = forwardRef<MapViewHandle, Props>(function MapView(
  {
    center = MAP_DEFAULT_CENTER,
    zoom = MAP_DEFAULT_ZOOM,
    bounds,
    children,
    interactive = true,
    onZoomChanged,
    onPress,
  },
  ref,
) {
  const cameraRef = useRef<ComponentRef<typeof Camera>>(null);

  useImperativeHandle(ref, () => ({
    centerOn: (c, z) => cameraRef.current?.easeTo({ center: c, zoom: z ?? zoom }),
    // bounds = [west, south, east, north] = LngLatBounds. fitBounds zooms to frame exactly
    // the geometry — so the whole trail fits the screen and a section/stage zooms in. One-shot,
    // so clearing a focus doesn't snap back. Asymmetric padding clears the top search/chips
    // and the bottom Start CTA.
    fitBounds: (bounds) =>
      cameraRef.current?.fitBounds(bounds, { padding: FIT_PADDING, duration: 500 }),
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
      onPress={onPress ? () => onPress() : undefined}
    >
      {bounds ? (
        <Camera ref={cameraRef} bounds={bounds} padding={BOUNDS_PADDING} />
      ) : (
        <Camera ref={cameraRef} center={center} zoom={zoom} />
      )}
      {children}
    </MapComponent>
  );
});

// Inset so a route framed by the `bounds` prop (preview maps) doesn't touch the edges.
const BOUNDS_PADDING = { top: 28, right: 28, bottom: 28, left: 28 };
// Imperative fitBounds on the full map: extra top clears the search bar + filter chips,
// extra bottom clears the Start journey CTA, so the framed route sits in the open area.
const FIT_PADDING = { top: 128, right: 44, bottom: 96, left: 44 };

const styles = StyleSheet.create({
  map: { flex: 1 },
});
