import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useState } from 'react';
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
import { ActiveControlBar, OptionsSheet } from '../../components/journey';
import { Button, Icon, Segmented, StatPill } from '../../components/ui';
import { CURRENT_USER_ID } from '../../config/user';
import { formatElevationM, formatKm, orientRoute, routeEndpoints } from '../../lib/format';
import {
  deleteJourney,
  journeyQueryKey,
  journeysQueryKey,
  updateJourney,
  useJourney,
  useTrailAccommodations,
  useTrailSections,
  useTrails,
} from '../../lib/hooks';
import { sectionsForDay as sectionsForDayOf } from '../../lib/sections';
import { useJourneyProgress } from '../../lib/useJourneyProgress';
import type { GuidePreset } from '../../store/journeySetupStore';
import { colors, fonts, layout, radius, spacing, type } from '../../theme';

const GUIDE_OPTIONS: { value: GuidePreset; label: string }[] = [
  { value: 'silent', label: 'Silent' },
  { value: 'guided', label: 'Guided' },
  { value: 'full', label: 'Full' },
];

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
  const [sheetOpen, setSheetOpen] = useState(false);

  const remove = useMutation({
    mutationFn: () => deleteJourney(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journeysQueryKey({ userId: CURRENT_USER_ID }) });
      router.replace('/(tabs)/journeys');
    },
  });
  const update = useMutation({
    mutationFn: (guidePreset: GuidePreset) => updateJourney(id, { guidePreset }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journeyQueryKey(id) }),
  });

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

  // Sections a day represents, in walking order — shown as links into section detail.
  const sectionsForDay = (start: number, end: number) =>
    sectionsForDayOf(sectionRanges, start, end);

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

  const walkStages = stages.filter((s) => !s.restDay);
  const completedCount = walkStages.filter((s) => s.status === 'completed').length;
  const doneDistanceM = walkStages
    .filter((s) => s.status === 'completed')
    .reduce((a, s) => a + (s.distanceM ?? 0), 0);
  // The "current" day is derived: the first walking day that isn't done. There is
  // therefore only ever one, and completing a day never auto-starts another.
  const currentStage = inProgress
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

  // "Section Y of M": the section the current day starts in, in walking order.
  const totalSections = sectionRanges.length;
  const currentSections = currentStage
    ? sectionsForDay(currentStage.startChainageM, currentStage.endChainageM)
    : [];
  const currentSectionOrder = currentSections[0]?.orderIndex ?? 0;
  const currentSectionNum = reverse ? totalSections - currentSectionOrder + 1 : currentSectionOrder;

  const guideValue = guideDraft ?? journey.guidePreset;

  // Active-journey controls (shared model with the map): Pause is an immediate
  // toggle; the ••• sheet holds navigation, guide, finish stage and finish journey.
  const progressLabel = `Day ${currentDay} of ${walkStages.length} · ${formatKm(doneDistanceM)} of ${formatKm(totalDistanceM)} walked`;
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
    if (!currentStage) return;
    progress.mutate(
      { type: 'completeStage', stageId: currentStage.id },
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
          {/* In-progress progress bar, or planned/completed totals */}
          {inProgress ? (
            <View style={styles.progressHeader}>
              <View style={styles.progressTopRow}>
                <Text style={styles.progressDay}>
                  Day {currentDay} of {walkStages.length}
                </Text>
                {totalSections > 0 && currentSectionNum > 0 && (
                  <Text style={styles.progressDone}>
                    Section {currentSectionNum} of {totalSections}
                  </Text>
                )}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.progressMeta}>
                {formatKm(doneDistanceM)} of {formatKm(totalDistanceM)} · {completedCount} days done
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
          <View style={styles.leadingLine} />
          {/* Read-only progress view: done / current / upcoming. Per-day decisions
              happen at Stage Complete; legacy rest days still render. */}
          {stages.map((s) => {
            if (s.restDay) {
              return (
                <View key={s.id} style={styles.restRow}>
                  <View style={styles.restBadge}>
                    <Icon name="calendar" size={14} color={colors.text.secondary} />
                  </View>
                  <Text style={styles.restLabel}>Rest day</Text>
                </View>
              );
            }

            const overnight = accommodationName(s.overnightAccommodationId);
            const done = s.status === 'completed';
            const current = currentStage?.id === s.id;
            const daySections = sectionsForDay(s.startChainageM, s.endChainageM);
            // A connected waypoint chain for the day; each place links to its section.
            const chain: { place: string; sectionId: number }[] = [];
            daySections.forEach((sec, idx) => {
              const [from, to] = routeEndpoints(orientRoute(sec.name, reverse));
              if (idx === 0) chain.push({ place: from, sectionId: sec.id });
              chain.push({ place: to, sectionId: sec.id });
            });
            return (
                <View key={s.id} style={[styles.stage, current && styles.stageCurrent]}>
                  <View style={styles.stageMain}>
                    <View
                      style={[
                        styles.dayBadge,
                        done && styles.dayBadgeDone,
                        current && styles.dayBadgeActive,
                      ]}
                    >
                      {done ? (
                        <Icon name="check" size={16} color={colors.status.success.text} />
                      ) : (
                        <Text style={[styles.dayNum, current && styles.dayNumActive]}>
                          {s.orderIndex}
                        </Text>
                      )}
                    </View>
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
                                <Text style={[styles.sectionLink, done && styles.sectionLinkDone]}>
                                  {node.place}
                                </Text>
                              </TouchableOpacity>
                            </Fragment>
                          ))
                        ) : (
                          <Text style={[styles.stageTitle, done && styles.sectionLinkDone]}>
                            Day {s.orderIndex}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.stageMeta}>
                        {[
                          formatKm(s.distanceM),
                          `${formatElevationM(s.ascentM)} ↑`,
                          `${formatElevationM(s.descentM)} ↓`,
                        ].join('  ·  ')}
                      </Text>
                      {overnight && (
                        <View style={styles.overnight}>
                          <Icon name="stay" size={13} color={colors.marker.refuge} />
                          <Text style={styles.overnightText} numberOfLines={1}>
                            {overnight}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing[8],
            paddingBottom: layout.contentPaddingBottom + insets.bottom,
          }}
        >
          {/* Guide level — mirrors the setup Guide preset */}
          <Text style={styles.listHeader}>GUIDE LEVEL</Text>
          <View style={styles.segWrap}>
            <Segmented
              value={guideValue}
              onChange={(v) => {
                setGuideDraft(v);
                update.mutate(v);
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
        finishStageSubtitle={`Mark Day ${currentDay} complete and unlock Day ${currentDay + 1}.`}
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
  progressDay: { ...type.cardTitle, color: colors.text.primary },
  progressDone: { ...type.meta, color: colors.text.secondary },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bg.subtle,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.status.progress.text,
  },
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
  stageCurrent: { backgroundColor: colors.status.progress.bg },
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
  dayBadgeActive: { backgroundColor: colors.status.progress.text },
  dayNum: {
    ...type.cardTitle,
    fontFamily: fonts.monoMedium,
    fontSize: 14,
    color: colors.text.primary,
  },
  dayNumActive: { color: colors.text.onAccent },
  stageBody: { flex: 1, gap: spacing[2] },
  sectionList: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2] },
  stageTitle: { ...type.cardTitle, color: colors.text.primary },
  sectionLink: { ...type.cardTitle, color: colors.text.primary, textDecorationLine: 'underline' },
  sectionLinkDone: { color: colors.text.secondary, textDecorationLine: 'none' },
  sectionSep: { ...type.cardTitle, color: colors.text.secondary },
  stageMeta: { ...type.meta, color: colors.text.secondary },
  overnight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] },
  overnightText: { ...type.meta, color: colors.text.primary, flex: 1 },
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
