import {
  type Accommodation as CoreAccommodation,
  type Section as CoreSection,
  planJourney,
} from '@roam/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Fragment, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScheduleGap, SetupScaffold } from '../../../components/journey';
import { Icon, StatusChip } from '../../../components/ui';
import { CURRENT_USER_ID } from '../../../config/user';
import { formatElevationM, formatKm, orientRoute, routeChainPlaces } from '../../../lib/format';
import {
  createJourney,
  journeysQueryKey,
  useTrailAccommodations,
  useTrailSections,
} from '../../../lib/hooks';
import {
  type EditStage,
  canSplitDay,
  combineDays,
  fromPlan,
  insertRestDay,
  removeStage,
  splitDay,
  toCreateStages,
} from '../../../lib/itinerary';
import { PACE_TARGET_M, useJourneySetupStore } from '../../../store/journeySetupStore';
import { colors, radius, spacing, type } from '../../../theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const STAY_LABEL = { camping: 'Camping', refuge: 'Refuges', mixed: 'Mixed' } as const;

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellValue}>{value}</Text>
    </View>
  );
}

export default function ReviewStep() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setup = useJourneySetupStore();
  const { routeId, trailId, trailRef, name, scope, direction, accommodation, pace, guide } = setup;

  const { data: sectionsData } = useTrailSections(String(trailId ?? 0), {
    query: { enabled: !!trailId },
  });
  const { data: accData } = useTrailAccommodations(String(trailId ?? 0), {
    query: { enabled: !!trailId },
  });
  const sections = Array.isArray(sectionsData?.data) ? sectionsData.data : [];
  const accommodations = Array.isArray(accData?.data) ? accData.data : [];

  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const accById = new Map(accommodations.map((a) => [a.id, a]));

  // Plan on-device with the same engine the server uses (offline-first).
  const plan = planJourney({
    sections: sections as unknown as CoreSection[],
    direction,
    startSectionId: scope === 'section' ? (setup.startSectionId ?? undefined) : undefined,
    endSectionId: scope === 'section' ? (setup.endSectionId ?? undefined) : undefined,
    pace: { targetDistancePerDayM: PACE_TARGET_M[pace] },
    accommodation,
    accommodations: accommodations as unknown as CoreAccommodation[],
  });

  // Editable copy of the plan — reset whenever the planning inputs change.
  const planKey = `${pace}|${scope}|${direction}|${setup.startSectionId}|${setup.endSectionId}|${sections.length}`;
  const [edited, setEdited] = useState<EditStage[] | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the planning inputs (planKey) change, not on every recompute of plan.
  useEffect(() => setEdited(null), [planKey]);
  const itinerary = edited ?? fromPlan(plan.stages);

  const totalDays = itinerary.length;
  const totalDistanceM = itinerary.reduce((a, s) => a + s.distanceM, 0);

  const create = useMutation({
    mutationFn: () =>
      createJourney({
        routeId: routeId ?? 0,
        userId: CURRENT_USER_ID,
        name: name.trim() || undefined,
        direction,
        accommodation,
        guidePreset: guide,
        startSectionId: scope === 'section' ? (setup.startSectionId ?? undefined) : undefined,
        endSectionId: scope === 'section' ? (setup.endSectionId ?? undefined) : undefined,
        stages: toCreateStages(itinerary),
      }),
    onSuccess: (res) => {
      if ('error' in res.data) return;
      queryClient.invalidateQueries({ queryKey: journeysQueryKey({ userId: CURRENT_USER_ID }) });
      router.replace(`/journey/${res.data.id}`);
    },
  });

  // Section names are "start → end" places, oriented for the direction. A combined
  // day lists each on its own line.
  const daySectionNames = (sectionIds: number[]): string[] =>
    sectionIds
      .map((id) => sectionById.get(id)?.name)
      .filter((n): n is string => Boolean(n))
      .map((n) => orientRoute(n, direction === 'reverse'));

  let walkNum = 0;

  return (
    <SetupScaffold
      step={5}
      onClose={() => router.back()}
      onBack={() => router.back()}
      footer={
        <TouchableOpacity
          style={[styles.cta, create.isPending && styles.ctaDisabled]}
          onPress={() => create.mutate()}
          activeOpacity={0.85}
          disabled={create.isPending}
        >
          <Text style={styles.ctaLabel}>{create.isPending ? 'Creating…' : 'Start journey'}</Text>
        </TouchableOpacity>
      }
    >
      <Text style={styles.eyebrow}>STEP 5 OF 5 · REVIEW</Text>
      <Text style={styles.name}>{name || `${trailRef} journey`}</Text>
      <Text style={styles.sub}>
        {totalDays} days · {formatKm(totalDistanceM)}
      </Text>

      {/* Summary grid */}
      <View style={styles.grid}>
        <SummaryCell label="Trail" value={trailRef} />
        <SummaryCell label="Duration" value={`${totalDays} days`} />
        <SummaryCell label="Pace" value={cap(pace)} />
        <SummaryCell label="Stay" value={STAY_LABEL[accommodation]} />
        <SummaryCell label="Guide" value={cap(guide)} />
        <SummaryCell label="Distance" value={formatKm(totalDistanceM)} />
      </View>

      {/* Itinerary — adjustable before confirming */}
      <View style={styles.leadingLine} />
      {itinerary.map((s, i) => {
        const nextStage = itinerary[i + 1];
        const gap = nextStage ? (
          <ScheduleGap
            inset={false}
            canCombine={!s.restDay && !nextStage.restDay}
            canSplit={canSplitDay(s, sections)}
            onAddRest={() => setEdited(insertRestDay(itinerary, i))}
            onCombine={() => setEdited(combineDays(itinerary, i))}
            onSplit={() => setEdited(splitDay(itinerary, i, sections))}
          />
        ) : null;
        const key = `${i}-${s.startChainageM}-${s.restDay}`;

        if (s.restDay) {
          return (
            <Fragment key={key}>
              <View style={styles.restRow}>
                <View style={styles.restBadge}>
                  <Icon name="calendar" size={14} color={colors.text.secondary} />
                </View>
                <Text style={styles.restLabel}>Rest day</Text>
                <TouchableOpacity onPress={() => setEdited(removeStage(itinerary, i))}>
                  <Text style={styles.restRemove}>Remove</Text>
                </TouchableOpacity>
              </View>
              {gap}
            </Fragment>
          );
        }

        walkNum += 1;
        const combined = s.sectionIds.length > 1;
        const overnight = accById.get(s.overnightAccommodationId ?? -1)?.name;
        const names = daySectionNames(s.sectionIds);
        return (
          <Fragment key={key}>
            <View style={styles.stage}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayNum}>{walkNum}</Text>
              </View>
              <View style={styles.stageBody}>
                <View style={styles.sectionRow}>
                  <Text style={styles.stageTitle} numberOfLines={2}>
                    {names.length ? routeChainPlaces(names).join(' → ') : 'Section'}
                  </Text>
                  {combined && <StatusChip label="Combined" variant="info" />}
                </View>
                <Text style={styles.stageMeta}>
                  {[
                    formatKm(s.distanceM),
                    `↑${formatElevationM(s.ascentM)}`,
                    `↓${formatElevationM(s.descentM)}`,
                  ].join(' · ')}
                </Text>
                {overnight && (
                  <Text style={styles.stageOvernight} numberOfLines={1}>
                    Stay · {overnight}
                  </Text>
                )}
              </View>
            </View>
            {gap}
          </Fragment>
        );
      })}
    </SetupScaffold>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.label, color: colors.text.secondary, paddingTop: spacing[2] },
  name: { ...type.sectionHeader, color: colors.text.primary, paddingTop: spacing[1] },
  sub: { ...type.meta, color: colors.text.secondary, paddingBottom: spacing[6] },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], paddingBottom: spacing[6] },
  cell: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.bg.subtle,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[1],
  },
  cellLabel: { ...type.meta, color: colors.text.secondary },
  cellValue: { ...type.cardTitle, color: colors.text.primary },

  listHeader: { ...type.label, color: colors.text.secondary, paddingBottom: spacing[3] },
  leadingLine: { height: 1, backgroundColor: colors.border.default },
  stage: {
    flexDirection: 'row',
    gap: spacing[4],
    paddingVertical: spacing[6],
  },
  dayBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { ...type.cardTitle, color: colors.text.primary },
  stageBody: { flex: 1, gap: spacing[1] },
  sectionList: { gap: spacing[1] },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  stageTitle: { ...type.cardTitle, color: colors.text.primary, flexShrink: 1 },
  stageMeta: { ...type.meta, color: colors.text.secondary },
  stageOvernight: { ...type.meta, color: colors.marker.refuge },

  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[6],
  },
  restBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restLabel: { ...type.cardTitle, color: colors.text.secondary, flex: 1 },
  restRemove: { ...type.meta, color: colors.text.secondary },

  cta: {
    flex: 1,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaLabel: { ...type.cardTitle, color: colors.text.onAccent },
});
