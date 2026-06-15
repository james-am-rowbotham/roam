import { Marker } from '@maplibre/maplibre-react-native';
import { symbolKey } from '@roam/core';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { Chip, Icon, IconButton } from '../../components/ui';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../../config/map';
import { useTrail, useTrailAccommodations, useTrailWater, useTrails } from '../../lib/hooks';
import { useUserLocation } from '../../lib/useUserLocation';
import { useMapStore } from '../../store/mapStore';
import { colors, fonts, radius, spacing, type } from '../../theme';

// ---------------------------------------------------------------------------
// Filter chips — pure filters, × to remove
// ---------------------------------------------------------------------------

// Active filter — a selected Chip with a dismiss suffix ("GR11 ✕").
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <Chip label={label} selected suffix="✕" onPress={onRemove} />;
}

// A removed filter, shown as a default chip with a + to re-add it.
function ReAddChip({ label, onAdd }: { label: string; onAdd: () => void }) {
  return <Chip label={`+ ${label}`} onPress={onAdd} />;
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
  // The route's painted waymark (§17.8) — the real GR11 sign, parsed from OSM.
  const waymarkSymbol = firstTrail?.waymark?.symbol ?? null;
  // The route line is drawn in the osmc:symbol way colour (GR11 → red), falling
  // back to ink when a route has no symbol.
  const trailColor = waymarkSymbol?.wayColor ?? colors.map.route;
  // The repeating blaze sprite riding the line (§17.2) — named by the symbol.
  const blazeImage = waymarkSymbol ? `blaze-${symbolKey(waymarkSymbol)}` : undefined;
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
        {/* Register all map sprites once for the native SymbolLayers. */}
        <MapImages />
        {/* Trail (GR11) and everything attached to it — hidden when the trail
            filter is removed. Section highlight is dimmed against the full line. */}
        {trailVisible && (
          <>
            {geojson && (
              <TrailLayer
                id="gr11"
                geojson={geojson as never}
                color={trailColor}
                // Full strength when it's the focus; dimmed back only when a
                // section is highlighted over it.
                width={isSectionActive ? 2 : 4}
                opacity={isSectionActive ? 0.2 : 1}
                onPress={firstTrailId ? () => router.push(`/trail/${firstTrailId}`) : undefined}
              />
            )}
            {/* Section highlight — the focused section drawn full-strength over
                the dimmed full trail, with start/finish pins at either end. */}
            {activeSectionGeom && (
              <TrailLayer
                id="section-highlight"
                geojson={{ type: 'Feature', geometry: activeSectionGeom as never, properties: {} }}
                color={trailColor}
                width={4}
                opacity={1}
              />
            )}
            {/* The blaze rides ABOVE both the full line and the section
                highlight — drawn last so a highlight never covers it (§17.2). */}
            {geojson && blazeImage && (
              <TrailBlaze id="gr11-blaze" geojson={geojson as never} image={blazeImage} />
            )}
            {/* Start/finish pins — at the focused section's ends when one is
                active, otherwise at the full trail's two termini. */}
            {activeSectionGeom ? (
              <SectionEndpoints geom={activeSectionGeom} />
            ) : (
              geojson && <SectionEndpoints geom={geojson as unknown as Record<string, unknown>} />
            )}
            {/* POIs — native layers self-disclose: discs appear at the Tactical
                tier (z12), labels at the Detail tier (z15). Confidence drives the
                muted look (§9). */}
            <NativePOILayer
              id="water"
              kind="water"
              pois={water}
              onPress={(id) => router.push(`/poi/water/${id}`)}
            />
            <NativePOILayer
              id="accommodations"
              kind="accommodation"
              pois={accommodations}
              onPress={(id) => router.push(`/poi/accommodation/${id}`)}
            />
            {/* The trail waymark repeats along the line via the blaze sprite on
                TrailLayer above (§17.2) — no single midpoint marker. */}
            {activeSectionGeomCenter && activeSectionLabel && (
              <GeometryLabel
                center={activeSectionGeomCenter}
                label={activeSectionLabel}
                onPress={() => router.push(`/section/${activeSectionId}`)}
              />
            )}
          </>
        )}
        {coords && <UserMarker coord={[coords.lng, coords.lat]} headingDeg={coords.headingDeg} />}
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
            <Chip label="Moderate" />
            <Chip label="2–3 days" />
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
