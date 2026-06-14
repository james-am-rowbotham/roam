import { groupStagesIntoDays, progressFraction } from '@roam/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
import { ActiveControlBar, ItineraryDayList, OptionsSheet } from '../../components/journey';
import { ElevationProfile } from '../../components/trail';
import { Button, Icon, Segmented, StatPill } from '../../components/ui';
import { CURRENT_USER_ID } from '../../config/user';
import { stageSubGeometry, stageViewport } from '../../lib/activeJourney';
import { formatElevationM, formatKm } from '../../lib/format';
import {
  deleteJourney,
  journeyQueryKey,
  journeysQueryKey,
  updateJourney,
  useJourney,
  useTrail,
  useTrailSections,
  useTrails,
} from '../../lib/hooks';
import { buildItineraryDays } from '../../lib/itineraryDays';
import { useJourneyProgress } from '../../lib/useJourneyProgress';
import { type GuidePreset, PACE_TARGET_M, type Pace } from '../../store/journeySetupStore';
import { useMapStore } from '../../store/mapStore';
import { colors, fonts, layout, radius, spacing, type } from '../../theme';

const GUIDE_OPTIONS: { value: GuidePreset; label: string }[] = [
  { value: 'silent', label: 'Silent' },
  { value: 'guided', label: 'Guided' },
  { value: 'full', label: 'Full' },
];

const PACE_OPTIONS: { value: Pace; label: string }[] = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'fast', label: 'Fast' },
];

// The journey's implied pace = the preset closest to its planned km/day.
function nearestPace(targetM: number): Pace {
  let best: Pace = 'moderate';
  let bestGap = Number.POSITIVE_INFINITY;
  for (const p of Object.keys(PACE_TARGET_M) as Pace[]) {
    const gap = Math.abs(PACE_TARGET_M[p] - targetM);
    if (gap < bestGap) {
      best = p;
      bestGap = gap;
    }
  }
  return best;
}

function confirmDelete(remove: () => void) {
  Alert.alert('Delete journey?', 'This permanently removes the journey and its itinerary.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: remove },
  ]);
}

function confirmFinishJourney(end: () => void) {
  Alert.alert(
    'Finish journey?',
    'Ends the journey and logs it as complete — it stays in your journeys.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Finish journey', style: 'destructive', onPress: end },
    ],
  );
}

// The on-trail Guide chat is not built yet (Guide Core, §12 / phase 8).
function askGuide() {
  Alert.alert('Guide', 'The on-trail Guide is coming soon.');
}

export default function JourneyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { progress } = useJourneyProgress(id);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'itinerary' | 'settings'>('itinerary');
  const [guideDraft, setGuideDraft] = useState<GuidePreset | null>(null);
  // Optimistic pace for instant regrouping; persisted to journey.pace via update.
  const [paceDraft, setPaceDraft] = useState<Pace | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const remove = useMutation({
    mutationFn: () => deleteJourney(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journeysQueryKey({ userId: CURRENT_USER_ID }) });
      router.replace('/(tabs)/journeys');
    },
  });
  // Journey Settings patches — guide preset and pace (the soft, re-grouping hint).
  const update = useMutation({
    mutationFn: (patch: { guidePreset?: GuidePreset; pace?: Pace }) => updateJourney(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journeyQueryKey(id) }),
  });

  const { data: journeyResponse, isLoading } = useJourney(id);
  const rawJourney = journeyResponse?.data;
  const journey = rawJourney && !('error' in rawJourney) ? rawJourney : null;

  const { data: trailsData } = useTrails();
  const trail = trailsData?.data?.find((t) => t.routeId === journey?.routeId);
  const trailId = trail?.id;

  // The trail's curated stages (etapas) — the itinerary lists these, grouped into days.
  const { data: sectionsData } = useTrailSections(String(trailId ?? 0), {
    query: { enabled: !!trailId },
  });
  const sectionRanges = Array.isArray(sectionsData?.data) ? sectionsData.data : [];

  // Trail geometry — to focus the full map on a tapped stage (same path as Section Detail).
  const { data: trailGeoData } = useTrail(String(trailId ?? 0), { query: { enabled: !!trailId } });
  const setSectionFilter = useMapStore((s) => s.setSectionFilter);

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
  const isPlanned = journey.status === 'planned';
  const isActive = journey.status === 'active';
  const isPaused = journey.status === 'paused';
  // Active + paused are both "in progress" (started, not finished).
  const inProgress = isActive || isPaused;
  const reverse = journey.direction === 'reverse';

  // walkStages = the journey's planned day-windows; their count gives the chosen pace.
  const walkStages = stages.filter((s) => !s.restDay);
  const doneDistanceM = walkStages
    .filter((s) => s.status === 'completed')
    .reduce((a, s) => a + (s.distanceM ?? 0), 0);
  // The current journey-window — what "Finish stage" completes (progress is recorded
  // on the journey's stage rows; the itinerary's stage display comes from trail data).
  const currentJourneyStage = inProgress
    ? (stages.find((s) => !s.restDay && s.status !== 'completed') ?? null)
    : null;

  // The itinerary lists the trail's curated stages (etapas) grouped into days (§5/§11).
  // Progress is counted in stages; pace only seeds the day grouping. The journey's
  // baseline pace comes from its planned km/day; a Settings override re-groups the
  // remaining stages (completed days keep the baseline grouping).
  const baselineTargetM = totalDistanceM / Math.max(1, walkStages.length);
  const baselinePace = nearestPace(baselineTargetM);
  // Pace: optimistic draft → persisted journey.pace → the baseline implied by the plan.
  const pace = paceDraft ?? journey.pace ?? baselinePace;
  const paceTargetM = PACE_TARGET_M[pace];
  const itinerary = buildItineraryDays(sectionRanges, {
    reverse,
    doneDistanceM,
    paceTargetM,
    donePaceTargetM: baselineTargetM,
    startDateISO: journey.startDate ?? null,
    trailRef: trail?.ref ?? null,
    // Completed day-windows carry the real completion date + walking time taken.
    completedStages: walkStages
      .filter((s) => s.status === 'completed')
      .map((s) => ({
        startChainageM: s.startChainageM,
        endChainageM: s.endChainageM,
        completedAt: s.completedAt,
        elapsedSeconds: s.elapsedSeconds,
      })),
  });
  // Soft consequence of the current pace vs the baseline — how many days it shifts the
  // finish. Computed from the remaining (unwalked) stages only.
  const remainingStages = itinerary.days
    .flatMap((d) => d.stages)
    .filter((s) => s.status !== 'done');
  const paceDelta =
    groupStagesIntoDays(remainingStages, baselineTargetM).length -
    groupStagesIntoDays(remainingStages, paceTargetM).length;
  const currentStageNum = itinerary.currentStageNumber;
  const totalStages = itinerary.totalStages;
  // Pace line (the only place pace surfaces — a quiet, soft description).
  const numDays = Math.max(1, itinerary.days.length);
  const stagesPerDay = Math.max(1, Math.round(totalStages / numDays));
  const kmPerDay = totalDistanceM / numDays;
  const paceWord = kmPerDay < 18_000 ? 'relaxed' : kmPerDay < 26_000 ? 'moderate' : 'fast';

  const trailName = trail?.ref ?? trail?.name ?? 'Journey';
  const title = journey.name?.trim() || trailName;

  const guideValue = guideDraft ?? journey.guidePreset;

  // Active-journey controls (shared model with the map): Pause is an immediate
  // toggle; the ••• sheet holds navigation, guide, finish stage and finish journey.
  const progressLabel = `Stage ${currentStageNum} of ${totalStages} · ${formatKm(doneDistanceM)} of ${formatKm(totalDistanceM)} walked`;
  // Resuming from the itinerary drops you onto the live map; pausing stays put.
  const toggleNavigation = () => {
    if (isPaused) {
      progress.mutate(
        { type: 'resume' },
        { onSuccess: () => router.push(`/journey/active/${id}`) },
      );
    } else {
      progress.mutate({ type: 'pause' });
    }
  };
  const finishStage = () => {
    if (!currentJourneyStage) return;
    progress.mutate(
      { type: 'completeStage', stageId: currentJourneyStage.id },
      {
        onSuccess: () => {
          setSheetOpen(false);
          router.push(`/journey/complete/${id}`);
        },
      },
    );
  };
  const finishJourney = () => {
    confirmFinishJourney(() =>
      progress.mutate(
        { type: 'end' },
        {
          onSuccess: () => {
            setSheetOpen(false);
            router.replace('/(tabs)/journeys');
          },
        },
      ),
    );
  };

  // Tapping a stage opens the full map focused on it: slice the trail line to the
  // stage's chainage and hand the map a section filter (same path as Section Detail).
  // Falls back to Section Detail if the geometry hasn't loaded yet.
  const geojson = trailGeoData?.data && 'type' in trailGeoData.data ? trailGeoData.data : null;
  const openStageOnMap = (sectionId: number) => {
    const sec = sectionRanges.find((s) => s.id === sectionId);
    const lo = sec ? Math.min(sec.startChainageM, sec.endChainageM) : 0;
    const hi = sec ? Math.max(sec.startChainageM, sec.endChainageM) : 0;
    const geom = sec ? stageSubGeometry(geojson, lo, hi, trail?.distanceM ?? null) : null;
    const vp = sec ? stageViewport(geojson, lo, hi, trail?.distanceM ?? null) : null;
    if (sec && geom && vp) {
      setSectionFilter(
        sectionId,
        sec.name,
        vp.center,
        geom as Record<string, unknown>,
        [lo, hi],
        vp,
      );
      router.push('/(tabs)/map');
    } else {
      router.push(`/section/${sectionId}`);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header — centered title, back + trail ref on the left */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <View style={styles.headerSide}>
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/(tabs)/journeys')
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow-left" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSide} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['itinerary', 'settings'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={styles.tab}
            onPress={() => setTab(t)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'itinerary' ? 'Itinerary' : 'Settings'}
            </Text>
            {tab === t && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'itinerary' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: layout.contentPaddingBottom + insets.bottom }}
        >
          {/* Progress header: stages + distance, elevation, a quiet pace line. */}
          {inProgress ? (
            <View style={styles.progressHeader}>
              <View style={styles.progressTopRow}>
                <Text style={styles.progressStage}>
                  Stage {currentStageNum} of {totalStages}
                </Text>
                <Text style={styles.progressDone}>
                  {Math.round(doneDistanceM / 1000)} / {Math.round(totalDistanceM / 1000)} KM
                </Text>
              </View>
              {trail?.elevation && trail.elevation.length > 0 && (
                <ElevationProfile
                  data={trail.elevation}
                  mode="progress"
                  progress={progressFraction(doneDistanceM, totalDistanceM)}
                  height={48}
                />
              )}
              <Text style={styles.progressPace}>
                Walking {paceWord} pace · grouping stages into ~{stagesPerDay} a day
              </Text>
            </View>
          ) : (
            <View style={styles.stats}>
              <StatPill value={formatKm(totalDistanceM)} label="distance" />
              <View style={styles.divider} />
              <StatPill value={formatElevationM(totalAscentM)} label="ascent" />
              <View style={styles.divider} />
              <StatPill value={String(totalStages)} label="stages" />
            </View>
          )}

          {/* Day-grouped itinerary — trail stages packed into days (§5/§11). */}
          <View style={styles.leadingLine} />
          <ItineraryDayList
            days={itinerary.days}
            onPressStage={openStageOnMap}
            onOpenDay={(n) => router.push(`/journey/day/${id}?day=${n}`)}
          />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing[8],
            paddingBottom: layout.contentPaddingBottom + insets.bottom,
          }}
        >
          {/* Pace — a soft hint; re-groups the remaining stages into days (§11). */}
          <Text style={styles.listHeader}>PACE</Text>
          <View style={styles.segWrap}>
            <Segmented
              value={pace}
              onChange={(p) => {
                setPaceDraft(p);
                update.mutate({ pace: p });
              }}
              options={PACE_OPTIONS}
            />
          </View>
          <Text style={styles.settingsBlurb}>
            Sets how many stages group into a day. Changing it regroups your remaining days
            {paceDelta !== 0
              ? ` — finishing about ${Math.abs(paceDelta)} day${
                  Math.abs(paceDelta) === 1 ? '' : 's'
                } ${paceDelta > 0 ? 'sooner' : 'later'}.`
              : '.'}
          </Text>

          {/* Guide level — mirrors the setup Guide preset */}
          <Text style={[styles.listHeader, styles.detailsHeader]}>GUIDE LEVEL</Text>
          <View style={styles.segWrap}>
            <Segmented
              value={guideValue}
              onChange={(v) => {
                setGuideDraft(v);
                update.mutate({ guidePreset: v });
              }}
              options={GUIDE_OPTIONS}
            />
          </View>
          <Text style={styles.settingsBlurb}>
            How much the trail companion chimes in unprompted — alerts, tips and nudges.
          </Text>

          {/* Journey — danger */}
          <Text style={[styles.listHeader, styles.detailsHeader]}>JOURNEY</Text>
          <View style={styles.dangerWrap}>
            <Button
              tone="danger"
              pending={remove.isPending}
              label={remove.isPending ? 'Deleting…' : 'Delete journey'}
              onPress={() => confirmDelete(() => remove.mutate())}
              disabled={remove.isPending}
              fullWidth
            />
          </View>
          <Text style={styles.settingsBlurb}>
            Removes the plan and offline data from this device.
          </Text>
        </ScrollView>
      )}

      {/* Start CTA — never-started journeys. */}
      {tab === 'itinerary' && isPlanned && (
        <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + spacing[4] }]}>
          <Button
            pending={progress.isPending}
            label={progress.isPending ? 'Starting…' : 'Start journey'}
            onPress={() =>
              progress.mutate(
                { type: 'start' },
                { onSuccess: () => router.push(`/journey/active/${id}`) },
              )
            }
          />
        </View>
      )}

      {/* In-progress control bar — Pause/Resume toggle + ••• options (Figma 13c). */}
      {tab === 'itinerary' && inProgress && (
        <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + spacing[4] }]}>
          <ActiveControlBar
            paused={isPaused}
            pending={progress.isPending}
            moreSize="md"
            onToggle={toggleNavigation}
            onMore={() => setSheetOpen(true)}
          />
        </View>
      )}

      <OptionsSheet
        visible={sheetOpen}
        context="itinerary"
        journeyName={title}
        progressLabel={progressLabel}
        finishStageSubtitle={`Mark Stage ${currentStageNum} complete and start the next.`}
        pending={progress.isPending}
        onNavigate={() => {
          setSheetOpen(false);
          router.push(`/journey/active/${id}`);
        }}
        onAskGuide={askGuide}
        onFinishStage={finishStage}
        onFinishJourney={finishJourney}
        onClose={() => setSheetOpen(false)}
      />
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
  },
  headerSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  headerTitle: { ...type.title, color: colors.text.primary, textAlign: 'center' },

  tabs: {
    flexDirection: 'row',
    paddingLeft: spacing[6],
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  // No bottom padding — the active underline sits flush on the bottom border.
  tab: { paddingHorizontal: spacing[4], paddingTop: spacing[5], gap: 7, alignItems: 'center' },
  tabLabel: { ...type.detailTab, color: colors.text.secondary },
  tabLabelActive: { color: colors.text.primary },
  tabUnderline: { height: 1.5, width: '100%', backgroundColor: colors.accent },

  detailsHeader: { paddingTop: spacing[12] },
  segWrap: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing[4] },
  settingsBlurb: {
    ...type.meta,
    color: colors.text.secondary,
    paddingHorizontal: layout.screenPadding,
    lineHeight: 18,
  },
  dangerWrap: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing[4] },

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
  progressStage: { ...type.cardTitle, color: colors.text.primary },
  progressDone: { ...type.dataMeta, color: colors.text.secondary },
  progressPace: { ...type.meta, color: colors.text.secondary },

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

  ctaWrap: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  stageActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[5] },
  ctaComplete: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCompleteLabel: { ...type.cardTitle, fontFamily: fonts.semiBold, color: colors.text.onAccent },
  ctaResume: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaResumeLabel: { ...type.cardTitle, fontFamily: fonts.semiBold, color: colors.text.primary },
});
