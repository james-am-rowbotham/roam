import { Marker } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapView,
  type MapViewHandle,
  POILayer,
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
// Filter chips — pure filters, × to remove
// ---------------------------------------------------------------------------

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.chipX}
        onPress={onRemove}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      >
        <Icon name="close" size={18} color={colors.text.onAccent} />
      </TouchableOpacity>
    </View>
  );
}

// A removed filter, shown muted with a + to re-add it.
function ReAddChip({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <TouchableOpacity style={styles.reAddChip} onPress={onAdd} activeOpacity={0.8}>
      <Icon name="plus" size={16} color={colors.text.secondary} />
      <Text style={styles.reAddChipText}>{label}</Text>
    </TouchableOpacity>
  );
}

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
    <Marker id={`label-${label}`} lngLat={center}>
      <TouchableOpacity style={styles.geoLabel} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.geoLabelText}>{label}</Text>
      </TouchableOpacity>
    </Marker>
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
    setViewport,
    trailVisible,
    activeTrailId,
    activeTrailLabel,
    activeTrailGeomCenter,
    activeSectionId,
    activeSectionLabel,
    activeSectionGeomCenter,
    activeSectionGeom,
    activeSectionChainageRange,
    showTrail,
    removeTrailFilter,
    removeSectionFilter,
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

  // Fetch the first trail for map display (GR11)
  const { data: trailsResponse } = useTrails();
  const firstTrail = trailsResponse?.data?.[0];
  const firstTrailId = firstTrail?.id;
  const trailLabel = firstTrail?.ref ?? firstTrail?.name ?? 'Trail';
  const enabled = { query: { enabled: !!firstTrailId } };

  const trailIdStr = String(firstTrailId ?? 0);
  const { data: trailResponse } = useTrail(trailIdStr, enabled);
  const { data: waterResponse } = useTrailWater(trailIdStr, enabled);
  const { data: accommResponse } = useTrailAccommodations(trailIdStr, enabled);

  const rawTrail = trailResponse?.data;
  const geojson = rawTrail && 'type' in rawTrail ? rawTrail : null;

  const rawWater = waterResponse?.data;
  const allWater = Array.isArray(rawWater) ? rawWater : [];
  const rawAccomm = accommResponse?.data;
  const allAccomm = Array.isArray(rawAccomm) ? rawAccomm : [];

  // Filter POIs to section chainage range when a section is active
  const water = activeSectionChainageRange
    ? allWater.filter(
        (p) =>
          p.chainageM >= activeSectionChainageRange[0] &&
          p.chainageM <= activeSectionChainageRange[1],
      )
    : allWater;
  const accommodations = activeSectionChainageRange
    ? allAccomm.filter(
        (p) =>
          p.chainageM >= activeSectionChainageRange[0] &&
          p.chainageM <= activeSectionChainageRange[1],
      )
    : allAccomm;

  const isSectionActive = !!activeSectionId;

  return (
    <View style={styles.screen}>
      {/* Full-screen map */}
      <MapView ref={mapRef} center={viewport.center} zoom={viewport.zoom}>
        {/* Trail (GR11) and everything attached to it — hidden when the trail
            filter is removed. Section highlight is dimmed against the full line. */}
        {trailVisible && (
          <>
            {geojson && (
              <TrailLayer
                id="gr11"
                geojson={geojson as never}
                color={colors.trail.gr}
                width={isSectionActive ? 2 : 3}
                opacity={isSectionActive ? 0.2 : 0.9}
              />
            )}
            {/* Section highlight */}
            {activeSectionGeom && (
              <TrailLayer
                id="section-highlight"
                geojson={{ type: 'Feature', geometry: activeSectionGeom as never, properties: {} }}
                color={colors.trail.gr}
                width={4}
                opacity={1}
              />
            )}
            {/* POIs */}
            <POILayer
              id="water"
              pois={water}
              color={colors.marker.water}
              radius={6}
              annotationMode={isSectionActive}
              onPress={(id) => router.push(`/poi/water/${id}`)}
            />
            <POILayer
              id="accommodations"
              pois={accommodations}
              color={colors.marker.refuge}
              radius={7}
              annotationMode
              onPress={(id) => router.push(`/poi/accommodation/${id}`)}
            />
            {/* Geometry labels — tap to navigate to detail */}
            {activeTrailGeomCenter && activeTrailLabel && (
              <GeometryLabel
                center={activeTrailGeomCenter}
                label={activeTrailLabel}
                onPress={() => router.push(`/trail/${activeTrailId}`)}
              />
            )}
            {activeSectionGeomCenter && activeSectionLabel && (
              <GeometryLabel
                center={activeSectionGeomCenter}
                label={activeSectionLabel}
                onPress={() => router.push(`/section/${activeSectionId}`)}
              />
            )}
          </>
        )}
        {coords && <UserMarker coord={[coords.lng, coords.lat]} />}
      </MapView>

      {/* Search bar */}
      <TouchableOpacity style={[styles.searchBar, { top: insets.top + 8 }]} activeOpacity={0.85}>
        <Icon name="search" size={18} color={colors.text.secondary} />
        <Text style={styles.searchPlaceholder}>Search trails, peaks, refuges…</Text>
        <Icon name="microphone" size={18} color={colors.text.secondary} />
      </TouchableOpacity>

      {/* Filter bar — the trail (GR11) is itself a removable filter: an active
          chip when shown, a muted re-add chip when removed. Section context and
          the discovery placeholders sit alongside it. */}
      <View style={[styles.filterContainer, { top: insets.top + 60 }]}>
        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {trailVisible ? (
              <FilterChip label={trailLabel} onRemove={removeTrailFilter} />
            ) : (
              <ReAddChip label={trailLabel} onAdd={showTrail} />
            )}
            {trailVisible && isSectionActive && activeSectionLabel && (
              <FilterChip label={activeSectionLabel} onRemove={removeSectionFilter} />
            )}
            <IconButton icon="search" style="surface" size="md" />
            <TouchableOpacity style={styles.filterChipInactive} activeOpacity={0.8}>
              <Text style={styles.filterChipInactiveText}>Moderate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChipInactive} activeOpacity={0.8}>
              <Text style={styles.filterChipInactiveText}>2–3 days</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

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

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 7,
    gap: 6,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  chipLabel: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text.onAccent },
  chipX: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipXText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text.onAccent,
    lineHeight: 18,
  },

  geoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.trail.gr,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  geoLabelText: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.22,
    color: colors.trail.gr,
  },
  geoLabelArrow: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.trail.gr,
    opacity: 0.5,
  },

  filterContainer: { position: 'absolute', left: 0, right: 0 },
  filterWrap: { paddingHorizontal: spacing[8] },
  filterRow: { gap: spacing[4], flexDirection: 'row', alignItems: 'center' },
  filterChipInactive: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipInactiveText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text.primary },
  reAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.default,
  },
  reAddChipText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text.secondary },

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
