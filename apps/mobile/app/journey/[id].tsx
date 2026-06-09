import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { journeyStatusChip } from '../../components/journey';
import { Icon, StatPill, StatusChip } from '../../components/ui';
import { formatElevationM, formatKm } from '../../lib/format';
import { useJourney, useTrailAccommodations, useTrails } from '../../lib/hooks';
import { colors, layout, radius, spacing, type } from '../../theme';

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: journeyResponse, isLoading } = useJourney(id);
  const rawJourney = journeyResponse?.data;
  const journey = rawJourney && !('error' in rawJourney) ? rawJourney : null;

  const { data: trailsData } = useTrails();
  const trail = trailsData?.data?.find((t) => t.routeId === journey?.routeId);
  const trailId = trail?.id;

  // Resolve overnight accommodation ids → names for the itinerary list.
  const { data: accommodationsData } = useTrailAccommodations(String(trailId ?? 0), {
    query: { enabled: !!trailId },
  });
  const accommodations = Array.isArray(accommodationsData?.data) ? accommodationsData.data : [];
  const accommodationName = (accId: number | null): string | null => {
    if (accId == null) return null;
    return accommodations.find((a) => a.id === accId)?.name ?? null;
  };

  if (isLoading || !journey) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const stages = journey.stages;
  const totalDistanceM = stages.reduce((a, s) => a + (s.distanceM ?? 0), 0);
  const totalAscentM = stages.reduce((a, s) => a + (s.ascentM ?? 0), 0);
  const chip = journeyStatusChip(journey.status);
  const trailName = trail?.ref ?? trail?.name ?? 'Journey';

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/journeys'))}
        >
          <Icon name="arrow-left" size={20} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {trailName}
          </Text>
          <Text style={styles.subtitle}>
            {stages.length}-day journey{journey.direction === 'reverse' ? ' · reversed' : ''}
          </Text>
        </View>
        <StatusChip label={chip.label} variant={chip.variant} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: layout.contentPaddingBottom + insets.bottom }}
      >
        {/* Totals */}
        <View style={styles.stats}>
          <StatPill value={formatKm(totalDistanceM)} label="distance" />
          <View style={styles.divider} />
          <StatPill value={formatElevationM(totalAscentM)} label="ascent" />
          <View style={styles.divider} />
          <StatPill value={String(stages.length)} label="days" />
        </View>

        {/* Itinerary */}
        <Text style={styles.listHeader}>ITINERARY</Text>
        {stages.map((s) => {
          const overnight = accommodationName(s.overnightAccommodationId);
          return (
            <View key={s.id} style={styles.stage}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayNum}>{s.orderIndex}</Text>
              </View>
              <View style={styles.stageBody}>
                <Text style={styles.stageTitle}>Day {s.orderIndex}</Text>
                <Text style={styles.stageMeta}>
                  {[
                    formatKm(s.distanceM),
                    s.ascentM != null ? `+${formatElevationM(s.ascentM)}` : null,
                    s.descentM != null ? `−${formatElevationM(s.descentM)}` : null,
                  ]
                    .filter(Boolean)
                    .join('  ·  ')}
                </Text>
                {overnight && (
                  <View style={styles.overnight}>
                    <Icon name="home" size={13} color={colors.marker.refuge} />
                    <Text style={styles.overnightText} numberOfLines={1}>
                      {overnight}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing[4],
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { ...type.title, color: colors.text.primary },
  subtitle: { ...type.meta, color: colors.text.secondary },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: layout.screenPadding,
  },
  divider: { width: 1, height: 28, backgroundColor: colors.border.default },

  listHeader: {
    ...type.label,
    color: colors.text.secondary,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing[3],
  },
  stage: {
    flexDirection: 'row',
    gap: spacing[4],
    paddingVertical: spacing[4],
    paddingHorizontal: layout.screenPadding,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  dayBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { ...type.cardTitle, color: colors.text.primary },
  stageBody: { flex: 1, gap: spacing[1] },
  stageTitle: { ...type.cardTitle, color: colors.text.primary },
  stageMeta: { ...type.meta, color: colors.text.secondary },
  overnight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] },
  overnightText: { ...type.meta, color: colors.text.primary, flex: 1 },
});
