import {
  type Accommodation as CoreAccommodation,
  type Section as CoreSection,
  planJourney,
} from '@roam/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SetupScaffold } from '../../../components/journey';
import { Button } from '../../../components/ui';
import { CURRENT_USER_ID } from '../../../config/user';
import { formatElevationM, formatKm, orientRoute, routeChainPlaces } from '../../../lib/format';
import {
  createJourney,
  journeysQueryKey,
  useTrailAccommodations,
  useTrailSections,
} from '../../../lib/hooks';
import { fromPlan, toCreateStages } from '../../../lib/itinerary';
import { PACE_TARGET_M, useJourneySetupStore } from '../../../store/journeySetupStore';
import { colors, fonts, radius, spacing, type } from '../../../theme';

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
  const itinerary = fromPlan(plan.stages);

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

  // Section names are "start → end" places, oriented for the direction.
  const daySectionNames = (sectionIds: number[]): string[] =>
    sectionIds
      .map((id) => sectionById.get(id)?.name)
      .filter((n): n is string => Boolean(n))
      .map((n) => orientRoute(n, direction === 'reverse'));

  return (
    <SetupScaffold
      step={5}
      onClose={() => router.back()}
      onBack={() => router.back()}
      footer={
        <Button
          label={create.isPending ? 'Creating…' : 'Create journey'}
          grow
          disabled={create.isPending}
          onPress={() => create.mutate()}
        />
      }
    >
      <Text style={styles.eyebrow}>STEP 5 OF 5 · REVIEW</Text>
      <Text style={styles.name}>{name || `${trailRef} journey`}</Text>
      <Text style={styles.sub}>
        {totalDays} days · {formatKm(totalDistanceM)}
      </Text>
      <Text style={styles.forecastNote}>
        This is a forecast based on your selections. You can adjust your pace or change your
        itinerary after starting the journey.
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

      {/* Itinerary — read-only forecast */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeader}>ITINERARY</Text>
        <TouchableOpacity onPress={() => router.push('/journey/setup/pace')}>
          <Text style={styles.adjustPace}>Adjust pace ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.leadingLine} />
      {itinerary.map((s, i) => {
        const overnight = accById.get(s.overnightAccommodationId ?? -1)?.name;
        const names = daySectionNames(s.sectionIds);
        return (
          <View key={`${i}-${s.startChainageM}`} style={styles.stage}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayNum}>{i + 1}</Text>
            </View>
            <View style={styles.stageBody}>
              <Text style={styles.stageTitle} numberOfLines={2}>
                {names.length ? routeChainPlaces(names).join(' → ') : 'Section'}
              </Text>
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
        );
      })}
    </SetupScaffold>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.label, color: colors.text.secondary, paddingTop: spacing[2] },
  name: { ...type.sectionHeader, color: colors.text.primary, paddingTop: spacing[2] },
  sub: { ...type.meta, color: colors.text.secondary },
  forecastNote: { ...type.meta, color: colors.text.secondary, paddingBottom: spacing[6] },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
  },
  cell: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.bg.subtle,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[1],
  },
  cellLabel: { ...type.meta, color: colors.text.secondary },
  cellValue: {
    ...type.cardTitle,
    fontFamily: fonts.monoMedium,
    fontSize: 14,
    letterSpacing: -0.07,
    color: colors.text.primary,
  },

  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[3],
  },
  listHeader: { ...type.label, color: colors.text.secondary },
  adjustPace: { ...type.bodyStrong, fontSize: 12, color: colors.accent },
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
  dayNum: {
    ...type.cardTitle,
    fontFamily: fonts.monoMedium,
    fontSize: 14,
    color: colors.text.primary,
  },
  stageBody: { flex: 1, gap: spacing[1] },
  stageTitle: { ...type.bodyStrong, color: colors.text.primary, flexShrink: 1 },
  stageMeta: { ...type.dataMeta, color: colors.text.secondary },
  stageOvernight: { ...type.meta, color: colors.marker.refuge },
  moreDays: { ...type.meta, color: colors.text.secondary, paddingVertical: spacing[4] },
});
