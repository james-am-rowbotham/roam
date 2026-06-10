import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScheduleGap, journeyStatusChip } from '../../components/journey';
import { Button, Icon, StatPill, StatusChip } from '../../components/ui';
import { formatElevationM, formatKm, orientRoute, routeEndpoints } from '../../lib/format';
import { useJourney, useTrailAccommodations, useTrailSections, useTrails } from '../../lib/hooks';
import { sectionCut } from '../../lib/itinerary';
import { useJourneyProgress } from '../../lib/useJourneyProgress';
import { colors, layout, radius, spacing, type } from '../../theme';

type StageItem = { id: number; status: 'planned' | 'active' | 'completed' };

function confirmRemoveRest(stageId: number, remove: (id: number) => void) {
  Alert.alert('Remove rest day?', undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => remove(stageId) },
  ]);
}

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { progress, restDay, removeRestDay, combine, split } = useJourneyProgress(id);

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

  // Sections define where a day can be split (so splits snap to the trail's grid).
  const { data: sectionsData } = useTrailSections(String(trailId ?? 0), {
    query: { enabled: !!trailId },
  });
  const sectionRanges = Array.isArray(sectionsData?.data) ? sectionsData.data : [];

  // Sections a day covers, in walking order — shown as links into section detail.
  const sectionsForDay = (start: number, end: number) => {
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    const out = sectionRanges.filter((sec) => {
      const slo = Math.min(sec.startChainageM, sec.endChainageM);
      const shi = Math.max(sec.startChainageM, sec.endChainageM);
      return Math.min(hi, shi) - Math.max(lo, slo) > 1;
    });
    return start > end ? [...out].reverse() : out;
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
  const isPlanned = journey.status === 'planned';
  const isActive = journey.status === 'active';

  const onStageTap = (stage: StageItem) => {
    if (!isActive || progress.isPending) return;
    progress.mutate(
      stage.status === 'completed'
        ? { type: 'uncompleteStage', stageId: stage.id }
        : { type: 'completeStage', stageId: stage.id },
    );
  };

  const editable = isPlanned || isActive;
  const walkStages = stages.filter((s) => !s.restDay);
  const completedCount = walkStages.filter((s) => s.status === 'completed').length;
  const doneDistanceM = walkStages
    .filter((s) => s.status === 'completed')
    .reduce((a, s) => a + (s.distanceM ?? 0), 0);
  // The "current" day is derived: the first walking day that isn't done. There is
  // therefore only ever one, and completing a day never auto-starts another.
  const currentStage = isActive
    ? (stages.find((s) => !s.restDay && s.status !== 'completed') ?? null)
    : null;
  const currentWalkIndex = currentStage
    ? walkStages.findIndex((s) => s.id === currentStage.id)
    : completedCount;
  const currentDay = Math.min(currentWalkIndex + 1, walkStages.length);
  const progressPct = walkStages.length
    ? Math.round((completedCount / walkStages.length) * 100)
    : 0;
  const trailName = trail?.ref ?? trail?.name ?? 'Journey';
  const title = journey.name?.trim() || trailName;
  const subtitle = [
    journey.name?.trim() ? trailName : null,
    `${stages.length}-day journey`,
    journey.direction === 'reverse' ? 'reversed' : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <StatusChip label={chip.label} variant={chip.variant} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: layout.contentPaddingBottom + insets.bottom }}
      >
        {/* Active progress, or planned/completed totals */}
        {isActive ? (
          <View style={styles.progressHeader}>
            <View style={styles.progressTopRow}>
              <Text style={styles.progressDay}>
                Day {currentDay} of {walkStages.length}
              </Text>
              <Text style={styles.progressDone}>{completedCount} done</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressMeta}>
              {formatKm(doneDistanceM)} of {formatKm(totalDistanceM)}
            </Text>
          </View>
        ) : (
          <View style={styles.stats}>
            <StatPill value={formatKm(totalDistanceM)} label="distance" />
            <View style={styles.divider} />
            <StatPill value={formatElevationM(totalAscentM)} label="ascent" />
            <View style={styles.divider} />
            <StatPill value={String(walkStages.length)} label="days" />
          </View>
        )}

        {/* Itinerary */}
        <Text style={styles.listHeader}>ITINERARY</Text>
        <View style={styles.leadingLine} />
        {stages.map((s, i) => {
          const nextStage = stages[i + 1];
          const gap = nextStage ? (
            <ScheduleGap
              editable={editable}
              canCombine={!s.restDay && !nextStage.restDay}
              canSplit={
                !s.restDay && sectionCut(s.startChainageM, s.endChainageM, sectionRanges) !== null
              }
              onAddRest={() => restDay.mutate(s.id)}
              onCombine={() => combine.mutate(s.id)}
              onSplit={() => split.mutate(s.id)}
            />
          ) : null;

          if (s.restDay) {
            return (
              <Fragment key={s.id}>
                <TouchableOpacity
                  style={styles.restRow}
                  onPress={() => confirmRemoveRest(s.id, removeRestDay.mutate)}
                  disabled={!editable}
                  activeOpacity={editable ? 0.6 : 1}
                >
                  <View style={styles.restBadge}>
                    <Icon name="calendar" size={14} color={colors.text.secondary} />
                  </View>
                  <Text style={styles.restLabel}>Rest day</Text>
                  {editable && <Text style={styles.restRemove}>Remove</Text>}
                </TouchableOpacity>
                {gap}
              </Fragment>
            );
          }

          const overnight = accommodationName(s.overnightAccommodationId);
          const done = s.status === 'completed';
          const current = currentStage?.id === s.id;
          const daySections = sectionsForDay(s.startChainageM, s.endChainageM);
          // A connected waypoint chain for the day; each place links to its section.
          const reverse = journey.direction === 'reverse';
          const chain: { place: string; sectionId: number }[] = [];
          daySections.forEach((sec, idx) => {
            const [from, to] = routeEndpoints(orientRoute(sec.name, reverse));
            if (idx === 0) chain.push({ place: from, sectionId: sec.id });
            chain.push({ place: to, sectionId: sec.id });
          });
          return (
            <Fragment key={s.id}>
              <View style={[styles.stage, current && styles.stageCurrent]}>
                <View style={styles.stageMain}>
                  <TouchableOpacity
                    style={[
                      styles.dayBadge,
                      done && styles.dayBadgeDone,
                      current && styles.dayBadgeActive,
                    ]}
                    onPress={() => onStageTap(s)}
                    disabled={!isActive || (!done && !current)}
                    activeOpacity={done || current ? 0.6 : 1}
                  >
                    {done ? (
                      <Icon name="check" size={16} color={colors.status.success.text} />
                    ) : (
                      <Text style={[styles.dayNum, current && styles.dayNumActive]}>
                        {s.orderIndex}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <View style={styles.stageBody}>
                    <View style={styles.sectionList}>
                      {chain.length > 0 ? (
                        chain.map((node, idx) => (
                          <Fragment key={`${node.place}-${idx}`}>
                            {idx > 0 && <Text style={styles.sectionSep}>→</Text>}
                            <TouchableOpacity
                              onPress={() => router.push(`/section/${node.sectionId}`)}
                              hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                            >
                              <Text style={styles.sectionLink}>{node.place}</Text>
                            </TouchableOpacity>
                          </Fragment>
                        ))
                      ) : (
                        <Text style={styles.stageTitle}>Day {s.orderIndex}</Text>
                      )}
                    </View>
                    <Text style={styles.stageMeta}>
                      {[
                        formatKm(s.distanceM),
                        s.ascentM != null ? `↑${formatElevationM(s.ascentM)}` : null,
                        s.descentM != null ? `↓${formatElevationM(s.descentM)}` : null,
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
                {current && (
                  <TouchableOpacity
                    style={styles.markComplete}
                    onPress={() => onStageTap(s)}
                    disabled={progress.isPending}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.markCompleteLabel}>
                      {progress.isPending ? '…' : 'Mark complete'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {gap}
            </Fragment>
          );
        })}
      </ScrollView>

      {/* Progress CTA */}
      {(isPlanned || isActive) && (
        <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + spacing[4] }]}>
          {isPlanned ? (
            <Button
              label={progress.isPending ? 'Starting…' : 'Start journey'}
              onPress={() => progress.mutate({ type: 'start' })}
            />
          ) : (
            <Button
              label="End journey"
              variant="ghost"
              onPress={() => progress.mutate({ type: 'end' })}
            />
          )}
        </View>
      )}
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

  progressHeader: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[6],
    gap: spacing[3],
  },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  progressDay: { ...type.cardTitle, color: colors.text.primary },
  progressDone: { ...type.meta, color: colors.text.secondary },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bg.subtle,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: radius.full, backgroundColor: colors.status.info.text },
  progressMeta: { ...type.meta, color: colors.text.secondary },

  listHeader: {
    ...type.label,
    color: colors.text.secondary,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing[3],
  },
  leadingLine: {
    height: 1,
    marginHorizontal: layout.screenPadding,
    backgroundColor: colors.border.default,
  },
  stage: {
    paddingVertical: spacing[8],
    paddingHorizontal: layout.screenPadding,
  },
  stageCurrent: { backgroundColor: colors.status.info.bg },
  stageMain: { flexDirection: 'row', gap: spacing[4], alignItems: 'flex-start' },
  dayBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeDone: { backgroundColor: colors.status.success.bg },
  dayBadgeActive: { backgroundColor: colors.status.info.text },
  dayNum: { ...type.cardTitle, color: colors.text.primary },
  dayNumActive: { color: colors.text.onAccent },
  stageBody: { flex: 1, gap: spacing[2] },
  sectionList: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2] },
  stageTitle: { ...type.cardTitle, color: colors.text.primary },
  sectionLink: { ...type.cardTitle, color: colors.text.primary, textDecorationLine: 'underline' },
  sectionSep: { ...type.cardTitle, color: colors.text.secondary },
  stageMeta: { ...type.meta, color: colors.text.secondary },
  overnight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] },
  overnightText: { ...type.meta, color: colors.text.primary, flex: 1 },
  markComplete: {
    marginTop: spacing[4],
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markCompleteLabel: { ...type.cardTitle, color: colors.text.onAccent },

  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[8],
    paddingHorizontal: layout.screenPadding,
  },
  restBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restLabel: { ...type.cardTitle, color: colors.text.secondary, flex: 1 },
  restRemove: { ...type.meta, color: colors.text.secondary },

  ctaWrap: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
});
