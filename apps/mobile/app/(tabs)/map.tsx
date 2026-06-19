import { Marker } from '@maplibre/maplibre-react-native';
import { symbolKey } from '@roam/core';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapImages,
  MapView,
  type MapViewHandle,
  NativePOILayer,
  SectionEndpoints,
  TrailBlaze,
  TrailLayer,
  UserMarker,
} from '../../components/map';
import { Icon, IconButton } from '../../components/ui';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../../config/map';
import { useTrail, useTrailAccommodations, useTrailWater, useTrails } from '../../lib/hooks';
import { useUserLocation } from '../../lib/useUserLocation';
import { useMapStore } from '../../store/mapStore';
import { colors, fonts, radius, spacing, type } from '../../theme';

// ---------------------------------------------------------------------------
// Geometry label — rendered on the map at trail/section midpoint
// ---------------------------------------------------------------------------

function GeometryLabel({
  center,
  label,
  onPress,
}: {
  center: [number, number];
  label: string;
  onPress: () => void;
}) {
  return (
    // key forces a remount when the label changes: MapLibre's native Marker
    // rejects an `id` change after mount, so we swap the instance instead.
    <Marker key={`label-${label}`} id={`label-${label}`} lngLat={center}>
      <TouchableOpacity style={styles.geoLabel} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.geoLabelText}>{label}</Text>
      </TouchableOpacity>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// One trail's route on the map — its own geometry + POIs + blaze. Rendered once
// per trail so the map shows every route (GR11, GR10, …), each in its osmc way
// colour with its painted blaze (§17.2/§17.8). Hooks-per-component keeps the
// per-trail fetches valid while the trail list grows.
// ---------------------------------------------------------------------------

type MapTrail = {
  id: number;
  ref?: string | null;
  name?: string | null;
  waymark?: { symbol?: import('@roam/core').OsmcSymbol | null } | null;
};

function TrailRoute({ trail, dim }: { trail: MapTrail; dim: boolean }) {
  const router = useRouter();
  const id = String(trail.id);
  const enabled = { query: { enabled: !!trail.id } };
  const { data: trailResponse } = useTrail(id, enabled);
  const { data: waterResponse } = useTrailWater(id, enabled);
  const { data: accommResponse } = useTrailAccommodations(id, enabled);

  const rawTrail = trailResponse?.data;
  const geojson = rawTrail && 'type' in rawTrail ? rawTrail : null;
  const water = Array.isArray(waterResponse?.data) ? waterResponse.data : [];
  const accommodations = Array.isArray(accommResponse?.data) ? accommResponse.data : [];

  const symbol = trail.waymark?.symbol ?? null;
  const color = symbol?.wayColor ?? colors.map.route;
  const blazeImage = symbol ? `blaze-${symbolKey(symbol)}` : undefined;
  // 'GR11' → 'gr11', 'GR 10' → 'gr10' — route the line tap to the new objective Guide.
  const slug = (trail.ref ?? trail.name ?? '').toLowerCase().replace(/\s+/g, '');

  if (!geojson) return null;
  return (
    <>
      <TrailLayer
        id={`trail-${trail.id}`}
        geojson={geojson as never}
        color={color}
        width={dim ? 2 : 4}
        opacity={dim ? 0.25 : 1}
        onPress={
          slug
            ? () => router.push({ pathname: '/objective/[id]', params: { id: slug } })
            : undefined
        }
      />
      {blazeImage && (
        <TrailBlaze id={`blaze-${trail.id}`} geojson={geojson as never} image={blazeImage} />
      )}
      <SectionEndpoints geom={geojson as unknown as Record<string, unknown>} />
      <NativePOILayer
        id={`water-${trail.id}`}
        kind="water"
        pois={water}
        onPress={(pid) => router.push(`/poi/water/${pid}`)}
      />
      <NativePOILayer
        id={`accommodations-${trail.id}`}
        kind="accommodation"
        pois={accommodations}
        onPress={(pid) => router.push(`/poi/accommodation/${pid}`)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    pendingViewport,
    activeSectionId,
    activeSectionLabel,
    activeSectionGeomCenter,
    activeSectionGeom,
  } = useMapStore();

  const [viewport, setLocalViewport] = useState({
    center: MAP_DEFAULT_CENTER as [number, number],
    zoom: MAP_DEFAULT_ZOOM,
  });

  const { coords } = useUserLocation();
  const mapRef = useRef<MapViewHandle>(null);

  // Depend on the serialized viewport so the map re-flies only when the pushed
  // value changes, not on every identity change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: value-based dep on pendingViewport is intentional
  useEffect(() => {
    if (pendingViewport) {
      setLocalViewport(pendingViewport);
      // Don't call setViewport here — it would cause an infinite loop.
      // pendingViewport is consumed once and ignored until next setSectionFilter call.
    }
  }, [JSON.stringify(pendingViewport)]);

  // Every trail on the map — each draws its own route line, blaze and POIs (TrailRoute).
  // All trails show all the time; filters come later.
  const { data: trailsResponse } = useTrails();
  const trails = (trailsResponse?.data ?? []) as MapTrail[];
  const isSectionActive = !!activeSectionId;

  return (
    <View style={styles.screen}>
      {/* Full-screen map */}
      <MapView ref={mapRef} center={viewport.center} zoom={viewport.zoom}>
        {/* Register all map sprites once for the native SymbolLayers. */}
        <MapImages />
        {/* Every trail's route + blaze + POIs, always on. Routes dim when a section
            is highlighted over them (navigation focus, §17.5). */}
        {trails.map((t) => (
          <TrailRoute key={t.id} trail={t} dim={isSectionActive} />
        ))}
        {activeSectionGeom && (
          <TrailLayer
            id="section-highlight"
            geojson={{ type: 'Feature', geometry: activeSectionGeom as never, properties: {} }}
            color={colors.map.route}
            width={4}
            opacity={1}
          />
        )}
        {activeSectionGeom && <SectionEndpoints geom={activeSectionGeom} />}
        {activeSectionGeomCenter && activeSectionLabel && (
          <GeometryLabel
            center={activeSectionGeomCenter}
            label={activeSectionLabel}
            onPress={() => router.push(`/section/${activeSectionId}`)}
          />
        )}
        {coords && <UserMarker coord={[coords.lng, coords.lat]} headingDeg={coords.headingDeg} />}
      </MapView>

      {/* Search bar */}
      <TouchableOpacity style={[styles.searchBar, { top: insets.top + 8 }]} activeOpacity={0.85}>
        <Icon name="search" size={18} color={colors.text.secondary} />
        <Text style={styles.searchPlaceholder}>Search trails, peaks, refuges…</Text>
        <Icon name="microphone" size={18} color={colors.text.secondary} />
      </TouchableOpacity>

      {/* Center-on-me — always visible; disabled until we have a fix. */}
      <View style={[styles.locate, { bottom: insets.bottom + spacing[12] }]}>
        <IconButton
          icon="locate"
          style="surface"
          size="lg"
          disabled={!coords}
          onPress={() => coords && mapRef.current?.centerOn([coords.lng, coords.lat], 13)}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1 },

  searchBar: {
    position: 'absolute',
    left: spacing[8],
    right: spacing[8],
    height: 44,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: spacing[4],
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  searchPlaceholder: { ...type.body, color: colors.text.secondary, flex: 1 },

  locate: {
    position: 'absolute',
    right: spacing[8],
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },

  geoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  geoLabelText: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.22,
    color: colors.text.secondary,
  },
  geoLabelArrow: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.text.secondary,
    opacity: 0.5,
  },

  filterContainer: { position: 'absolute', left: 0, right: 0 },
  filterWrap: { paddingHorizontal: spacing[8] },
  filterRow: { gap: spacing[4], flexDirection: 'row', alignItems: 'center' },

  backBtn: {
    position: 'absolute',
    left: spacing[8],
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.overlay.frosted,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
});
