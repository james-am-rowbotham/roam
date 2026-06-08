import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView, POILayer, TrailLayer } from '../../components/map';
import { Icon } from '../../components/ui';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../../config/map';
import { useTrail, useTrailAccommodations, useTrailWater, useTrails } from '../../lib/hooks';
import { useMapStore } from '../../store/mapStore';
import { colors, fonts, radius, spacing, type } from '../../theme';

// ---------------------------------------------------------------------------
// Filter chips (static for now — wired up in Phase 4)
// ---------------------------------------------------------------------------

const ACTIVE_FILTERS = ['Moderate', '2–3 days'];
const INACTIVE_FILTERS = ['Any distance'];

function FilterBar() {
  return (
    <View style={styles.filterWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <TouchableOpacity style={styles.filterIcon} activeOpacity={0.8}>
          <Icon name="search" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        {ACTIVE_FILTERS.map((f) => (
          <TouchableOpacity key={f} style={styles.filterChipActive} activeOpacity={0.8}>
            <Text style={styles.filterChipActiveText}>{f}</Text>
          </TouchableOpacity>
        ))}
        {INACTIVE_FILTERS.map((f) => (
          <TouchableOpacity key={f} style={styles.filterChipInactive} activeOpacity={0.8}>
            <Text style={styles.filterChipInactiveText}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pendingViewport, clearHighlight } = useMapStore();
  const isHighlightActive = useMapStore((s) => s.isHighlightActive);
  const [viewport, setViewport] = useState({
    center: MAP_DEFAULT_CENTER as [number, number],
    zoom: MAP_DEFAULT_ZOOM,
  });

  useEffect(() => {
    if (pendingViewport) {
      setViewport(pendingViewport);
    }
  }, [pendingViewport]);

  const { data: trailsResponse } = useTrails();
  const firstTrailId = trailsResponse?.data?.[0]?.id;
  const enabled = { query: { enabled: !!firstTrailId } };

  const { data: trailResponse } = useTrail(firstTrailId ?? 0, enabled);
  const { data: waterResponse } = useTrailWater(firstTrailId ?? 0, enabled);
  const { data: accommResponse } = useTrailAccommodations(firstTrailId ?? 0, enabled);

  // Guard against error response — success type has `type: 'Feature'`
  const rawTrail = trailResponse?.data;
  const geojson = rawTrail && 'type' in rawTrail ? rawTrail : null;
  const highlightGeojson = useMapStore((s) => s.highlightGeojson);
  const highlightLabel = useMapStore((s) => s.highlightLabel);
  const highlightChainageRange = useMapStore((s) => s.highlightChainageRange);
  const rawWater = waterResponse?.data;
  const allWater = Array.isArray(rawWater) ? rawWater : [];
  const rawAccomm = accommResponse?.data;
  const allAccomm = Array.isArray(rawAccomm) ? rawAccomm : [];

  // When a section is highlighted, filter POIs to its chainage range
  const water = highlightChainageRange
    ? allWater.filter(
        (p) => p.chainageM >= highlightChainageRange[0] && p.chainageM <= highlightChainageRange[1],
      )
    : allWater;
  const accommodations = highlightChainageRange
    ? allAccomm.filter(
        (p) => p.chainageM >= highlightChainageRange[0] && p.chainageM <= highlightChainageRange[1],
      )
    : allAccomm;

  return (
    <View style={styles.screen}>
      {/* Full-screen map */}
      <MapView center={viewport.center} zoom={viewport.zoom}>
        {/* Full trail — hidden when a section is highlighted */}
        {geojson && !highlightGeojson && (
          <TrailLayer
            id="gr11"
            geojson={geojson as never}
            color={colors.trail.gr}
            width={3}
            opacity={0.9}
          />
        )}
        {/* Section highlight — bright overlay on top of the full trail */}
        {highlightGeojson && (
          <TrailLayer
            id="gr11-highlight"
            geojson={{ type: 'Feature', geometry: highlightGeojson as never, properties: {} }}
            color={colors.overlay.onImage}
            width={6}
            opacity={0.9}
          />
        )}
        {highlightGeojson && (
          <TrailLayer
            id="gr11-highlight-color"
            geojson={{ type: 'Feature', geometry: highlightGeojson as never, properties: {} }}
            color={colors.trail.gr}
            width={4}
            opacity={1}
          />
        )}
        {/* In highlight mode: Marker for both (few items, renders above trail).
            Normal mode: circle layers for water (many), Marker for accommodations (few). */}
        <POILayer
          id="water"
          pois={water}
          color={colors.marker.water}
          radius={6}
          annotationMode={isHighlightActive}
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
      </MapView>

      {/* UI elements positioned directly as siblings of MapView — avoids native layer z-order issues */}

      {isHighlightActive ? (
        /* Section context panel */
        <View style={[styles.contextPanel, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.contextBack}
            onPress={() => {
              clearHighlight();
              router.back();
            }}
            activeOpacity={0.85}
          >
            <Icon name="arrow-left" size={18} color={colors.accent} />
          </TouchableOpacity>
          <View style={styles.contextLabel}>
            <Text style={styles.contextTitle} numberOfLines={1}>
              {highlightLabel ?? 'Section'}
            </Text>
          </View>
        </View>
      ) : (
        /* Normal map UI */
        <>
          {router.canGoBack() && (
            <TouchableOpacity
              style={[styles.backBtn, { top: insets.top + 8 }]}
              onPress={() => {
                clearHighlight();
                router.back();
              }}
              activeOpacity={0.85}
            >
              <Icon name="arrow-left" size={20} color={colors.accent} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.searchBar, { top: insets.top + 8 }]}
            activeOpacity={0.85}
          >
            <Icon name="search" size={18} color={colors.text.secondary} />
            <Text style={styles.searchPlaceholder}>Search trails, peaks, refuges…</Text>
            <Icon name="microphone" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
          <View style={[styles.filterContainer, { top: insets.top + 60 }]}>
            <FilterBar />
          </View>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1 },

  contextPanel: {
    position: 'absolute',
    left: spacing[8],
    right: spacing[8],
    height: 44,
    backgroundColor: colors.overlay.frosted,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing[8],
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  contextBack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextLabel: { flex: 1 },
  contextTitle: { ...type.cardTitle, color: colors.text.primary },

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

  searchBar: {
    position: 'absolute',
    top: 12,
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
  searchPlaceholder: {
    ...type.body,
    color: colors.text.secondary,
    flex: 1,
  },

  filterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  filterWrap: { paddingHorizontal: spacing[8] },
  filterRow: {
    gap: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActiveText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text.onAccent,
  },
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
  filterChipInactiveText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
});
