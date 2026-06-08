import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MapView, POILayer, TrailLayer } from '../../components/map';
import { Icon } from '../../components/ui';
import { useTrail, useTrailAccommodations, useTrailWater, useTrails } from '../../lib/hooks';
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
  const { data: trailsResponse } = useTrails();
  const firstTrailId = trailsResponse?.data?.[0]?.id;
  const enabled = { query: { enabled: !!firstTrailId } };

  const { data: trailResponse } = useTrail(firstTrailId ?? 0, enabled);
  const { data: waterResponse } = useTrailWater(firstTrailId ?? 0, enabled);
  const { data: accommResponse } = useTrailAccommodations(firstTrailId ?? 0, enabled);

  const geojson = trailResponse?.data ?? null;
  const water = waterResponse?.data ?? [];
  const accommodations = accommResponse?.data ?? [];

  return (
    <View style={styles.screen}>
      {/* Full-screen map */}
      <MapView>
        {geojson && <TrailLayer id="gr11" geojson={geojson} color={colors.trail.gr} width={3} />}
        <POILayer
          id="water"
          pois={water}
          color={colors.marker.water}
          radius={5}
          onPress={(id) => router.push(`/poi/water/${id}`)}
        />
        <POILayer
          id="accommodations"
          pois={accommodations}
          color={colors.marker.refuge}
          radius={6}
          onPress={(id) => router.push(`/poi/accommodation/${id}`)}
        />
      </MapView>

      {/* Floating UI overlaid on the map */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Search bar */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.85}>
          <Icon name="search" size={18} color={colors.text.secondary} />
          <Text style={styles.searchPlaceholder}>Search trails, peaks, refuges…</Text>
          <Icon name="microphone" size={18} color={colors.text.secondary} />
        </TouchableOpacity>

        {/* Filter chips */}
        <View style={styles.filterContainer}>
          <FilterBar />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
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
    top: 64,
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
