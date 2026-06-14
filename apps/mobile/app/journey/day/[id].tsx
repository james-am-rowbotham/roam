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
import { ElevationProfile } from '../../../components/trail';
import { Icon } from '../../../components/ui';
import { formatElevationM, formatKm, routeChainPlaces } from '../../../lib/format';
import { useJourney, useTrailSections, useTrails } from '../../../lib/hooks';
import { buildItineraryDays, formatElapsed } from '../../../lib/itineraryDays';
import { PACE_TARGET_M } from '../../../store/journeySetupStore';
import { colors, layout, spacing, type } from '../../../theme';

// Stats for one completed day of a journey (opened from the itinerary). A day may
// group several stages walked on the same calendar day, so totals are aggregated.
export default function DayStatsScreen() {
  const { id, day } = useLocalSearchParams<{ id: string; day: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dayNumber = Number(day);

  const { data: journeyResponse, isLoading } = useJourney(id);
  const rawJourney = journeyResponse?.data;
  const journey = rawJourney && !('error' in rawJourney) ? rawJourney : null;

  const { data: trailsData } = useTrails();
  const trail = trailsData?.data?.find((t) => t.routeId === journey?.routeId);
  const { data: sectionsData } = useTrailSections(String(trail?.id ?? 0), {
    query: { enabled: !!trail?.id },
  });

  if (isLoading || !journey) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const sectionRanges = Array.isArray(sectionsData?.data) ? sectionsData.data : [];
  const walkStages = journey.stages.filter((s) => !s.restDay);
  const totalDistanceM = walkStages.reduce((a, s) => a + (s.distanceM ?? 0), 0);
  const doneDistanceM = walkStages
    .filter((s) => s.status === 'completed')
    .reduce((a, s) => a + (s.distanceM ?? 0), 0);
  const baselineTargetM = totalDistanceM / Math.max(1, walkStages.length);

  // Re-derive the same itinerary the journey screen shows, then pick this day. Completed
  // days are grouped by completion date (deterministic), so the day number is stable.
  const { days } = buildItineraryDays(sectionRanges, {
    reverse: journey.direction === 'reverse',
    doneDistanceM,
    paceTargetM: journey.pace ? PACE_TARGET_M[journey.pace] : baselineTargetM,
    donePaceTargetM: baselineTargetM,
    startDateISO: journey.startDate ?? null,
    trailRef: trail?.ref ?? null,
    completedStages: walkStages
      .filter((s) => s.status === 'completed')
      .map((s) => ({
        startChainageM: s.startChainageM,
        endChainageM: s.endChainageM,
        completedAt: s.completedAt,
        elapsedSeconds: s.elapsedSeconds,
      })),
  });
  const dayData = days.find((d) => d.number === dayNumber);

  const title = trail?.ref ?? trail?.name ?? 'Day';
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/journey/${id}`));

  if (!dayData) {
    return (
      <View style={styles.screen}>
        <Header title={title} insetTop={insets.top} onBack={back} />
        <View style={styles.loading}>
          <Text style={styles.statLabel}>Day not found.</Text>
        </View>
      </View>
    );
  }

  const distanceM = dayData.stages.reduce((a, s) => a + s.distanceM, 0);
  const ascentM = dayData.stages.reduce((a, s) => a + s.ascentM, 0);
  const routeLabel =
    routeChainPlaces(dayData.stages.map((s) => s.name)).join(' → ') || `Day ${dayData.number}`;

  // Slice the trail's elevation profile to this day's chainage span.
  const elevation = trail?.elevation ?? [];
  const trailTotalM = trail?.distanceM ?? 0;
  const lo = Math.min(...dayData.stages.map((s) => Math.min(s.startChainageM, s.endChainageM)));
  const hi = Math.max(...dayData.stages.map((s) => Math.max(s.startChainageM, s.endChainageM)));
  const slice =
    elevation.length > 1 && trailTotalM > 0
      ? elevation.slice(
          Math.floor((lo / trailTotalM) * elevation.length),
          Math.max(
            Math.ceil((hi / trailTotalM) * elevation.length),
            Math.floor((lo / trailTotalM) * elevation.length) + 2,
          ),
        )
      : [];

  return (
    <View style={styles.screen}>
      <Header title={title} insetTop={insets.top} onBack={back} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: layout.contentPaddingBottom + insets.bottom }}
      >
        {/* Day heading */}
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>
            DAY {dayData.number}
            {dayData.dateLabel && dayData.dateLabel !== 'TODAY' ? ` · ${dayData.dateLabel}` : ''}
          </Text>
          <Text style={styles.route}>{routeLabel}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <Stat value={formatKm(distanceM)} label="walked" />
          <View style={styles.statDivider} />
          <Stat value={`↑${formatElevationM(ascentM)}`} label="ascent" />
          <View style={styles.statDivider} />
          <Stat
            value={dayData.elapsedSeconds != null ? formatElapsed(dayData.elapsedSeconds) : '—'}
            label="time"
          />
        </View>

        {slice.length > 1 && (
          <View style={styles.elevation}>
            <ElevationProfile
              data={slice}
              mode="complete"
              height={64}
              scale
              distanceM={distanceM}
            />
          </View>
        )}

        {/* Stages walked this day */}
        <Text style={styles.listHeader}>
          {dayData.stages.length === 1 ? 'STAGE' : `${dayData.stages.length} STAGES`}
        </Text>
        {dayData.stages.map((stage) => (
          <View key={stage.id} style={styles.stageRow}>
            <View style={styles.badge}>
              <Icon name="check" size={15} color={colors.status.success.text} />
            </View>
            <View style={styles.stageBody}>
              <Text style={styles.stageTitle}>
                Stage {stage.number} · {stage.name}
              </Text>
              <Text style={styles.stageMeta}>
                {[
                  formatKm(stage.distanceM),
                  `${formatElevationM(stage.ascentM)} ↑`,
                  stage.grade,
                ].join(' · ')}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Header({
  title,
  insetTop,
  onBack,
}: {
  title: string;
  insetTop: number;
  onBack: () => void;
}) {
  return (
    <View style={[styles.header, { paddingTop: insetTop + spacing[2] }]}>
      <View style={styles.headerSide}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-left" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerSide} />
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing[4],
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  headerTitle: { ...type.title, color: colors.text.primary, textAlign: 'center' },

  heading: { paddingHorizontal: layout.screenPadding, paddingTop: spacing[6], gap: spacing[1] },
  eyebrow: { ...type.label, color: colors.text.secondary },
  route: { ...type.sectionHeader, color: colors.text.primary },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: layout.screenPadding,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing[1] },
  statValue: { ...type.statValue, color: colors.text.primary },
  statLabel: { ...type.meta, color: colors.text.secondary },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border.default },

  elevation: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing[6] },

  listHeader: {
    ...type.label,
    color: colors.text.secondary,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing[3],
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[5],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.status.success.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageBody: { flex: 1, gap: spacing[1] },
  stageTitle: { ...type.cardTitle, color: colors.text.primary },
  stageMeta: { ...type.dataMeta, color: colors.text.secondary },
});
